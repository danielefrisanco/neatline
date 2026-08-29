import type { Point, Position, Size } from "./types.js";

/**
 * How much the map lies, measured rather than assumed.
 *
 * Two pieces of furniture make a claim about the ground: a scale bar says one
 * length on the paper is one distance on the earth everywhere, and a north
 * arrow says one direction on the paper is north everywhere. Neither is true of
 * any projection, and the usual rule — "a scale bar is meaningful for the
 * conformal and equal-area projections" — is wrong in both directions. Sampling
 * the drawn canvas: `europe/mercator` varies by 2.76 and mercator is conformal,
 * so the rule permits a bar that lies by nearly three to one; `IN/orthographic`
 * varies by 1.07 and orthographic is neither family, so the rule forbids one
 * closer to true than the bar it just allowed.
 *
 * Honesty depends on the *extent*, not on which family the projection belongs
 * to, and it is measurable. This is the same discipline the `invert()` round
 * trip settled for annotations: measure the property, do not assert the
 * category.
 */

/** Mean earth radius in kilometres — the sphere d3-geo projects from. */
const EARTH_RADIUS = 6371.0088;
const RADIANS = Math.PI / 180;

/** Samples per axis. 22 × 22 is ~900 probes: enough to find a bad corner. */
const GRID = 21;

/** How far a probe steps, in user units. Short enough to be local, long
 * enough that the inverse is not answering out of its own rounding. */
const PROBE = 2;

/** A pixel that does not come back where it started is not on the map. */
const ON_CANVAS = 0.5;

/** Above this the north probe would step over the pole and read backwards. */
const POLE = 89;

/**
 * Great-circle distance in kilometres.
 *
 * Haversine rather than the law of cosines because the probes are two user
 * units apart, which on a country map is a few kilometres — the regime where
 * cosines lose their significant figures.
 */
function greatCircle(a: Position, b: Position): number {
  const dLat = (b[1] - a[1]) * RADIANS;
  const dLon = (b[0] - a[0]) * RADIANS;
  const chord =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * RADIANS) * Math.cos(b[1] * RADIANS) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(chord)));
}

export interface Distortion {
  /**
   * The largest local scale on the canvas over the smallest. 1 is a map on
   * which one length means one distance everywhere; 2 is a map where the same
   * ruler reads double at one end of the frame and single at the other.
   */
  readonly scale: number;
  /**
   * How far north swings away from straight up, in degrees, at the worst point
   * on the canvas. 0 is a map on which up is north everywhere.
   */
  readonly north: number;
  /** Kilometres to the user unit, taken at the median so one bad corner cannot move it. */
  readonly kmPerUnit: number;
  /** How many probes landed on the map. Zero means nothing could be measured. */
  readonly samples: number;
}

/** What a caller gets when the canvas holds no measurable map at all. */
const UNMEASURABLE: Distortion = Object.freeze({
  scale: Infinity,
  north: 180,
  kmPerUnit: 0,
  samples: 0,
});

/**
 * Sample the drawn canvas and report what it does to distance and direction.
 *
 * Deliberately the whole canvas rather than the region's bounding box. A reader
 * lays a scale bar wherever they like, including on the padding and on the
 * neighbours drawn behind the subject, so the honest measure covers everything
 * that is on the paper — which is also why an orthographic hemisphere fails so
 * badly here. Its limb is on the paper, and scale diverges there.
 */
export function measureDistortion(
  project: (position: Position) => Point | null,
  invert: (point: Point) => Position | null,
  [width, height]: Size,
): Distortion {
  const scales: number[] = [];
  let north = 0;
  let measured = false;

  for (let column = 0; column <= GRID; column++) {
    for (let row = 0; row <= GRID; row++) {
      const x = (width * column) / GRID;
      const y = (height * row) / GRID;
      const here = invert([x, y]);
      if (here === null) continue;
      // A pixel off the globe inverts to null, but a pixel on the far side of
      // one inverts to the near side — so the round trip is what says the
      // coordinate really belongs to this pixel.
      const back = project(here);
      if (back === null) continue;
      if (Math.hypot(back[0] - x, back[1] - y) > ON_CANVAS) continue;

      // Both axes, because an equal-area projection buys its areas by trading
      // one against the other: a bar reads true across and short down.
      for (const [dx, dy] of [
        [PROBE, 0],
        [0, PROBE],
      ] as const) {
        const there = invert([x + dx, y + dy]);
        if (there === null) continue;
        const km = greatCircle(here, there);
        if (km > 0) scales.push(km / PROBE);
      }

      if (Math.abs(here[1]) < POLE) {
        const up = project([here[0], here[1] + 0.05]);
        if (up !== null) {
          // Screen angle of north: 0 is straight up, either sign is a lean.
          const angle = Math.atan2(up[0] - x, y - up[1]);
          if (Number.isFinite(angle)) {
            north = Math.max(north, Math.abs(angle) / RADIANS);
            measured = true;
          }
        }
      }
    }
  }

  if (scales.length === 0 || !measured) return UNMEASURABLE;
  scales.sort((a, b) => a - b);
  return {
    scale: (scales[scales.length - 1] as number) / (scales[0] as number),
    north,
    kmPerUnit: scales[scales.length >> 1] as number,
    samples: scales.length,
  };
}
