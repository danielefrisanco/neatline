import { textWidth } from "./labels.js";
import { el, text, type SvgNode } from "./svg.js";
import type { Callout, Pin, Point, Position, Size } from "./types.js";

/**
 * The annotation layer — where the map stops describing the ground and starts
 * saying something about it.
 *
 * A pin is the first of four marks, and the only one whose shape is a
 * decision: arrows, callouts and icons all have to answer the same question a
 * pin does — *where* — and copying one answer is what keeps them from
 * arriving as three different vocabularies. So `at` is a coordinate, in
 * lon/lat, and everything else is composition on top of it.
 *
 * Deliberately *not* a coordinate in pixels. A pixel is only meaningful for
 * the exact region, projection and canvas size that produced it; the same map
 * at another size puts that pixel on different ground. `invert()` exists to
 * turn a pointer's pixel into a coordinate precisely so that what gets stored
 * here is the coordinate.
 *
 * Annotations are excluded from the camera, for the same reason `neighbours`
 * is: placing a mark must never move the map out from under the marks already
 * placed. A pin outside the frame stays outside the frame.
 */

/**
 * Mark radius in user units. A theme overrides `r` in CSS; this is the fallback.
 *
 * Larger than it first needed to be, because the casing eats into it: the
 * stroke is centred on the circle, so a 2.4-unit casing spends 1.2 of it
 * inside, and at radius 5 the coloured core came out barely wider than a
 * rank-1 city dot. Seven leaves the mark reading as a mark.
 */
const PIN_RADIUS = 7;

/**
 * How far a coordinate may move through a round trip before the pixel it was
 * given is somebody else's, in degrees.
 *
 * The mirror of `INVERT_TOLERANCE`, and it exists for the mirror of the same
 * reason. `project()` does not refuse a coordinate on the far side of a globe:
 * the far hemisphere projects onto the same disc, so it hands back a pixel that
 * is already occupied by a place on the near side. A pin at 160°W, 10°S — the
 * middle of the Pacific — projects onto an Africa-centred globe at [369, 491],
 * which is Angola, and nothing about that pixel says it is wrong.
 *
 * So the coordinate is put back through `invert()`, which answers with the near
 * side by construction, and compared with where it started. Measured over five
 * projections, nine regions and a 9° grid, a coordinate that really is visible
 * returns within 3.6e-11 degrees and one that is not misses by at least 0.09.
 * Anything in that gap does; 1e-6 degrees is a tenth of a millimetre on the
 * ground, and nine orders of magnitude clear of both ends.
 */
const ROUND_TRIP_TOLERANCE = 1e-6;

const RADIANS = Math.PI / 180;

/**
 * Angular distance between two coordinates, in degrees.
 *
 * Straight subtraction of lon and lat will not do: it calls 179°E and 179°W
 * 358 degrees apart when they are two, and it calls every meridian at the pole
 * a different place when they are one point. The chord on the unit sphere has
 * neither problem.
 */
function apart(a: Position, b: Position): number {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const x = Math.cos(lat1 * RADIANS) * Math.cos(lon1 * RADIANS)
    - Math.cos(lat2 * RADIANS) * Math.cos(lon2 * RADIANS);
  const y = Math.cos(lat1 * RADIANS) * Math.sin(lon1 * RADIANS)
    - Math.cos(lat2 * RADIANS) * Math.sin(lon2 * RADIANS);
  const z = Math.sin(lat1 * RADIANS) - Math.sin(lat2 * RADIANS);
  const chord = Math.hypot(x, y, z);
  return (2 * Math.asin(Math.min(1, chord / 2))) / RADIANS;
}

/**
 * Gap between the mark and a label sitting beside it, in user units.
 *
 * Measured from the radius, so it has to clear two casings rather than none:
 * the mark's own, which is half a halo-width proud of `PIN_RADIUS`, and the
 * label's, which starts half a halo-width before the glyphs. At four they met,
 * and a bold name read as though it were touching its mark.
 */
const PIN_GAP = 6;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Reject a coordinate that cannot be one.
 *
 * `highlight` throws on a code it does not recognise rather than quietly
 * dropping it, and a pin deserves the same: a mark silently missing from a map
 * is worse than a map that refuses to build. The check catches the mistake
 * that actually happens — `[lat, lon]` instead of `[lon, lat]` — whenever the
 * longitude it was handed is past 90, which is most of the northern hemisphere
 * writing about anywhere east of Corsica. A swap that stays in range is a real
 * place and no validation can find it.
 */
