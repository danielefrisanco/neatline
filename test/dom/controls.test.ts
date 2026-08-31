// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ICON_NAMES,
  PALETTE_NAMES,
  PROJECTION_NAMES,
  REGION_PRESET_NAMES,
  THEME_NAMES,
  TYPEFACE_NAMES,
} from "../../src/index.js";
import { DEFAULTS, type Config } from "../../tool/src/config.js";
import { buildForm, type Editing, type Vocabularies } from "../../tool/src/controls.js";

/**
 * The form, in a document.
 *
 * Everything else about the tool is tested as data — the URL round trip, the
 * mark encoder, the export sizes — and **both of the bugs a person found were
 * in the part that data cannot reach.** A `<label>` wrapping a `<select>`
 * forwarded clicks to it and made the dropdown close as soon as it opened; a
 * rename handler rebuilt a pin as `{ at, label }` and quietly dropped the icon
 * it had been given. Neither is visible in a config object, and both are a few
 * lines of DOM.
 *
 * So this file builds the real form in a real document and operates the real
 * controls. It asserts behaviour rather than markup: what a click does, what
 * appears when, and what survives an edit.
 */

const VOCABULARY: Vocabularies = {
  regions: REGION_PRESET_NAMES,
  projections: PROJECTION_NAMES,
  themes: THEME_NAMES,
  palettes: PALETTE_NAMES,
  typefaces: TYPEFACE_NAMES,
  icons: ICON_NAMES,
  countries: [
    { code: "FR", name: "France" },
    { code: "DE", name: "Germany" },
  ],
};

const IDLE: Editing = {
  mode: "none",
  openRoute: false,
  onMode: () => {},
  onFinishRoute: () => {},
};

let host: HTMLFormElement;

function build(config: Partial<Config> = {}, editing: Partial<Editing> = {}) {
  const changes = vi.fn();
  buildForm(host, { ...DEFAULTS, ...config }, VOCABULARY, changes, { ...IDLE, ...editing });
  return changes;
}

/** The control under a given field label — the way a person finds it. */
function field(label: string): HTMLElement | null {
  for (const name of host.querySelectorAll(".field-label")) {
    if (name.textContent !== label) continue;
    return name.closest(".field");
  }
  return null;
}

beforeEach(() => {
  document.body.replaceChildren();
  host = document.createElement("form");
  document.body.append(host);
});

describe("the form", () => {
  it("builds every group", () => {
    build();
    // The order somebody works in: what am I mapping, how much of it, what do
    // I want it to say, what am I marking on it — and only then what it looks
    // like. Not the order the controls were built in.
    expect([...host.querySelectorAll("h2")].map((h) => h.textContent)).toEqual([
      "Subject",
      "Frame",
      "What it shows",
      "Marks",
      "Look",
    ]);
  });

  /**
   * The bug a person found by trying to use the tool: a label containing a
   * control forwards clicks to it, so a click landing on a `<select>` fires
   * twice — opening the menu and closing it again — and the dropdown only stays
   * open while the mouse button is held down.
   */
  it("never wraps a select in its label", () => {
    build();
    const selects = [...host.querySelectorAll("select")];
    expect(selects.length).toBeGreaterThan(5);
    for (const select of selects) {
      expect(select.closest("label")).toBeNull();
      // And it is still labelled — pointing at it by `for` rather than by
      // containing it is the whole of the fix.
      const label = host.querySelector(`label[for="${select.id}"]`);
      if (select.classList.contains("mark-icon")) continue;
      expect(label, `${select.id} has no label`).not.toBeNull();
    }
  });

  it("gives a group's ? its heading rather than a line of its own", () => {
    build();
    for (const head of host.querySelectorAll(".group-head")) {
      expect(head.querySelector("h2")).not.toBeNull();
      expect(head.querySelector("details.help")).not.toBeNull();
    }
    expect(host.querySelectorAll(".group-head").length).toBeGreaterThanOrEqual(3);
  });
});

