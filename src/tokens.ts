/**
 * The token vocabulary.
 *
 * Named by role, never by appearance: `--ink`, never `--dark-gray`. A token
 * called `--dark-gray` is a lie the moment someone writes a dark theme, and
 * renaming it later breaks every theme in the wild.
 *
 * Reserved tokens are part of the vocabulary from v1 and simply unused. A theme
 * can set them today and they will start doing something when their layer
 * arrives, which is cheaper than asking every theme to be revised then.
 */

export interface TokenSpec {
  readonly name: string;
  readonly status: "live" | "reserved";
  readonly controls: string;
}

export const TOKENS: readonly TokenSpec[] = Object.freeze([
  { name: "--bg", status: "live", controls: "Canvas ground — the ocean, or transparent" },
  { name: "--land", status: "live", controls: "Country fill" },
  { name: "--land-edge", status: "live", controls: "Country outline, usually a hairline" },
  { name: "--land-edge-width", status: "live", controls: "Country outline width, in user units" },
  { name: "--border", status: "live", controls: "Shared boundary stroke" },
  { name: "--border-width", status: "live", controls: "Boundary stroke width, in user units" },
  { name: "--border-dash", status: "live", controls: "Boundary dash pattern, or `none`" },
  { name: "--accent", status: "live", controls: "Fill for anything highlighted" },
  { name: "--accent-edge", status: "live", controls: "Outline for anything highlighted" },
  { name: "--bin-1", status: "live", controls: "Lowest band of a classified value" },
  { name: "--bin-2", status: "live", controls: "Second band" },
  { name: "--bin-3", status: "live", controls: "Third band" },
  { name: "--bin-4", status: "live", controls: "Fourth band" },
  { name: "--bin-5", status: "live", controls: "Highest band" },
  // Political fill needs no data: it colours a country so that it differs from
  // each of its neighbours. Four are provably enough for any map on a plane;
  // six leaves room for the exclaves and shared-arc quirks that make a real
  // country graph not quite planar.
  { name: "--fill-1", status: "live", controls: "First political-fill colour" },
  { name: "--fill-2", status: "live", controls: "Second political-fill colour" },
  { name: "--fill-3", status: "live", controls: "Third political-fill colour" },
  { name: "--fill-4", status: "live", controls: "Fourth political-fill colour" },
  { name: "--fill-5", status: "live", controls: "Fifth political-fill colour" },
  { name: "--fill-6", status: "live", controls: "Sixth political-fill colour" },
  { name: "--prism-side", status: "live", controls: "The extruded wall of a raised country" },
  { name: "--accent-side", status: "live", controls: "The wall of a raised country that is highlighted" },
  { name: "--place", status: "live", controls: "Settlement dots" },
  { name: "--ink", status: "live", controls: "Primary text" },
  { name: "--ink-muted", status: "live", controls: "Secondary text" },
  { name: "--font", status: "live", controls: "Type stack for all text" },
  { name: "--label-size", status: "live", controls: "Base label size, in user units" },
  { name: "--stripe", status: "live", controls: "Diagonal hatching over a marked country" },
  { name: "--stripe-width", status: "live", controls: "Hatch line width, in user units" },
  { name: "--water", status: "live", controls: "Lakes and rivers" },
  { name: "--water-width", status: "live", controls: "River stroke width, in user units" },
  { name: "--road", status: "reserved", controls: "Route strokes — Phase 4 data" },
  // The graticule and land-cover vocabulary, reserved alongside their layers.
  // A theme can set them today and they start working when the layer fills.
  { name: "--graticule", status: "reserved", controls: "Parallels and meridians" },
  { name: "--graticule-width", status: "reserved", controls: "Grid line width" },
  { name: "--equator", status: "reserved", controls: "The equator and the tropics, drawn apart from the grid" },
  { name: "--desert", status: "reserved", controls: "Arid land cover" },
  { name: "--forest", status: "reserved", controls: "Wooded land cover" },
  { name: "--mountain", status: "reserved", controls: "Upland and mountain cover" },
  { name: "--glacier", status: "reserved", controls: "Ice and permanent snow" },
  { name: "--sea-ink", status: "reserved", controls: "Names of seas, gulfs and straits" },
  { name: "--neighbour", status: "live", controls: "Context countries drawn behind the region" },
  { name: "--anno", status: "reserved", controls: "Pins, arrows, callouts — v1.1" },
  { name: "--anno-ink", status: "reserved", controls: "Text on an annotation — v1.1" },
  { name: "--furniture-ink", status: "reserved", controls: "Credit lines and legends — v2" },
]);

export const TOKEN_NAMES: readonly string[] = Object.freeze(TOKENS.map((t) => t.name));

export function isTokenName(value: string): boolean {
  return TOKEN_NAMES.includes(value);
}
