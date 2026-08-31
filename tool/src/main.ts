import { neatline } from "../../src/index.js";

/**
 * The skeleton: one map, one status line, and a real address.
 *
 * 09b deliberately draws something nobody chose. The point of this sub-phase is
 * the pipeline — a bundler, an action, and data served beside the bundle — and
 * the only way to know that works is to put it on a URL and open it. A static
 * site whose deploy is first attempted at the end of a phase is a static site
 * that turns out to have worked only on the machine that built it.
 *
 * The one thing here that is not scaffolding is the error handling. Every way
 * this page can fail today is a *fetch* failing, and a fetch that fails against
 * the wrong base path does not announce itself: the server answers the 404 page
 * with `content-type: text/html`, `JSON.parse` chokes on `<`, and the message
 * that reaches the console is a syntax error from three modules down. So the
 * failure is caught here and shown as what it is.
 */

const map = document.querySelector<HTMLElement>("#map");
const status = document.querySelector<HTMLElement>("#status");

if (map === null || status === null) {
  throw new Error("neatline: the page is missing #map or #status");
}

function say(text: string, failed = false): void {
  (status as HTMLElement).textContent = text;
  (status as HTMLElement).classList.toggle("is-error", failed);
}

async function draw(): Promise<void> {
  const started = performance.now();
  const drawn = await neatline({
    region: ["IT", "CH", "AT", "SI", "HR", "FR", "DE"],
    detail: "50m",
    projection: "conic-conformal",
    size: [960, 620],
    theme: "minimal",
    palette: "sand",
    sea: true,
    seaNames: true,
    terrain: ["mountain"],
    graticule: true,
    labelRank: 1,
    placeRank: 1,
    credit: "Natural Earth",
    title: "The Alps, drawn in a browser",
  });

  // `toString()` rather than `svg`: the stylesheet ships inside the document,
  // which is the whole bargain the library makes. Set as markup rather than
  // through an iframe because the ids and the stylesheet are both scoped to a
  // hash of the map — two maps on one page was the blocker that Phase 8 closed.
  (map as HTMLElement).innerHTML = drawn.toString();
  (map as HTMLElement).removeAttribute("aria-busy");
  say(`Drawn in ${Math.round(performance.now() - started)} ms.`);
}

draw().catch((error: unknown) => {
  (map as HTMLElement).removeAttribute("aria-busy");
  const detail = error instanceof Error ? error.message : String(error);
  // The base path is the failure this page exists to catch, so it is named
  // rather than left for the reader to infer from a parse error.
  say(
    `Could not draw the map. ${detail}` +
      (detail.includes("JSON") || detail.includes("Unexpected token")
        ? " — that usually means the data was requested from the wrong path and a 404 page came back instead."
        : ""),
    true,
  );
  throw error;
});