function assertPosition(at: Position, index: number, what: string): void {
  const where = `neatline: ${what}[${index}].at`;
  if (!Array.isArray(at) || at.length !== 2) {
    throw new Error(`${where} must be a [lon, lat] pair`);
  }
  const [lon, lat] = at;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    throw new Error(`${where} must be two finite numbers, got [${lon}, ${lat}]`);
  }
  if (lon < -180 || lon > 180) {
    throw new Error(`${where} has a longitude of ${lon}, which is outside [-180, 180]`);
  }
  if (lat < -90 || lat > 90) {
    throw new Error(
      `${where} has a latitude of ${lat}, which is outside [-90, 90] — ` +
        `coordinates are [lon, lat], not [lat, lon]`,
    );
  }
}

/**
 * Where a pin's label sits, and which end of it is anchored.
 *
 * With no offset the label sits to the right of the mark, the same convention
 * the settlement labels use. An offset moves the *label*, never the mark — the
 * mark is at the coordinate, and that is the whole point of it — so a label
 * pushed left has to be anchored at its end, or it runs back over the mark it
 * was moved away from.
 */
function labelAt(
  x: number,
  y: number,
  offset: Point | undefined,
): { readonly x: number; readonly y: number; readonly anchor: string } {
  if (offset === undefined) {
    return { x: x + PIN_RADIUS + PIN_GAP, y, anchor: "start" };
  }
  const [dx, dy] = offset;
  const anchor = dx < 0 ? "end" : dx > 0 ? "start" : "middle";
  return { x: x + dx, y: y + dy, anchor };
}

/**
 * A coordinate as a point on the canvas, or nothing.
 *
 * The single place any annotation turns a `where` into a pixel, which is the
 * point of it: a pin and a callout that validated differently, or guarded the
 * globe differently, would be two vocabularies wearing one name.
 */
function resolve(
  at: Position,
  index: number,
  what: string,
  project: (position: Position) => Point | null,
  invert: (point: Point) => Position | null,
): Point | null {
  assertPosition(at, index, what);
  const point = project(at);
  if (point === null) return null;
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
  const back = invert(point);
  if (back === null) return null;
  if (apart(at, back) > ROUND_TRIP_TOLERANCE) return null;
  return point;
}

/**
 * Build the annotation layer.
 *
 * Two different things go wrong with a pin, and they get two different answers
 * because they are two different facts.
 *
 * A pin on the far side of a globe has no pixel of its own. It gets one anyway
 * — the far hemisphere projects onto the same disc as the near one, so
 * `project()` answers a Pacific coordinate with a pixel in the middle of
 * Africa. Those are dropped, because drawing them means putting a mark on
 * ground it does not belong to, and a mark that is silently in the wrong place
 * is worse than one that is missing. They are found by round trip: `invert()`
 * returns the near side by construction, so a coordinate that comes back as
 * itself was visible and one that comes back as somewhere else was not.
 *
 * A pin that survives the round trip but lands outside the canvas *does* have
 * a place; the camera simply is not looking at it. That is stated as
 * `data-fit="0"`, the same way a name too big for its country is, and the
 * stylesheet decides what to do about it. The engine states the fact; it does
 * not act on it.
 */
export interface PinLayer {
  readonly nodes: readonly SvgNode[];
  /**
   * The labels of the marks a reader can actually see.
   *
   * What the accessible description is built from, which is why it is returned
   * rather than read back off the options: a description naming a pin that was
   * dropped for being on the far side of the globe, or hidden for being off the
   * canvas, describes a map nobody is looking at.
   */
  readonly labels: readonly string[];
}

