import { describe, expect, it } from "vitest";
import { neatline, type MapOptions } from "../src/index.js";

/**
 * A gallery, not a checksum.
 *
 * Phase 2 shipped a map that rendered as a solid black square while every
 * string assertion passed, because nothing in the suite ever looked at the
 * result. These snapshots are committed as real `.svg` files so a diff is
 * something a person can open, and so the spread of themes, palettes,
 * projections and canvas shapes is visible at a glance rather than inferred.
 */
const GALLERY: ReadonlyArray<readonly [string, MapOptions]> = [
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

  // Ten maps outside Western Europe. Twelve of the entries above are the same
  // thirteen countries, which proves the themes differ from one another and
  // very little else: framing, label thinning and political fill all behave
  // differently on a region that is mostly water, or mostly desert, or sits at
  // a latitude where the parallels crowd. Each of these is a region the presets
  // do not cover, and each carries an option the gallery was exercising in only
  // one place or none.

  // Neighbours somewhere the context is bigger than the subject. In Western
  // Europe the surrounding countries are peers; here China sits behind the
  // whole northern edge, so this is the map that shows whether context stays
  // context.
  [
    "south-asia-neighbours",
    {
      region: ["IN", "PK", "NP", "BD", "LK", "BT"],
      projection: "conic-conformal",
      theme: "atlas",
      neighbours: true,
      size: [900, 900],
      title: "South Asia, with its neighbours",
    },
  ],
  // A region that is mostly sea. The camera is fitted to land, so an
  // archipelago is the case where it can drift out into open water and frame
  // nothing at all. Atlas rather than moss: moss grounds its sea in stone
  // grey-green on purpose, which is right for a walking map of a continent and
  // washes out where three quarters of the frame is water.
  [
    "southeast-asia-cities",
    {
      region: ["ID", "MY", "TH", "VN", "PH", "KH", "LA", "MM", "BN", "TL"],
      projection: "equal-earth",
      theme: "atlas",
      size: [1100, 700],
      placeRank: 2,
      title: "Southeast Asia",
    },
  ],
  // The gallery had no choropleth in it at all: every data map above encodes
  // its quantity as height. 0.7 shipped a choropleth that exported as one flat
  // colour with the whole suite green, which is precisely the failure a file
  // someone opens is here to catch.
  //
  // Somaliland is XS, one of the five features Natural Earth ships with no ISO
  // code at all. Leaving it out does not leave it blank — it leaves a hole in
  // the Horn, because Somalia's polygon stops at a border the map is not
  // drawing. It is in the region and deliberately not in `values`: hatched
  // instead, which is what hatching is for — the thing that is not a quantity.
  //
  // Moss, and not by preference: on sand the lightest bin is #F1E8D5 against a
  // #F6F1E7 ground, and `--land-edge` is the ground colour exactly, so a
  // low-value country on a coast has neither a fill nor an outline that
  // separates it from the sea. Eritrea simply disappeared. Slate is worse.
  // Moss gives the lightest bin a ground to sit on and draws a real coastline.
  [
    "east-africa-choropleth",
    {
      region: ["ET", "KE", "TZ", "UG", "RW", "BI", "SS", "SO", "XS", "DJ", "ER"],
      projection: "equal-earth",
      theme: "minimal",
      palette: "moss",
      size: [900, 900],
      values: {
        ET: 126, KE: 55, TZ: 65, UG: 47, RW: 14,
        BI: 13, SS: 11, SO: 18, DJ: 1.1, ER: 3.7,
      },
      bins: 5,
      stripe: ["XS"],
      title: "East Africa by population, in millions",
    },
  ],
  // Political fill has to keep neighbours distinct without a palette built for
  // the region. Sixteen countries in a ring is a harder graph than Europe's.
  [
    "middle-east-political",
    {
      region: ["TR", "SY", "LB", "IL", "PS", "JO", "IQ", "IR", "SA", "YE", "OM", "AE", "QA", "KW", "EG"],
      projection: "conic-conformal",
      theme: "atlas",
      fill: "political",
      size: [1000, 800],
      title: "The Middle East",
    },
  ],
  // High latitude, where the standard parallels have to be chosen from the
  // region or Norway stretches past recognition.
  [
    "nordics-dusk",
    {
      region: ["SE", "NO", "FI", "DK", "IS"],
      projection: "conic-conformal",
      theme: "minimal",
      palette: "dusk",
      size: [1100, 700],
      title: "The Nordics",
    },
  ],
  // Three countries, two of them narrow and one of them islands — the smallest
  // region in the gallery that is still more than one country.
  [
    "japan-korea-highlight",
    {
      region: ["JP", "KR", "KP"],
      projection: "conic-conformal",
      theme: "noir",
      highlight: ["JP"],
      size: [800, 900],
      title: "Japan",
    },
  ],
  // Extrusion away from the region it was built on, and over a long thin
  // country where the side walls are most of what you see.
  [
    "southern-cone-prism",
    {
      region: ["AR", "CL", "UY", "PY", "BO"],
      projection: "conic-conformal",
      theme: "atlas",
      size: [800, 1000],
      extrude: { values: { AR: 646, CL: 335, UY: 77, PY: 43, BO: 45 }, height: 120 },
      title: "The Southern Cone by GDP",
    },
  ],
  // Small islands and nothing else, none large enough to anchor a camera on
  // its own. Trinidad belongs to the Caribbean and is deliberately not here:
  // it sits seven degrees south of the rest, so including it empties half the
  // canvas and pushes its own label off the edge. A region is what frames
  // together, not what a continent list says.
  //
  // 50m, and not for the detail: at 110m the Bahamas simplify down to a few
  // blobs that New Providence is not one of, so Nassau — a real coordinate
  // from a separate dataset — is drawn in open sea. Small islands are where a
  // simplified coastline and an exact point stop agreeing with each other.
  [
    "caribbean-islands",
    {
      region: ["CU", "HT", "DO", "JM", "BS", "PR"],
      detail: "50m",
      projection: "mercator",
      theme: "minimal",
      palette: "moss",
      size: [1100, 600],
      placeRank: 1,
      title: "The Caribbean",
    },
  ],
  // The `names` override doing what it shipped for: the same map in the
  // language the region speaks, without the library carrying a name table.
  [
    "south-america-espanol",
    {
      region: "south-america",
      projection: "equal-earth",
      theme: "minimal",
      palette: "sand",
      size: [800, 1000],
      names: {
        BR: "Brasil", PE: "Perú", BO: "Bolivia", GF: "Guayana Francesa",
        SR: "Surinam", FK: "Islas Malvinas",
      },
      title: "América del Sur",
    },
  ],
  // Landlocked, and the one map here that Phase 8d is aimed at: with no
  // coastline in frame, `--bg` is not the sea — it is showing through every
  // gap between countries that the region does not draw. This is the before
  // shot for the ocean layer.
  [
    "central-asia-inland",
    {
      region: ["KZ", "UZ", "TM", "TJ", "KG", "AF", "MN"],
      projection: "conic-conformal",
      theme: "contrast",
      size: [1100, 700],
      title: "Central Asia",
    },
  ],
];

