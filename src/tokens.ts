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
  { name: "--border", status: "live", controls: "Shared boundary stroke" },
  { name: "--border-width", status: "live", controls: "Boundary stroke width, in user units" },
  { name: "--accent", status: "live", controls: "Fill for anything highlighted" },
  { name: "--accent-edge", status: "live", controls: "Outline for anything highlighted" },
  { name: "--prism-side", status: "live", controls: "The extruded wall of a raised country" },
  { name: "--place", status: "live", controls: "Settlement dots" },
  { name: "--ink", status: "live", controls: "Primary text" },
  { name: "--ink-muted", status: "live", controls: "Secondary text" },
  { name: "--font", status: "live", controls: "Type stack for all text" },
  { name: "--label-size", status: "live", controls: "Base label size, in user units" },
  { name: "--water", status: "live", controls: "Lakes and rivers" },
  { name: "--road", status: "reserved", controls: "Route strokes — Phase 4 data" },
  { name: "--neighbour", status: "live", controls: "Context countries drawn behind the region" },
  { name: "--anno", status: "reserved", controls: "Pins, arrows, callouts — v1.1" },
  { name: "--anno-ink", status: "reserved", controls: "Text on an annotation — v1.1" },
  { name: "--furniture-ink", status: "reserved", controls: "Credit lines and legends — v2" },
]);

export const TOKEN_NAMES: readonly string[] = Object.freeze(TOKENS.map((t) => t.name));

export function isTokenName(value: string): boolean {
  return TOKEN_NAMES.includes(value);
}
