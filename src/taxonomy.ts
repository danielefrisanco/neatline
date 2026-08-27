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
 */

export type LayerName =
  | "neighbours"
  | "land"
  | "hydro"
  | "borders"
  | "roads"
  | "places"
  | "labels"
  | "annotations";

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
    status: "reserved",
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
    status: "reserved",
    carries: "Settlement dots, ranked by population",
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
    carries: "Pins, arrows and callouts — always the top of the stack",
  },
]);

/** Class on the root `<svg>`. */
export const ROOT_CLASS = "mp";
/** Class on every layer group, alongside its own name. */
export const LAYER_CLASS = "mp-layer";
/** Class on the canvas ground rectangle. */
export const BACKGROUND_CLASS = "mp-bg";
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
]);

export function layer(name: LayerName): LayerSpec {
  const found = LAYERS.find((spec) => spec.name === name);
  if (!found) throw new Error(`mapper: no layer named "${name}"`);
  return found;
}