describe("gallery", () => {
  it.each(GALLERY)("renders %s", async (name, options) => {
    const map = await neatline({ detail: "110m", ...options });
    // `render()`, not `toString()`: these files exist to be opened, and many
    // viewers ignore <style>. The stylesheet still ships inside them.
    await expect(await map.render()).toMatchFileSnapshot(
      `./__snapshots__/gallery/${name}.svg`,
    );
  });

  // Every file in the gallery has to survive a reader that ignores stylesheets,
  // or the gallery cannot do the one job it exists for.
  it.each(GALLERY)("gives %s paint a viewer can see without css", async (_name, options) => {
    const map = await neatline({ detail: "110m", ...options });
    const artifact = await map.render();
    const withoutStyle = artifact.replace(/<style>[\s\S]*?<\/style>/, "");
    // An extruded map draws prisms rather than flat countries, so either
    // carries the paint — what matters is that something visible does.
    expect(withoutStyle).toMatch(
      /<path class="mp-(country|prism-top)"[^>]*fill="#[0-9A-Fa-f]{3,6}"/,
    );
  });

  it("keeps the small stylesheet-only form available", async () => {
    const map = await neatline({ region: ["FR"], detail: "110m", theme: "atlas" });
    const small = map.toString();
    const portable = await map.render();
    expect(small).not.toContain('fill="#F2EAD8"');
    expect(portable).toContain('fill="#F2EAD8"');
    expect(small.length).toBeLessThan(portable.length);
  });
});