export function pinLayer(
  pins: readonly Pin[],
  project: (position: Position) => Point | null,
  invert: (point: Point) => Position | null,
  [width, height]: Size,
): PinLayer {
  const nodes: SvgNode[] = [];
  const labels: string[] = [];

  for (const [index, pin] of pins.entries()) {
    const point = resolve(pin.at, index, "pins", project, invert);
    if (point === null) continue;
    const [x, y] = point;

    const onCanvas = x >= 0 && x <= width && y >= 0 && y <= height;
    const children: SvgNode[] = [];
    if (onCanvas && pin.label !== undefined && pin.label !== "") labels.push(pin.label);

    // A per-feature title is a hover tooltip, not an accessibility tree — the
    // root carries `role="img"`, so it is read once. Same bargain the country
    // paths take.
    if (pin.label !== undefined && pin.label !== "") {
      children.push(el("title", {}, [text(pin.label)]));
    }

    children.push(
      el("circle", {
        class: "mp-pin-mark",
        cx: round(x),
        cy: round(y),
        r: PIN_RADIUS,
      }),
    );

    if (pin.label !== undefined && pin.label !== "") {
      const at = labelAt(x, y, pin.offset);
      children.push(
        el(
          "text",
          {
            // The labels layer's own class, carried into this one on purpose.
            // A pin's name is text on a map and wants everything the label
            // rule already provides — the type stack, the tracking, and above
            // all the halo that is the difference between a name that reads
            // over a coastline and one that does not. A class of its own
            // would have to restate all of it, and would arrive unstyled in
            // every theme not revised to know about it.
            class: "mp-label",
            "data-kind": "pin",
            x: round(at.x),
            y: round(at.y),
            "text-anchor": at.anchor,
            "dominant-baseline": "central",
          },
          [text(pin.label)],
        ),
      );
    }

    nodes.push(
      el(
        "g",
        {
          class: "mp-anno mp-pin",
          "data-id": pin.id,
          "data-kind": pin.kind,
          // Stated, not acted on. `1` is written out as well as `0` so the
          // attribute is a fact about every pin rather than a flag that only
          // appears when something went wrong.
          "data-fit": onCanvas ? 1 : 0,
        },
        children,
      ),
    );
  }

  return { nodes, labels };
}

/** Padding between a callout's caption and the edge of its box, in user units. */
const CALLOUT_PAD = 7;

/** Line height inside a callout, as a fraction of the font size. */
const CALLOUT_LEADING = 1.35;

/** Where the box sits when the caller does not say. Up and to the right. */
const CALLOUT_OFFSET: Point = [40, -40];

/** Widest a caption sets before it wraps, in user units. */
const CALLOUT_WIDTH = 180;

/**
 * How much wider a real string can run than `--label-advance` predicts.
 *
 * The estimator is an average glyph width, and the label engine deliberately
 * tunes it to err *low*: a country name is hidden when it does not fit, so
 * over-estimating would hide names that would have been fine. A box has the
 * opposite requirement — under-estimating does not hide anything, it prints the
 * caption straight out through the right-hand edge.
 *
 * Measured in a browser with `getComputedTextLength()` across the three bundled
 * stacks at weights 400, 500 and 700: a realistic caption runs at most 1.28× the
 * estimate and averages 0.8, the worst cases being short strings where
 * per-character variance has nothing to average against. 1.3 covers all of them.
 * A box slightly too wide costs a few units of whitespace; a box too narrow is
 * broken, so this rounds up on purpose.
 */
const CALLOUT_SLACK = 1.3;

/**
 * Break a caption into lines that fit.
 *
 * Greedy, not the even-split search the country labels use: that one is
 * choosing between two lines of a name and wants them balanced, while this is
 * setting a sentence in a column and wants it full. A word longer than the
 * column is left long rather than broken — hyphenation is a typographic
 * problem this library has no business having an opinion about, and a URL cut
 * in half is worse than a box that runs wide.
 */
/**
 * How wide a row will actually set, rounded up.
 *
 * Tracking is added rather than folded into the advance because it is a flat
 * per-character length, not a fraction of the size — `--label-track` is in user
 * units, so it does not scale when the type does. The label engine leaves it
 * out and can afford to: it errs low on purpose. A box cannot.
 */
function measure(row: string, size: number, advance: number, track: number): number {
  return (textWidth(row, size, advance) + row.length * track) * CALLOUT_SLACK;
}

