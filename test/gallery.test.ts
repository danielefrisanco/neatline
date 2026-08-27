import { describe, expect, it } from "vitest";
import { mapper, type MapperOptions } from "../src/index.js";

/**
 * A gallery, not a checksum.
 *
 * Phase 2 shipped a map that rendered as a solid black square while every
 * string assertion passed, because nothing in the suite ever looked at the
 * result. These snapshots are committed as real `.svg` files so a diff is
 * something a person can open, and so the spread of themes, palettes,
 * projections and canvas shapes is visible at a glance rather than inferred.
 */
const GALLERY: ReadonlyArray<readonly [string, MapperOptions]> = [
  [
    "west-europe-minimal",
    { region: "west-europe", projection: "conic-conformal", theme: "minimal" },
  ],
  [
    "west-europe-atlas",
    { region: "west-europe", projection: "conic-conformal", theme: "atlas" },
  ],
  [
    "west-europe-dusk",
    { region: "west-europe", projection: "conic-conformal", theme: "minimal", palette: "dusk" },
  ],
  [
    "west-europe-highlight",
    {
      region: "west-europe",
      projection: "conic-conformal",
      theme: "minimal",
      palette: "sand",
      highlight: ["FR", "BE", "NL", "LU"],
      title: "Benelux and France",
    },
  ],
  [
    "world-equal-earth",
    { region: "world", projection: "equal-earth", theme: "atlas", size: [1200, 620] },
  ],
  [
    "africa-wide",
    { region: "africa", projection: "equal-earth", theme: "minimal", palette: "sand", size: [1200, 700] },
  ],
  [
    "south-america-orthographic",
    { region: "south-america", projection: "orthographic", theme: "atlas", size: [800, 800] },
  ],
  [
    "italy-brand-tokens",
    {
      region: ["IT"],
      projection: "mercator",
      theme: "minimal",
      tokens: { land: "#0B5D3B", "land-edge": "#F4F1E8", bg: "#F4F1E8" },
      size: [600, 800],
      title: "Where we operate",
    },
  ],
];

describe("gallery", () => {
  it.each(GALLERY)("renders %s", async (name, options) => {
    const map = await mapper({ detail: "110m", ...options });
    await expect(map.toString()).toMatchFileSnapshot(`./__snapshots__/gallery/${name}.svg`);
  });

  it("renders west-europe-inlined for design tools", async () => {
    const map = await mapper({
      region: "west-europe",
      detail: "110m",
      projection: "conic-conformal",
      theme: "atlas",
    });
    const target = `${import.meta.dirname}/__snapshots__/gallery/west-europe-inlined.svg`;
    await map.toFile(target, { inlineStyles: true });
    const { readFile } = await import("node:fs/promises");
    expect(await readFile(target, "utf8")).toContain('fill="#F2EAD8"');
  });
});
