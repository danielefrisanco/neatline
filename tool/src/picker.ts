import type { CountryName } from "../../src/index.js";

/**
 * Choosing countries by name rather than by remembering a code.
 *
 * The first version of this was a text box you typed `FR,DE,IT` into, which is
 * fine if you already know the codes and useless otherwise — and nobody knows
 * that Switzerland is `CH` unless they have met the problem before. So: a
 * search over the names, a list you tick, and the codes shown beside the names
 * so the URL stays legible to anyone who reads it.
 *
 * The country list comes from `countryTable()`, which reads the same data the
 * map is drawn from. That matters more than it looks: **the two tiers do not
 * hold the same countries** — 177 at 110m and 241 at 50m — so a picker built
 * from a fixed list would offer countries that then fail to appear, with
 * nothing to say why. The list follows the detail.
 *
 * Deliberately not a `<select multiple>`. That control is a usability trap:
 * clicking an item clears the rest unless a modifier key is held, which is
 * exactly the class of surprise the wrapping-label bug already caused once.
 * Checkboxes cannot do that.
 */

export interface PickerOptions {
  readonly countries: readonly CountryName[];
  readonly chosen: readonly string[];
  readonly onChange: (codes: readonly string[]) => void;
}

/** Fold accents away so "espana" finds "España" and "cote" finds "Côte d'Ivoire". */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function buildPicker({ countries, chosen, onChange }: PickerOptions): HTMLElement {
  const root = document.createElement("div");
  root.className = "picker";

  const selected = new Set(chosen.map((code) => code.toUpperCase()));

  const chips = document.createElement("div");
  chips.className = "chips";

  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Search countries…";
  search.spellcheck = false;
  search.setAttribute("aria-label", "Search countries");

  const list = document.createElement("div");
  list.className = "picker-list";
  list.setAttribute("role", "group");
  list.setAttribute("aria-label", "Countries");

  const commit = (): void => {
    // Emitted in the order the list is in rather than the order they were
    // ticked, so the same set of countries always produces the same URL.
    onChange(countries.filter((c) => selected.has(c.code)).map((c) => c.code));
  };

  const drawChips = (): void => {
    chips.replaceChildren();
    if (selected.size === 0) {
      const empty = document.createElement("span");
      empty.className = "chips-empty";
      empty.textContent = "No countries chosen yet.";
      chips.append(empty);
      return;
    }
    for (const country of countries.filter((c) => selected.has(c.code))) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.title = `Remove ${country.name}`;
      chip.setAttribute("aria-label", `Remove ${country.name}`);
      chip.textContent = `${country.code} ×`;
      chip.addEventListener("click", () => {
        selected.delete(country.code);
        drawChips();
        drawList();
        commit();
      });
      chips.append(chip);
    }
  };

  const drawList = (): void => {
    const needle = fold(search.value.trim());
    list.replaceChildren();
    // A code match ranks above a name match, so typing "CH" offers Switzerland
    // before Chad, Chile and China.
    const matches = countries
      .filter(
        (c) =>
          needle === "" ||
          fold(c.name).includes(needle) ||
          fold(c.code).startsWith(needle),
      )
      .sort((a, b) => {
        const byCode = Number(fold(b.code).startsWith(needle)) - Number(fold(a.code).startsWith(needle));
        return needle === "" ? 0 : byCode;
      });

    if (matches.length === 0) {
      const none = document.createElement("p");
      none.className = "picker-none";
      none.textContent = `Nothing matches “${search.value}”.`;
      list.append(none);
      return;
    }

    for (const country of matches.slice(0, 300)) {
      const row = document.createElement("label");
      row.className = "picker-row";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = selected.has(country.code);
      box.addEventListener("change", () => {
        if (box.checked) selected.add(country.code);
        else selected.delete(country.code);
        drawChips();
        commit();
      });
      const code = document.createElement("span");
      code.className = "picker-code";
      code.textContent = country.code;
      const name = document.createElement("span");
      name.textContent = country.name;
      row.append(box, code, name);
      list.append(row);
    }
  };

  // On `input`, because filtering a list is instant and reversible — unlike
  // redrawing a map, which is why the codes box waited for `change`.
  search.addEventListener("input", drawList);
  // Enter in a search box inside a form would submit it and reload the page.
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") event.preventDefault();
  });

  drawChips();
  drawList();
  root.append(chips, search, list);
  return root;
}