describe("controls that come and go", () => {
  it("offers degree labels only with the grid they annotate", () => {
    build({ graticule: false });
    expect([...host.querySelectorAll(".check span")].map((s) => s.textContent)).not.toContain(
      "Degree labels",
    );
    build({ graticule: true });
    expect([...host.querySelectorAll(".check span")].map((s) => s.textContent)).toContain(
      "Degree labels",
    );
  });

  /**
   * The icon dropdown sets what the *next* click drops. Outside the gesture it
   * is a control with nothing to act on.
   */
  it("offers the next pin's icon only while pins are being dropped", () => {
    build({}, { mode: "none" });
    expect(field("Icon for the next pin")).toBeNull();
    build({}, { mode: "arrow" });
    expect(field("Icon for the next pin")).toBeNull();
    build({}, { mode: "pin" });
    expect(field("Icon for the next pin")).not.toBeNull();
  });

  it("offers the pin size when there is a pin to size", () => {
    build();
    expect(field("Pin size")).toBeNull();
    build({ pins: [{ at: [0, 0] }] });
    expect(field("Pin size")).not.toBeNull();
    build({}, { mode: "pin" });
    expect(field("Pin size")).not.toBeNull();
  });

  it("offers to finish a route only while one is open", () => {
    const text = (): string[] => [...host.querySelectorAll("button")].map((b) => b.textContent ?? "");
    build({}, { mode: "route", openRoute: false });
    expect(text()).not.toContain("Finish this route");
    build({}, { mode: "route", openRoute: true });
    expect(text()).toContain("Finish this route");
  });
});

describe("the mark list", () => {
  const pins = [
    { at: [2.35, 48.86] as [number, number], kind: "airport" },
    { at: [13.4, 52.5] as [number, number], label: "Berlin" },
  ];

  /** The second bug a person found, now through the control that caused it. */
  it("keeps a pin's icon when its name is typed in", () => {
    const changes = build({ pins });
    const input = host.querySelector<HTMLInputElement>(".mark-label");
    expect(input).not.toBeNull();
    if (input === null) return;
    input.value = "Charles de Gaulle";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(changes).toHaveBeenCalledWith({
      pins: [
        { at: [2.35, 48.86], kind: "airport", label: "Charles de Gaulle" },
        pins[1],
      ],
    });
  });

  it("keeps a pin's name when its icon is chosen", () => {
    const changes = build({ pins });
    const icons = host.querySelectorAll<HTMLSelectElement>(".mark-icon");
    const second = icons[1];
    expect(second).toBeDefined();
    if (second === undefined) return;
    second.value = "hospital";
    second.dispatchEvent(new Event("change", { bubbles: true }));
    expect(changes).toHaveBeenCalledWith({
      pins: [pins[0], { at: [13.4, 52.5], label: "Berlin", kind: "hospital" }],
    });
  });

  it("shows each pin's own icon rather than one for all of them", () => {
    build({ pins });
    expect([...host.querySelectorAll<HTMLSelectElement>(".mark-icon")].map((s) => s.value)).toEqual([
      "airport",
      "",
    ]);
  });

  it("removes the mark that was asked for", () => {
    const changes = build({ pins });
    const remove = host.querySelectorAll<HTMLButtonElement>(".mark-remove");
    remove[0]?.click();
    expect(changes).toHaveBeenCalledWith({ pins: [pins[1]] });
  });

  it("drops a highlighted country from its chip", () => {
    const changes = build({ highlight: ["FR", "DE"] });
    const chip = host.querySelector<HTMLButtonElement>(".chips .chip");
    expect(chip?.textContent).toBe("FR ×");
    chip?.click();
    expect(changes).toHaveBeenCalledWith({ highlight: ["DE"] });
  });

  it("says so when there is nothing marked", () => {
    build();
    expect(host.querySelector(".marks-empty")?.textContent).toBe("Nothing marked yet.");
  });

  it("clears every kind of mark at once", () => {
    const changes = build({
      pins,
      highlight: ["FR"],
      arrows: [{ from: [0, 0], to: [1, 1] }],
      routes: [{ stops: [{ at: [0, 0] }] }],
    });
    const clear = [...host.querySelectorAll("button")].find(
      (b) => b.textContent === "Clear every mark",
    );
    clear?.click();
    expect(changes).toHaveBeenCalledWith({ highlight: [], pins: [], arrows: [], routes: [] });
  });
});
