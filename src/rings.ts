import { geoPath, type GeoProjection } from "d3-geo";

/**
 * Projected outlines, and the small amount of plane geometry two layers need.
 *
 * `geoPath` normally writes a path string, but a prism has to sweep every edge
 * upward and a label has to be placed inside a shape — both need the points
 * themselves. Sharing the recorder keeps one definition of what a ring is.
 */

/** A closed projected outline, in SVG user units. */
export type Ring = Array<[number, number]>;

/** Collects the points d3 would otherwise write straight into a path string. */
export class Recorder {
  readonly rings: Ring[] = [];
  private current: Ring = [];

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
  /** d3 calls this for point geometry; neither caller has any. */
  arc(): void {}
}

export function projectRings(geometry: unknown, projection: GeoProjection): Ring[] {
  const recorder = new Recorder();
  geoPath(projection, recorder as never)(geometry as never);
  return recorder.rings;
}

/** `[minX, minY, maxX, maxY]` in user units. */
export type RingBox = readonly [number, number, number, number];

export function ringBox(ring: Ring): RingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/** Twice the signed area. The sign follows the winding; callers take the size. */
export function signedArea(ring: Ring): number {
  let total = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i] as [number, number];
    const b = ring[(i + 1) % ring.length] as [number, number];
    total += a[0] * b[1] - b[0] * a[1];
  }
  return total / 2;
}

/**
 * The area-weighted centroid — the balance point, not the average of the
 * vertices, which drifts toward wherever the outline happens to be detailed.
 */
export function centroid(ring: Ring): [number, number] {
  let area = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i] as [number, number];
    const b = ring[(i + 1) % ring.length] as [number, number];
    const cross = a[0] * b[1] - b[0] * a[1];
    area += cross;
    x += (a[0] + b[0]) * cross;
    y += (a[1] + b[1]) * cross;
  }
  if (area === 0) {
    // A degenerate ring has no balance point; the mean is the honest answer.
    const mean = ring.reduce((sum, p) => [sum[0] + p[0], sum[1] + p[1]], [0, 0]);
    return [mean[0] / ring.length, mean[1] / ring.length];
  }
  return [x / (3 * area), y / (3 * area)];
}

/** Ray casting, counting crossings to the right of the point. */
export function contains(ring: Ring, [x, y]: readonly [number, number]): boolean {
  let inside = false;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i] as [number, number];
    const b = ring[(i + 1) % ring.length] as [number, number];
    if (a[1] > y === b[1] > y) continue;
    const crossing = a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
    if (crossing > x) inside = !inside;
  }
  return inside;
}
