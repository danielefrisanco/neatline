/**
 * Build the bundled map data.
 *
 * Phase 4's real job is not "add more layers" — it is to stop reading a
 * devDependency off disk at call time, which is what made the library
 * Node-only. Sources are devDependencies and stay on the build machine;
 * `data/` is what ships and what `loadWorld()` reads.
 *
 * Three sources, each chosen for one reason:
 *   world-atlas     countries, because it carries ISO numeric ids that the
 *                   identity table already maps
 *   sane-topojson   lakes and rivers, which world-atlas does not have
 *   Natural Earth   populated places, vendored under vendor/
 *
 * Countries stay as a topology: shared borders can only be derived where arcs
 * are shared. Water needs no such thing — no two lakes share an edge — so it is
 * decoded to plain geometry, which is smaller and simpler to read back.
 */
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const TIERS = ["110m", "50m"];

/**
 * Three bands, so a theme can thin density with one CSS rule.
 *
 * Capitals are promoted regardless of size — a map that shows Milan but not
 * Bern is wrong — but the bands are otherwise population, not capital status:
 * Hamburg, Lyon, Turin and Munich all belong on a map of Western Europe.
 */
function rankOf(properties) {
  const population = properties.pop_max ?? 0;
  if (properties.adm0cap === 1 || population >= 5_000_000) return 1;
  if (population >= 1_000_000) return 2;
  return 3;
}

function trimPlaces(collection) {
  const places = [];
  for (const item of collection.features) {
    const p = item.properties;
    const [lon, lat] = item.geometry.coordinates;
    if (typeof lon !== "number" || typeof lat !== "number") continue;
    places.push({
      // Short keys: this file is read on every call, not by a person.
      n: p.nameascii || p.name,
      i: p.iso_a2 && p.iso_a2 !== "-99" ? p.iso_a2 : null,
      x: Math.round(lon * 1e4) / 1e4,
      y: Math.round(lat * 1e4) / 1e4,
      p: p.pop_max ?? 0,
      c: p.adm0cap === 1 ? 1 : 0,
      s: p.scalerank ?? 10,
      r: rankOf(p),
    });
  }
  // Most important first, so a cap on how many to draw is a slice.
  places.sort((a, b) => a.r - b.r || a.s - b.s || b.p - a.p);
  return places;
}

/** Drop the coordinate precision that survives simplification but not the eye. */
function round(coordinates, digits) {
  if (typeof coordinates[0] === "number") {
    const f = 10 ** digits;
    return coordinates.map((n) => Math.round(n * f) / f);
  }
  return coordinates.map((c) => round(c, digits));
}

function waterLayer(topology, key, digits) {
  const object = topology.objects[key];
  if (!object) return { type: "FeatureCollection", features: [] };
  const collection = feature(topology, object);
  return {
    type: "FeatureCollection",
    features: collection.features.map((f) => ({
      type: "Feature",
      properties: {},
      geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates, digits) },
    })),
  };
}

await mkdir("data", { recursive: true });

for (const tier of TIERS) {
  const countries = JSON.parse(
    await readFile(require.resolve(`world-atlas/countries-${tier}.json`), "utf8"),
  );
  const sane = JSON.parse(
    await readFile(require.resolve(`sane-topojson/dist/world_${tier}.json`), "utf8"),
  );
  const places = trimPlaces(JSON.parse(await readFile(`vendor/places-${tier}.raw.json`, "utf8")));

  const digits = tier === "110m" ? 2 : 3;
  const bundle = {
    tier,
    countries,
    lakes: waterLayer(sane, "lakes", digits),
    rivers: waterLayer(sane, "rivers", digits),
    places,
  };

  const path = `data/${tier}.json`;
  await writeFile(path, JSON.stringify(bundle), "utf8");
  const { size } = await import("node:fs").then((fs) => fs.promises.stat(path));
  console.log(
    `  ${path}  ${(size / 1024).toFixed(0)} KB` +
      `  (${countries.objects.countries.geometries.length} countries,` +
      ` ${bundle.lakes.features.length} lakes,` +
      ` ${bundle.rivers.features.length} rivers,` +
      ` ${places.length} places)`,
  );
}
console.log("data built");
