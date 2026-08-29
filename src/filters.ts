import { el, type SvgElement } from "./svg.js";

/**
 * Built-in SVG filters, materialised on demand.
 *
 * A theme is a stylesheet, and a stylesheet cannot create SVG elements — so
 * effects that need markup were out of a theme's reach. These close that gap:
 * a theme asks for one by name, `filter: url(#mp-relief)`, and the definition
 * is emitted into the reserved `<defs>` block. Nothing is emitted unless it is
 * referenced.
 *
 * They are lighting filters rather than CSS shadows because a shadow only
 * separates a shape from its ground. Relief needs a lit side and an unlit one,
 * and `feSpecularLighting` over a blurred alpha channel is how SVG expresses
 * that — a bump map derived from the shape itself.
 */
export const FILTER_PREFIX = "mp-";

function bevel(id: string, options: {
  readonly azimuth: number;
  readonly elevation: number;
  readonly surface: number;
  readonly blur: number;
  readonly shadow: number;
}): SvgElement {
  return el(
    "filter",
    { id, x: "-30%", y: "-30%", width: "170%", height: "170%" },
    [
      // The shape's own alpha, blurred, is the height map: edges fall away and
      // the interior stays high, which is what gives the lit face its curve.
      el("feGaussianBlur", { in: "SourceAlpha", stdDeviation: options.blur, result: "height" }),
      el(
        "feDiffuseLighting",
        {
          in: "height",
          surfaceScale: options.surface,
          // Normalised so flat ground comes back at full brightness. A surface
          // facing straight up returns sin(elevation), so at 50° the whole
          // landmass would otherwise be multiplied by 0.77 and the theme's
          // colour would come out muddy. Dividing it back out leaves the
          // interior untouched and lets only the slopes darken and catch light.
          diffuseConstant: (1 / Math.sin((options.elevation * Math.PI) / 180)).toFixed(3),
          "lighting-color": "#ffffff",
          result: "light",
        },
        [el("feDistantLight", { azimuth: options.azimuth, elevation: options.elevation })],
      ),
      // Multiplied, not added. Adding a specular highlight bleaches the land to
      // white and throws the theme's colour away; multiplying a diffuse light
      // keeps the fill and only darkens the faces turned away from the sun.
      el("feComposite", {
        in: "SourceGraphic",
        in2: "light",
        operator: "arithmetic",
        k1: "1",
        k2: "0",
        k3: "0",
        k4: "0",
        result: "shaded",
      }),
      el("feComposite", { in: "shaded", in2: "SourceAlpha", operator: "in", result: "clipped" }),
      el("feDropShadow", {
        in: "clipped",
        dx: 2,
        dy: 3,
        stdDeviation: 2.5,
        "flood-color": "#000000",
        "flood-opacity": String(options.shadow),
      }),
    ],
  );
}

const BUILTINS: Readonly<Record<string, (scope: string) => SvgElement>> = Object.freeze({
  /** Land lifted off the sea: lit from the north-west, with a soft shadow. */
  "mp-relief": (scope: string) =>
    bevel(`mp-relief-${scope}`, { azimuth: 235, elevation: 45, surface: 3, blur: 3.5, shadow: 0.38 }),
  /** The same, harder and shallower — reads at small sizes. */
  "mp-relief-soft": (scope: string) =>
    bevel(`mp-relief-soft-${scope}`, { azimuth: 235, elevation: 66, surface: 1.4, blur: 2, shadow: 0.2 }),
});

export const FILTER_NAMES: readonly string[] = Object.freeze(Object.keys(BUILTINS));

/** The built-in filters a stylesheet actually asks for, in a stable order. */
export function referencedFilters(css: string, scope: string): SvgElement[] {
  const wanted = new Set<string>();
  // Matched against the css as authored. The scope is appended on the way out,
  // never written by a theme — `url(#mp-relief)` is the name the docs promise.
  for (const match of css.matchAll(/url\(\s*#([A-Za-z_][\w-]*)\s*\)/g)) {
    const id = match[1];
    if (id !== undefined && id in BUILTINS) wanted.add(id);
  }
  return FILTER_NAMES.filter((name) => wanted.has(name)).map((name) =>
    (BUILTINS[name] as (scope: string) => SvgElement)(scope),
  );
}
