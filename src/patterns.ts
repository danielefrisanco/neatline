import { el, type SvgElement } from "./svg.js";

/**
 * Built-in SVG patterns, materialised on demand.
 *
 * The same bargain as the filters: a stylesheet cannot create SVG elements, so
 * a theme names the pattern it wants — `fill: url(#mp-stripe)` — and the
 * definition is emitted into the reserved `<defs>` block. Nothing is emitted
 * unless something references it.
 *
 * The line inside the pattern carries a class rather than a colour, so it is
 * themed like everything else on the map and flattens like everything else
 * too. A pattern is not reachable through `currentColor` from the element that
 * references it — that colour resolves where the pattern *sits*, in the defs
 * block, not where it is used — so a class is the only honest way to let a
 * theme decide what a hatch looks like.
 */

const BUILTINS: Readonly<Record<string, (scope: string) => SvgElement>> = Object.freeze({
  /**
   * Diagonal hatching, for the thing a map has to say about a country that is
   * not a quantity: disputed, claimed, excluded, no data. Drawn as vertical
   * lines in a rotated tile, because a repeating tile of true diagonals leaves
   * hairline seams where its corners meet.
   */
  "mp-stripe": (scope: string) =>
    el(
      "pattern",
      {
        id: `mp-stripe-${scope}`,
        width: 7,
        height: 7,
        patternUnits: "userSpaceOnUse",
        patternTransform: "rotate(45)",
      },
      [el("path", { class: "mp-hatch-line", d: "M0,0 V7" })],
    ),
});

export const PATTERN_NAMES: readonly string[] = Object.freeze(Object.keys(BUILTINS));

/** The built-in patterns a stylesheet actually asks for, in a stable order. */
export function referencedPatterns(css: string, scope: string): SvgElement[] {
  const wanted = new Set<string>();
  // Matched against the css as authored. The scope is appended on the way out,
  // never written by a theme — `url(#mp-relief)` is the name the docs promise.
  for (const match of css.matchAll(/url\(\s*#([A-Za-z_][\w-]*)\s*\)/g)) {
    const id = match[1];
    if (id !== undefined && id in BUILTINS) wanted.add(id);
  }
  return PATTERN_NAMES.filter((name) => wanted.has(name)).map((name) =>
    (BUILTINS[name] as (scope: string) => SvgElement)(scope),
  );
}
