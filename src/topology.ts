import { feature } from "topojson-client";
import { featureId } from "./iso.js";
import type { Detail } from "./types.js";

/** A country ready to draw: geometry plus the ids the emitter needs. */
export interface CountryFeature {
  readonly id: string;
  readonly name: string;
  readonly geometry: unknown;
}

const cache = new Map<Detail, readonly CountryFeature[]>();

/**
 * Load and normalise the world topology.
 *
 * PHASE 1 SEAM. This reads `world-atlas` from disk, which makes it Node-only
 * and depends on a devDependency — deliberately temporary. The full dataset is
 * 8 MB across all tiers, far too much to ship to every consumer, so Phase 4
 * replaces this with per-region extracts bundled in `data/`. Everything above
 * this function is written against the returned shape, not the source, so that
 * swap should not reach any caller.
 */
export async function loadCountries(detail: Detail): Promise<readonly CountryFeature[]> {
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
    objects: { countries: unknown };
  };

  const collection = feature(
    topology as never,
    topology.objects.countries as never,
  ) as unknown as { features: ReadonlyArray<Record<string, never>> };

  const countries: CountryFeature[] = [];
  for (const raw of collection.features) {
    const record = raw as unknown as {
      id?: string | number;
      properties?: { name?: string };
      geometry: unknown;
    };
    const name = record.properties?.name ?? "";
    const id = featureId(record.id, name);
    // A feature with no resolvable id cannot be targeted or highlighted;
    // dropping it silently would be worse than leaving it unaddressable.
    if (id === null) continue;
    countries.push({ id, name, geometry: raw });
  }

  const frozen = Object.freeze(countries);
  cache.set(detail, frozen);
  return frozen;
}
