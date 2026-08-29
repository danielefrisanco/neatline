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

/**
 * A mark at a coordinate — the first of the annotation primitives, and the one
 * that settles the shape of the rest.
 *
 * Arrows, callouts and icons all have to say *where*, and they all say it the
 * way this does: `at`, in lon/lat, GeoJSON order. Storing the coordinate
 * rather than the pixel is the whole discipline of the layer — a pixel is only
 * meaningful for the exact region, projection and canvas size that produced
 * it, so a map reframed or resized detaches every mark placed in pixels. Where
 * a mark is placed with a pointer, `invert()` is what turns the drop back into
 * a coordinate to store.
 *
 * Annotations are excluded from the camera, exactly as `neighbours` is:
 * placing a mark never moves the map out from under the marks already placed.
 *
 * ```ts
 * pins: [
 *   { at: [2.35, 48.86], label: "Paris", kind: "capital" },
 *   { at: [30.52, 50.45], label: "Kyiv", id: "k1", offset: [-10, 0] },
 * ]
 * ```
 */
export interface Pin {
  /** Where the mark goes, in `[lon, lat]`. */
  readonly at: Position;
  /** Text set beside the mark. Omitted, the pin is a mark and nothing else. */
  readonly label?: string;
  /**
   * The caller's handle on this pin, written out as `data-id`.
   *
   * What an editor uses to find the node it just drew again — which is why the
   * taxonomy reserved `data-id` on the annotation layer and nowhere else.
   */
  readonly id?: string;
  /**
   * What kind of thing this is, written out as `data-kind` for a theme to
   * style — `"capital"`, `"airport"`, `"conflict"`.
   *
   * Free text rather than an enumeration, because the vocabulary is not
   * settled: the icon sets arrive later in this phase and their names become
   * the conventional values. A theme can style any of them today.
   */
  readonly kind?: string;
  /**
   * Move the *label* off the mark, in user units, `[dx, dy]`.
   *
   * Never the mark, which stays on its coordinate — that is what a pin is for.
   * A negative `dx` anchors the text at its far end, so a label pushed left
   * does not run back across the mark it was moved away from.
   */
  readonly offset?: Point;
}

/**
 * A caption tied to a coordinate by a leader line.
 *
 * The difference from a [`Pin`](#Pin) is which half is the subject. A pin says
 * *there is something here* and the mark carries the meaning; a callout says
 * *this sentence is about here*, and the words carry it while the line does
 * nothing but point. That is why a callout has a box and a pin does not — a
 * word can sit on a coastline behind a halo, and a sentence cannot.
 *
 * It says `where` exactly as a pin does, because everything in this layer
 * does: `at`, in `[lon, lat]`.
 *
 * ```ts
 * callouts: [
 *   { at: [30.52, 50.45], text: "Grain exports resumed here in July", offset: [60, -70] },
 * ]
 * ```
 */
export interface Callout {
  /** The coordinate the leader line points at. */
  readonly at: Position;
  /** The caption. Wrapped to `width`; blank lines and runs of spaces collapse. */
  readonly text: string;
  /**
   * Where the box goes relative to the point, in user units, `[dx, dy]`.
   *
   * The offset lands the corner of the box nearest the point, and the box
   * extends away from there — so a negative `dx` puts the box to the left of
   * what it describes and a negative `dy` puts it above.
   *
   * @default [40, -40]
   */
  readonly offset?: Point;
  /** Widest the caption may set before it wraps, in user units. @default 180 */
  readonly width?: number;
  /** The caller's handle, written out as `data-id`. */
  readonly id?: string;
  /** What kind of thing this is, written out as `data-kind` for a theme. */
  readonly kind?: string;
}

