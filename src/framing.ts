import { geoArea, geoBounds, geoCentroid, geoDistance } from "d3-geo";
import type { CountryFeature } from "./topology.js";

export interface FramedCountry {
  readonly id: string;
  readonly name: string;
  /** Only the pieces that survived outlier rejection. */
  readonly geometry: unknown;
}

export interface FrameGeometry {
  /** What the camera fits to, and what gets drawn. */
  readonly geometry: { type: "FeatureCollection"; features: unknown[] };
  readonly bounds: [[number, number], [number, number]];
  readonly countries: readonly FramedCountry[];
  /** How many pieces were excluded, for diagnostics. */
  readonly clipped: number;
}

interface Piece {
  readonly country: CountryFeature;
  readonly geometry: unknown;
  readonly coordinates: unknown;
  readonly area: number;
  readonly centroid: [number, number];
}

/** How many deviations from the typical distance before a piece is an outlier. */
const OUTLIER_FACTOR = 4;
/** Never clip closer than this (radians ≈ 17°), so compact regions stay whole. */
const MIN_RADIUS = 0.3;
/** Refuse to clip if it would discard this much of the region's land. */
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
      });
    }
  }

  return pieces;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
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
  const pieces = explode(features);
  if (pieces.length < 2) return unchanged(features);

  const centre = geoCentroid({
    type: "FeatureCollection",
    features: features.map((f) => f.geometry),
  } as never);
  const distances = pieces.map((piece) => geoDistance(piece.centroid, centre));

  const typical = median(distances);
  const deviation = median(distances.map((d) => Math.abs(d - typical)));
  const limit = Math.max(typical + OUTLIER_FACTOR * deviation, MIN_RADIUS);

  const kept: Piece[] = [];
  let keptArea = 0;
  let totalArea = 0;
  for (const [index, piece] of pieces.entries()) {
    totalArea += piece.area;
    if ((distances[index] ?? 0) <= limit) {
      kept.push(piece);
      keptArea += piece.area;
    }
  }

  // A genuinely dispersed region — Oceania, or the world — is not an outlier
  // problem, and clipping it would be the bug rather than the fix.
  if (kept.length === 0 || keptArea < totalArea * (1 - MAX_AREA_LOSS)) {
    return unchanged(features);
  }

  // Reassemble the surviving pieces back into one feature per country, so the
  // emitter still writes a single path per country carrying its own id.
  const byCountry = new Map<string, { country: CountryFeature; rings: unknown[] }>();
  for (const piece of kept) {
    const entry = byCountry.get(piece.country.id) ?? { country: piece.country, rings: [] };
    entry.rings.push(piece.coordinates);
    byCountry.set(piece.country.id, entry);
  }

  const countries: FramedCountry[] = [...byCountry.values()].map(({ country, rings }) => ({
    id: country.id,
    name: country.name,
    geometry: {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "MultiPolygon" as const, coordinates: rings },
    },
  }));

  const geometry = {
    type: "FeatureCollection" as const,
    features: countries.map((c) => c.geometry),
  };

  return {
    geometry,
    bounds: geoBounds(geometry as never),
    countries,
    clipped: pieces.length - kept.length,
  };
}
