import { geoBounds, geoPath } from "d3-geo";
import { framingGeometry, type FrameGeometry } from "./framing.js";
import { resolveId } from "./iso.js";
import { createProjection } from "./projections.js";
import { expandPreset, isRegionPreset } from "./regions.js";
import { loadCountries, type CountryFeature } from "./topology.js";
import type {
  BBox,
  MapperOptions,
  MapResult,
  Point,
  Position,
  Region,
  RenderOptions,
  Size,
} from "./types.js";

export { isoTable, resolveId, type IsoEntry } from "./iso.js";
export { PROJECTION_NAMES, isProjectionName } from "./projections.js";
export { REGION_PRESETS, REGION_PRESET_NAMES, isRegionPreset } from "./regions.js";

export type {
  BBox,
  Detail,
  GeoJsonFeatureCollection,
  MapperOptions,
  MapResult,
  Point,
  Position,
  ProjectionName,
  Region,
  RegionPreset,
  RenderOptions,
  Size,
} from "./types.js";

const DEFAULT_SIZE: Size = [1000, 1000];
const DEFAULT_PADDING = 24;

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Does a feature's bounding box overlap the requested one? */
function intersectsBBox(country: CountryFeature, bbox: BBox): boolean {
  const [[west, south], [east, north]] = geoBounds(country.geometry as never);
  const [wantWest, wantSouth, wantEast, wantNorth] = bbox;
  return west <= wantEast && east >= wantWest && south <= wantNorth && north >= wantSouth;
}

interface ResolvedRegion {
  readonly features: readonly CountryFeature[];
  /** What the camera frames — the bbox itself, when one was given. */
  readonly frame: FrameGeometry;
}

function resolveRegion(region: Region, all: readonly CountryFeature[]): ResolvedRegion {
  if (typeof region === "string") {
    if (!isRegionPreset(region)) {
      throw new Error(`mapper: unknown region preset "${region}"`);
    }
    const codes = expandPreset(region);
    const features = codes === null ? all : pick(codes, all);
    return { features, frame: framingGeometry(features) };
  }

  if (Array.isArray(region)) {
    const features = pick(region as readonly string[], all);
    return { features, frame: framingGeometry(features) };
  }

  if (typeof region === "object" && region !== null && "bbox" in region) {
    const { bbox } = region as { bbox: BBox };
    const [west, south, east, north] = bbox;
    const features = all.filter((c) => intersectsBBox(c, bbox));
    // Frame the rectangle that was asked for, not the countries that spill
    // outside it — otherwise a bbox over the Alps zooms out to all of France.
    const rectangle = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south],
              ],
            ],
          },
        },
      ],
    };
    return {
      features,
      frame: {
        geometry: rectangle,
        bounds: [[west, south], [east, north]],
        countries: features.map((f) => ({ id: f.id, name: f.name, geometry: f.geometry })),
        clipped: 0,
      },
    };
  }

  throw new Error("mapper: region must be a preset name, code list, bbox, or GeoJSON");
}

function pick(codes: readonly string[], all: readonly CountryFeature[]): CountryFeature[] {
  const wanted = new Set<string>();
  for (const code of codes) {
    const resolved = resolveId(code);
    if (resolved === null) {
      throw new Error(
        `mapper: unrecognised country code "${code}". ` +
          `Expected ISO 3166-1 alpha-2 ("FR"), numeric ("250"), or a user-assigned code ("XK").`,
      );
    }
    wanted.add(resolved);
  }
  return all.filter((country) => wanted.has(country.id));
}

/**
 * Build a map.
 *
 * Async because geometry is loaded per region rather than bundled wholesale —
 * the full dataset is 8 MB, so shipping it to every consumer is not an option.
 */
export async function mapper(options: MapperOptions): Promise<MapResult> {
  const detail = options.detail ?? "50m";
  const projectionName = options.projection ?? "equal-earth";
  const [width, height] = options.size ?? DEFAULT_SIZE;
  const padding = options.padding ?? DEFAULT_PADDING;

  const all = await loadCountries(detail);
  const { features, frame } = resolveRegion(options.region, all);

  if (features.length === 0) {
    throw new Error("mapper: region resolved to no countries");
  }

  const highlighted = new Set<string>();
  for (const code of options.highlight ?? []) {
    const resolved = resolveId(code);
    if (resolved === null) {
      throw new Error(`mapper: unrecognised highlight code "${code}"`);
    }
    highlighted.add(resolved);
  }

  const projection = createProjection(projectionName, frame, width, height, padding);
  const path = geoPath(projection).digits(1);

  const paths: string[] = [];
  for (const country of frame.countries) {
    const d = path(country.geometry as never);
    if (!d) continue;
    const highlight = highlighted.has(country.id) ? " is-highlighted" : "";
    paths.push(
      `<path class="mp-country${highlight}" data-iso="${country.id}"` +
        ` data-name="${escapeAttribute(country.name)}" d="${d}"/>`,
    );
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"` +
    ` class="mp" role="img" aria-label="Map">\n` +
    paths.join("\n") +
    `\n</svg>`;

  return {
    svg,
    css: "",

    project(position: Position): Point | null {
      const projected = projection([position[0], position[1]]);
      return projected === null ? null : [projected[0], projected[1]];
    },

    toString() {
      return svg;
    },

    async toFile(path: string, _options?: RenderOptions) {
      // Imported lazily so browser bundles never pull in node:fs.
      const { writeFile } = await import("node:fs/promises");
      await writeFile(path, this.toString(), "utf8");
    },
  };
}
