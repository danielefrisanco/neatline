import { describe, expect, it } from "vitest";
import { mapper } from "../src/index.js";

/**
 * Labels are tested by what they promise, not by what they emit.
 *
 * A string assertion has passed on a visually broken map three times in this
 * project's history, so the properties here are geometric: a name sits inside
 * the country it names, a name never leaves the canvas, a name rides its prism.
 * Each one is checked against the paths in the same document, which is the only
 * thing that can contradict them.
 */

interface Label {
  readonly iso: string | null;
  readonly kind: string;
  readonly x: number;
  readonly y: number;
  readonly rank: number;
  readonly fits: boolean;
  readonly text: string;
}

const LABEL = /<text class="mp-label[^"]*"([^>]*)>(.*?)<\/text>/g;

function attribute(source: string, name: string): string | null {
  const match = new RegExp(`${name}="([^"]*)"`).exec(source);
  return match === null ? null : (match[1] as string);
}

function labels(svg: string): Label[] {
  const found: Label[] = [];
  LABEL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LABEL.exec(svg)) !== null) {
    const attributes = match[1] as string;
    found.push({
      iso: attribute(attributes, "data-iso"),
      kind: attribute(attributes, "data-kind") ?? "",
      x: Number(attribute(attributes, "x")),
      y: Number(attribute(attributes, "y")),
      rank: Number(attribute(attributes, "data-rank")),
      fits: attribute(attributes, "data-fit") !== "0",
      text: (match[2] as string).replace(/<[^>]*>/g, " ").trim(),
    });
  }
  return found;
}

/** Every subpath of a rendered country, as rings of points. */
function rings(svg: string, iso: string): Array<Array<[number, number]>> {
  const match = new RegExp(`<path class="mp-country[^"]*" data-iso="${iso}"[^>]*\\sd="([^"]*)"`).exec(
    svg,
  );
  if (match === null) return [];
  return (match[1] as string)
    .split("Z")
    .filter((part) => part.trim() !== "")
    .map((part) =>
      part
        .split(/[ML]/)
        .filter((pair) => pair.includes(","))
        .map((pair) => pair.split(",").map(Number) as [number, number]),
    );
}

/** Even-odd across every ring, so a hole counts as outside. */
function inside(shape: ReadonlyArray<ReadonlyArray<[number, number]>>, x: number, y: number): boolean {
  let crossings = 0;
  for (const ring of shape) {
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i] as [number, number];
      const b = ring[(i + 1) % ring.length] as [number, number];
      if (a[1] > y === b[1] > y) continue;
      if (a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]) > x) crossings += 1;
    }
  }
  return crossings % 2 === 1;
}

