import { feature, mesh } from "topojson-client";
import { featureId } from "./iso.js";
import type { Detail, GeoJsonFeatureCollection, Position } from "./types.js";

/** A country ready to draw: geometry plus the ids the emitter needs. */
export interface CountryFeature {
  readonly id: string;
  readonly name: string;
  readonly geometry: unknown;
}

/** A settlement. Ranked 1–3 so a theme can thin density with one CSS rule. */
export interface Place {
  readonly name: string;
  /** The country it sits in, or `null` where Natural Earth records none. */
  readonly iso: string | null;
  readonly position: Position;
  readonly population: number;
  readonly capital: boolean;
  readonly rank: 1 | 2 | 3;
}

/**
 * A named body of water, reduced to the one point its name is set at.
 *
 * Natural Earth ships these as polygons and this is not one, deliberately. The
 * shape is only ever used to decide where the name goes, so the build works
 * that out once — the interior point furthest from the shore, so the name lands
 * on water rather than on the Sicily the Mediterranean's centroid falls on —
 * and ships the answer. 1.5 MB of coastline becomes 9 KB of anchors.
 *
 * The rule that follows from it is stated in the README because a reader can
 * check it: a sea is named when its middle is on the map.
 */
export interface Sea {
  readonly name: string;
  /** `ocean`, `sea`, `bay`, `gulf`, `strait`, `channel`, `sound`, `reef`, `river`. */
  readonly kind: string;
  readonly position: Position;
  readonly rank: 1 | 2 | 3;
}

export type WaterKind = "lake" | "river";

/**
 * The geometry the emitter draws from.
 *
 * `borders` is a capability rather than raw topology, because shared boundaries
 * can only be derived where arcs are shared — a fact of the storage format, not
 * of the map. Water needs no equivalent: no two lakes share an edge, so it is
 * stored as plain geometry.
 */
export interface World {
  readonly countries: readonly CountryFeature[];
  readonly places: readonly Place[];
  readonly seas: readonly Sea[];
  /**
   * The boundaries shared between the named countries, each drawn once.
   * Coastlines are excluded — the land layer already draws that silhouette.
   *
   * With `focus`, only that country's own share of them, which is what an
   * extruded map needs: a border has to be drawn once per country, at each
   * country's own height, or it floats between the two.
   */
  borders(ids: readonly string[], focus?: string): unknown | null;
  /**
   * Which of the named countries share a boundary with which.
   *
   * The same fact `borders` is built on, kept rather than discarded. A political
   * fill needs the graph, not the lines — and the mesh already visits every
   * shared arc to find them, so this costs one more pass over arcs and no new
   * geometry.
   */
  adjacency(ids: readonly string[]): Map<string, Set<string>>;
  water(kind: WaterKind): unknown;
}

const cache = new Map<Detail, World>();

/**
 * The ocean, cached apart from everything else because it is loaded apart.
 *
 * One polygon with a hole for every continent, and half again the size of the
 * whole rest of the bundle — so it lives in `data/ocean-<tier>.json` and is
 * read only when a map asks for the sea. An opt-in layer every caller
 * downloads is not opt-in.
 */
const oceanCache = new Map<Detail, GeoJsonFeatureCollection>();

export async function loadOcean(detail: Detail): Promise<GeoJsonFeatureCollection> {
  const cached = oceanCache.get(detail);
  if (cached) return cached;

  const url = new URL(`../data/ocean-${detail}.json`, import.meta.url);
  let collection: GeoJsonFeatureCollection;
  try {
    const { readFile } = await import("node:fs/promises");
    collection = JSON.parse(await readFile(url, "utf8")) as GeoJsonFeatureCollection;
  } catch {
    throw new Error(
      `neatline: could not read ocean geometry for detail "${detail}". ` +
        `Run \`npm run build:data\` to regenerate it.`,
    );
  }

  oceanCache.set(detail, collection);
  return collection;
}

/**
 * Land cover, cached and loaded apart for the ocean's reason, at a tenth of the
 * weight: 52 KB at 110m and 589 KB at 50m, against a 152 KB bundle.
 *
 * Three kinds ship — `desert`, `mountain`, `glacier` — and each feature carries
 * only which one it is. The classification is Natural Earth's own, joined from
 * the 10m tier by `NE_ID` because the coarser files ship the column blank; see
 * `scripts/fetch-natural-earth.mjs`, where that join is done and checked.
 */
const coverCache = new Map<Detail, GeoJsonFeatureCollection>();

export async function loadCover(detail: Detail): Promise<GeoJsonFeatureCollection> {
  const cached = coverCache.get(detail);
  if (cached) return cached;

  const url = new URL(`../data/cover-${detail}.json`, import.meta.url);
  let collection: GeoJsonFeatureCollection;
  try {
    const { readFile } = await import("node:fs/promises");
    collection = JSON.parse(await readFile(url, "utf8")) as GeoJsonFeatureCollection;
  } catch {
    throw new Error(
      `neatline: could not read land cover for detail "${detail}". ` +
        `Run \`npm run build:data\` to regenerate it.`,
    );
  }

  coverCache.set(detail, collection);
  return collection;
}

