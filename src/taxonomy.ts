/**
 * The class taxonomy — the real public API.
 *
 * A theme is a stylesheet, so every selector anyone ever writes is a promise
 * this project makes. These names are versioned like a function signature and
 * change only on a major. The order of `LAYERS` is the paint order, and it is
 * part of that promise: a layer inserted between two existing ones would
 * silently restack every theme in the wild, so all eight slots are emitted from
 * v1 onward, empty where the feature does not exist yet.
 *
 * Layers are plural (`.mp-land`), features are singular (`.mp-country`).
 *
 * Every layer but the last is geographic: its contents move when the projection
 * or the region changes. `furniture` is the exception — a credit line or a
 * watermark is placed on the *canvas*, in fixed user units, and must not shift
 * when the camera does. That difference is why it is a layer of its own rather
 * than a kind of annotation.
 */

export type LayerName =
  | "neighbours"
  | "land"
  | "hydro"
  | "borders"
  | "roads"
  | "places"
  | "labels"
  | "annotations"
  | "furniture";

export interface LayerSpec {
  readonly name: LayerName;
  /** Class on the group element. Always accompanied by `mp-layer`. */
  readonly className: string;
  /** Class on the elements inside it. */
  readonly feature: string;
  /** `live` layers can carry content in v1; `reserved` ones are always empty. */
  readonly status: "live" | "reserved";
  readonly carries: string;
}

/**
 * Paint order, bottom to top.
 *
 * `neighbours` sits directly above the background and below the land, because
 * context has to be drawn *under* its subject — the region must overlap it, not
 * the reverse. The plan originally placed it above the water; that was wrong,
 * since lakes and rivers are drawn on top of the land they sit in.
 */
export const LAYERS: readonly LayerSpec[] = Object.freeze([
  {
    name: "neighbours",
    className: "mp-neighbours",
    feature: "mp-neighbour",
    status: "reserved",
    carries: "Surrounding countries drawn as context behind the region",
  },
  {
    name: "land",
    className: "mp-land",
    feature: "mp-country",
    status: "live",
    carries: "Filled land polygons, one node per country",
  },
  {
    name: "hydro",
    className: "mp-hydro",
    feature: "mp-water",
    status: "live",
    carries: "Lakes and rivers, drawn over the land they sit in",
  },
  {
    name: "borders",
    className: "mp-borders",
    feature: "mp-border",
    status: "live",
    carries: "Shared boundaries, drawn once each as unfilled lines",
  },
  {
    name: "roads",
    className: "mp-roads",
    feature: "mp-road",
    status: "reserved",
    carries: "Motorway, trunk and primary routes",
  },
  {
    name: "places",
    className: "mp-places",
    feature: "mp-place",
    status: "live",
    carries: "Settlement dots, ranked 1-3 so a theme can thin them",
  },
  {
    name: "labels",
    className: "mp-labels",
    feature: "mp-label",
    status: "reserved",
    carries: "Text nodes, thinned by rank in CSS",
  },
  {
    name: "annotations",
    className: "mp-annotations",
    feature: "mp-anno",
    status: "reserved",
    carries: "Pins, arrows and callouts — the top of the geographic stack",
  },
  {
    name: "furniture",
    className: "mp-furniture",
    feature: "mp-credit",
    status: "reserved",
    carries: "Credit lines, watermarks, legends — placed on the canvas, not on the map",
  },
]);

/** Class on the root `<svg>`. */
export const ROOT_CLASS = "mp";
/** Class on every layer group, alongside its own name. */
export const LAYER_CLASS = "mp-layer";
/** Class on the canvas ground rectangle. */
export const BACKGROUND_CLASS = "mp-bg";
/**
 * Class on the reserved `<defs>` block.
 *
 * Emitted empty. A stylesheet can express a great deal on its own — the raised
 * relief look is `filter: drop-shadow(...)`, plain CSS, no markup needed — but
 * gradients, patterns and the arrow markers a flow map needs are SVG elements,
 * not declarations, and they have to be defined somewhere before they can be
 * referenced. Claiming the slot now keeps that from becoming a structural
 * change later.
 */
export const DEFS_CLASS = "mp-defs";
/** Modifier added to any feature named in `highlight`. */
export const HIGHLIGHT_CLASS = "is-highlighted";

/**
 * Feature classes claimed but not built. Naming them here keeps a future layer
 * from colliding with a name a theme already relies on.
 */
export const RESERVED_CLASSES: readonly string[] = Object.freeze([
  "mp-anno",
  "mp-pin",
  "mp-arrow",
  "mp-callout",
  // Data-driven renderings of the land layer. A prism map extrudes each
  // country by its value, so a country stops being one path and becomes a top
  // face plus side walls — a different rendering of the same layer, not a new
  // one, which is why these are class names rather than a layer slot.
  "mp-prism",
  "mp-prism-top",
  "mp-prism-side",
  "mp-flow",
  "mp-symbol",
  "mp-credit",
  "mp-watermark",
  "mp-legend",
  "mp-scale",
  "mp-compass",
]);

export function layer(name: LayerName): LayerSpec {
  const found = LAYERS.find((spec) => spec.name === name);
  if (!found) throw new Error(`mapper: no layer named "${name}"`);
  return found;
}