describe("country labels", () => {
  it("puts every name inside the country it names", async () => {
    for (const region of ["west-europe", "africa", "south-america"] as const) {
      const map = await mapper({ region, detail: "110m", size: [1000, 900] });
      const named = labels(map.svg).filter((label) => label.kind === "country");
      expect(named.length).toBeGreaterThan(5);

      const stray: string[] = [];
      for (const label of named) {
        const shape = rings(map.svg, label.iso as string);
        if (shape.length === 0) continue;
        if (!inside(shape, label.x, label.y)) stray.push(`${region}: ${label.text}`);
      }
      expect(stray).toEqual([]);
    }
  });

  it("keeps every name on the canvas", async () => {
    const map = await mapper({ region: "world", detail: "110m", size: [1200, 700] });
    for (const label of labels(map.svg)) {
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(label.x).toBeLessThanOrEqual(1200);
      expect(label.y).toBeGreaterThanOrEqual(0);
      expect(label.y).toBeLessThanOrEqual(700);
    }
  });

  it("hides the names a map has no room for rather than dropping them", async () => {
    const map = await mapper({
      region: "europe",
      detail: "110m",
      size: [900, 800],
      theme: "minimal",
    });
    const named = labels(map.svg).filter((label) => label.kind === "country");
    const hidden = named.filter((label) => !label.fits);

    // The document still states every name; the stylesheet is what thins them.
    expect(hidden.length).toBeGreaterThan(0);
    expect(named.length).toBeGreaterThan(hidden.length);
    // Scoped and reserialised by the time it ships, so match the rule not the text.
    expect(map.css).toMatch(/\.mp-label\[data-fit="0"\]\s*\{[^}]*display:\s*none/);
  });

  it("flattens the hidden ones onto an attribute, for readers with no CSS", async () => {
    const map = await mapper({
      region: "europe",
      detail: "110m",
      size: [900, 800],
      theme: "minimal",
    });
    const flattened = await map.render();
    const unfit = /<text class="mp-label"[^>]*data-fit="0"[^>]*>/.exec(flattened);
    expect(unfit?.[0]).toContain('display="none"');
  });

  it("gives a name more room when the type is set larger", async () => {
    const size = { region: "europe", detail: "110m", size: [900, 800] } as const;
    const small = labels((await mapper(size)).svg).filter((l) => l.kind === "country" && l.fits);
    const large = labels(
      (await mapper({ ...size, tokens: { "--label-size": "26" } })).svg,
    ).filter((l) => l.kind === "country" && l.fits);
    expect(large.length).toBeLessThan(small.length);
  });

  it("is deterministic", async () => {
    const options = { region: "europe", detail: "110m" } as const;
    const first = await mapper(options);
    const second = await mapper(options);
    expect(labels(first.svg)).toEqual(labels(second.svg));
  });
});

describe("settlement labels", () => {
  it("names only the ranks asked for, and never one without a dot", async () => {
    const region = { region: "west-europe", detail: "50m" } as const;
    const one = labels((await mapper(region)).svg).filter((l) => l.kind === "place");
    const three = labels((await mapper({ ...region, labelRank: 3 })).svg).filter(
      (l) => l.kind === "place",
    );
    expect(one.length).toBeGreaterThan(0);
    expect(three.length).toBeGreaterThan(one.length);

    const dotted = new Set(
      [...(await mapper(region)).svg.matchAll(/<circle class="mp-place" data-name="([^"]*)"/g)].map(
        (m) => m[1],
      ),
    );
    for (const label of one) expect(dotted.has(label.text)).toBe(true);
  });

  it("steps a country name clear of its own capital", async () => {
    const map = await mapper({ region: "west-europe", detail: "50m", size: [1000, 800] });
    const all = labels(map.svg);
    const spain = all.find((l) => l.kind === "country" && l.iso === "ES");
    const madrid = all.find((l) => l.kind === "place" && l.text === "Madrid");
    expect(spain).toBeDefined();
    expect(madrid).toBeDefined();
    // Two labels on the same baseline are the collision the step exists to fix.
    expect(Math.abs((spain as Label).y - (madrid as Label).y)).toBeGreaterThan(8);
  });
});

describe("labels on an extruded map", () => {
  it("raises a name onto the surface it belongs to", async () => {
    const values = { FR: 100, DE: 90, ES: 40, IT: 60, GB: 80 };
    const flat = await mapper({ region: "west-europe", detail: "110m", size: [900, 800] });
    const raised = await mapper({
      region: "west-europe",
      detail: "110m",
      size: [900, 800],
      extrude: { values, height: 120 },
    });

    const on = (map: { svg: string }, iso: string): Label | undefined =>
      labels(map.svg).find((l) => l.kind === "country" && l.iso === iso);

    const ground = on(flat, "FR");
    const lifted = on(raised, "FR");
    expect(ground).toBeDefined();
    expect(lifted).toBeDefined();
    expect((lifted as Label).y).toBeLessThan((ground as Label).y);
  });
});

describe("the labels layer", () => {
  it("is empty when it is turned off, and the slot still exists", async () => {
    const map = await mapper({ region: "europe", detail: "110m", layers: { labels: false } });
    expect(map.svg).toContain('<g class="mp-layer mp-labels"/>');
    // `mp-labels` contains `mp-label`, so the empty slot is not the answer here.
    expect(map.svg).not.toContain('<text class="mp-label');
  });
});
