import { feature, mesh } from "topojson-client";
import { featureId } from "./iso.js";
import type { Detail } from "./types.js";

/** A country ready to draw: geometry plus the ids the emitter needs. */
export interface CountryFeature {
  readonly id: string;
  readonly name: string;
  readonly geometry: unknown;
}

/**
 * The geometry the emitter draws from.
 *
 * `borders` is exposed as a capability rather than handing out the raw
 * topology, because shared boundaries can only be derived where arcs are
 * shared — a fact of the *source format*, not of the map. Keeping it behind
 * this interface means Phase 4 can serve borders from a precomputed mesh
 * without any caller learning that the storage changed.
 */
export interface World {
  readonly countries: readonly CountryFeature[];
  /**
   * The boundaries shared between the named countries, each drawn once.
   *
   * Coastlines and the region's outer edge are excluded: they are already the
   * silhouette of the land layer, and stroking them twice makes translucent or
   * dashed border themes render wrong. Returns `null` when nothing is shared.
   */
  borders(ids: readonly string[]): unknown | null;
}

const cache = new Map<Detail, World>();

/**
 * Load and normalise the world topology.
 *
 * PHASE 1 SEAM. This reads `world-atlas` from disk, which makes it Node-only
 * and depends on a devDependency — deliberately temporary. The full dataset is
 * 8 MB across all tiers, far too much to ship to every consumer, so Phase 4
 * replaces this with per-region extracts bundled in `data/`. Everything above
 * this function is written against `World`, not the source, so that swap should
 * not reach any caller.
 */
export async function loadWorld(detail: Detail): Promise<World> {
  const cached = cache.get(detail);
  if (cached) return cached;

  const [{ readFile }, { createRequire }] = await Promise.all([
    import("node:fs/promises"),
    import("node:module"),
  ]);

  const require = createRequire(import.meta.url);

  let path: string;
  try {
    path = require.resolve(`world-atlas/countries-${detail}.json`);
  } catch {
    throw new Error(
      `mapper: could not find world-atlas data for detail "${detail}". ` +
        `Phase 1 loads geometry from the world-atlas package; install it with ` +
        `\`npm i -D world-atlas\`. Phase 4 replaces this with bundled data.`,
    );
  }

  const topology = JSON.parse(await readFile(path, "utf8")) as {
    objects: { countries: { geometries: readonly unknown[] } };
  };
  const object = topology.objects.countries;

  const collection = feature(
    topology as never,
    object as never,
  ) as unknown as { features: ReadonlyArray<Record<string, never>> };

  const countries: CountryFeature[] = [];
  // Kept so `borders` can rebuild a subset object: the mesh needs the raw
  // arc-indexed geometry, which the GeoJSON conversion above has thrown away.
  const rawById = new Map<string, unknown>();

  for (const [index, raw] of collection.features.entries()) {
    const record = raw as unknown as {
      id?: string | number;
      properties?: { name?: string };
    };
    const name = record.properties?.name ?? "";
    const id = featureId(record.id, name);
    // A feature with no resolvable id cannot be targeted or highlighted;
    // dropping it silently would be worse than leaving it unaddressable.
    if (id === null) continue;
    countries.push({ id, name, geometry: raw });
    const source = object.geometries[index];
    if (source !== undefined) rawById.set(id, source);
  }

  const world: World = {
    countries: Object.freeze(countries),
    borders(ids: readonly string[]): unknown | null {
      const geometries: unknown[] = [];
      for (const id of ids) {
        const source = rawById.get(id);
        if (source !== undefined) geometries.push(source);
      }
      if (geometries.length < 2) return null;

      const subset = { type: "GeometryCollection" as const, geometries };
      // `a !== b` selects arcs that two different countries share. The same
      // call with `a === b` would give the outer edge, which the land layer
      // already draws.
      const lines = mesh(topology as never, subset as never, (a, b) => a !== b) as {
        coordinates: readonly unknown[];
      };
      return lines.coordinates.length === 0 ? null : lines;
    },
  };

  cache.set(detail, world);
  return world;
}
