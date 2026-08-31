import type { Config } from "./config.js";

/**
 * The form, built from the library's own name lists.
 *
 * Nothing here knows what a theme is. `THEME_NAMES`, `PALETTE_NAMES`,
 * `PROJECTION_NAMES` and the rest are exported precisely so a caller can put
 * them in a dropdown without keeping a second copy that goes stale — so a
 * palette added to the library appears here on the next build with no change to
 * this file.
 *
 * Every control writes one key of the config and then hands the whole thing
 * back. No control knows about rendering, the URL, or any other control; that
 * wiring lives in one place, which is what keeps "changing a theme" and
 * "arriving from a shared link" the same code path.
 */

type Change = (patch: Partial<Config>) => void;

function field(label: string, control: HTMLElement, hint?: string): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "field";
  const name = document.createElement("span");
  name.className = "field-label";
  name.textContent = label;
  wrap.append(name, control);
  if (hint !== undefined) {
    const note = document.createElement("span");
    note.className = "field-hint";
    note.textContent = hint;
    wrap.append(note);
  }
  return wrap;
}

function select(
  options: readonly { value: string; label: string }[],
  value: string,
  onChange: (value: string) => void,
): HTMLSelectElement {
  const element = document.createElement("select");
  for (const option of options) {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    element.append(node);
  }
  element.value = value;
  element.addEventListener("change", () => onChange(element.value));
  return element;
}

const named = (names: readonly string[]): { value: string; label: string }[] =>
  names.map((name) => ({ value: name, label: name }));

function checkbox(
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "check";
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = checked;
  box.addEventListener("change", () => onChange(box.checked));
  const text = document.createElement("span");
  text.textContent = label;
  wrap.append(box, text);
  return wrap;
}

function slider(
  value: number,
  [low, high, step]: readonly [number, number, number],
  onChange: (value: number) => void,
): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "slider";
  const range = document.createElement("input");
  range.type = "range";
  range.min = String(low);
  range.max = String(high);
  range.step = String(step);
  range.value = String(value);
  const readout = document.createElement("output");
  readout.textContent = String(value);
  range.addEventListener("input", () => {
    readout.textContent = range.value;
    onChange(Number(range.value));
  });
  wrap.append(range, readout);
  return wrap;
}

export interface Vocabularies {
  readonly regions: readonly string[];
  readonly projections: readonly string[];
  readonly themes: readonly string[];
  readonly palettes: readonly string[];
  readonly typefaces: readonly string[];
}

const COVERS = ["desert", "mountain", "glacier"] as const;

/**
 * Rebuild the whole form from the config it is given.
 *
 * Torn down and rebuilt on every change rather than patched in place. That is
 * the cheap and correct choice at this size — a few dozen nodes against a map
 * that takes tens of milliseconds to compute — and it removes a whole class of
 * bug where a control and the state disagree after arriving from a link.
 */
