import { geoBounds, geoPath } from "d3-geo";
import { framingGeometry, type FrameGeometry } from "./framing.js";
import { resolveId } from "./iso.js";
import { createProjection } from "./projections.js";
import { expandPreset, isRegionPreset, presetLabel } from "./regions.js";
import { el, serialize, text, type SvgNode } from "./svg.js";
import {
  BACKGROUND_CLASS,
  HIGHLIGHT_CLASS,
  LAYER_CLASS,
  LAYERS,
  ROOT_CLASS,
  type LayerName,
} from "./taxonomy.js";
import { loadWorld, type CountryFeature } from "./topology.js";
import type {
  BBox,
  GeoJsonFeatureCollection,
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
export {
  BACKGROUND_CLASS,
  HIGHLIGHT_CLASS,
  LAYERS,
  LAYER_CLASS,
  RESERVED_CLASSES,
  ROOT_CLASS,
  type LayerName,
  type LayerSpec,
} from "./taxonomy.js";

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
  /**
   * Which countries may contribute shared boundaries. Empty for caller-supplied
   * GeoJSON: its outlines are the caller's own, and meshing them against the
   * bundled arcs would draw borders that do not match the drawn land.
   */
  readonly borderIds: readonly string[];
  readonly description: string;
}

function degrees(value: number, negative: string, positive: string): string {
  const rounded = Math.round(Math.abs(value) * 10) / 10;
  return `${rounded}°${value < 0 ? negative : positive}`;
}

/** "France", "France and Germany", "France, Germany and Italy", then a count. */
function listNames(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] as string;
  if (names.length > 3) return `${names.length} countries`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1] as string}`;
}

function readCustomFeature(raw: unknown): CountryFeature {
  const record = raw as {
    id?: string | number;
    properties?: Record<string, unknown>;
  };
  const properties = record.properties ?? {};
  const candidate =
    record.id ?? properties["iso"] ?? properties["iso_a2"] ?? properties["id"];
  const id = candidate === undefined ? null : resolveId(String(candidate));
  const name = typeof properties["name"] === "string" ? properties["name"] : "";
  // An unresolvable id is not an error here: caller-supplied geometry has no
  // obligation to be a country. It simply cannot be targeted by `highlight`.
  return { id: id ?? "", name, geometry: raw };
}

function resolveRegion(region: Region, all: readonly CountryFeature[]): ResolvedRegion {
  if (typeof region === "string") {
    if (!isRegionPreset(region)) {
      throw new Error(`mapper: unknown region preset "${region}"`);
    }
    const codes = expandPreset(region);
    const features = codes === null ? all : pick(codes, all);
    return {
      features,
      frame: framingGeometry(features),
      borderIds: features.map((f) => f.id),
      description: `Map of ${presetLabel(region)}`,
    };
  }

  if (Array.isArray(region)) {
    const features = pick(region as readonly string[], all);
    return {
      features,
      frame: framingGeometry(features),
      borderIds: features.map((f) => f.id),
      description: `Map of ${listNames(features.map((f) => f.name).filter(Boolean))}`,
    };
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
        bounds: [
          [west, south],
          [east, north],
        ],
        countries: features.map((f) => ({ id: f.id, name: f.name, geometry: f.geometry })),
        clipped: 0,
      },
      borderIds: features.map((f) => f.id),
      description:
        `Map of the area from ${degrees(west, "W", "E")} ${degrees(south, "S", "N")}` +
        ` to ${degrees(east, "W", "E")} ${degrees(north, "S", "N")}`,
    };
  }

  if (
    typeof region === "object" &&
    region !== null &&
    (region as GeoJsonFeatureCollection).type === "FeatureCollection"
  ) {
    const features = (region as GeoJsonFeatureCollection).features.map(readCustomFeature);
    if (features.length === 0) {
      throw new Error("mapper: region FeatureCollection is empty");
    }
    return {
      features,
      frame: framingGeometry(features),
      borderIds: [],
      description: `Map of ${features.length} custom ${features.length === 1 ? "feature" : "features"}`,
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

  const world = await loadWorld(detail);
  const resolved = resolveRegion(options.region, world.countries);
  const { frame } = resolved;

  if (resolved.features.length === 0) {
    throw new Error("mapper: region resolved to no countries");
  }

  const highlighted = new Set<string>();
  for (const code of options.highlight ?? []) {
    const code2 = resolveId(code);
    if (code2 === null) {
      throw new Error(`mapper: unrecognised highlight code "${code}"`);
    }
    highlighted.add(code2);
  }

  const projection = createProjection(projectionName, frame, width, height, padding);
  const path = geoPath(projection).digits(1);

  const content = new Map<LayerName, SvgNode[]>();

  const land: SvgNode[] = [];
  const highlightedNames: string[] = [];
  for (const country of frame.countries) {
    const d = path(country.geometry as never);
    if (!d) continue;
    const isHighlighted = country.id !== "" && highlighted.has(country.id);
    if (isHighlighted && country.name) highlightedNames.push(country.name);
    land.push(
      el(
        "path",
        {
          class: isHighlighted ? `mp-country ${HIGHLIGHT_CLASS}` : "mp-country",
          "data-iso": country.id === "" ? undefined : country.id,
          "data-name": country.name === "" ? undefined : country.name,
          d,
        },
        // A per-feature title is a hover tooltip, not an accessibility tree:
        // the root carries `role="img"`, so assistive technology reads the
        // label once instead of announcing two hundred paths.
        country.name === "" ? [] : [el("title", {}, [text(country.name)])],
      ),
    );
  }
  content.set("land", land);

  const borderGeometry =
    resolved.borderIds.length > 0 ? world.borders(resolved.borderIds) : null;
  if (borderGeometry !== null) {
    const d = path(borderGeometry as never);
    if (d) {
      content.set("borders", [el("path", { class: "mp-border", "data-kind": "intl", d })]);
    }
  }

  const description = options.title ?? describe(resolved.description, highlightedNames);

  const root = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      preserveAspectRatio: "xMidYMid meet",
      class: ROOT_CLASS,
      role: "img",
      "aria-label": description,
    },
    [
      el("title", {}, [text(description)]),
      el("rect", { class: BACKGROUND_CLASS, x: 0, y: 0, width, height }),
      // Every slot is emitted, in order, empty or not. Inserting one later
      // would restack the layers underneath it and break themes in the wild.
      ...LAYERS.map((spec) =>
        el(
          "g",
          {
            class: `${LAYER_CLASS} ${spec.className}`,
            // Structural, not stylistic: a line drawn with the default fill
            // renders as a filled blob. Presentation attributes lose to any
            // CSS rule, so a theme can still override it.
            fill: spec.name === "borders" ? "none" : undefined,
          },
          content.get(spec.name) ?? [],
        ),
      ),
    ],
  );

  const svg = serialize(root);

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

    async toFile(target: string, _options?: RenderOptions) {
      // Imported lazily so browser bundles never pull in node:fs.
      const { writeFile } = await import("node:fs/promises");
      await writeFile(target, this.toString(), "utf8");
    },
  };
}

function describe(base: string, highlightedNames: readonly string[]): string {
  return highlightedNames.length === 0
    ? base
    : `${base}, highlighting ${listNames(highlightedNames)}`;
}
