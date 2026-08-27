import { geoArea, geoBounds, geoCentroid, geoDistance } from "d3-geo";
import type { CountryFeature } from "./topology.js";

export interface FramedCountry {
  readonly id: string;
  readonly name: string;
  /** The country's whole geometry. What falls outside the frame is unseen. */
  readonly geometry: unknown;
}

export interface FrameGeometry {
  /** What the camera fits to. Not what gets drawn — see `countries`. */
  readonly geometry: { type: "FeatureCollection"; features: unknown[] };
  readonly bounds: [[number, number], [number, number]];
  readonly countries: readonly FramedCountry[];
  /**
   * Retained for diagnostics. Always 0 now that nothing is excluded from the
   * output: pieces outside the frame are invisible, not deleted.
   */
  readonly clipped: number;
}

interface Piece {
  readonly country: CountryFeature;
  readonly geometry: unknown;
  readonly coordinates: unknown;
  readonly area: number;
  readonly centroid: [number, number];
  readonly bounds: [[number, number], [number, number]];
}

/**
 * How far past its own extent a piece may sit before it stops being part of the
 * country as anyone pictures it.
 */
const REACH = 1.5;
/** The share of a country's land that defines where its core ends. */
const CORE_SHARE = 0.6;
/** Never clip closer than this (radians ≈ 1.1°), so small countries stay whole. */
const MIN_RADIUS = 0.02;
/** Refuse to clip a country if it would discard this much of its land. */
const MAX_AREA_LOSS = 0.4;

/** Split MultiPolygons so an overseas department can be judged on its own. */
function explode(features: readonly CountryFeature[]): Piece[] {
  const pieces: Piece[] = [];

  for (const country of features) {
    const shape = country.geometry as {
      geometry?: { type?: string; coordinates?: unknown[] };
    };
    const geometry = shape.geometry;

    const rings =
      geometry?.type === "MultiPolygon" && Array.isArray(geometry.coordinates)
        ? geometry.coordinates
        : [(geometry as { coordinates?: unknown } | undefined)?.coordinates];

    for (const coordinates of rings) {
      if (coordinates === undefined) continue;
      const part = {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "Polygon" as const, coordinates },
      };
      pieces.push({
        country,
        geometry: part,
        coordinates,
        area: geoArea(part as never),
        centroid: geoCentroid(part as never) as [number, number],
        bounds: geoBounds(part as never) as [[number, number], [number, number]],
      });
    }
  }

  return pieces;
}

/**
 * The extent the camera should frame.
 *
 * A country's geometry includes everything it governs, which for France means
 * French Guiana. Fitting to raw bounds would frame South America and squash
 * Europe into a corner. So outlying pieces are dropped from the *camera*
 * calculation only — they are still drawn, and simply fall outside the
 * viewport, which is what a reader expects from a map of Western Europe.
 *
 * Outliers are judged by angular distance from the region's centre rather than
 * by area: French Guiana is 13% of France by area, so an area threshold would
 * never catch it. Distance is measured on the sphere, so regions spanning the
 * antimeridian are handled without special cases.
 */
function unchanged(features: readonly CountryFeature[]): FrameGeometry {
  const all = { type: "FeatureCollection" as const, features: features.map((f) => f.geometry) };
  return {
    geometry: all,
    bounds: geoBounds(all as never),
    countries: features.map((f) => ({ id: f.id, name: f.name, geometry: f.geometry })),
    clipped: 0,
  };
}

export function framingGeometry(features: readonly CountryFeature[]): FrameGeometry {
  // Two separate questions, and conflating them caused every "where did it go?"
  // in this file's history. What the camera should frame is one question; what
  // should be drawn is another.
  //
  // Only the first needs judgement. French Guiana must not drag the camera to
  // South America on a map of France — but it is still France, and on a map of
  // the world it is simply there, as Alaska is still part of the United States.
  // So the camera is fitted to each country's core, and then everything is
  // drawn. Whatever falls outside the frame is invisible rather than deleted,
  // which is exactly what a paper atlas does, and nothing can go missing from a
  // map that is showing it.
  const anchors: unknown[] = [];
  for (const country of features) {
    const pieces = explode([country]);
    const kept = pieces.length < 2 ? pieces : core(pieces);
    for (const piece of kept) anchors.push(piece.geometry);
  }
  if (anchors.length === 0) return unchanged(features);

  const bounds = geoBounds({ type: "FeatureCollection", features: anchors } as never) as [
    [number, number],
    [number, number],
  ];

  return {
    // The camera fits the cores...
    geometry: { type: "FeatureCollection" as const, features: anchors },
    bounds,
    // ...and everything is drawn into it.
    countries: features.map((f) => ({ id: f.id, name: f.name, geometry: f.geometry })),
    clipped: 0,
  };
}

/**
 * The pieces of one country that make up the country itself.
 *
 * Anchored on the largest piece, not on the country's centroid: France's
 * centroid sits in the Atlantic because French Guiana drags it there, which
 * would put mainland France 7° from its own centre and make every threshold
 * meaningless.
 *
 * The scale comes from how big the core *is*, not from how far its centroid
 * sits from the anchor — that distance is near zero for any country with one
 * dominant landmass, which clipped Sicily and Sardinia off Italy. A country's
 * own extent is the only sensible ruler for what counts as far away from it.
 */
function core(pieces: readonly Piece[]): Piece[] {
  const anchor = [...pieces].sort((a, b) => b.area - a.area)[0];
  if (anchor === undefined) return [...pieces];

  const ranked = pieces
    .map((piece) => ({ piece, distance: geoDistance(piece.centroid, anchor.centroid) }))
    .sort((a, b) => a.distance - b.distance);

  const total = ranked.reduce((sum, entry) => sum + entry.piece.area, 0);
  if (total <= 0) return [...pieces];

  const inner: Piece[] = [];
  let behind = 0;
  for (const entry of ranked) {
    inner.push(entry.piece);
    behind += entry.piece.area;
    if (behind >= total * CORE_SHARE) break;
  }

  const [[west, south], [east, north]] = geoBounds({
    type: "FeatureCollection",
    features: inner.map((piece) => piece.geometry),
  } as never);
  const extent = geoDistance([west, south], [east, north]) / 2;

  const limit = Math.max(extent * REACH, MIN_RADIUS);
  const kept = ranked.filter((entry) => entry.distance <= limit);
  const keptArea = kept.reduce((sum, entry) => sum + entry.piece.area, 0);

  // A country that genuinely is an archipelago is not an outlier problem.
  if (kept.length === 0 || keptArea < total * (1 - MAX_AREA_LOSS)) return [...pieces];
  return kept.map((entry) => entry.piece);
}
