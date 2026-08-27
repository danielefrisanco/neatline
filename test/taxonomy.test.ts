import { describe, expect, it } from "vitest";
import { mapper, LAYERS } from "../src/index.js";

/** Layer group classes, in the order they appear in the document. */
function layerOrder(svg: string): string[] {
  return [...svg.matchAll(/class="mp-layer ([a-z-]+)"/g)].map((m) => m[1] as string);
}

const map = await mapper({ region: "west-europe", detail: "110m", projection: "conic-conformal" });

describe("document shape", () => {
  it("puts the background behind every layer", () => {
    const background = map.svg.indexOf('class="mp-bg"');
    const firstLayer = map.svg.indexOf('class="mp-layer');
    expect(background).toBeGreaterThan(-1);
    expect(background).toBeLessThan(firstLayer);
  });

  it("covers the whole canvas with the background", () => {
    expect(map.svg).toContain(
      '<rect class="mp-bg" x="0" y="0" width="1000" height="1000" fill="none"/>',
    );
  });

  // Regression: the background rect shipped without a fill, and SVG's default
  // fill is black — so a full-canvas rect painted over the entire document and
  // an unthemed map rendered as a solid black square.
  it("does not paint the canvas black when no theme is applied", () => {
    const background = /<rect class="mp-bg"[^>]*>/.exec(map.svg)?.[0];
    expect(background).toBeDefined();
    expect(background).toContain('fill="none"');
  });

  // Nothing in a geometry-only document may rely on an inherited paint that
  // the caller has not chosen. Land silhouettes are the deliberate exception:
  // black shapes are what an unstyled map is meant to look like.
  it("declares a fill anywhere the default would be wrong", () => {
    for (const tag of map.svg.matchAll(/<(rect|g)\b[^>]*>/g)) {
      const element = tag[0];
      if (!element.includes("mp-bg") && !element.includes("mp-borders")) continue;
      expect(element).toContain('fill="none"');
    }
  });

  it("carries the root class", () => {
    expect(map.svg).toContain(`class="mp"`);
  });
});

describe("layer stack", () => {
  // The paint order is the contract. Inserting a layer between two existing
  // ones would silently restack every theme already written against v1, so
  // this test exists to make that change loud.
  it("emits every layer, in the declared order", () => {
    expect(layerOrder(map.svg)).toEqual([
      "mp-neighbours",
      "mp-land",
      "mp-hydro",
      "mp-borders",
      "mp-roads",
      "mp-places",
      "mp-labels",
      "mp-annotations",
    ]);
  });

  it("matches the exported taxonomy exactly", () => {
    expect(layerOrder(map.svg)).toEqual(LAYERS.map((spec) => spec.className));
  });

  it("emits reserved layers empty rather than omitting them", () => {
    for (const spec of LAYERS) {
      if (spec.status !== "reserved") continue;
      expect(map.svg).toContain(`<g class="mp-layer ${spec.className}"/>`);
    }
  });

  it("keeps the annotation slot at the top of the stack", () => {
    const order = layerOrder(map.svg);
    expect(order[order.length - 1]).toBe("mp-annotations");
  });

  it("places context below the land it provides context for", () => {
    const order = layerOrder(map.svg);
    expect(order.indexOf("mp-neighbours")).toBeLessThan(order.indexOf("mp-land"));
  });
});

