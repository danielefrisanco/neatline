import { describe, expect, it } from "vitest";
import { parseCss, type Rule } from "../src/css.js";
import { loadWorld } from "../src/topology.js";
import { politicalFill } from "../src/political.js";
import { mapper } from "../src/index.js";
import { PALETTES, THEMES } from "../src/theme.js";
import { TOKENS } from "../src/tokens.js";

/**
 * What a preset has to be, as tests rather than as prose.
 *
 * A theme is data, and data with five near-identical copies drifts: one gets a
 * token the others miss, a hex loses a digit, a dark block quietly stops
 * covering half its vocabulary. None of that shows up as a thrown error — it
 * shows up as one map, months later, with a black hole where a country was.
 */

const themes = Object.entries(THEMES);
const palettes = Object.entries(PALETTES);

/** Tokens that hold a measurement or a type stack, not a colour. */
const NOT_COLOURS = new Set([
  "--border-width",
  "--land-edge-width",
  "--border-dash",
  "--water-width",
  "--stripe-width",
  "--font",
  "--label-size",
]);

const LIVE = TOKENS.filter((t) => t.status === "live").map((t) => t.name);
const LIVE_COLOURS = LIVE.filter((name) => !NOT_COLOURS.has(name));

const COLOUR = /^(#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|transparent|none|currentColor|rgba?\(|hsla?\()/;

function rules(css: string): Rule[] {
  return parseCss(css).filter((node): node is Rule => node.kind === "rule");
}

/** Declarations on `.mp` outside any at-rule — the theme's light values. */
function light(css: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const rule of rules(css)) {
    if (rule.at !== null || rule.selector.trim() !== ".mp") continue;
    for (const d of rule.declarations) found.set(d.property, d.value);
  }
  return found;
}

function dark(css: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const rule of rules(css)) {
    if (rule.at === null || !rule.at.includes("prefers-color-scheme: dark")) continue;
    for (const d of rule.declarations) found.set(d.property, d.value);
  }
  return found;
}

describe.each(themes)("theme %s", (name, css) => {
  it("defines every live token", () => {
    const defined = light(css);
    expect([...LIVE].filter((token) => !defined.has(token))).toEqual([]);
  });

  it("ships a dark block", () => {
    expect(dark(css).size).toBeGreaterThan(0);
  });

  /**
   * The classic unreadable-artifact bug: a rule whose only definition sits
   * inside the media query never applies to a reader whose system is light, so
   * the page renders one theme's paint on the other theme's ground.
   */
  it("puts only token values in the dark block, all of them already defined", () => {
    const defined = light(css);
    for (const [property, value] of dark(css)) {
      expect(property, `${name} dark sets a non-token`).toMatch(/^--/);
      expect(defined.has(property), `${name} dark introduces ${property}`).toBe(true);
      expect(value).not.toEqual(defined.get(property));
    }
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ])("writes %s colours that a renderer can parse", (_which, read) => {
    for (const [property, value] of read(css)) {
      if (!property.startsWith("--") || NOT_COLOURS.has(property)) continue;
      expect(value, `${name} ${property}`).toMatch(COLOUR);
    }
  });

  /**
   * `.mp-country.is-highlighted` and `.mp-country[data-bin="3"]` have identical
   * specificity, so the later one wins outright. Highlight is the caller naming
   * a country; a band is a number it fell into — so highlight has to be last.
   */
  it("lets a highlight beat a band", () => {
    const selectors = rules(css).map((r) => r.selector.trim());
    const highlighted = selectors.indexOf(".mp .mp-country.is-highlighted");
    const banded = selectors.indexOf('.mp .mp-country[data-bin="5"]');
    expect(highlighted).toBeGreaterThan(-1);
    expect(banded).toBeGreaterThan(-1);
    expect(highlighted).toBeGreaterThan(banded);
  });
});

describe.each(palettes)("palette %s", (name, css) => {
  /**
   * A palette that covers half the colour vocabulary leaves a map wearing the
   * theme's colours on the palette's ground. `dusk` used to do exactly that: it
   * set `--land` but no `--bin-n`, so a choropleth came out in pale daylight
   * bands over a night sea.
   */
  it("covers the whole colour vocabulary", () => {
    const defined = light(css);
    expect([...LIVE_COLOURS].filter((token) => !defined.has(token))).toEqual([]);
  });

  it("carries no structure", () => {
    for (const rule of rules(css)) {
      expect(rule.selector.trim(), `${name} styles something`).toBe(".mp");
      for (const d of rule.declarations) {
        expect(d.property, `${name} sets a property, not a token`).toMatch(/^--/);
      }
    }
  });
});

describe("political fill", () => {
  it.each(["europe", "africa", "world"] as const)(
    "gives no country in %s a neighbour's colour",
    async (region) => {
      const map = await mapper({ region, detail: "110m", fill: "political" });
      const coloured = new Map(
        [...map.svg.matchAll(/data-iso="([A-Z]{2})"[^>]*data-fill="(\d)"/g)].map((m) => [
          m[1] as string,
          Number(m[2]),
        ]),
      );
      expect(coloured.size).toBeGreaterThan(30);

      const world = await loadWorld("110m");
      const clashes: string[] = [];
      for (const [id, neighbours] of world.adjacency([...coloured.keys()])) {
        for (const neighbour of neighbours) {
          if (coloured.get(id) === coloured.get(neighbour)) clashes.push(`${id}/${neighbour}`);
        }
      }
      expect(clashes).toEqual([]);
    },
  );

  it("is deterministic", () => {
    const graph = new Map([
      ["AA", new Set(["BB", "CC"])],
      ["BB", new Set(["AA", "CC"])],
      ["CC", new Set(["AA", "BB"])],
    ]);
    const ids = ["AA", "BB", "CC"];
    expect([...politicalFill(ids, graph)]).toEqual([...politicalFill([...ids].reverse(), graph)]);
  });

  it("defers to a band, so one country never carries two encodings", async () => {
    const map = await mapper({
      region: "west-europe",
      detail: "110m",
      fill: "political",
      values: { FR: 10, DE: 20 },
    });
    const france = /data-iso="FR"[^>]*/.exec(map.svg)?.[0] ?? "";
    const spain = /data-iso="ES"[^>]*/.exec(map.svg)?.[0] ?? "";
    expect(france).toContain("data-bin=");
    expect(france).not.toContain("data-fill=");
    expect(spain).toContain("data-fill=");
  });
});
