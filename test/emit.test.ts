import { describe, expect, it } from "vitest";
import { mapper } from "../src/index.js";

describe("geometry", () => {
  it("draws the region", async () => {
    const map = await mapper({ region: "west-europe", detail: "110m" });
    expect(map.svg).toContain("<path");
    expect(map.svg).toContain('data-iso="FR"');
    expect(map.svg).toContain('data-name="France"');
  });

  it("draws only what the region asked for", async () => {
    const map = await mapper({ region: ["FR", "DE"], detail: "110m" });
    expect(map.svg.match(/class="mp-country"/g)).toHaveLength(2);
    expect(map.svg).not.toContain('data-iso="ES"');
  });

  it("accepts numeric codes as readily as alpha-2", async () => {
    const map = await mapper({ region: ["250", "276"], detail: "110m" });
    expect(map.svg).toContain('data-iso="FR"');
    expect(map.svg).toContain('data-iso="DE"');
  });

  it("marks highlighted countries and leaves the rest alone", async () => {
    const map = await mapper({
      region: "west-europe",
      detail: "110m",
      highlight: ["FR", "BE"],
    });
    expect(map.svg).toContain('class="mp-country is-highlighted" data-iso="FR"');
    expect(map.svg).toContain('class="mp-country" data-iso="ES"');
  });

  it("selects by bounding box", async () => {
    const map = await mapper({
      region: { bbox: [-10, 36, 5, 52] },
      detail: "110m",
    });
    expect(map.svg).toContain('data-iso="ES"');
    expect(map.svg).not.toContain('data-iso="FI"');
  });
});

describe("framing", () => {
  // France governs French Guiana, so its geometry reaches South America.
  // Fitting to raw bounds frames the Atlantic and squashes Europe into a
  // corner. Guyane is still France and is still drawn — it just falls outside
  // the viewport, the way a paper atlas of Western Europe handles it.
  it("frames Europe, not the Atlantic", async () => {
    const map = await mapper({
      region: "west-europe",
      detail: "110m",
      projection: "conic-conformal",
      size: [1000, 1000],
      padding: 40,
    });

    const paris = map.project([2.35, 48.86])!;
    expect(paris[0]).toBeGreaterThan(300);
    expect(paris[0]).toBeLessThan(700);
    expect(paris[1]).toBeGreaterThan(200);
    expect(paris[1]).toBeLessThan(800);

    // Cayenne projects far off-canvas rather than dragging the camera to it.
    const cayenne = map.project([-52.3, 4.9])!;
    expect(cayenne[0]).toBeLessThan(0);
  });

  // For now the outlying pieces are dropped from the output too, so a map of
  // France is continental France. Guyane is still France — representing
  // overseas territories properly (insets, or an explicit opt-in) is planned
  // work, not a decision that they do not belong.
  it("draws continental France, with no stray geometry off-canvas", async () => {
    const map = await mapper({ region: ["FR"], detail: "110m", size: [1000, 1000] });
    expect(map.svg.match(/class="mp-country"/g)).toHaveLength(1);
    expect(map.svg).toContain('data-iso="FR"');

    const coordinates = /d="([^"]+)"/.exec(map.svg)![1]!;
    const numbers = coordinates.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(1000);
  });

  it("does not clip a genuinely dispersed region", async () => {
    const map = await mapper({ region: "world", detail: "110m" });
    expect(map.svg).toContain('data-iso="NZ"');
    expect(map.svg).toContain('data-iso="CL"');
    expect(map.svg).not.toContain("NaN");
  });
});

describe("canvas", () => {
  it("honours an explicit size", async () => {
    const map = await mapper({ region: "west-europe", detail: "110m", size: [640, 480] });
    expect(map.svg).toContain('viewBox="0 0 640 480"');
  });

  it("defaults to a 1000-unit square", async () => {
    const map = await mapper({ region: "west-europe", detail: "110m" });
    expect(map.svg).toContain('viewBox="0 0 1000 1000"');
  });
});

describe("project", () => {
  it("places a coordinate inside the padded canvas", async () => {
    const map = await mapper({
      region: "west-europe",
      detail: "110m",
      projection: "conic-conformal",
      size: [1000, 1000],
      padding: 40,
    });
    const paris = map.project([2.35, 48.86]);
    expect(paris).not.toBeNull();
    const [x, y] = paris!;
    expect(x).toBeGreaterThan(40);
    expect(x).toBeLessThan(960);
    expect(y).toBeGreaterThan(40);
    expect(y).toBeLessThan(960);
  });

  it("is deterministic", async () => {
    const twice = await Promise.all([
      mapper({ region: "west-europe", detail: "110m" }),
      mapper({ region: "west-europe", detail: "110m" }),
    ]);
    expect(twice[0]!.project([2.35, 48.86])).toEqual(twice[1]!.project([2.35, 48.86]));
  });
});

describe("projections", () => {
  it.each(["mercator", "conic-conformal", "albers", "equal-earth", "orthographic"] as const)(
    "renders under %s",
    async (projection) => {
      const map = await mapper({ region: "west-europe", detail: "110m", projection });
      expect(map.svg).toContain("<path");
      expect(map.svg).not.toContain("NaN");
    },
  );
});

describe("errors", () => {
  it("rejects an unknown preset", async () => {
    await expect(mapper({ region: "narnia" as never })).rejects.toThrow(/unknown region preset/);
  });

  it("rejects an unrecognised country code rather than drawing nothing", async () => {
    await expect(mapper({ region: ["FR", "ZZ"] })).rejects.toThrow(/unrecognised country code/);
  });

  it("rejects an unrecognised highlight code", async () => {
    await expect(
      mapper({ region: "west-europe", highlight: ["ZZ"] }),
    ).rejects.toThrow(/unrecognised highlight code/);
  });
});

describe("output", () => {
  it("matches the committed West Europe render", async () => {
    const map = await mapper({
      region: "west-europe",
      detail: "110m",
      projection: "conic-conformal",
    });
    await expect(map.svg).toMatchFileSnapshot("./__snapshots__/west-europe.svg");
  });
});