describe("accessibility", () => {
  it("names the map on the root", () => {
    expect(map.svg).toContain('role="img"');
    expect(map.svg).toContain('aria-label="Map of Western Europe"');
    expect(map.svg).toContain("<title>Map of Western Europe</title>");
  });

  it("names each country for hover", () => {
    expect(map.svg).toContain("<title>France</title>");
  });

  it("mentions what is highlighted", async () => {
    const highlighted = await mapper({
      region: "west-europe",
      detail: "110m",
      highlight: ["FR", "BE"],
    });
    expect(highlighted.svg).toContain('aria-label="Map of Western Europe, highlighting');
    expect(highlighted.svg).toContain("France");
  });

  it("lets the caller say what the map is actually about", async () => {
    const titled = await mapper({
      region: "west-europe",
      detail: "110m",
      title: "Rail freight volume, 2024",
    });
    expect(titled.svg).toContain('aria-label="Rail freight volume, 2024"');
    expect(titled.svg).toContain("<title>Rail freight volume, 2024</title>");
  });

  it("describes a coordinate region without a preset name", async () => {
    const box = await mapper({ region: { bbox: [-10, 36, 5, 52] }, detail: "110m" });
    expect(box.svg).toContain('aria-label="Map of the area from 10°W 36°N to 5°E 52°N"');
  });
});

describe("borders", () => {
  it("draws shared boundaries as unfilled lines", () => {
    expect(map.svg).toContain('<g class="mp-layer mp-borders" fill="none">');
    expect(map.svg).toContain('<path class="mp-border" data-kind="intl"');
  });

  // Meshing the topology gives each shared edge once. Stroking country
  // outlines instead would double every internal border, which is invisible
  // for an opaque hairline and obviously wrong for a translucent or dashed one.
  it("draws each boundary once, not once per neighbour", () => {
    expect(map.svg.match(/class="mp-border"/g)).toHaveLength(1);
  });

  it("leaves the layer empty when nothing is shared", async () => {
    const single = await mapper({ region: ["FR"], detail: "110m" });
    expect(single.svg).toContain('<g class="mp-layer mp-borders" fill="none"/>');
  });

  it("does not draw a coastline as a border", async () => {
    // Ireland and Great Britain share no land boundary with each other.
    const islands = await mapper({ region: ["IE", "IS"], detail: "110m" });
    expect(islands.svg).toContain('<g class="mp-layer mp-borders" fill="none"/>');
  });
});

describe("canvas", () => {
  it("handles a non-square canvas without distorting the projection", async () => {
    const wide = await mapper({ region: "west-europe", detail: "110m", size: [1200, 600] });
    expect(wide.svg).toContain('viewBox="0 0 1200 600"');
    expect(wide.svg).toContain('width="1200"');
    expect(wide.svg).toContain('height="600"');
    expect(wide.svg).toContain('preserveAspectRatio="xMidYMid meet"');

    // Everything the camera framed lands inside the shorter axis too.
    const paris = wide.project([2.35, 48.86])!;
    expect(paris[1]).toBeGreaterThan(0);
    expect(paris[1]).toBeLessThan(600);
  });
});

describe("custom geometry", () => {
  const collection = {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature",
        id: "FR",
        properties: { name: "Sales region <A> & <B>" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
      },
    ],
  };

  it("draws a caller-supplied FeatureCollection", async () => {
    const custom = await mapper({ region: collection, detail: "110m" });
    expect(custom.svg).toContain('class="mp-country"');
    expect(custom.svg).toContain('data-iso="FR"');
  });

  it("escapes markup in names, in attributes and in text", async () => {
    const custom = await mapper({ region: collection, detail: "110m" });
    expect(custom.svg).toContain('data-name="Sales region &lt;A&gt; &amp; &lt;B&gt;"');
    expect(custom.svg).toContain("<title>Sales region &lt;A&gt; &amp; &lt;B&gt;</title>");
    expect(custom.svg).not.toContain("<A>");
  });

  // The caller's outlines are their own; meshing them against the bundled
  // arcs would draw boundaries that do not follow the geometry on screen.
  it("does not invent borders for geometry it did not supply", async () => {
    const custom = await mapper({ region: collection, detail: "110m" });
    expect(custom.svg).toContain('<g class="mp-layer mp-borders" fill="none"/>');
  });

  it("rejects an empty collection", async () => {
    await expect(
      mapper({ region: { type: "FeatureCollection", features: [] } }),
    ).rejects.toThrow(/empty/);
  });
});
