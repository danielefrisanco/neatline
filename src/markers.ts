import { el, type SvgElement } from "./svg.js";

/**
 * Built-in SVG markers, materialised on demand.
 *
 * The third of the same bargain the filters and patterns make: a stylesheet
 * cannot create SVG elements, so a theme names the marker it wants —
 * `marker-end: url(#mp-arrowhead)` — and the definition is emitted into the
 * reserved `<defs>` block. Nothing is emitted unless something references it.
 *
 * The head carries a class rather than a colour, for the reason the hatch line
 * does: a marker is not reachable through `currentColor` from the element that
 * references it, because that colour resolves where the marker *sits*, in the
 * defs block, and not where it is used. A class is the only honest way to let a
 * theme decide what an arrowhead looks like.
 */

const BUILTINS: Readonly<Record<string, (scope: string) => SvgElement>> = Object.freeze({
  /**
   * A plain triangular head, oriented along the path it terminates.
   *
   * `refX` sits a unit short of the tip so the head overlaps the last of the
   * stroke rather than butting against it — a join that leaves a hairline gap
   * at some zoom levels and none at others is worse than one that overlaps.
   *
   * `markerUnits` is left at its default, which scales the head with the
   * stroke: a heavier arrow gets a proportionally heavier head, which is what
   * anyone thickening `--anno` weight would expect.
   */
  "mp-arrowhead": (scope: string) =>
    el(
      "marker",
      {
        id: `mp-arrowhead-${scope}`,
        viewBox: "0 0 10 10",
        refX: 9,
        refY: 5,
        markerWidth: 5,
        markerHeight: 5,
        orient: "auto",
      },
      [el("path", { class: "mp-arrow-head", d: "M0,0 L10,5 L0,10 Z" })],
    ),
});

export const MARKER_NAMES: readonly string[] = Object.freeze(Object.keys(BUILTINS));

/** The built-in markers a stylesheet actually asks for, in a stable order. */
export function referencedMarkers(css: string, scope: string): SvgElement[] {
  const wanted = new Set<string>();
  // Matched against the css as authored. The scope is appended on the way out,
  // never written by a theme — `url(#mp-arrowhead)` is the name the docs promise.
  for (const match of css.matchAll(/url\(\s*#([A-Za-z_][\w-]*)\s*\)/g)) {
    const id = match[1];
    if (id !== undefined && id in BUILTINS) wanted.add(id);
  }
  return MARKER_NAMES.filter((name) => wanted.has(name)).map((name) =>
    (BUILTINS[name] as (scope: string) => SvgElement)(scope),
  );
}
