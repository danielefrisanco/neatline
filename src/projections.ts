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

type Bounds = [[number, number], [number, number]];

/**
 * How wide the region is in longitude, in degrees.
 *
 * `geoBounds` reports a region that crosses the antimeridian with its west
 * edge greater than its east — Oceania comes back as 113°E to -180°E, which is
 * a 67° span and not a 293° one. Subtracting naively would call it nearly
 * global and give up on centring exactly where centring matters most.
 */
function longitudeSpan([[west], [east]]: Bounds): number {
  return east >= west ? east - west : east - west + 360;
}

/** The meridian to put down the middle of the map, wrapped into [-180, 180]. */
function centralMeridian(bounds: Bounds): number {
  const [[west]] = bounds;
  const centre = west + longitudeSpan(bounds) / 2;
  return ((((centre + 180) % 360) + 360) % 360) - 180;
}

/**
 * Past this span a region is effectively the whole world, and rotating stops
 * being a service: it buys almost no accuracy and moves the Atlantic off the
 * middle of a world map, where every reader expects to find it.
 */
const GLOBAL_SPAN = 180;

/**
 * Turn a cylindrical or pseudocylindrical projection to face its region.
 *
 * `fitExtent` scales and translates, but it never rotates — so a map of Asia
 * was still drawn from a Greenwich-centred projection and arrived sheared,
 * 90° out from the part of the projection that is faithful. Only the central
 * meridian moves: tilting one of these off the equator produces an oblique
 * aspect, which is a deliberate choice and not something to do by default.
 */
function facing(projection: GeoProjection, bounds: Bounds): GeoProjection {
  if (longitudeSpan(bounds) >= GLOBAL_SPAN) return projection;
  return projection.rotate([-centralMeridian(bounds), 0]);
}

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
  const [[, south], [, north]] = bounds;
  const span = north - south;
  const projection = factory().parallels([south + span / 6, north - span / 6]);
  // Centre the developable surface on the region, or it shears badly.
  return projection.rotate([-centralMeridian(bounds), 0]);
}

/**
 * A lookup table rather than a switch, so composite projections and insets
 * can be registered later without touching callers.
 */
const PROJECTIONS: Readonly<Record<ProjectionName, ProjectionFactory>> = {
  mercator: (bounds) => facing(geoMercator(), bounds),
  "equal-earth": (bounds) => facing(geoEqualEarth(), bounds),
  orthographic: (bounds) => {
    const [[, south], [, north]] = bounds;
    // A globe has to be turned in both axes — there is no other way to look
    // at the region, and no familiar view to preserve by not turning it.
    return geoOrthographic().rotate([-centralMeridian(bounds), -(south + north) / 2]);
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
  /** Extra room at the top, for anything drawn above the map — an extrusion. */
  headroom = 0,
): GeoProjection {
  const projection = PROJECTIONS[name](frame.bounds);

  return projection.fitExtent(
    [
      [padding, padding + headroom],
      [width - padding, height - padding],
    ],
    frame.geometry as never,
  );
}
