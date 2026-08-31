// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { forget, recall, recallZoom, remember, rememberZoom } from "../../tool/src/memory.js";

/**
 * Coming back, as opposed to being sent a link.
 *
 * The two have to be told apart, and one rule does it: a shared link always
 * wins. Someone opening a link is asking for *that* map, not for the last one
 * they made themselves — so what was stored is consulted only when the address
 * carries nothing at all.
 *
 * The rest of this is about storage that refuses to work, which is not an edge
 * case: `localStorage` **throws** — not returns null, throws — in a browser set
 * to block site data, and is empty in a private window. Neither is worth telling
 * anyone about; the answer to both is a default map, drawn immediately.
 */

beforeEach(() => {
  // Restored before cleared: the previous test may have left `getItem` throwing,
  // and clearing through a mock that throws is how a suite starts lying to
  // itself about what is in storage.
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("the map you were making", () => {
  it("comes back when the address carries nothing", () => {
    remember("region=world&projection=mercator");
    expect(recall("")).toBe("region=world&projection=mercator");
    expect(recall("?")).toBe("region=world&projection=mercator");
  });

  it("gives way to a link somebody sent", () => {
    remember("region=world");
    expect(recall("?region=africa")).toBeNull();
  });

  it("is nothing at all on a first visit", () => {
    expect(recall("")).toBeNull();
  });

  /** A convenience with no way out of it is a trap, not a convenience. */
  it("can be thrown away, so a bare address means a bare map again", () => {
    remember("region=world");
    forget();
    expect(recall("")).toBeNull();
  });

  it("refuses to store or return something absurdly long", () => {
    remember(`region=${"x".repeat(9000)}`);
    expect(recall("")).toBeNull();
  });
});

describe("a browser that will not store anything", () => {
  it("draws a map instead of throwing", () => {
    const storage = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked by the browser");
    });
    const write = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked by the browser");
    });
    expect(() => remember("region=world")).not.toThrow();
    expect(recall("")).toBeNull();
    expect(() => forget()).not.toThrow();
    expect(storage).toHaveBeenCalled();
    expect(write).toHaveBeenCalled();
    // Restored here rather than left to `restoreAllMocks`: these are spies on a
    // host object's own methods, and a suite whose storage silently stays broken
    // is a suite that reports the wrong thing about every test after this one.
    storage.mockRestore();
    write.mockRestore();
  });
});

describe("how big the preview is drawn", () => {
  const ZOOMS = ["fit", "0.5", "1", "2"];

  it("is remembered apart from the map itself", () => {
    rememberZoom("1");
    remember("region=world");
    forget();
    // Forgetting the map does not forget how you like to look at one.
    expect(recallZoom(ZOOMS)).toBe("1");
  });

  it("ignores a value this version does not offer", () => {
    rememberZoom("400");
    expect(recallZoom(ZOOMS)).toBeNull();
  });
});
