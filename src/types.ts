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
  /** ISO codes to mark with `.is-highlighted`. */
  readonly highlight?: readonly string[];
}

export interface RenderOptions {
  /** Bundled preset name, or a path to a `.css` file. @default "minimal" */
  readonly theme?: string;
  /** Token overrides, applied as a later declaration on the root element. */
  readonly tokens?: Readonly<Record<string, string>>;
  /**
   * Flatten computed values onto presentation attributes.
   * Figma and Illustrator are inconsistent about honouring `<style>` blocks.
   * @default false
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
  /** The complete document — geometry with the theme applied. */
  toString(): string;
  /** Write the complete document to disk. Node only. */
  toFile(path: string, options?: RenderOptions): Promise<void>;
}
