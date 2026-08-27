import type { LayerName } from "./taxonomy.js";

/**
 * Public type surface.
 *
 * These names are the API. Once published they can only change on a major,
 * so they are settled here before any geometry code exists.
 */

/** Longitude / latitude, in that order — GeoJSON order, not lat/lon. */
export type Position = readonly [lon: number, lat: number];

/** A projected point in SVG user units. */
export type Point = readonly [x: number, y: number];

/** [west, south, east, north] in degrees. */
export type BBox = readonly [
  west: number,
  south: number,
  east: number,
  north: number,
];

/** Canvas dimensions in SVG user units. */
export type Size = readonly [width: number, height: number];

/** Source generalisation tier. Smaller number = more detail, larger file. */
export type Detail = "110m" | "50m" | "10m";

/**
 * Projections are resolved through a lookup table rather than a switch,
 * so composite projections and insets can be added without touching callers.
 */
export type ProjectionName =
  | "mercator"
  | "conic-conformal"
  | "albers"
  | "equal-earth"
  | "orthographic";

/** Named regions bundled with the package. */
export type RegionPreset =
  | "world"
  | "europe"
  | "west-europe"
  | "north-america"
  | "south-america"
  | "africa"
  | "asia"
  | "oceania";

/**
 * Minimal structural GeoJSON. Deliberately local rather than a dependency —
 * the library only ever reads these fields.
 */
export interface GeoJsonFeatureCollection {
  readonly type: "FeatureCollection";
  readonly features: readonly unknown[];
}

/**
 * Every region form normalises to one FeatureCollection internally.
 * All variants are plain data — no callbacks anywhere in the public API,
 * which is what keeps a future editor UI able to drive it and a whole map
 * configuration expressible as a URL.
 */
export type Region =
  | RegionPreset
  | readonly string[]
  | { readonly bbox: BBox }
  | GeoJsonFeatureCollection;

export interface MapperOptions {
  /** Preset name, ISO 3166-1 alpha-2 codes, a bounding box, or raw GeoJSON. */
  readonly region: Region;
  /** @default "50m" */
  readonly detail?: Detail;
  /** @default "equal-earth" */
  readonly projection?: ProjectionName;
  /** @default [1000, 1000] */
  readonly size?: Size;
  /** Inset from the canvas edge, in user units. @default 24 */
  readonly padding?: number;
  /**
   * Accessible name for the map, used as the root `aria-label` and `<title>`.
   * Generated from the region when omitted, which can only ever describe the
   * geography — a map about something needs the caller to say what.
   */
  readonly title?: string;
  /** ISO codes to mark with `.is-highlighted`. */
  readonly highlight?: readonly string[];
  /**
   * How far down the settlement ranking to draw. 1 is capitals and the largest
   * cities, 2 adds everything over a million, 3 adds the rest.
   * @default 2
   */
  readonly placeRank?: 1 | 2 | 3;
  /** Bundled theme name, a path to a `.css` file, or a stylesheet. */
  readonly theme?: string;
  /**
   * Colour-only overlay applied after the theme. A theme carries structure —
   * weights, dashes, type; a palette carries hue. Keeping them separate is what
   * lets one style be recoloured without being rewritten.
   */
  readonly palette?: string;
  /** Token overrides, applied last. `{ accent: "#c00" }` or `{ "--accent": "#c00" }`. */
  readonly tokens?: Readonly<Record<string, string>>;
  /**
   * Which layers carry content. Omitted layers are still emitted, empty —
   * the stack is a fixed contract, so this controls what goes in a slot, never
   * whether the slot exists. The saving is file size, not appearance.
   */
  readonly layers?: Readonly<Partial<Record<LayerName, boolean>>>;
}

export interface RenderOptions {
  /**
   * Write-time overrides, so one built map can be written several ways —
   * light, dark, and a flattened export — without recomputing the geometry,
   * which is the expensive part.
   */
  /** Bundled preset name, or a path to a `.css` file. */
  readonly theme?: string;
  /** Colour-only overlay, applied after the theme. */
  readonly palette?: string;
  /** Token overrides, applied as a later declaration on the root element. */
  readonly tokens?: Readonly<Record<string, string>>;
  /**
   * Flatten computed values onto presentation attributes.
   *
   * On by default, because a file on disk gets opened by whatever the reader
   * has — a design tool, a file manager thumbnailer, an editor preview — and
   * many of those ignore `<style>` entirely, rendering a themed map as black
   * shapes. The stylesheet still ships alongside, so a browser honours the CSS
   * and everything else honours the attributes.
   *
   * Set it to `false` for the smallest possible file when you know the target
   * understands stylesheets.
   *
   * @default true
   */
  readonly inlineStyles?: boolean;
}

export interface MapResult {
  /** Geometry only: semantic classes and data attributes, no styling. */
  readonly svg: string;
  /** The resolved theme stylesheet. */
  readonly css: string;
  /**
   * Project a coordinate into SVG user units.
   *
   * The hook the whole annotation layer hangs from: pins, arrows and callouts
   * are all placed through this. Returns `null` for points the projection
   * cannot represent.
   */
  project(position: Position): Point | null;
  /**
   * The complete document, styled by its stylesheet alone.
   *
   * This is the form to embed in a page: the browser applies the `<style>`
   * block, so it stays small. For a file someone will open in a design tool or
   * a viewer, use `render()` or `toFile()`.
   */
  toString(): string;
  /**
   * The complete document as a portable artifact.
   *
   * Flattens the theme onto presentation attributes unless told otherwise, so
   * the result renders the same whether or not the reader understands
   * stylesheets. Accepts write-time overrides, so one built map can be produced
   * several ways without recomputing the geometry.
   */
  render(options?: RenderOptions): Promise<string>;
  /** Write `render()` output to disk. Node only. */
  toFile(path: string, options?: RenderOptions): Promise<void>;
}
