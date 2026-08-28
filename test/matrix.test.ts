import { describe, expect, it } from "vitest";
import {
  neatline,
  PALETTE_NAMES,
  PROJECTION_NAMES,
  REGION_PRESET_NAMES,
  THEME_NAMES,
  TYPEFACE_NAMES,
} from "../src/index.js";

/**
 * The cross product, as invariants rather than as pictures.
 *
 * Nine regions by five projections by five themes is 225 maps. Committing 225
 * SVG snapshots would mean nobody ever opens one, and a gallery nobody opens is
 * the exact failure this project has already had three times. So the gallery
 * stays curated and human-sized, and the combinations that no one will ever
 * look at are checked here for the things that can be stated as facts:
 *
 *   - it renders at all
 *   - it draws something
 *   - every number it emits is a number
 *   - what it draws is on the canvas
 *   - the same input gives the same output
 *   - every token the stylesheet asks for resolves to a value
 *
 * None of that proves a map is *good*. It proves a combination is not broken,
 * which is the only claim a matrix this size can honestly make.
 */

const SIZE = [640, 480] as const;
const base = { detail: "110m", size: SIZE } as const;

/** Every coordinate in every `d` attribute, as numbers. */
function pathNumbers(svg: string): number[] {
  const found: number[] = [];
  for (const match of svg.matchAll(/\sd="([^"]*)"/g)) {
    for (const token of (match[1] as string).matchAll(/-?\d*\.?\d+(?:e-?\d+)?/gi)) {
      found.push(Number(token[0]));
    }
  }
  return found;
}

function countryPaths(svg: string): string[] {
  return [...svg.matchAll(/<path class="mp-country"[^>]*\sd="([^"]*)"/g)].map(
    (m) => m[1] as string,
  );
}

const combinations = REGION_PRESET_NAMES.flatMap((region) =>
  PROJECTION_NAMES.map((projection) => [region, projection] as const),
);

describe("every region in every projection", () => {
  it.each(combinations)("draws %s in %s", async (region, projection) => {
    const map = await neatline({ ...base, region, projection });

    const countries = countryPaths(map.svg);
    expect(countries.length, `${region}/${projection} drew no land`).toBeGreaterThan(0);

    // A single NaN in a `d` makes the renderer discard the whole subpath
    // silently — the country simply is not there, and no assertion on the
    // string would notice.
    const numbers = pathNumbers(map.svg);
    expect(numbers.length).toBeGreaterThan(0);
    const broken = numbers.filter((n) => !Number.isFinite(n));
    expect(broken, `${region}/${projection} emitted ${broken.length} non-finite coordinates`).toEqual(
      [],
    );
  });

  /**
   * Framing exists to put the region on the canvas. A projection that cannot
   * represent the region — Mercator at the poles is the classic — fails by
   * sending the geometry somewhere off in the millions, not by throwing.
   */
  it.each(combinations)("keeps %s in %s on the canvas", async (region, projection) => {
    const map = await neatline({ ...base, region, projection });
    const xs: number[] = [];
    const ys: number[] = [];
    for (const d of countryPaths(map.svg)) {
      const numbers = [...d.matchAll(/-?\d*\.?\d+(?:e-?\d+)?/gi)].map((m) => Number(m[0]));
      for (let i = 0; i + 1 < numbers.length; i += 2) {
        xs.push(numbers[i] as number);
        ys.push(numbers[i + 1] as number);
      }
    }
    const onCanvas = xs.filter(
      (x, i) => x >= 0 && x <= SIZE[0] && (ys[i] as number) >= 0 && (ys[i] as number) <= SIZE[1],
    );
    expect(
      onCanvas.length / xs.length,
      `${region}/${projection} put most of the land off-canvas`,
    ).toBeGreaterThan(0.5);
  });
});

describe("every region in every preset", () => {
  const themed = REGION_PRESET_NAMES.flatMap((region) =>
    THEME_NAMES.map((theme) => [region, theme] as const),
  );

  /**
   * `render()` flattens the stylesheet onto the nodes. A token the theme never
   * defined survives that pass as the literal text `var(--thing)` sitting in a
   * presentation attribute, which every renderer ignores — so the shape is
   * drawn in the default paint and the theme silently did nothing.
   */
  it.each(themed)("resolves every token for %s in %s", async (region, theme) => {
    const map = await neatline({ ...base, region, theme });
    const flattened = await map.render();
    const withoutStylesheet = flattened.replace(/<style>[\s\S]*?<\/style>/g, "");
    const unresolved = [...withoutStylesheet.matchAll(/var\(--[a-z-]+\)/g)].map((m) => m[0]);
    expect([...new Set(unresolved)], `${region}/${theme}`).toEqual([]);
  });
});

describe("determinism", () => {
  it.each(REGION_PRESET_NAMES)("renders %s identically twice", async (region) => {
    const once = await neatline({ ...base, region, theme: "atlas" });
    const twice = await neatline({ ...base, region, theme: "atlas" });
    expect(once.svg).toEqual(twice.svg);
    expect(await once.render()).toEqual(await twice.render());
  });
});

describe("every palette and typeface, on one region", () => {
  it.each(PALETTE_NAMES)("dresses west-europe in %s", async (palette) => {
    const map = await neatline({ ...base, region: "west-europe", theme: "minimal", palette });
    expect(countryPaths(map.svg).length).toBeGreaterThan(0);
    const flattened = (await map.render()).replace(/<style>[\s\S]*?<\/style>/g, "");
    expect(flattened).not.toMatch(/var\(--/);
  });

  it.each(TYPEFACE_NAMES)("sets west-europe in %s", async (typeface) => {
    const map = await neatline({ ...base, region: "west-europe", theme: "minimal", typeface });
    const flattened = (await map.render()).replace(/<style>[\s\S]*?<\/style>/g, "");
    expect(flattened).toMatch(/font-family="/);
    expect(flattened).not.toMatch(/var\(--/);
  });
});
