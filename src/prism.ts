import { geoPath, type GeoProjection } from "d3-geo";
import { el, type SvgElement, type SvgNode } from "./svg.js";
import { text } from "./svg.js";

/**
 * Extruded countries — height as quantity.
 *
 * The map most people mean by "3D": each country raised in proportion to a
 * value, so the shape of the data is legible before any legend is read.
 *
 * Built by sweeping the projected outline upward. A country is drawn as its
 * footprint, plus one quad per edge running from the footprint to the raised
 * copy, plus the raised copy on top. The union of those is the solid, and it
 * works for any polygon — concave, holed, or in pieces — without a geometry
 * library.
 */

/** Collects the points d3 would otherwise write straight into a path string. */
class Recorder {
  readonly rings: Array<Array<[number, number]>> = [];
  private current: Array<[number, number]> = [];

  moveTo(x: number, y: number): void {
    this.current = [[x, y]];
  }
  lineTo(x: number, y: number): void {
    this.current.push([x, y]);
  }
  closePath(): void {
    if (this.current.length > 2) this.rings.push(this.current);
    this.current = [];
  }
  /** d3 calls this for point geometry; a prism has none. */
  arc(): void {}
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function ringPath(ring: ReadonlyArray<readonly [number, number]>, lift: number): string {
  let out = "";
  for (const [index, point] of ring.entries()) {
    out += `${index === 0 ? "M" : "L"}${round(point[0])},${round(point[1] - lift)}`;
  }
  return `${out}Z`;
}

/**
 * The footprint plus every edge swept upward.
 *
 * Each quad is wound consistently before it is written: the winding of an edge
 * follows the direction the outline happens to run, and under the nonzero fill
 * rule two quads of opposite winding punch a hole in each other.
 */
function sidePath(rings: ReadonlyArray<ReadonlyArray<[number, number]>>, lift: number): string {
  let out = "";
  for (const ring of rings) {
    out += ringPath(ring, 0);
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i] as [number, number];
      const b = ring[(i + 1) % ring.length] as [number, number];
      const quad: Array<[number, number]> = [
        [a[0], a[1]],
        [b[0], b[1]],
        [b[0], b[1] - lift],
        [a[0], a[1] - lift],
      ];
      let area = 0;
      for (let k = 0; k < 4; k += 1) {
        const p = quad[k] as [number, number];
        const q = quad[(k + 1) % 4] as [number, number];
        area += p[0] * q[1] - q[0] * p[1];
      }
      const ordered = area < 0 ? [...quad].reverse() : quad;
      out += ringPath(ordered, 0);
    }
  }
  return out;
}

export interface PrismInput {
  readonly id: string;
  readonly name: string;
  readonly geometry: unknown;
  readonly height: number;
  readonly highlighted: boolean;
}

export function prisms(
  countries: readonly PrismInput[],
  projection: GeoProjection,
): SvgNode[] {
  const drawn: Array<{ depth: number; node: SvgElement }> = [];

  for (const country of countries) {
    const recorder = new Recorder();
    geoPath(projection, recorder as never)(country.geometry as never);
    if (recorder.rings.length === 0) continue;

    const lift = Math.max(0, country.height);
    let depth = -Infinity;
    for (const ring of recorder.rings) {
      for (const point of ring) depth = Math.max(depth, point[1]);
    }

    const classes = country.highlighted ? "mp-prism is-highlighted" : "mp-prism";
    const children: SvgNode[] = [];
    if (country.name !== "") children.push(el("title", {}, [text(country.name)]));
    if (lift > 0) {
      children.push(el("path", { class: "mp-prism-side", d: sidePath(recorder.rings, lift) }));
    }
    children.push(
      el("path", {
        class: "mp-prism-top",
        d: recorder.rings.map((ring) => ringPath(ring, lift)).join(""),
      }),
    );

    drawn.push({
      depth,
      node: el(
        "g",
        {
          class: classes,
          "data-iso": country.id === "" ? undefined : country.id,
          "data-name": country.name === "" ? undefined : country.name,
          "data-height": round(lift),
        },
        children,
      ),
    });
  }

  // Painter's algorithm: the far side of the map first, so a nearer country
  // stands in front of the one behind it rather than being cut into by it.
  drawn.sort((a, b) => a.depth - b.depth);
  return drawn.map((entry) => entry.node);
}

/**
 * Turn caller values into heights in user units.
 *
 * Values arrive raw — GDP, headcount, whatever — and are scaled against the
 * largest so the caller never has to know what an SVG unit is.
 */
export function heightsFor(
  extrude: number | { readonly values: Readonly<Record<string, number>>; readonly height?: number },
  resolve: (code: string) => string | null,
): { readonly uniform: number | null; readonly byId: Map<string, number> } {
  if (typeof extrude === "number") return { uniform: extrude, byId: new Map() };

  const tallest = extrude.height ?? 120;
  const entries: Array<[string, number]> = [];
  let largest = 0;
  for (const [code, value] of Object.entries(extrude.values)) {
    const id = resolve(code);
    if (id === null || !Number.isFinite(value)) continue;
    entries.push([id, Math.max(0, value)]);
    largest = Math.max(largest, Math.max(0, value));
  }

  const byId = new Map<string, number>();
  for (const [id, value] of entries) {
    byId.set(id, largest === 0 ? 0 : (value / largest) * tallest);
  }
  return { uniform: null, byId };
}
