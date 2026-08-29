import { el, text, type SvgNode } from "./svg.js";
import type { Anchor, Credit, Size } from "./types.js";

/**
 * The furniture layer — everything placed on the canvas rather than on the map.
 *
 * This is the one layer that is not geographic, and the anchor is what makes it
 * so. Every other layer moves when the projection or the region changes,
 * because everything in it is somewhere on the ground. A credit line, a
 * watermark, a legend and a scale bar are on the *paper*: they belong to one of
 * nine positions on the canvas, in fixed user units, and must not shift when the
 * camera does.
 *
 * So the anchor is to this layer what `at` is to the annotations — the one
 * decision the rest of the layer copies. A watermark, a legend, a scale bar and
 * a north arrow all have to answer *where on the canvas*, and they will all
 * answer it this way.
 */

/** The nine positions, written the way a reader would say them. */
export const ANCHORS: readonly Anchor[] = Object.freeze([
  "top-left",
  "top",
  "top-right",
  "left",
  "centre",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
]);

export function isAnchor(value: string): value is Anchor {
  return (ANCHORS as readonly string[]).includes(value);
}

interface Placed {
  readonly x: number;
  readonly y: number;
  /** Which end of the text sits at `x`. */
  readonly textAnchor: "start" | "middle" | "end";
  /** Where `y` falls on the glyphs. */
  readonly baseline: "hanging" | "middle" | "auto";
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Turn an anchor into a point and the alignment that belongs with it.
 *
 * The alignment is half of what an anchor means and the easy half to forget: a
 * credit anchored bottom-right is not text placed at the bottom-right corner,
 * it is text whose *end* sits there. Placed by coordinate alone it would run
 * off the canvas, which is a thing you only notice once the credit is long.
 *
 * The inset is the map's own padding, so furniture lines up with the margin the
 * map was already drawn inside rather than inventing a second one.
 */
export function place([width, height]: Size, anchor: Anchor, inset: number): Placed {
  const [row, column] = rowAndColumn(anchor);

  const x = column === "left" ? inset : column === "right" ? width - inset : width / 2;
  const y = row === "top" ? inset : row === "bottom" ? height - inset : height / 2;

  return {
    x: round(x),
    y: round(y),
    textAnchor: column === "left" ? "start" : column === "right" ? "end" : "middle",
    // `hanging` at the top and the default at the bottom, so the inset measures
    // to the edge of the glyphs at both ends rather than to a baseline that
    // leaves the ascenders hanging out of the canvas at the top.
    baseline: row === "top" ? "hanging" : row === "bottom" ? "auto" : "middle",
  };
}

function rowAndColumn(anchor: Anchor): [row: string, column: string] {
  if (anchor === "centre") return ["middle", "centre"];
  const parts = anchor.split("-");
  if (parts.length === 2) return [parts[0] as string, parts[1] as string];
  // A bare "top", "bottom", "left" or "right" names one axis and centres the
  // other, which is what a reader means by it.
  const only = parts[0] as string;
  return only === "top" || only === "bottom" ? [only, "centre"] : ["middle", only];
}

/**
 * Build the furniture layer.
 *
 * Deliberately not part of the accessible description. A credit says who made
 * the map, which is not something the map is *of* — announcing it before the
 * geography would put the byline ahead of the subject.
 */
export function creditLayer(credit: Credit, size: Size, inset: number): SvgNode[] {
  if (credit.text === "") return [];
  const anchor = credit.anchor ?? "bottom-right";
  if (!isAnchor(anchor)) {
    throw new Error(
      `neatline: credit.anchor "${anchor}" is not one of ${ANCHORS.join(", ")}`,
    );
  }
  const at = place(size, anchor, inset);
  return [
    el(
      "text",
      {
        class: "mp-credit",
        "data-anchor": anchor,
        x: at.x,
        y: at.y,
        "text-anchor": at.textAnchor,
        "dominant-baseline": at.baseline,
      },
      [text(credit.text)],
    ),
  ];
}
