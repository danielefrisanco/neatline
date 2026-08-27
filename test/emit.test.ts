import { describe, expect, it } from "vitest";
import { mapper } from "../src/index.js";

describe("document", () => {
  it("emits a valid, viewBox'd root", async () => {
    const map = mapper({ region: "west-europe" });
    await expect(map.svg).toMatchFileSnapshot("./__snapshots__/west-europe.svg");
  });

  it("honours an explicit canvas size", () => {
    const map = mapper({ region: "west-europe", size: [640, 480] });
    expect(map.svg).toContain('viewBox="0 0 640 480"');
  });

  it("defaults to a 1000-unit square canvas", () => {
    const map = mapper({ region: "europe" });
    expect(map.svg).toContain('viewBox="0 0 1000 1000"');
  });

  it("carries an accessible role on the root", () => {
    const map = mapper({ region: "europe" });
    expect(map.svg).toContain('role="img"');
  });
});

describe("phase 0 boundaries", () => {
  it("has no geometry yet", () => {
    const map = mapper({ region: "west-europe" });
    expect(map.svg).not.toContain("<path");
  });

  it("defers projection to phase 1", () => {
    const map = mapper({ region: "west-europe" });
    expect(() => map.project([2.35, 48.86])).toThrow(/phase 1/);
  });
});
