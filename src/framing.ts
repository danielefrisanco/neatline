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

/**
 * How far past its own core a piece may sit before it stops being part of the
 * country as anyone pictures it.
 */
const REACH = 3;
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
  const byCountry = new Map<string, { country: CountryFeature; rings: unknown[] }>();
  let clipped = 0;

  // Judged one country at a time, because "does this piece belong?" is a
  // question about a country, not about a region. French Guiana is 15% of
  // France by area and Patagonia is 14% of South America — no threshold on
  // size can tell them apart. But Guiana is an outlier *within France*, while
  // Patagonia is simply where Argentina is.
  for (const country of features) {
    const pieces = explode([country]);
    if (pieces.length === 0) continue;

    const kept = pieces.length < 2 ? pieces : core(pieces);
    clipped += pieces.length - kept.length;

    const entry = byCountry.get(country.id) ?? { country, rings: [] };
    for (const piece of kept) entry.rings.push(piece.coordinates);
    byCountry.set(country.id, entry);
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

  if (countries.length === 0) return unchanged(features);

  const geometry = {
    type: "FeatureCollection" as const,
    features: countries.map((c) => c.geometry),
  };

  return { geometry, bounds: geoBounds(geometry as never), countries, clipped };
}

/**
 * The pieces of one country that make up the country itself.
 *
 * Walk outward from the country's own centre until most of its land is behind
 * you — that is its core, and its radius sets the scale. Anything sitting
 * several times farther out than that is an overseas holding: still the same
 * country, but not the shape the name brings to mind, and not what a reader
 * expects a map of it to frame.
 */
function core(pieces: readonly Piece[]): Piece[] {
  const centre = geoCentroid({
    type: "FeatureCollection",
    features: pieces.map((piece) => piece.geometry),
  } as never) as [number, number];

  const ranked = pieces
    .map((piece) => ({ piece, distance: geoDistance(piece.centroid, centre) }))
    .sort((a, b) => a.distance - b.distance);

  const total = ranked.reduce((sum, entry) => sum + entry.piece.area, 0);
  if (total <= 0) return [...pieces];

  let behind = 0;
  let radius = 0;
  for (const entry of ranked) {
    radius = entry.distance;
    behind += entry.piece.area;
    if (behind >= total * CORE_SHARE) break;
  }

  const limit = Math.max(radius * REACH, MIN_RADIUS);
  const kept = ranked.filter((entry) => entry.distance <= limit);
  const keptArea = kept.reduce((sum, entry) => sum + entry.piece.area, 0);

  // A country that genuinely is an archipelago is not an outlier problem.
  if (kept.length === 0 || keptArea < total * (1 - MAX_AREA_LOSS)) return [...pieces];
  return kept.map((entry) => entry.piece);
}