export function buildForm(
  host: HTMLElement,
  config: Config,
  vocabulary: Vocabularies,
  onChange: Change,
): void {
  host.replaceChildren();

  const group = (title: string, children: readonly HTMLElement[]): HTMLElement => {
    const section = document.createElement("section");
    section.className = "group";
    const heading = document.createElement("h2");
    heading.textContent = title;
    section.append(heading, ...children);
    return section;
  };

  const regions = document.createElement("div");
  regions.className = "stack";
  regions.append(
    select(
      [
        ...named(vocabulary.regions),
        { value: "__codes", label: "country codes…" },
      ],
      vocabulary.regions.includes(config.region) ? config.region : "__codes",
      (value) => onChange({ region: value === "__codes" ? "FR,DE,IT" : value }),
    ),
  );
  if (!vocabulary.regions.includes(config.region)) {
    const codes = document.createElement("input");
    codes.type = "text";
    codes.value = config.region;
    codes.spellcheck = false;
    codes.placeholder = "FR, DE, IT";
    codes.setAttribute("aria-label", "Country codes");
    // On `change` rather than `input`: a half-typed list of codes is a
    // different map, and redrawing one per keystroke is worse than waiting.
    codes.addEventListener("change", () => onChange({ region: codes.value }));
    regions.append(codes);
  }

  host.append(
    group("Subject", [
      field("Region", regions, "A preset, or a list of ISO codes"),
      field(
        "Detail",
        select(
          [
            { value: "110m", label: "110m — coarse, fast" },
            { value: "50m", label: "50m — fine" },
          ],
          config.detail,
          (value) => onChange({ detail: value as Config["detail"] }),
        ),
      ),
      field(
        "Projection",
        select(named(vocabulary.projections), config.projection, (value) =>
          onChange({ projection: value }),
        ),
      ),
    ]),

    group("Look", [
      field(
        "Theme",
        select(named(vocabulary.themes), config.theme, (value) => onChange({ theme: value })),
      ),
      field(
        "Palette",
        select(
          [{ value: "", label: "none — the theme's own" }, ...named(vocabulary.palettes)],
          config.palette,
          (value) => onChange({ palette: value }),
        ),
      ),
      field(
        "Typeface",
        select(
          [{ value: "", label: "none — the theme's own" }, ...named(vocabulary.typefaces)],
          config.typeface,
          (value) => onChange({ typeface: value }),
        ),
      ),
      field("Border width", slider(config.borderWidth, [0, 4, 0.1], (value) =>
        onChange({ borderWidth: value }),
      )),
      field("Label size", slider(config.labelSize, [8, 28, 1], (value) =>
        onChange({ labelSize: value }),
      )),
    ]),

    group("Layers", [
      checkbox("Sea as a shape", config.sea, (on) => onChange({ sea: on })),
      checkbox("Name the seas", config.seaNames, (on) => onChange({ seaNames: on })),
      checkbox("Graticule", config.graticule, (on) => onChange({ graticule: on })),
      checkbox("Neighbours", config.neighbours, (on) => onChange({ neighbours: on })),
      ...COVERS.map((kind) =>
        checkbox(
          kind === "mountain" ? "Mountains" : kind === "desert" ? "Desert" : "Glaciers",
          config.terrain.includes(kind),
          (on) =>
            onChange({
              terrain: on
                ? [...config.terrain, kind]
                : config.terrain.filter((other) => other !== kind),
            }),
        ),
      ),
    ]),

    group("Names", [
      field(
        "Cities shown",
        select(
          [
            { value: "1", label: "1 — capitals and the largest" },
            { value: "2", label: "2 — and over a million" },
            { value: "3", label: "3 — everything" },
          ],
          String(config.placeRank),
          (value) => onChange({ placeRank: Number(value) as 1 | 2 | 3 }),
        ),
      ),
      field(
        "Cities named",
        select(
          [
            { value: "1", label: "1 — capitals and the largest" },
            { value: "2", label: "2 — and over a million" },
            { value: "3", label: "3 — everything" },
          ],
          String(config.labelRank),
          (value) => onChange({ labelRank: Number(value) as 1 | 2 | 3 }),
        ),
        "Lower than the dots on purpose: words collide where dots merely crowd",
      ),
    ]),

    group("Canvas", [
      field("Width", numberBox(config.width, (value) => onChange({ width: value }))),
      field("Height", numberBox(config.height, (value) => onChange({ height: value }))),
      field("Credit", textBox(config.credit, (value) => onChange({ credit: value }))),
    ]),
  );
}

function numberBox(value: number, onChange: (value: number) => void): HTMLElement {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "200";
  input.max = "4000";
  input.step = "10";
  input.value = String(value);
  input.addEventListener("change", () => {
    const next = Number(input.value);
    if (Number.isFinite(next)) onChange(Math.min(4000, Math.max(200, Math.round(next))));
  });
  return input;
}

function textBox(value: string, onChange: (value: string) => void): HTMLElement {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.addEventListener("change", () => onChange(input.value));
  return input;
}