function wrap(
  caption: string,
  width: number,
  size: number,
  advance: number,
  track: number,
): string[] {
  const words = caption.split(/\s+/).filter((word) => word !== "");
  if (words.length === 0) return [];
  const rows: string[] = [];
  let row = words[0] as string;
  for (const word of words.slice(1)) {
    const candidate = `${row} ${word}`;
    if (measure(candidate, size, advance, track) <= width) row = candidate;
    else {
      rows.push(row);
      row = word;
    }
  }
  rows.push(row);
  return rows;
}

/**
 * Build the callouts.
 *
 * The box is the whole reason this is a second primitive rather than an option
 * on the first. A pin's label is one word and rides on the halo every label
 * gets; a caption is a sentence, and a sentence needs a ground of its own or it
 * dissolves into whatever the map put under it. Having a ground is also what
 * finally gives `--anno-ink` something to mean: ink drawn *on* an annotation,
 * legible against `--anno`, which is the value every preset has been carrying
 * since Phase 3 without anything consuming it.
 *
 * There is no mark at the anchor. The leader line already ends there, and a
 * caller who wants a dot as well adds a pin at the same coordinate — which is
 * composition rather than a second way to draw the same circle.
 */
export function calloutLayer(
  callouts: readonly Callout[],
  project: (position: Position) => Point | null,
  invert: (point: Point) => Position | null,
  [width, height]: Size,
  size: number,
  advance: number,
  track: number,
): PinLayer {
  const nodes: SvgNode[] = [];
  const labels: string[] = [];

  for (const [index, callout] of callouts.entries()) {
    const point = resolve(callout.at, index, "callouts", project, invert);
    if (point === null) continue;
    const [x, y] = point;

    const column = callout.width ?? CALLOUT_WIDTH;
    const rows = wrap(callout.text, column, size, advance, track);
    if (rows.length === 0) continue;

    const [dx, dy] = callout.offset ?? CALLOUT_OFFSET;
    const widest = Math.max(...rows.map((row) => measure(row, size, advance, track)));
    const boxWidth = widest + CALLOUT_PAD * 2;
    const boxHeight = rows.length * size * CALLOUT_LEADING + CALLOUT_PAD * 2;

    // The offset lands the corner nearest the point, and the box grows away
    // from it — so the sign of the offset is the direction the box goes, which
    // is the only reading of it a caller has to hold in their head.
    const boxX = dx < 0 ? x + dx - boxWidth : x + dx;
    const boxY = dy < 0 ? y + dy - boxHeight : y + dy;

    const anchored = x >= 0 && x <= width && y >= 0 && y <= height;
    const boxSeen =
      boxX + boxWidth >= 0 && boxX <= width && boxY + boxHeight >= 0 && boxY <= height;
    const onCanvas = anchored && boxSeen;
    if (onCanvas) labels.push(callout.text);

    const children: SvgNode[] = [
      el("title", {}, [text(callout.text)]),
      // Straight, and from the point to the corner the offset named — which is
      // why the corner is what the offset positions. A leader that arrived at
      // some other edge would need the caller to solve for where it came out.
      el("path", {
        class: "mp-callout-leader",
        d: `M${round(x)},${round(y)}L${round(x + dx)},${round(y + dy)}`,
      }),
      el("rect", {
        class: "mp-callout-box",
        x: round(boxX),
        y: round(boxY),
        width: round(boxWidth),
        height: round(boxHeight),
      }),
    ];

    // First baseline sits a full line below the box top, so the cap height
    // clears the padding rather than the ascender resting on it.
    const first = boxY + CALLOUT_PAD + size * 0.82;
    children.push(
      el(
        "text",
        {
          class: "mp-label",
          "data-kind": "callout",
          x: round(boxX + CALLOUT_PAD),
          y: round(first),
        },
        rows.map((row, line) =>
          el(
            "tspan",
            {
              x: round(boxX + CALLOUT_PAD),
              // In user units, not `em`: the flattened export is read by tools
              // that resolve lengths but not font-relative ones.
              dy: line === 0 ? undefined : round(size * CALLOUT_LEADING),
            },
            [text(row)],
          ),
        ),
      ),
    );

    nodes.push(
      el(
        "g",
        {
          class: "mp-anno mp-callout",
          "data-id": callout.id,
          "data-kind": callout.kind,
          "data-fit": onCanvas ? 1 : 0,
        },
        children,
      ),
    );
  }

  return { nodes, labels };
}