/**
 * A curve from one coordinate to another, with a head on the far end.
 *
 * The third primitive, and the first with two `at`s rather than one — so it is
 * where the locator settled for the pin has to hold twice over. Both ends are
 * validated the same way and both are guarded the same way: an arrow with one
 * end on the far side of a globe is not drawn at all, because half an arrow
 * points somewhere nobody asked about.
 *
 * ```ts
 * arrows: [
 *   { from: [30.73, 46.48], to: [32.5, 15.6], kind: "grain" },
 * ]
 * ```
 */
export interface Arrow {
  /** Where the curve starts, in `[lon, lat]`. */
  readonly from: Position;
  /** Where it ends, and where the head goes. */
  readonly to: Position;
  /**
   * How far the curve bows out from the straight line, as a fraction of the
   * distance between the ends.
   *
   * The sign is the side it bows to, so flipping it is how a caller gets an
   * arrow off a coastline or out from under a second arrow running the other
   * way. `0` draws a straight line.
   *
   * @default 0.18
   */
  readonly bow?: number;
  /** The caller's handle, written out as `data-id`. */
  readonly id?: string;
  /** What kind of thing this is, written out as `data-kind` for a theme. */
  readonly kind?: string;
}

/**
 * One of nine positions on the canvas.
 *
 * What `at` is to an annotation, this is to the furniture — and the difference
 * between them is the whole reason furniture is a layer of its own. An
 * annotation is somewhere on the ground and moves when the camera does. A
 * credit line, a watermark, a legend or a scale bar is on the *paper*: it stays
 * where it was put however the map is reframed.
 *
 * `"top"`, `"bottom"`, `"left"` and `"right"` name one axis and centre the
 * other, which is what a reader means by them.
 */
export type Anchor =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "centre"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

/**
 * A line of text on the canvas — a source, a byline, a date.
 *
 * ```ts
 * credit: "Source: Natural Earth"
 * credit: { text: "Reuters graphics", anchor: "bottom-left" }
 * ```
 *
 * Natural Earth is public domain and this library requires no attribution, so
 * nothing here is an obligation the map imposes on you. It exists because a
 * map that leaves a browser as a file has no surrounding page to carry a
 * caption, and the credit has to come out of the generator or it does not
 * exist at all.
 */
export interface Credit {
  readonly text: string;
  /** @default "bottom-right" */
  readonly anchor?: Anchor;
}

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
  /**
   * Marks placed on the map at a coordinate.
   *
   * The journalist's actual need: a dot where the thing happened, and a word
   * saying what it was. Rendered into the `.mp-annotations` layer, above every
   * geographic layer and below the furniture.
   *
   * A pin the projection cannot place at all — the far side of an orthographic
   * globe — is dropped, because the only alternative is to draw it at a
   * coordinate nobody asked for. A pin that lands outside the canvas is
   * emitted carrying `data-fit="0"`: it has a place, the camera is simply not
   * looking at it, and the stylesheet decides what to do about that.
   */
  readonly pins?: readonly Pin[];
  /**
   * Captions tied to a coordinate by a leader line.
   *
   * A pin names a place; a callout says something about one. Drawn into the
   * same `.mp-annotations` layer, above the pins, and subject to the same two
   * rules: a coordinate behind a globe is dropped, and one the camera is not
   * pointed at is drawn carrying `data-fit="0"`.
   */
  readonly callouts?: readonly Callout[];
  /**
   * Curves between two coordinates — trade, migration, supply lines.
   *
   * Drawn into `.mp-annotations` beneath the pins and callouts, since a
   * connection is context for the marks rather than the other way round. Both
   * ends take the same guards a pin's `at` does, and an arrow with either end
   * behind a globe is dropped whole.
   */
  readonly arrows?: readonly Arrow[];
  /**
   * A line of text on the canvas — a source, a byline, a date.
   *
   * Rendered into `.mp-furniture`, the one layer that is not geographic: it is
   * anchored to the canvas in fixed user units and does not move when the
   * camera does. A bare string takes the default anchor.
   */
  readonly credit?: string | Credit;
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
