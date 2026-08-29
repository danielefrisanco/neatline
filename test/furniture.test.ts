import { describe, expect, it } from "vitest";
import { ANCHORS, isAnchor, neatline, type Anchor } from "../src/index.js";

/**
 * Furniture is the one layer that is not geographic.
 *
 * Every other layer holds things that are somewhere on the ground, and they all
 * move when the projection or the region changes. A credit line is on the
 * *paper*. The test that matters here is therefore not that it renders — it is
 * that reframing the map underneath it does not move it, because the moment it
 * moves it has stopped being furniture and become a caption on the ground.
 */

const SIZE = [800, 600] as const;
const PADDING = 20;

interface Line {
  readonly anchor: string | null;
  readonly x: number;
  readonly y: number;
  readonly textAnchor: string | null;
  readonly text: string;
}

function attribute(source: string, name: string): string | null {
  const match = new RegExp(`${name}="([^"]*)"`).exec(source);
  return match === null ? null : (match[1] as string);
}

/**
 * The `.mp-furniture` group's contents, and nothing outside it.
 *
 * An empty layer serialises self-closing — `<g class="…"/>` — which is what
 * lets a reserved slot exist at no cost and still accept children once parsed.
 * So "no content" is a tag that never opens, not a pair with nothing between.
 */
function furniture(svg: string): string {
  const start = svg.indexOf('class="mp-layer mp-furniture"');
  expect(start, "the furniture layer is always emitted").toBeGreaterThan(-1);
  const tagEnd = svg.indexOf(">", start);
  if (svg[tagEnd - 1] === "/") return "";
  const close = svg.indexOf("</g>", tagEnd);
  expect(close, "the furniture group never closes").toBeGreaterThan(-1);
  return svg.slice(tagEnd + 1, close);
}

function credit(svg: string): Line | null {
  const match = /<text class="mp-credit"([^>]*)>([\s\S]*?)<\/text>/.exec(furniture(svg));
  if (match === null) return null;
  const attributes = match[1] as string;
  return {
    anchor: attribute(attributes, "data-anchor"),
    x: Number(attribute(attributes, "x")),
    y: Number(attribute(attributes, "y")),
    textAnchor: attribute(attributes, "text-anchor"),
    text: (match[2] as string).trim(),
  };
}

async function withAnchor(anchor: Anchor) {
  return await neatline({
    region: "west-europe",
    detail: "110m",
    size: SIZE,
    padding: PADDING,
    credit: { text: "Source: Natural Earth", anchor },
  });
}

describe("a credit line", () => {
  it.each(ANCHORS)("sits at the %s of the canvas", async (anchor) => {
    const map = await withAnchor(anchor as Anchor);
    const line = credit(map.svg);
    expect(line, `no credit for ${anchor}`).not.toBeNull();
    expect(line?.anchor).toBe(anchor);

    const wantsLeft = anchor.endsWith("left");
    const wantsRight = anchor.endsWith("right");
    const wantsTop = anchor.startsWith("top");
    const wantsBottom = anchor.startsWith("bottom");

    expect(line?.x).toBe(
      wantsLeft ? PADDING : wantsRight ? SIZE[0] - PADDING : SIZE[0] / 2,
    );
    expect(line?.y).toBe(
      wantsTop ? PADDING : wantsBottom ? SIZE[1] - PADDING : SIZE[1] / 2,
    );

    // The alignment is half of what an anchor means, and the half that is easy
    // to forget: a credit anchored right is text whose *end* sits at the edge.
    // Placed by coordinate alone, a long one runs off the canvas.
    expect(line?.textAnchor).toBe(wantsLeft ? "start" : wantsRight ? "end" : "middle");
  });

  it("does not move when the map underneath it is reframed", async () => {
    // The defining property of the layer. If this ever fails, the credit has
    // stopped being furniture and become a caption on the ground.
    const base = { detail: "110m", size: SIZE, padding: PADDING, credit: "Reuters" } as const;
    const maps = await Promise.all([
      neatline({ ...base, region: "west-europe", projection: "conic-conformal" }),
      neatline({ ...base, region: "africa", projection: "orthographic" }),
      neatline({ ...base, region: "world", projection: "equal-earth" }),
      neatline({ ...base, region: ["JP"], projection: "mercator" }),
    ]);
    const placed = maps.map((m) => credit(m.svg));
    for (const line of placed) {
      expect(line?.x).toBe(placed[0]?.x);
      expect(line?.y).toBe(placed[0]?.y);
    }
    // And it really is four different maps underneath.
    const paris = maps.map((m) => JSON.stringify(m.project([2.35, 48.86])));
    expect(new Set(paris).size).toBeGreaterThan(1);
  });

  it("follows the padding the map was drawn inside", async () => {
    // Furniture lines up with the margin the map already has rather than
    // inventing a second one.
    const tight = await neatline({
      region: "west-europe",
      detail: "110m",
      size: SIZE,
      padding: 8,
      credit: "x",
    });
    const loose = await neatline({
      region: "west-europe",
      detail: "110m",
      size: SIZE,
      padding: 60,
      credit: "x",
    });
    expect(credit(tight.svg)?.x).toBe(SIZE[0] - 8);
    expect(credit(loose.svg)?.x).toBe(SIZE[0] - 60);
  });

  it("takes a bare string at the default anchor", async () => {
    const map = await neatline({ region: "west-europe", detail: "110m", credit: "Reuters" });
    const line = credit(map.svg);
    expect(line?.text).toBe("Reuters");
    expect(line?.anchor).toBe("bottom-right");
  });

  it("puts nothing in the layer when there is nothing to say", async () => {
    const none = await neatline({ region: "west-europe", detail: "110m" });
    expect(furniture(none.svg).trim()).toBe("");
    const empty = await neatline({ region: "west-europe", detail: "110m", credit: "" });
    expect(furniture(empty.svg).trim()).toBe("");
  });

  it("leaves the layer emitted and empty when furniture is switched off", async () => {
    const map = await neatline({
      region: "west-europe",
      detail: "110m",
      credit: "Reuters",
      layers: { furniture: false },
    });
    expect(map.svg).toContain('class="mp-layer mp-furniture"');
    expect(furniture(map.svg).trim()).toBe("");
  });

  it("refuses an anchor that is not one of the nine", async () => {
    await expect(
      neatline({
        region: "west-europe",
        detail: "110m",
        credit: { text: "x", anchor: "middle-left" as Anchor },
      }),
    ).rejects.toThrow(/is not one of/);
  });

  it("stays out of the accessible description", async () => {
    // A credit says who made the map, which is not what the map is *of*.
    // Announcing it would put the byline ahead of the subject.
    const map = await neatline({
      region: "west-europe",
      detail: "110m",
      credit: "Reuters graphics",
    });
    expect(/aria-label="([^"]*)"/.exec(map.svg)?.[1]).not.toContain("Reuters");
  });

  it("agrees with itself about what an anchor is", () => {
    expect(ANCHORS).toHaveLength(9);
    expect(new Set(ANCHORS).size).toBe(9);
    expect(ANCHORS.every((a) => isAnchor(a))).toBe(true);
    expect(isAnchor("middle-left")).toBe(false);
    expect(isAnchor("center")).toBe(false);
  });
});
