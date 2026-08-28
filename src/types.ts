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
  | "oceania"
  | "antarctica";

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

export interface MapOptions {
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
  /**
   * Rename anything the map labels.
   *
   * Keys are ISO codes for countries and settlement names for cities; values
   * are whatever you want written on the map. This is how a map is produced in
   * a language other than English, and how a country gets the short form a
   * headline needs.
   *
   * ```ts
   * names: { DE: "Deutschland", FR: "Frankreich", Munich: "München" }
   * ```
   *
   * The new name is the map's name for that feature throughout — it is what
   * the label reads, what `data-name` carries, what the hover title says, and
   * what the accessible description is built from. The bundled data is English
   * only, so there is no `language` option to give you: it would need name
   * tables this package does not ship.
   */
  readonly names?: Readonly<Record<string, string>>;
  /** ISO codes to mark with `.is-highlighted`. */
  readonly highlight?: readonly string[];
  /**
   * Values per country, classified into bands and written out as `data-bin`
   * so a theme can colour them — a choropleth. Bands are by rank, because map
   * data is usually skewed enough that equal value intervals show nothing.
   *
   * Defaults to whatever `extrude` was given, so one set of numbers can drive
   * both height and colour.
   */
  readonly values?: Readonly<Record<string, number>>;
  /** How many bands to classify `values` into. @default 5 */
  readonly bins?: number;
  /**
   * How the land is coloured when it is not carrying data.
   *
   * `"political"` gives every country a colour none of its neighbours has,
   * written out as `data-fill` for the theme to resolve — the old convention
   * that makes a boundary readable without tracing the line. It needs no data,
   * and it defers to `values`: a country with a band keeps its band.
   */
  readonly fill?: "political";
  /**
   * ISO codes to lay diagonal hatching over.
   *
   * The thing a map has to say about a country that is not a quantity —
   * disputed, claimed, excluded, no data. It is drawn as an overlay rather
   * than as a fill, so a hatched country keeps whatever colour it already had
   * and the two readings stack instead of one replacing the other.
   */
  readonly stripe?: readonly string[];
  /**
   * Raise each country off the map, so height reads as quantity.
   *
   * A number lifts every country by that many user units. `{ values }` lifts
   * each in proportion to its value — raw numbers, GDP or headcount or
   * anything else, scaled against the largest so the caller never has to think
   * in SVG units. `height` sets what the largest becomes (default 120).
   */
  readonly extrude?:
    | number
    | { readonly values: Readonly<Record<string, number>>; readonly height?: number };
  /**
   * Draw the surrounding countries as context, beneath the region.
   *
   * Never labelled, never highlighted, and excluded from the camera — so
   * turning context on cannot move the subject.
   * @default false
   */
  readonly neighbours?: boolean;
  /**
   * How far down the settlement ranking to draw. 1 is capitals and the largest
   * cities, 2 adds everything over a million, 3 adds the rest.
   * @default 2
   */
  readonly placeRank?: 1 | 2 | 3;
  /**
   * How far down the same ranking to *name* the settlements that are drawn.
   *
   * Lower than `placeRank` on purpose: a dot is a mark and a name is a word,
   * and words collide where dots merely crowd. The default names the capitals
   * and the largest cities and leaves the rest as dots.
   *
   * Country names are not ranked by the caller — a country is named if its
   * name fits inside it, which the geometry decides.
   * @default 1
   */
  readonly labelRank?: 1 | 2 | 3;
  /** Bundled theme name, a path to a `.css` file, or a stylesheet. */
  readonly theme?: string;
  /**
   * Colour-only overlay applied after the theme. A theme carries structure —
   * weights, dashes, type; a palette carries hue. Keeping them separate is what
   * lets one style be recoloured without being rewritten.
   */
  readonly palette?: string;
  /**
   * Type-only overlay, applied after the palette. What a palette is for colour,
   * this is for lettering: `"humanist"`, `"serif"`, `"grotesk"`, `"condensed"`
   * or `"mono"`, a path to a `.css` file, or a stylesheet.
   *
   * Sizes travel with the stack, because a condensed face set at the size of a
   * humanist one is small. `condensed` is the one to reach for on a crowded
   * map: narrower names pass the fit test, so more of them are drawn.
   */
  readonly typeface?: string;
  /** Token overrides, applied last — they beat theme, palette and typeface alike. */
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
  /** Type-only overlay, applied after the palette. */
  readonly typeface?: string;
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
   * Turn a point in SVG user units back into a coordinate.
   *
   * The inverse of `project()`, and the hook a pointer needs. Placing a pin by
   * hand is a `project()` problem — the author knows the coordinate and wants
   * the pixel. Dragging one is this problem, and it runs the other way: the
   * drop arrives in pixels and has to be stored as lon/lat, or the pin comes
   * unstuck from the ground the moment the region, the projection or the
   * canvas size changes.
   *
   * Returns `null` for a pixel that is not on the globe at all — the canvas
   * corners outside an orthographic disc are nowhere, not somewhere. Where the
   * globe folds, the answer is the near side: the far hemisphere projects onto
   * the same disc, so one pixel names two coordinates and this returns the one
   * facing the reader.
   */
  invert(point: Point): Position | null;
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
