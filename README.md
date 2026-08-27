# mapper

Generate standalone, CSS-themeable SVG maps from a region and a stylesheet.

No tile server, no fonts pipeline, no API key, no runtime model call.
Same input, byte-identical output.

```ts
import { mapper } from "mapper";

const map = await mapper({
  region: "west-europe",
  projection: "conic-conformal",
  highlight: ["FR", "DE", "BE"],
  title: "Rail freight volume, 2024",
});

await map.toFile("europe.svg", { theme: "minimal" });
```

## Status

Early. **Phases 0–2 are complete** — the package builds under both ESM and CJS,
resolves real geometry, and emits the frozen document shape below. Themes come
in Phase 3; until then `map.css` is empty and the SVG carries no styling.

See the build plan for what is in scope, what is reserved, and what is
deliberately out.

## The class taxonomy

The real public API is the shape of the document, not the function signature.
Every theme anyone writes is a set of selectors against these names, so they are
versioned like a function signature and change only on a major.

The root is `<svg class="mp">`. Inside it, a `.mp-bg` rectangle covers the
canvas, then eight layer groups in **fixed paint order**, bottom to top:

| Layer group | Feature class | Data attributes | Carries |
|---|---|---|---|
| `.mp-neighbours` | `.mp-neighbour` | `data-iso` | *Reserved* · surrounding countries drawn as context |
| `.mp-land` | `.mp-country` | `data-iso`, `data-name` | Filled land polygons, one node per country |
| `.mp-hydro` | `.mp-water` | `data-kind` | *Reserved* · lakes and rivers |
| `.mp-borders` | `.mp-border` | `data-kind` | Shared boundaries, each drawn once |
| `.mp-roads` | `.mp-road` | `data-kind` | *Reserved* · motorway, trunk, primary |
| `.mp-places` | `.mp-place` | `data-rank`, `data-pop` | *Reserved* · settlement dots |
| `.mp-labels` | `.mp-label` | `data-rank`, `data-iso` | *Reserved* · text nodes, thinned by rank |
| `.mp-annotations` | `.mp-anno` | `data-id` | *Reserved* · pins, arrows, callouts |
| `.mp-furniture` | `.mp-credit` | `data-anchor` | *Reserved* · credits, watermarks, legends |

`.is-highlighted` is a modifier on any feature named in `highlight`.
`.mp-pin`, `.mp-arrow`, `.mp-callout`, `.mp-watermark`, `.mp-legend`,
`.mp-scale` and `.mp-compass` are claimed but not yet emitted.

Every layer but the last is geographic — its contents move when the projection
or region changes. `.mp-furniture` is the exception: a credit line or watermark
is placed on the canvas in fixed user units and must not shift when the camera
does, which is why it is a layer of its own and sits above everything else.

`.mp-bg` and the `.mp-borders` group ship with `fill="none"`. That is structural,
not stylistic: SVG's default fill is black, so a full-canvas rectangle or a line
path with no theme applied would render as a black square and a filled blob.
Presentation attributes have zero specificity, so any theme rule overrides them.

Every layer group carries `mp-layer` alongside its own class, and **every one is
emitted even when empty**. That is deliberate: inserting a layer later would
restack everything beneath it and break themes already in the wild. Empty slots
cost about thirty bytes and buy a stable stack for the life of v1.

The taxonomy is also readable at runtime, so tooling never has to hard-code it:

```ts
import { LAYERS } from "mapper";

LAYERS.map((layer) => layer.className);
// ["mp-neighbours", "mp-land", "mp-hydro", "mp-borders", ...]
```

### Borders are meshed, not outlined

`.mp-border` comes from the shared arcs between countries, so the
France–Germany boundary is one line rather than two stacked on top of each
other. Coastlines are excluded — they are already the silhouette of the land
layer. This matters the moment a theme makes borders translucent or dashed,
where doubled lines render visibly wrong.

The group carries `fill="none"` as a presentation attribute, because a line path
with the SVG default fill renders as a filled blob.

### A note on non-browser renderers

Browsers follow the spec: presentation attributes have zero specificity, so
`.mp-bg { fill: … }` in a theme overrides the built-in `fill="none"`. Verified
in Chromium.

Some non-browser renderers get this backwards and let the attribute win —
ImageMagick's built-in MSVG renderer is one. A map themed with a `<style>` block
will show an unpainted background there. This is the same class of problem as
design tools that ignore `<style>` entirely, and it is what the planned
`inlineStyles` render option exists to solve, by flattening computed values onto
presentation attributes before writing the file.

### Accessibility

The root carries `role="img"` with an `aria-label` and a matching `<title>`.
Each country also carries its own `<title>`, which browsers show on hover;
because the root is `role="img"`, assistive technology reads the one label
instead of announcing two hundred paths.

The generated label describes the geography (`"Map of Western Europe,
highlighting France and Belgium"`). Pass `title` to say what the map is actually
about — a map of election results is not "a map of Western Europe".

## Scripts

| | |
|---|---|
| `npm run check` | typecheck → test → build → verify exports |
| `npm run build` | dual ESM/CJS bundle plus types |
| `npm test` | vitest; SVG snapshots land in `test/__snapshots__/` as real `.svg` files |
| `npm run dev` | rebuild on change |

## License

MIT. Geometry comes from [Natural Earth](https://www.naturalearthdata.com/),
which is public domain and carries no attribution requirement.
