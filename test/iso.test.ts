import { describe, expect, it } from "vitest";
import { featureId, isoTable, resolveId } from "../src/iso.js";
import { loadWorld } from "../src/topology.js";

describe("resolveId", () => {
  it("accepts alpha-2, case-insensitively", () => {
    expect(resolveId("FR")).toBe("FR");
    expect(resolveId("fr")).toBe("FR");
    expect(resolveId("  de  ")).toBe("DE");
  });

  it("accepts ISO numeric, with or without leading zeros", () => {
    expect(resolveId("250")).toBe("FR");
    expect(resolveId("076")).toBe("BR");
    expect(resolveId("56")).toBe("BE");
  });

  it("accepts user-assigned codes", () => {
    expect(resolveId("XK")).toBe("XK");
  });

  it("returns null for nonsense, so typos surface as errors", () => {
    expect(resolveId("ZZ")).toBeNull();
    expect(resolveId("")).toBeNull();
    expect(resolveId("France")).toBeNull();
  });
});

describe("featureId", () => {
  it("prefers ISO alpha-2", () => {
    expect(featureId(250, "France")).toBe("FR");
    expect(featureId("250", "France")).toBe("FR");
  });

  it("falls back to a user-assigned code when the topology has no id", () => {
    expect(featureId(undefined, "Kosovo")).toBe("XK");
    expect(featureId(undefined, "N. Cyprus")).toBe("XN");
  });

  it("gives up rather than inventing an id", () => {
    expect(featureId(undefined, "Nowhere")).toBeNull();
  });
});

describe("isoTable", () => {
  it("marks which codes are ours rather than ISO's", () => {
    const table = isoTable();
    expect(table.find((e) => e.code === "FR")).toEqual({
      code: "FR",
      numeric: "250",
      userAssigned: false,
    });
    expect(table.find((e) => e.code === "XK")).toEqual({
      code: "XK",
      numeric: null,
      userAssigned: true,
    });
  });

  it("is sorted and free of duplicates", () => {
    const codes = isoTable().map((e) => e.code);
    expect(codes).toEqual([...codes].sort());
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("coverage of the real topology", () => {
  it("resolves an id for every feature, so nothing is unreachable", async () => {
    const { countries } = await loadWorld("50m");
    expect(countries.length).toBeGreaterThan(200);
    expect(countries.every((c) => c.id.length > 0)).toBe(true);
  });

  it("keeps the five id-less territories addressable", async () => {
    const { countries } = await loadWorld("50m");
    const ids = new Set(countries.map((c) => c.id));
    for (const code of ["XK", "XS", "XN", "XI", "XG"]) {
      expect(ids.has(code)).toBe(true);
    }
  });
});
