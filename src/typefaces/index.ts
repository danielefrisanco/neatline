/**
 * Type, as a category you pick rather than a stack you write.
 *
 * Colour already had this: a palette carries hue and nothing else, so it can be
 * laid over any theme without knowing a single selector. Type had no
 * equivalent — changing the lettering meant naming an exact font stack and
 * guessing at sizes to match it. These are the same idea applied to the other
 * half of a map's voice.
 *
 * Like a palette, a typeface carries only tokens, so it composes with every
 * theme and can never fight one over structure. Sizes travel with the stack
 * because they have to: a condensed face set at the size of a humanist one is
 * small, and a serif needs a fraction more room than a grotesk.
 *
 * Only stacks that are already on the machine. A map is a standalone file with
 * no network — a webfont would arrive as a request the document cannot make,
 * and the reader would see the fallback with none of the metrics the sizes here
 * were chosen for.
 */

const pack = (declarations: string): string => `.mp {\n${declarations.trim()}\n}`;

/** The default voice: a system UI face, even colour, no affect. */
export const humanist = pack(`
  --font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --label-size: 13;
  --place-label-size: 11;
  --label-track: 0;
  --label-weight: 500;
  --label-advance: 0.58;`);

/** Printed atlas: a book face, a little tracking, names set quietly. */
export const serif = pack(`
  --font: ui-serif, Georgia, "Iowan Old Style", "Times New Roman", serif;
  --label-size: 13.5;
  --place-label-size: 11;
  --label-track: 0.2;
  --label-weight: 400;
  --label-advance: 0.5;`);

/** Swiss signage: neutral, tight, slightly heavy, no warmth at all. */
export const grotesk = pack(`
  --font: Helvetica, "Helvetica Neue", Arial, "Liberation Sans", sans-serif;
  --label-size: 12.5;
  --place-label-size: 10.5;
  --label-track: 0.35;
  --label-weight: 600;
  --label-advance: 0.55;`);

/**
 * For crowded maps: narrow enough that more names pass the fit test.
 *
 * Set at the same size as `humanist` on purpose. Bumping the size to match the
 * apparent weight of a condensed face gave back in height exactly what the
 * narrower glyphs won in width, and the crowded map it exists for lost names
 * instead of gaining them.
 */
export const condensed = pack(`
  --font: "Roboto Condensed", "Arial Narrow", "Liberation Sans Narrow", ui-sans-serif, sans-serif;
  --label-size: 13;
  --place-label-size: 11;
  --label-track: 0;
  --label-weight: 600;
  --label-advance: 0.46;`);

/** Data and coordinates: even widths, so figures line up down a column. */
export const mono = pack(`
  --font: ui-monospace, "SF Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace;
  --label-size: 11.5;
  --place-label-size: 10;
  --label-track: 0;
  --label-weight: 500;
  --label-advance: 0.6;`);
