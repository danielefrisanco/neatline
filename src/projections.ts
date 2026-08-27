import {
  geoAlbers,
  geoConicConformal,
  geoEqualEarth,
  geoMercator,
  geoOrthographic,
} from "d3-geo";
import type { GeoProjection } from "d3-geo";
import type { FrameGeometry } from "./framing.js";
import type { ProjectionName } from "./types.js";

/** A projection that has not yet been fitted to a region. */
type ProjectionFactory = (bounds: [[number, number], [number, number]]) => GeoProjection;

/**
 * Conic projections need standard parallels chosen for the region — the same
 * projection tuned for Europe looks wrong over Chile. Placing them at the
 * inner sixths of the latitude span is the usual heuristic, and it means a
 * conic works anywhere without the caller knowing what a parallel is.
 */
function conicFor(
  factory: () => GeoProjection & { parallels(p: [number, number]): GeoProjection },
  bounds: [[number, number], [number, number]],
): GeoProjection {
  const [[west, south], [east, north]] = bounds;
  const span = north - south;
  const projection = factory().parallels([south + span / 6, north - span / 6]);
  // Centre the developable surface on the region, or it shears badly.
  return projection.rotate([-(west + east) / 2, 0]);
}

/**
 * A lookup table rather than a switch, so composite projections and insets
 * can be registered later without touching callers.
 */
const PROJECTIONS: Readonly<Record<ProjectionName, ProjectionFactory>> = {
  mercator: () => geoMercator(),
  "equal-earth": () => geoEqualEarth(),
  orthographic: (bounds) => {
    const [[west, south], [east, north]] = bounds;
    return geoOrthographic().rotate([-(west + east) / 2, -(south + north) / 2]);
  },
  "conic-conformal": (bounds) => conicFor(geoConicConformal, bounds),
  albers: (bounds) => conicFor(geoAlbers, bounds),
};

export const PROJECTION_NAMES = Object.keys(PROJECTIONS) as readonly ProjectionName[];

export function isProjectionName(value: string): value is ProjectionName {
  return value in PROJECTIONS;
}

/**
 * Build a projection fitted to `region` inside a `width` × `height` canvas.
 *
 * `fitExtent` solves centring, scale and padding in one call — there is no
 * separate camera to compute.
 */
export function createProjection(
  name: ProjectionName,
  frame: FrameGeometry,
  width: number,
  height: number,
  padding: number,
): GeoProjection {
  const projection = PROJECTIONS[name](frame.bounds);

  return projection.fitExtent(
    [
      [padding, padding],
      [width - padding, height - padding],
    ],
    frame.geometry as never,
  );
}