interface Bundle {
  readonly countries: { objects: { countries: { geometries: readonly unknown[] } } };
  readonly lakes: unknown;
  readonly rivers: unknown;
  readonly places: ReadonlyArray<{
    n: string;
    i: string | null;
    x: number;
    y: number;
    p: number;
    c: number;
    r: number;
  }>;
  readonly seas?: ReadonlyArray<{ n: string; k: string; x: number; y: number; r: number }>;
}

/**
 * Load the bundled map data.
 *
 * Reads `data/`, which the build produces — not a package off disk. That
 * distinction is the whole point of this seam: Phase 1 resolved `world-atlas`
 * through `createRequire`, which tied the library to Node and to a
 * devDependency being present at call time. Sources now stay on the build
 * machine and only the extract ships.
 */
export async function loadWorld(detail: Detail): Promise<World> {
  const cached = cache.get(detail);
  if (cached) return cached;

  const url = new URL(`../data/${detail}.json`, import.meta.url);

  let bundle: Bundle;
  try {
    const { readFile } = await import("node:fs/promises");
    bundle = JSON.parse(await readFile(url, "utf8")) as Bundle;
  } catch {
    throw new Error(
      `neatline: could not read bundled data for detail "${detail}". ` +
        `Run \`npm run build:data\` to regenerate it.`,
    );
  }

  const topology = bundle.countries;
  const object = topology.objects.countries;

  const collection = feature(topology as never, object as never) as unknown as {
    features: ReadonlyArray<Record<string, never>>;
  };

  const countries: CountryFeature[] = [];
  // Kept so `borders` can rebuild a subset object: the mesh needs the raw
  // arc-indexed geometry, which the GeoJSON conversion above has thrown away.
  const rawById = new Map<string, unknown>();

  for (const [index, raw] of collection.features.entries()) {
    const record = raw as unknown as { id?: string | number; properties?: { name?: string } };
    const name = record.properties?.name ?? "";
    const id = featureId(record.id, name);
    // A feature with no resolvable id cannot be targeted or highlighted;
    // dropping it silently would be worse than leaving it unaddressable.
    if (id === null) continue;
    countries.push({ id, name, geometry: raw });
    const source = object.geometries[index];
    if (source !== undefined) rawById.set(id, source);
  }

  const places: Place[] = bundle.places.map((p) => ({
    name: p.n,
    iso: p.i,
    position: [p.x, p.y] as Position,
    population: p.p,
    capital: p.c === 1,
    rank: (p.r === 1 || p.r === 2 ? p.r : 3) as 1 | 2 | 3,
  }));

  // Optional in the bundle shape rather than required, so a `data/` built
  // before sea names existed still loads and simply has none.
  const seas: Sea[] = (bundle.seas ?? []).map((s) => ({
    name: s.n,
    kind: s.k,
    position: [s.x, s.y] as Position,
    rank: (s.r === 1 || s.r === 2 ? s.r : 3) as 1 | 2 | 3,
  }));

  const world: World = {
    countries: Object.freeze(countries),
    places: Object.freeze(places),
    seas: Object.freeze(seas),

    borders(ids: readonly string[], focus?: string): unknown | null {
      const geometries: unknown[] = [];
      const focused = focus === undefined ? undefined : rawById.get(focus);
      for (const id of ids) {
        const source = rawById.get(id);
        if (source !== undefined) geometries.push(source);
      }
      if (geometries.length < 2) return null;

      const subset = { type: "GeometryCollection" as const, geometries };
      // `a !== b` selects arcs two different countries share. The same call
      // with `a === b` would give the outer edge, which the land layer draws.
      const lines = mesh(topology as never, subset as never, (a, b) =>
        a !== b && (focused === undefined || a === focused || b === focused),
      ) as { coordinates: readonly unknown[] };
      return lines.coordinates.length === 0 ? null : lines;
    },

    adjacency(ids: readonly string[]): Map<string, Set<string>> {
      const graph = new Map<string, Set<string>>();
      const geometries: unknown[] = [];
      const idOf = new Map<unknown, string>();

      for (const id of ids) {
        const source = rawById.get(id);
        if (source === undefined) continue;
        geometries.push(source);
        idOf.set(source, id);
        graph.set(id, new Set());
      }
      if (geometries.length < 2) return graph;

      const subset = { type: "GeometryCollection" as const, geometries };
      // The filter is called once per arc whatever it returns, so returning
      // false throughout records the graph and builds no line work at all.
      mesh(topology as never, subset as never, (a, b) => {
        if (a === b) return false;
        const left = idOf.get(a);
        const right = idOf.get(b);
        if (left === undefined || right === undefined) return false;
        graph.get(left)?.add(right);
        graph.get(right)?.add(left);
        return false;
      });

      return graph;
    },

    water(kind: WaterKind): unknown {
      return kind === "lake" ? bundle.lakes : bundle.rivers;
    },
  };

  cache.set(detail, world);
  return world;
}
