/**
 * The grid the world is drawn on.
 *
 * The lines are built here rather than taken from `d3.geoGraticule()` for one
 * reason: the equator and the tropics have to be told apart from every other
 * parallel, and a generator that returns an undifferentiated MultiLineString
 * cannot say which of its lines is the equator. Drawing them all the same
 * weight is the failure the plan named — a map that marks the tropics the way
 * it marks 20°N is not marking them at all — so the parallel set is built
 * knowing which latitudes are special, and skips them rather than drawing them
 * twice.
 *
 * Everything here is degrees until the last step. A line is a list of
 * positions sampled along a constant latitude or longitude; the projection
 * bends it, which is exactly the point of drawing a graticule on a map that is
 * not a rectangle.
 */
import type { GeoPath } from "d3-geo";
import { el, type SvgNode } from "./svg.js";
import type { Graticule, Position, Size } from "./types.js";

/**
 * Obliquity of the ecliptic — the latitude the sun stands over at a solstice,
 * and so where the tropics are. It drifts by about half an arcsecond a year,
 * which is four decimal places of no consequence to a line 0.4 units wide.
 */
const TROPIC = 23.4362;

/**
 * Degrees between sampled points along a line.
 *
 * A parallel is a straight line only on a cylindrical projection. At 2° the
 * curve of a conic reads as a curve; at 10° it reads as a polygon, which was
 * visible on `west-europe/conic-conformal` before this was lowered.
 */
const PRECISION = 2;

/**
 * Angular steps a reader can name. A grid at 7° is a grid nobody can count
 * from, so the spacing comes off this ladder or off the caller.
 */
const STEPS = [0.5, 1, 2, 5, 10, 15, 30, 45] as const;
/** The coarsest rung, and what a whole-world span falls back to. */
const COARSEST = Math.max(...STEPS);

/** Lines wanted across a span. Six is a grid; twenty is a screen door. */
const TARGET = 6;

/**
 * How far past the framed bounds the grid runs, as a fraction of the span.
 *
 * `fitExtent` shows more than the bounds it was given: the region is fitted to
 * whichever axis binds, and the other one gets slack. A grid stopped at the
 * bounds leaves that slack empty, so it runs over and the viewport clips it.
 */
const OVERHANG = 0.25;

/** Coarsest sensible spacing. Beyond this a "grid" is two lines. */
const MAX_STEP = 90;

function stepFor(span: number): number {
  for (const step of STEPS) if (span / step <= TARGET) return step;
  return COARSEST;
}

function checkStep(value: number, what: string): number {
  if (!Number.isFinite(value) || value <= 0 || value > MAX_STEP) {
    throw new Error(
      `neatline: graticule ${what} must be a positive number of degrees up to ${MAX_STEP}, got ${value}`,
    );
  }
  return value;
}

/** Sample a constant-latitude line, always including both ends. */
function parallel(lat: number, west: number, east: number): Position[] {
  const points: Position[] = [];
  for (let lon = west; lon < east; lon += PRECISION) points.push([lon, lat]);
  points.push([east, lat]);
  return points;
}

/** Sample a constant-longitude line, always including both ends. */
function meridian(lon: number, south: number, north: number): Position[] {
  const points: Position[] = [];
  for (let lat = south; lat < north; lat += PRECISION) points.push([lon, lat]);
  points.push([lon, north]);
  return points;
}

/** Multiples of `step` inside `[low, high]`, counted from zero so 0 is on the grid. */
function ticks(low: number, high: number, step: number): number[] {
  const values: number[] = [];
  const first = Math.ceil(low / step);
  const last = Math.floor(high / step);
  // A step far finer than the span can ask for thousands of lines. The cap is
  // above anything a reader could count and below anything that hurts.
  for (let n = first; n <= last && values.length < 4000; n += 1) {
    values.push(Math.round(n * step * 1e6) / 1e6);
  }
  return values;
}

export function graticuleLayer(
  graticule: Graticule,
  bounds: readonly [Position, Position],
  path: GeoPath,
  [width, height]: Size,
): SvgNode[] {
  const [[west, south], [east, north]] = bounds;
  const lonSpan = Math.max(east - west, 1e-6);
  const latSpan = Math.max(north - south, 1e-6);

  const asked = graticule.step;
  const [stepX, stepY] =
    asked === undefined
      ? [stepFor(lonSpan), stepFor(latSpan)]
      : typeof asked === "number"
        ? [checkStep(asked, "step"), checkStep(asked, "step")]
        : [checkStep(asked[0], "step[0]"), checkStep(asked[1], "step[1]")];

  // Clamped, because a line past the pole is not a line and a meridian drawn
  // twice at ±180 is a seam.
  const left = Math.max(-180, west - lonSpan * OVERHANG);
  const right = Math.min(180, east + lonSpan * OVERHANG);
  const bottom = Math.max(-90, south - latSpan * OVERHANG);
  const top = Math.min(90, north + latSpan * OVERHANG);

  const special = new Map<number, string>([
    [0, "equator"],
    [TROPIC, "tropic"],
    [-TROPIC, "tropic"],
  ]);

  const lines: { kind: string; points: Position[] }[] = [];
  for (const lon of ticks(left, right, stepX)) {
    lines.push({ kind: "meridian", points: meridian(lon, bottom, top) });
  }
  for (const lat of ticks(bottom, top, stepY)) {
    // The equator is a multiple of every step on the ladder, so without this
    // it would be drawn once as a parallel and once as itself — two strokes
    // in two colours on the same pixels.
    if (special.has(lat)) continue;
    // A parallel at the pole is a point, not a line. Drawn anyway it is a
    // stroke of nothing on most projections and a full-width line across the
    // top of a cylindrical one, which is the pole claiming to be a place.
    if (Math.abs(lat) >= 90) continue;
    lines.push({ kind: "parallel", points: parallel(lat, left, right) });
  }
  for (const [lat, kind] of special) {
    if (lat < bottom || lat > top) continue;
    lines.push({ kind, points: parallel(lat, left, right) });
  }

  const nodes: SvgNode[] = [];
  for (const line of lines) {
    const geometry = { type: "LineString", coordinates: line.points } as never;
    const [[x0, y0], [x1, y1]] = path.bounds(geometry);
    // A projection can send a line nowhere — behind an orthographic globe, or
    // to infinity on a cylindrical one at the pole. Neither is drawable, and
    // a line entirely off the canvas is a kilobyte of path data nobody sees.
    if (!Number.isFinite(x0) || !Number.isFinite(y0)) continue;
    if (!Number.isFinite(x1) || !Number.isFinite(y1)) continue;
    if (x1 < 0 || y1 < 0 || x0 > width || y0 > height) continue;
    const d = path(geometry);
    if (!d) continue;
    nodes.push(el("path", { class: "mp-grid", "data-kind": line.kind, d }));
  }
  return nodes;
}
