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
    "west-europe-cities",
    {
      region: "west-europe",
      detail: "50m",
      projection: "conic-conformal",
      theme: "atlas",
      title: "Western Europe: major cities and rivers",
    },
  ],
  [
    "france-rivers",
    {
      region: ["FR"],
      detail: "50m",
      projection: "conic-conformal",
      theme: "minimal",
      palette: "sand",
      placeRank: 3,
      size: [800, 800],
    },
  ],
  [
    "europe-no-water",
    {
      region: "europe",
      projection: "conic-conformal",
      theme: "minimal",
      layers: { hydro: false, places: false },
      size: [900, 900],
    },
  ],
  // The raised-landmass look editorial maps use. No data, no markup, no defs —
  // `filter: drop-shadow()` is a CSS declaration, so a theme can simply say it.
  [
    "west-europe-relief",
    {
      region: "west-europe",
      projection: "conic-conformal",
      theme: `.mp { --sea: #9FBACB; --land: #F3ECDC; --edge: #C0B49A; --ink: #57503F; }
.mp .mp-bg { fill: var(--sea); }
.mp .mp-land { filter: url(#mp-relief); }
.mp .mp-country { fill: var(--land); stroke: var(--edge); stroke-width: 0.7; }
.mp .mp-border { fill: none; stroke: var(--ink); stroke-width: 0.9; }
.mp .mp-water[data-kind="lake"] { fill: var(--sea); }
.mp .mp-place { fill: var(--ink); }`,
      title: "Western Europe in relief",
    },
  ],
  // Context, not subject: the surrounding countries fade in beneath the region
  // and are excluded from the camera, so the framing is identical without them.
  [
    "west-europe-neighbours",
    {
      region: "west-europe",
      projection: "conic-conformal",
      theme: "atlas",
      neighbours: true,
      title: "Western Europe, with its neighbours",
    },
  ],
  // Height as quantity — the map most people mean by "3D". Values are raw
  // (GDP in $bn here) and scaled against the largest.
  [
    "europe-gdp-prism",
    {
      region: "west-europe",
      projection: "conic-conformal",
      theme: "atlas",
      size: [1000, 900],
      extrude: {
        values: {
          DE: 4460, GB: 3340, FR: 3050, IT: 2250, ES: 1620, NL: 1120,
          CH: 885, IE: 545, AT: 515, BE: 630, DK: 405, PT: 290, LU: 85,
        },
        height: 150,
      },
      title: "Western Europe by GDP",
    },
  ],
  // One country lifted off the rest, which is the other thing extrusion is for.
  [
    "italy-raised",
    {
      region: "west-europe",
      projection: "conic-conformal",
      theme: "atlas",
      size: [900, 900],
      extrude: { values: { IT: 1 }, height: 60 },
      highlight: ["IT"],
      title: "Italy, raised",
    },
  ],
  // The three presets Phase 5 added. Each is shown on the same region and
  // projection as `west-europe-minimal`, so what differs between the files is
  // only ever the theme.
  [
    "west-europe-noir",
    { region: "west-europe", projection: "conic-conformal", theme: "noir" },
  ],
  [
    "west-europe-blueprint",
    { region: "west-europe", projection: "conic-conformal", theme: "blueprint" },
  ],
  [
    "west-europe-contrast",
    { region: "west-europe", projection: "conic-conformal", theme: "contrast" },
  ],
  // Political fill: no data, no legend — colour only so that no country
  // matches the one beside it.
  [
    "europe-political",
    {
      region: "europe",
      projection: "conic-conformal",
      theme: "atlas",
      fill: "political",
      size: [900, 900],
      title: "Europe",
    },
  ],
  // The same idea where the theme has no six hues to give it: blueprint fills
  // with steps of its own blue, which still keeps every neighbour distinct.
  [
    "africa-political-blueprint",
    {
      region: "africa",
      projection: "equal-earth",
      theme: "blueprint",
      fill: "political",
      size: [1000, 900],
      title: "Africa",
    },
  ],
  // Every preset has to survive a highlight — that is the shot people judge.
  [
    "west-europe-noir-highlight",
    {
      region: "west-europe",
      projection: "conic-conformal",
      theme: "noir",
      highlight: ["DE"],
      title: "Germany",
    },
  ],
  [
    "world-contrast",
    {
      region: "world",
      projection: "equal-earth",
      theme: "contrast",
      size: [1200, 620],
      layers: { places: false },
    },
  ],
  // Asia, for a region whose shape and scale test the framing differently from
  // Europe: an equal-area projection over a span wide enough that a conformal
  // one would be indefensible.
  [
    "asia-dusk",
    {
      region: "asia",
      projection: "equal-earth",
      theme: "minimal",
      palette: "dusk",
      size: [1200, 800],
      title: "Asia",
    },
  ],
  [
    "asia-political",
    {
      region: "asia",
      projection: "equal-earth",
      theme: "atlas",
      fill: "political",
      size: [1200, 800],
      title: "Asia",
    },
  ],
  // Two encodings composing rather than competing: members filled with the
  // accent, candidates hatched over their own political colour.
  [
    "europe-union",
    {
      region: "europe",
      projection: "conic-conformal",
      theme: "atlas",
      size: [900, 900],
      highlight: [
        "AT", "BE", "BG", "HR", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
        "IE", "IT", "LV", "LT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
      ],
      stripe: ["AL", "BA", "MD", "ME", "MK", "RS", "UA"],
      title: "The European Union and its candidate countries",
    },
  ],
  // The two continents the gallery was missing, so every one is now rendered
  // at least once. `oceania` is the important one: it straddles the
  // antimeridian, which is where centring a projection on its region either
  // works or produces a map of the wrong half of the planet.
  [
    "north-america-albers",
    {
      region: "north-america",
      projection: "albers",
      theme: "minimal",
      palette: "sand",
      size: [1100, 900],
      title: "North America",
    },
  ],
  [
    "oceania-noir",
    {
      region: "oceania",
      projection: "equal-earth",
      theme: "noir",
      size: [1100, 800],
      title: "Oceania",
    },
  ],
  // A continent that is one country, at the one place a cylindrical projection
  // cannot describe: the pole is a line there, not a point, so Antarctica comes
  // out as a smear across the bottom of the map. Orthographic turns the globe
  // to look straight down at it instead.
  [
    "antarctica-orthographic",
    {
      region: "antarctica",
      projection: "orthographic",
      theme: "blueprint",
      size: [900, 900],
      layers: { hydro: false },
      title: "Antarctica",
    },
  ],
  [
    "europe-named",
    {
      region: "europe",
      theme: "minimal",
      size: [1000, 900],
      title: "Europe, named",
    },
  ],
  [
    "west-europe-named-cities",
    {
      region: "west-europe",
      projection: "conic-conformal",
      theme: "atlas",
      size: [1000, 800],
      placeRank: 2,
      labelRank: 2,
      title: "Western Europe and its cities",
    },
  ],
  [
    "asia-named-blueprint",
    { region: "asia", theme: "blueprint", size: [1100, 900], title: "Asia, named" },
  ],
  [
    "west-europe-unnamed",
    {
      region: "west-europe",
      projection: "conic-conformal",
      theme: "minimal",
      layers: { labels: false },
      title: "Western Europe, unlabelled",
    },
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
    // `render()`, not `toString()`: these files exist to be opened, and many
    // viewers ignore <style>. The stylesheet still ships inside them.
    await expect(await map.render()).toMatchFileSnapshot(
      `./__snapshots__/gallery/${name}.svg`,
    );
  });

  // Every file in the gallery has to survive a reader that ignores stylesheets,
  // or the gallery cannot do the one job it exists for.
  it.each(GALLERY)("gives %s paint a viewer can see without css", async (_name, options) => {
    const map = await mapper({ detail: "110m", ...options });
    const artifact = await map.render();
    const withoutStyle = artifact.replace(/<style>[\s\S]*?<\/style>/, "");
    // An extruded map draws prisms rather than flat countries, so either
    // carries the paint — what matters is that something visible does.
    expect(withoutStyle).toMatch(
      /<path class="mp-(country|prism-top)"[^>]*fill="#[0-9A-Fa-f]{3,6}"/,
    );
  });

  it("keeps the small stylesheet-only form available", async () => {
    const map = await mapper({ region: ["FR"], detail: "110m", theme: "atlas" });
    const small = map.toString();
    const portable = await map.render();
    expect(small).not.toContain('fill="#F2EAD8"');
    expect(portable).toContain('fill="#F2EAD8"');
    expect(small.length).toBeLessThan(portable.length);
  });
});
