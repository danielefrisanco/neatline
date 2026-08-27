/**
 * Classify values so a theme can colour them.
 *
 * The library never picks a colour. It sorts the values, puts each country in a
 * band, and writes `data-bin` — what that band looks like is the stylesheet's
 * business, exactly as it is for every other layer.
 *
 * Bands are by rank rather than by equal value intervals, because the data
 * people put on maps is usually skewed: five equal slices of European GDP put
 * Germany alone in the top band and everything else in the bottom one, which
 * shows nothing.
 */
export const DEFAULT_BINS = 5;

export interface Binned {
  readonly bin: number;
  readonly value: number;
}

export function assignBins(
  values: Readonly<Record<string, number>>,
  count: number,
  resolve: (code: string) => string | null,
): Map<string, Binned> {
  const entries: Array<[string, number]> = [];
  for (const [code, value] of Object.entries(values)) {
    const id = resolve(code);
    if (id === null || !Number.isFinite(value)) continue;
    entries.push([id, value]);
  }

  const bands = Math.max(1, Math.floor(count));
  const sorted = [...entries].sort((a, b) => a[1] - b[1]);
  const assigned = new Map<string, Binned>();

  for (const [index, [id, value]] of sorted.entries()) {
    const bin = Math.min(bands, Math.floor((index * bands) / sorted.length) + 1);
    assigned.set(id, { bin, value });
  }

  // Equal ranks deserve equal bands: without this, two countries with the same
  // value can land either side of a boundary purely by sort order.
  const byValue = new Map<number, number>();
  for (const [, entry] of assigned) {
    const lowest = byValue.get(entry.value);
    if (lowest === undefined || entry.bin < lowest) byValue.set(entry.value, entry.bin);
  }
  for (const [id, entry] of assigned) {
    assigned.set(id, { value: entry.value, bin: byValue.get(entry.value) ?? entry.bin });
  }

  return assigned;
}
