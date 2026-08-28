/**
 * The structure every bundled theme shares.
 *
 * A theme is meant to be colour and weight, not layout logic, and five themes
 * repeating the same forty rules is five places for them to drift. So the rules
 * live here once and read entirely from tokens — a theme supplies values, and
 * anything genuinely structural about it goes in `extra`.
 *
 * That constraint is also what makes palettes worth having: because every
 * width, dash and hue arrives through a custom property, a palette can restyle
 * a map without knowing a single selector.
 *
 * One rule of the lighting model is enforced by the palettes rather than here:
 * a prism's wall is in shadow, so `--prism-side` has to be darker than any
 * band that can sit on top of it. A pale wall under a dark band inverts the
 * light source, and a choropleth prism map turns to mud.
 *
 * The highlighted wall is `--accent-side` and not `brightness()` on the accent
 * for the usual reason: a CSS filter function is not a value SVG 1.1 accepts,
 * so every viewer that ignores stylesheets drew the wall in the same colour as
 * the top and flattened the prism into a silhouette.
 *
 * The same reason rules out `calc()` anywhere here. Flattening substitutes
 * custom properties but does not evaluate arithmetic, so a settlement name set
 * in `calc(var(--label-size) * 0.8)` would export as that string in a
 * `font-size` attribute, which is not a length. Hence `--place-label-size` is
 * a token of its own rather than a fraction of another.
 */

const BANDS = [1, 2, 3, 4, 5];
const FILLS = [1, 2, 3, 4, 5, 6];

const rules = (build: (n: number) => string, over: readonly number[]): string =>
  over.map(build).join("\n");

/**
 * Order matters more than it looks.
 *
 * `.mp-country.is-highlighted` and `.mp-country[data-bin="3"]` have identical
 * specificity, so whichever is written last wins. Highlight is the caller
 * naming a country outright, and a band is a number it happened to fall in —
 * so highlight is written last and takes it. Before this was settled,
 * highlighting a country on a choropleth silently returned its band colour.
 */
export const STRUCTURE = `
.mp .mp-bg { fill: var(--bg); }

.mp .mp-neighbour { fill: var(--neighbour); stroke: none; }

.mp .mp-country {
  fill: var(--land);
  stroke: var(--land-edge);
  stroke-width: var(--land-edge-width);
  stroke-linejoin: round;
}

${rules((n) => `.mp .mp-country[data-bin="${n}"] { fill: var(--bin-${n}); }`, BANDS)}
${rules((n) => `.mp .mp-country[data-fill="${n}"] { fill: var(--fill-${n}); }`, FILLS)}

.mp .mp-country.is-highlighted {
  fill: var(--accent);
  stroke: var(--accent-edge);
}

.mp .mp-water[data-kind="lake"] { fill: var(--water); stroke: none; }
.mp .mp-water[data-kind="river"] {
  fill: none;
  stroke: var(--water);
  stroke-width: var(--water-width);
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mp .mp-border {
  fill: none;
  stroke: var(--border);
  stroke-width: var(--border-width);
  stroke-dasharray: var(--border-dash);
  stroke-linejoin: round;
  stroke-linecap: round;
}

.mp .mp-road { fill: none; stroke: var(--road); }
.mp .mp-place { fill: var(--place); stroke: none; }

.mp .mp-prism-top {
  fill: var(--land);
  stroke: var(--land-edge);
  stroke-width: var(--land-edge-width);
}
.mp .mp-prism-side { fill: var(--prism-side); stroke: none; }
.mp .mp-prism-edge {
  fill: none;
  stroke: var(--border);
  stroke-width: var(--border-width);
  stroke-dasharray: var(--border-dash);
}
${rules((n) => `.mp .mp-prism[data-bin="${n}"] .mp-prism-top { fill: var(--bin-${n}); }`, BANDS)}
${rules((n) => `.mp .mp-prism[data-fill="${n}"] .mp-prism-top { fill: var(--fill-${n}); }`, FILLS)}
.mp .mp-prism.is-highlighted .mp-prism-top { fill: var(--accent); }
.mp .mp-prism.is-highlighted .mp-prism-side { fill: var(--accent-side); }

.mp .mp-hatch { fill: url(#mp-stripe); stroke: none; }
.mp .mp-hatch-line { fill: none; stroke: var(--stripe); stroke-width: var(--stripe-width); }

.mp .mp-label {
  fill: var(--ink);
  font-family: var(--font);
  font-size: var(--label-size);
  font-weight: var(--label-weight);
  letter-spacing: var(--label-track);
  stroke: var(--label-halo);
  stroke-width: var(--label-halo-width);
  stroke-linejoin: round;
  paint-order: stroke;
}

.mp .mp-label[data-kind="place"] {
  fill: var(--ink-muted);
  font-size: var(--place-label-size);
}

.mp .mp-label.is-highlighted { font-weight: 700; }

.mp .mp-label[data-fit="0"] { display: none; }
`.trim();

export interface ThemeParts {
  /** Declarations for the light `.mp` block. */
  readonly tokens: string;
  /**
   * Declarations for the dark block. Only tokens belong here: a rule whose
   * only definition sits inside the media query never applies to a reader
   * whose system is light, and the map renders half-styled.
   */
  readonly dark: string;
  /** Rules this theme needs that the shared structure cannot express. */
  readonly extra?: string;
}

/**
 * Assemble one theme.
 *
 * The dark block is written last on purpose. A palette is applied after the
 * whole theme, so it lands later still and wins — which is the behaviour worth
 * having: asking for `palette: "sand"` gets sand, whatever the reader's system
 * is set to. Automatic dark is the default, never an override.
 */
export function compose(parts: ThemeParts): string {
  const sections = [
    `.mp {\n${parts.tokens.trim()}\n}`,
    STRUCTURE,
    parts.extra?.trim(),
    `@media (prefers-color-scheme: dark) {\n.mp {\n${parts.dark.trim()}\n}\n}`,
  ];
  return sections.filter((section) => section !== undefined && section !== "").join("\n\n");
}
