import {
  neatline,
  PALETTE_NAMES,
  PROJECTION_NAMES,
  REGION_PRESET_NAMES,
  THEME_NAMES,
  TYPEFACE_NAMES,
} from "../../src/index.js";
import { decode, encode, toOptions, type Config, type Vocabulary } from "./config.js";
import { buildForm } from "./controls.js";

/**
 * The tool: a form over `MapOptions`, and a URL that rebuilds what it made.
 *
 * One state object, one render, one place the URL is written. Every control
 * hands back a patch and nothing else happens until it reaches here — which is
 * what makes "someone changed a dropdown" and "someone opened a shared link"
 * the same code path, and the second one is the path that usually rots.
 *
 * The library is doing the work, and the reason a UI this thin is possible at
 * all is that **no option in `MapOptions` is a callback**. A form can build the
 * entire configuration as data, put it in a query string, and hand it over.
 */

const VOCABULARY: Vocabulary = {
  regions: REGION_PRESET_NAMES,
  projections: PROJECTION_NAMES,
  themes: THEME_NAMES,
  palettes: PALETTE_NAMES,
  typefaces: TYPEFACE_NAMES,
};

const mapHost = must<HTMLElement>("#map");
const statusHost = must<HTMLElement>("#status");
const formHost = must<HTMLElement>("#form");
const linkHost = must<HTMLInputElement>("#share");

function must<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (found === null) throw new Error(`neatline: the page is missing ${selector}`);
  return found;
}

let config: Config = decode(window.location.search, VOCABULARY);

/**
 * How long to wait before drawing, in milliseconds.
 *
 * A slider fires on every pixel of travel and a 50m world map is not a
 * per-pixel operation. Short enough that a dropdown feels immediate, long
 * enough that dragging a slider draws once at the end rather than forty times
 * on the way.
 */
const SETTLE = 90;

let pending: number | undefined;
/** Which render is current, so a slow one cannot overwrite a newer fast one. */
let generation = 0;

function say(text: string, state: "" | "busy" | "error" = ""): void {
  statusHost.textContent = text;
  statusHost.classList.toggle("is-error", state === "error");
  statusHost.classList.toggle("is-busy", state === "busy");
}

function apply(patch: Partial<Config>): void {
  config = { ...config, ...patch };
  buildForm(formHost, config, VOCABULARY, apply);
  writeUrl();
  schedule();
}

function writeUrl(): void {
  const query = encode(config);
  const url = `${window.location.pathname}${query === "" ? "" : `?${query}`}`;
  // `replaceState`, not `pushState`: every keystroke on a slider is not a place
  // in someone's history to go back through.
  window.history.replaceState(null, "", url);
  linkHost.value = `${window.location.origin}${url}`;
}

function schedule(): void {
  window.clearTimeout(pending);
  pending = window.setTimeout(() => void render(), SETTLE);
}

async function render(): Promise<void> {
  const mine = ++generation;
  say("Drawing…", "busy");
  const started = performance.now();
  try {
    const drawn = await neatline(toOptions(config));
    // An older render finishing after a newer one has started must not win.
    // Switching detail from 110m to 50m and back is exactly how that happens.
    if (mine !== generation) return;
    // `toString()` rather than `svg`: the stylesheet travels inside the
    // document, which is the whole bargain the library makes. Two maps could
    // share this page safely — ids and stylesheet are both scoped to a hash of
    // the map — but there is only one here.
    mapHost.innerHTML = drawn.toString();
    mapHost.removeAttribute("aria-busy");
    say(`Drawn in ${Math.round(performance.now() - started)} ms.`);
  } catch (error: unknown) {
    if (mine !== generation) return;
    mapHost.removeAttribute("aria-busy");
    const detail = error instanceof Error ? error.message : String(error);
    // The base path is the failure this page was built to catch first: a wrong
    // base does not error, it fetches the 404 page and reports a parse error
    // from three modules down.
    const looksLikeAWrongPath = detail.includes("JSON") || detail.includes("Unexpected token");
    say(
      `Could not draw the map. ${detail}` +
        (looksLikeAWrongPath
          ? " — that usually means the data was requested from the wrong path and a 404 page came back instead."
          : ""),
      "error",
    );
  }
}

linkHost.addEventListener("focus", () => linkHost.select());

buildForm(formHost, config, VOCABULARY, apply);
writeUrl();
void render();
