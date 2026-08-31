// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CountryName } from "../../src/index.js";
import { buildPicker } from "../../tool/src/picker.js";

/**
 * Choosing a country by name.
 *
 * The point of this control is that nobody knows Switzerland is `CH` unless
 * they have met the problem before — so the parts worth holding are the ones
 * that make a name findable: folding accents away, and ranking a code match
 * above a name match so typing "CH" offers Switzerland before Chad, Chile and
 * China.
 */

const COUNTRIES: readonly CountryName[] = [
  { code: "CH", name: "Switzerland" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "ES", name: "España" },
  { code: "TD", name: "Chad" },
];

let host: HTMLElement;

function picker(chosen: readonly string[] = []) {
  const onChange = vi.fn();
  document.body.replaceChildren();
  host = buildPicker({ countries: COUNTRIES, chosen, onChange });
  document.body.append(host);
  return onChange;
}

function search(text: string): void {
  const box = host.querySelector<HTMLInputElement>('input[type="search"]');
  if (box === null) return;
  box.value = text;
  box.dispatchEvent(new Event("input", { bubbles: true }));
}

const listed = (): string[] =>
  [...host.querySelectorAll(".picker-code")].map((span) => span.textContent ?? "");

beforeEach(() => {
  document.body.replaceChildren();
});

describe("finding a country", () => {
  it("lists them all before anything is typed", () => {
    picker();
    expect(listed()).toHaveLength(COUNTRIES.length);
  });

  it("folds accents away, in both directions", () => {
    picker();
    search("espana");
    expect(listed()).toEqual(["ES"]);
    search("cote");
    expect(listed()).toEqual(["CI"]);
  });

  it("ranks a code match above a name match", () => {
    picker();
    search("ch");
    // Switzerland is CH; Chile, China and Chad merely contain the letters.
    expect(listed()[0]).toBe("CH");
    expect(listed()).toHaveLength(4);
  });

  it("says so when nothing matches", () => {
    picker();
    search("atlantis");
    expect(listed()).toEqual([]);
    expect(host.querySelector(".picker-none")?.textContent).toBe("Nothing matches “atlantis”.");
  });
});

describe("choosing them", () => {
  /**
   * Emitted in the order the list is in rather than the order they were ticked,
   * so the same set of countries always produces the same URL.
   */
  it("hands back codes in list order, not click order", () => {
    const onChange = picker();
    const boxes = host.querySelectorAll<HTMLInputElement>('.picker-row input[type="checkbox"]');
    boxes[2]?.click();
    boxes[0]?.click();
    expect(onChange).toHaveBeenLastCalledWith(["CH", "CN"]);
  });

  it("shows what is chosen as chips, and removes one when clicked", () => {
    const onChange = picker(["CH", "ES"]);
    expect([...host.querySelectorAll(".chip")].map((c) => c.textContent)).toEqual(["CH ×", "ES ×"]);
    host.querySelector<HTMLButtonElement>(".chip")?.click();
    expect(onChange).toHaveBeenLastCalledWith(["ES"]);
  });

  it("says when nothing is chosen yet", () => {
    picker();
    expect(host.querySelector(".chips-empty")?.textContent).toBe("No countries chosen yet.");
  });

  /** Enter in a search box inside a form would submit it and reload the page. */
  it("swallows Enter", () => {
    picker();
    const box = host.querySelector<HTMLInputElement>('input[type="search"]');
    const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    box?.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
  });
});
