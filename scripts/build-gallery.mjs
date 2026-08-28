/**
 * Build the gallery contact sheet — every committed snapshot on one page.
 *
 * The gallery exists because this project has three times shipped a map that
 * every string assertion passed and no one had looked at. Committing the SVGs
 * only half solves that: a directory of forty-two files is not something anyone
 * opens either. This puts them on one page, in the browser, at a size where a
 * flat choropleth or a black square is obvious at a glance.
 *
 * The page is derived from the files themselves rather than from the test that
 * writes them — the title comes from the root `aria-label`, the shape from the
 * viewBox, and what each map demonstrates is read back off the markup. So the
 * page can never claim a map contains something the file does not.
 *
 * Output is untracked on purpose, the same bargain the plan gets: three
 * megabytes of inline SVG makes a diff nobody can read. Run it when you want
 * to look.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";

const DIR = "test/__snapshots__/gallery";
const OUT = "gallery.html";

/** What a map demonstrates, read back off the file rather than off its options. */
const FEATURES = [
  ["neighbours", (s) => s.includes('class="mp-neighbour"')],
  ["choropleth", (s) => s.includes("data-bin=")],
  ["political fill", (s) => s.includes("data-fill=")],
  ["hatching", (s) => s.includes("data-stripe=")],
  ["prism", (s) => s.includes('class="mp-prism')],
  ["highlight", (s) => s.includes("is-highlighted")],
  ["relief", (s) => s.includes("#mp-relief")],
  ["names", (s) => s.includes('data-kind="country"')],
  ["cities", (s) => s.includes('data-kind="place"')],
  ["water", (s) => s.includes('class="mp-water"')],
];

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Namespace every id in one map.
 *
 * The stylesheets already cannot collide — each is scoped to a hash of itself,
 * which is why forty-two `<style>` blocks can share a page. The *ids* are still
 * constants, so without this every `url(#mp-land-clip)` on the page would
 * resolve to the first map's clip path and forty-one maps would have their
 * rivers clipped to somebody else's coastline.
 */
function namespaceIds(svg, index) {
  let out = svg;
  for (const id of new Set([...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]))) {
    out = out.replaceAll(`id="${id}"`, `id="g${index}-${id}"`);
    out = out.replaceAll(`url(#${id})`, `url(#g${index}-${id})`);
  }
  return out;
}

const files = (await readdir(DIR)).filter((f) => f.endsWith(".svg")).sort();
const cards = [];

for (const [index, file] of files.entries()) {
  const slug = file.replace(/\.svg$/, "");
  const raw = await readFile(`${DIR}/${file}`, "utf8");

  // The root aria-label, not the first <title> — every country carries a
  // <title> of its own for hover, and those come later in the document.
  const label = /<svg[^>]*aria-label="([^"]*)"/.exec(raw)?.[1] ?? slug;
  const [, w, h] = /viewBox="0 0 (\d+) (\d+)"/.exec(raw) ?? [, "0", "0"];
  // Detect against the markup with the stylesheet removed. Every bundled theme
  // carries rules for `data-bin`, `data-fill` and `.is-highlighted` whether or
  // not the map uses them, so testing the whole file reports every feature on
  // every map — which is worse than reporting none, because it looks right.
  const drawn = raw.replace(/<style>[\s\S]*?<\/style>/, "");
  const found = FEATURES.filter(([, test]) => test(drawn)).map(([name]) => name);

  const svg = namespaceIds(raw, index)
    .replace(/<svg([^>]*?)\swidth="[^"]*"/, "<svg$1")
    .replace(/<svg([^>]*?)\sheight="[^"]*"/, "<svg$1");

  cards.push(`      <figure class="card" id="${escape(slug)}">
        <div class="plate">${svg}</div>
        <figcaption>
          <h2>${escape(label)}</h2>
          <p class="chips">${found.map((f) => `<span class="chip">${escape(f)}</span>`).join("")}</p>
          <p class="file"><code>${escape(slug)}.svg</code> · ${w}×${h}</p>
        </figcaption>
      </figure>`);
}

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>neatline gallery — ${files.length} maps</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@500;600;700&family=IBM+Plex+Serif:wght@400&display=swap">
<style>
  :root {
    --ground: #EFF1EC; --panel: #FBFCF9; --plate: #FFFFFF;
    --ink: #1E2426; --ink-soft: #59636A; --line: #D5DAD2; --accent: #35607A;
    --f-head: "IBM Plex Sans Condensed", "Helvetica Neue", Arial, sans-serif;
    --f-body: "IBM Plex Serif", Georgia, serif;
    --f-mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #11151A; --panel: #191F25; --plate: #E9EBE6;
      --ink: #E7EAE5; --ink-soft: #96A1A9; --line: #28313A; --accent: #7FB3D1;
    }
  }
  :root[data-theme="dark"] {
    --ground: #11151A; --panel: #191F25; --plate: #E9EBE6;
    --ink: #E7EAE5; --ink-soft: #96A1A9; --line: #28313A; --accent: #7FB3D1;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: clamp(1.5rem, 4vw, 3.5rem) clamp(1rem, 4vw, 3rem) 5rem;
    background: var(--ground); color: var(--ink);
    font-family: var(--f-body); font-size: 16px; line-height: 1.6;
  }
  .wrap { max-width: 1180px; margin: 0 auto; }
  header { border-bottom: 2px solid var(--ink); padding-bottom: 1.5rem; margin-bottom: 3rem; }
  .eyebrow {
    font-family: var(--f-mono); font-size: .7rem; letter-spacing: .18em;
    text-transform: uppercase; color: var(--accent); margin: 0 0 .8rem;
  }
  h1 {
    font-family: var(--f-head); font-weight: 700; letter-spacing: -.02em;
    font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.05; margin: 0 0 .8rem;
  }
  header p.stand { margin: 0; max-width: 62ch; color: var(--ink-soft); }
  .grid { display: grid; grid-template-columns: 1fr; gap: 2.5rem; }
  @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
  .card { margin: 0; display: flex; flex-direction: column; gap: .7rem; scroll-margin-top: 1rem; }
  .plate {
    background: var(--plate); border: 1px solid var(--line); border-radius: 2px;
    padding: .5rem; overflow: hidden; line-height: 0;
  }
  .plate svg { width: 100%; height: auto; display: block; }
  figcaption { display: flex; flex-direction: column; gap: .3rem; }
  figcaption h2 {
    font-family: var(--f-head); font-weight: 600; font-size: 1.1rem;
    letter-spacing: -.01em; margin: 0;
  }
  .chips { display: flex; flex-wrap: wrap; gap: .3rem; margin: 0; }
  .chip {
    font-family: var(--f-mono); font-size: .66rem; letter-spacing: .04em;
    color: var(--accent); border: 1px solid currentColor; border-radius: 2px;
    padding: .08rem .35rem;
  }
  .file { margin: 0; font-size: .72rem; color: var(--ink-soft); }
  .file code { font-family: var(--f-mono); font-size: .95em; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <p class="eyebrow">neatline · npm run gallery</p>
    <h1>${files.length} maps, as files someone can open</h1>
    <p class="stand">Every committed snapshot in <code>${DIR}</code>, exactly as it renders. What each map is said to demonstrate is read back off the markup rather than off the test that wrote it, so nothing here can claim a feature the file does not contain.</p>
  </header>
  <div class="grid">
${cards.join("\n")}
  </div>
</div>
</body>
</html>
`;

await writeFile(OUT, page, "utf8");
const kb = Buffer.byteLength(page) / 1024;
console.log(`  ${OUT}  ${(kb / 1024).toFixed(1)} MB  (${files.length} maps)`);
