// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { HELP, helpFor } from "../../tool/src/help.js";

/**
 * The `?`, and the three things a person complained about.
 *
 * All three were behaviour rather than content: an explanation cropped by the
 * sidebar it was anchored in, one that could not be dismissed by clicking away
 * from it, and one that vanished when the panel scrolled under it. None of that
 * is visible in the text of the entries, which is the only part a data test
 * could reach.
 *
 * Position itself is not asserted here — happy-dom has no layout, so every
 * rectangle is zero — and it is checked by opening the real page instead. What
 * is asserted is everything that is logic: which topics exist, what opens, what
 * closes, and what a key press does to the rest of the page.
 */

beforeEach(() => {
  document.body.replaceChildren();
});

function open(topic: string): HTMLDetailsElement {
  const details = helpFor(topic) as HTMLDetailsElement;
  document.body.append(details);
  details.querySelector("summary")?.click();
  return details;
}

describe("the ? beside a control", () => {
  it("is nothing at all for a topic with no answer behind it", () => {
    expect(helpFor("nonesuch")).toBeNull();
  });

  it("writes out every entry for its topic", () => {
    const details = helpFor("projection");
    const terms = [...(details?.querySelectorAll(".help-term") ?? [])].map((p) => p.textContent);
    expect(terms).toEqual(HELP["projection"]?.map((entry) => entry.title));
    // The body is text, not markup: an explanation is not a place for a link.
    expect(details?.querySelectorAll(".help-text")).toHaveLength(terms.length);
  });

  it("names itself for a reader who cannot see it", () => {
    const summary = helpFor("detail")?.querySelector("summary");
    expect(summary?.getAttribute("aria-label")).toBe("About detail");
  });
});

describe("dismissing it", () => {
  it("closes when something else is clicked", () => {
    const details = open("region");
    expect(details.open).toBe(true);
    document.body.click();
    expect(details.open).toBe(false);
  });

  it("stays open while it is being read", () => {
    const details = open("region");
    details.querySelector(".help-body")?.dispatchEvent(new Event("click", { bubbles: true }));
    expect(details.open).toBe(true);
  });

  it("never leaves two open at once", () => {
    const first = open("region");
    const second = open("theme");
    expect(first.open).toBe(false);
    expect(second.open).toBe(true);
  });

  /**
   * Escape has two meanings on this page — close the explanation, and abandon
   * the arrow you are half way through drawing. The one on screen wins, and it
   * has to stop the event so the other never sees it.
   */
  it("takes Escape without the map's handler seeing it", () => {
    const details = open("region");
    let reachedTheMap = false;
    window.addEventListener("keydown", () => {
      reachedTheMap = true;
    });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(details.open).toBe(false);
    expect(reachedTheMap).toBe(false);
  });

  it("leaves Escape alone when nothing is open", () => {
    open("region").open = false;
    let reachedTheMap = false;
    window.addEventListener("keydown", () => {
      reachedTheMap = true;
    });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(reachedTheMap).toBe(true);
  });
});
