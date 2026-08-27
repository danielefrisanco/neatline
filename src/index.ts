import type {
  MapperOptions,
  MapResult,
  Point,
  Position,
  RenderOptions,
  Size,
} from "./types.js";

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

/**
 * Build a map.
 *
 * Phase 0 scaffold: the surface is real and the document is valid, but no
 * geometry is resolved yet. Phase 1 fills in regions, projections and paths.
 */
export function mapper(options: MapperOptions): MapResult {
  const [width, height] = options.size ?? DEFAULT_SIZE;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"`,
    ` class="mp" role="img" aria-label="Map">`,
    `</svg>`,
  ].join("");

  return {
    svg,
    css: "",

    project(_position: Position): Point | null {
      throw new Error("mapper: project() lands in phase 1 (geometry core)");
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
