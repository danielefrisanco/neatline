import { feature, mesh } from "topojson-client";
import { featureId } from "./iso.js";
import type { Detail, Position } from "./types.js";

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

  const world: World = {
    countries: Object.freeze(countries),
    places: Object.freeze(places),

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
