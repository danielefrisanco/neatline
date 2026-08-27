/**
 * Political fill: give every country a colour none of its neighbours has.
 *
 * The oldest convention in map-making, and the one that needs no data at all —
 * the point is not what the colour means but that the boundary between two
 * countries is legible without tracing a line. It is the sensible default for a
 * map with nothing to encode, which is most of them.
 *
 * Four colours provably suffice for any map drawn on a plane. This asks for six
 * and settles for what greedy colouring finds, because the graph it is handed
 * is not quite the one the theorem is about: exclaves, maritime arcs and
 * countries that meet at a point all put edges in it that a planar drawing
 * would not.
 */

/** How many `--fill-n` tokens the vocabulary defines. */
export const FILL_COUNT = 6;

/**
 * Welsh–Powell: colour the most-constrained country first.
 *
 * Taking countries in order of how many neighbours they have means the hard
 * cases are decided while every colour is still free, and it is what keeps the
 * result down near four. Ties break on the code so the same map always comes
 * out the same way — a snapshot that changed with iteration order would be
 * worthless.
 */
export function politicalFill(
  ids: readonly string[],
  adjacency: ReadonlyMap<string, ReadonlySet<string>>,
  count: number = FILL_COUNT,
): Map<string, number> {
  const total = Math.max(1, Math.floor(count));
  const ordered = [...ids].sort((a, b) => {
    const degree = (adjacency.get(b)?.size ?? 0) - (adjacency.get(a)?.size ?? 0);
    return degree !== 0 ? degree : a.localeCompare(b);
  });

  const assigned = new Map<string, number>();

  for (const id of ordered) {
    const taken = new Set<number>();
    for (const neighbour of adjacency.get(id) ?? []) {
      const colour = assigned.get(neighbour);
      if (colour !== undefined) taken.add(colour);
    }

    let chosen = 0;
    for (let colour = 1; colour <= total; colour += 1) {
      if (!taken.has(colour)) {
        chosen = colour;
        break;
      }
    }

    // Every colour spoken for. Impossible on a planar map with six available,
    // but the graph is not guaranteed planar — so rather than fail, reuse the
    // colour that appears least often around this country and leave a visible
    // clash instead of an unfilled hole.
    if (chosen === 0) {
      const frequency = new Map<number, number>();
      for (const neighbour of adjacency.get(id) ?? []) {
        const colour = assigned.get(neighbour);
        if (colour !== undefined) frequency.set(colour, (frequency.get(colour) ?? 0) + 1);
      }
      chosen = 1;
      let fewest = Infinity;
      for (let colour = 1; colour <= total; colour += 1) {
        const seen = frequency.get(colour) ?? 0;
        if (seen < fewest) {
          fewest = seen;
          chosen = colour;
        }
      }
    }

    assigned.set(id, chosen);
  }

  return assigned;
}
