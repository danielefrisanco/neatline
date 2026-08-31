import { describe, expect, it } from "vitest";
import {
  neatline,
  PALETTE_NAMES,
  PROJECTION_NAMES,
  REGION_PRESET_NAMES,
  THEME_NAMES,
  TYPEFACE_NAMES,
} from "../src/index.js";
import { DEFAULTS, decode, encode, toOptions, type Config, type Vocabulary } from "../tool/src/config.js";

/**
 * The tool's URL, which is the only part of it that can rot silently.
 *
 * A dropdown that stops working is obvious the moment anyone opens the page. A
 * link that stops rebuilding the map it was made from is not — it produces a
 * *plausible* map, the default one, and the person who sent it has no way to
 * tell. So the round trip is held by a test, and so is the promise that keeps
 * the links short: a config nobody changed encodes to nothing at all.
 *
 * The last two tests are the ones that matter most. Every value in a URL is
 * user input arriving from a link that may have been edited by hand, truncated
 * by a chat client, or written against an older version of the tool — and a
 * value the library will reject does not fail one control, it fails the whole
 * render.
 */

const VOCABULARY: Vocabulary = {
  regions: REGION_PRESET_NAMES,
  projections: PROJECTION_NAMES,
  themes: THEME_NAMES,
  palettes: PALETTE_NAMES,
  typefaces: TYPEFACE_NAMES,
};

const CHOSEN: Config = {
  region: "GR,TR,BG",
  projection: "mercator",
  theme: "atlas",
  palette: "limes",
  typeface: "serif",
  detail: "50m",
  width: 1200,
  height: 700,
  sea: false,
  seaNames: true,
  graticule: true,
  neighbours: true,
  terrain: ["glacier", "mountain"],
  placeRank: 3,
  labelRank: 2,
  borderWidth: 2.5,
  landEdgeWidth: 1.2,
  labelSize: 17,
  credit: "Made by someone",
  highlight: ["GR"],
  pins: [{ at: [23.73, 37.98], label: "Athens" }],
  arrows: [{ from: [23.73, 37.98], to: [28.98, 41.01] }],
  routes: [{ stops: [{ at: [23.73, 37.98] }, { at: [23.32, 42.7] }] }],
};

describe("the tool's URL", () => {
  it("is empty when nothing was chosen", () => {
    // A fresh page has a bare address, and a shared one carries exactly the
    // decisions its author made. It also means a default can be changed later
    // without stranding old links on a value nobody picked.
    expect(encode(DEFAULTS)).toBe("");
  });

  it("rebuilds every choice it was given", () => {
    expect(decode(encode(CHOSEN), VOCABULARY)).toEqual(CHOSEN);
  });

  it("writes only what differs from the default", () => {
    const query = encode({ ...DEFAULTS, theme: "noir" });
    expect(query).toBe("theme=noir");
  });

  it("ignores a value it does not recognise rather than failing", () => {
    const config = decode("theme=chartreuse&projection=spiral&detail=1m", VOCABULARY);
    expect(config.theme).toBe(DEFAULTS.theme);
    expect(config.projection).toBe(DEFAULTS.projection);
    expect(config.detail).toBe(DEFAULTS.detail);
  });

  it("refuses a region the library would throw on", () => {
    // `region: "atlantis"` is not a preset and not a code list. Handing it on
    // would not produce a wrong map — it would produce no map, because an
    // unknown preset throws inside the library.
    expect(decode("region=atlantis", VOCABULARY).region).toBe(DEFAULTS.region);
    expect(decode("region=GR,TR", VOCABULARY).region).toBe("GR,TR");
    expect(decode("region=europe", VOCABULARY).region).toBe("europe");
  });

  it("pulls a number back into range instead of passing it on", () => {
    const config = decode("width=99999&labelSize=-4&placeRank=9&borderWidth=abc", VOCABULARY);
    expect(config.width).toBe(4000);
    expect(config.labelSize).toBe(6);
    expect(config.placeRank).toBe(3);
    expect(config.borderWidth).toBe(DEFAULTS.borderWidth);
  });

  it("keeps only the cover kinds that exist", () => {
    expect(decode("terrain=mountain,forest,glacier", VOCABULARY).terrain).toEqual([
      "mountain",
      "glacier",
    ]);
  });

  it("caps a credit line rather than letting a crafted link set one", () => {
    expect(decode(`credit=${"x".repeat(500)}`, VOCABULARY).credit).toHaveLength(120);
  });
});

describe("the config as library options", () => {
  it("hands a preset over as a name and codes over as a list", () => {
    expect(toOptions({ ...DEFAULTS, region: "africa" }).region).toBe("africa");
    expect(toOptions({ ...DEFAULTS, region: "gr, tr" }).region).toEqual(["GR", "TR"]);
  });

  it("sets a token only when it was moved off the default", () => {
    expect(toOptions(DEFAULTS).tokens).toBeUndefined();
    expect(toOptions({ ...DEFAULTS, borderWidth: 2 }).tokens).toEqual({ "--border-width": "2" });
  });

  it("leaves out a palette and a typeface rather than passing an empty one", () => {
    const bare = toOptions(DEFAULTS);
    expect("palette" in bare).toBe(false);
    expect("typeface" in bare).toBe(false);
  });

  /**
   * The whole point of the two modules together: anything a URL can say, the
   * library can draw. A tool that encodes a state its own renderer rejects is
   * worse than one with fewer options.
   */
  it("draws every configuration the URL can express", async () => {
    for (const config of [DEFAULTS, CHOSEN, decode("region=world&projection=orthographic&graticule=1", VOCABULARY)]) {
      const map = await neatline({ ...toOptions(config), detail: "110m", size: [400, 300] });
      expect(map.svg.startsWith("<svg")).toBe(true);
      expect(map.svg).toContain("<path");
    }
  });
});
