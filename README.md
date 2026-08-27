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

Early. **Phases 0–4 are complete** — the package builds under both ESM and CJS,
resolves real geometry, emits the frozen document shape below, themes it, and
carries lakes, rivers and cities. Labels arrive in Phase 6.

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
| `.mp-hydro` | `.mp-water` | `data-kind` | Lakes and rivers, drawn over the land |
| `.mp-borders` | `.mp-border` | `data-kind` | Shared boundaries, each drawn once |
| `.mp-roads` | `.mp-road` | `data-kind` | *Reserved* · motorway, trunk, primary |
| `.mp-places` | `.mp-place` | `data-name`, `data-iso`, `data-rank`, `data-pop` | Settlement dots, ranked 1–3 |
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

## Theming

Three inputs, applied in cascade order. There is no merge step, no schema and
no validation layer, because the cascade already does that work.

```ts
const map = await mapper({
  region: "west-europe",
  theme: "atlas",              // structure: weights, dashes, type
  palette: "dusk",             // colour only, applied over the theme
  tokens: { accent: "#C2482F" } // final say
});

map.css              // the resolved stylesheet, scoped
map.svg              // geometry only — pair it with map.css yourself
map.toString()       // complete, styled by its <style> block — for embedding
await map.render()   // complete and portable — renders without CSS support
await map.toFile(p)  // render(), written to disk
```

### Two output forms, for two different readers

`toString()` is styled by its stylesheet alone. That is the right form to embed
in a page: the browser applies the `<style>` block, and the file stays small.

`render()` and `toFile()` **flatten the theme onto presentation attributes by
default**, because a file gets opened by whatever the reader happens to have —
a design tool, a file-manager thumbnailer, an editor preview — and many of those
ignore `<style>` entirely, which renders a themed map as black shapes. The
stylesheet still ships inside, so a browser honours the CSS and everything else
honours the attributes. Both resolve to the same paint.

Pass `inlineStyles: false` for the smallest possible file when you know the
target understands stylesheets.

**A theme carries structure; a palette carries only colour.** That split is the
point: both a newsroom and a company want to keep a style and change its
colours, not rewrite it. Because tokens are named by role, a palette *is* a set
of token values — so recolouring costs nothing to implement.

Bundled themes are `minimal` and `atlas`; bundled palettes are `dusk` and
`sand`. Any of them can instead be a path to a `.css` file or a stylesheet
passed inline. The files ship too, for linking or forking:

```ts
import "mapper/themes/atlas.css";
```

### Tokens

Named by role, never by appearance. `--ink`, never `--dark-gray` — the second
is a lie the moment someone writes a dark theme, and renaming it later breaks
every theme in the wild.

| Token | Controls |
|---|---|
| `--bg` | Canvas ground — the ocean, or transparent |
| `--land` | Country fill |
| `--land-edge` | Country outline |
| `--border` / `--border-width` | Shared boundaries |
| `--accent` / `--accent-edge` | Anything highlighted |
| `--ink` / `--ink-muted` | Text |
| `--font` / `--label-size` | Type |
| `--water` `--road` `--neighbour` `--anno` `--anno-ink` `--furniture-ink` | *Reserved* — set them now, they start working when their layer lands |

### Styles are scoped to one map

A `<style>` block inside inline SVG is **not** scoped to that SVG — it applies
to the whole host page. Two differently themed maps on a page would overwrite
each other, and a map would restyle anything sharing a class name.

So every rule is scoped to a class derived from a hash of the stylesheet
itself: `.mp.mp-t-k3f9a1z .mp-country`. Deterministic, so the same theme always
produces the same class and output stays byte-identical; distinct, so two
themes cannot collide.

### How flattening works

`inlineStyles` resolves the cascade and writes the computed paint onto each
element as presentation attributes. It is not a CSS engine. It handles class selectors and descendant combinators,
which is what the bundled themes use and what the authoring convention asks for.
Selectors beyond that are skipped rather than half-applied.

### Framing, and why nothing goes missing

A country's geometry includes everything it governs: France reaches to French
Guiana, the United States to Alaska and Hawaii. Fitting a camera to that frames
an ocean.

So the camera is fitted to each country's **core** — anchored on its largest
piece and scaled by that core's own extent — and then **everything is drawn**.
Guyane is still in a map of France; it simply falls outside the viewport, the
way a paper atlas handles it. Continental France, the lower 48 and mainland
Portugal frame correctly, while Sicily, Sardinia, Indonesia's archipelago and
New Zealand's two islands all stay whole, and a world map shows every last one
of them.

### Relief without data

```css
.mp .mp-land { filter: url(#mp-relief); }
```

`mp-relief` and `mp-relief-soft` are built in. A stylesheet cannot create SVG
elements, so a theme names the effect and the definition is written into the
reserved `<defs>` — only when referenced. `FILTER_NAMES` lists what is
available.

They are lighting filters, not shadows. A shadow separates a shape from its
ground; relief needs a lit face and an unlit one, so the land's own alpha is
blurred into a height map and lit from the north-west. The light is *multiplied*
rather than added, which keeps the theme's colour instead of bleaching it white.

No elevation model, no raster, no data. Worth separating from *terrain*, which
is a data problem — glaciers, salt flats and depth bands are real vectors, but
land contour lines would have to be derived from an elevation model.
See `west-europe-relief.svg` in the gallery.

### Neighbours

```ts
await mapper({ region: "west-europe", neighbours: true });
```

The surrounding countries, drawn beneath the region as context. Never labelled,
never highlighted, and **excluded from the camera** — so turning context on
cannot move your subject. Styled from `--neighbour`.

### Cities

Settlements are ranked 1–3: capitals and the largest cities, then everything
over a million, then the rest. `placeRank` decides how far down to draw
(default 2 — which on Western Europe means the thirteen capitals plus Milan,
Hamburg, Munich, Lyon, Marseille, Turin and Barcelona). Every dot also carries
`data-rank`, so a theme can thin them further with one CSS rule.

### Choosing layers

```ts
await mapper({ region: "west-europe", layers: { borders: false } });
```

This empties `.mp-borders`; it never removes the group. The stack is a fixed
contract, and a document whose shape depends on its options is one no theme can
be written against. The saving is file size, not appearance — hiding a layer is
one CSS rule, but not emitting its path data is real bytes.

## Scripts

| | |
|---|---|
| `npm run check` | typecheck → test → build → verify exports |
| `npm run build` | dual ESM/CJS bundle plus types |
| `npm test` | vitest; snapshots land in `test/__snapshots__/` as real `.svg` files you can open |
| `npm run dev` | rebuild on change |

## The gallery

`test/__snapshots__/gallery/` holds committed renders across themes, palettes,
projections and canvas shapes. They are snapshots, so a diff fails the build —
but they are real `.svg` files, so a diff is also something a person can open.
That matters twice over: Phase 2 shipped a map that rendered as a solid black
square while every string assertion passed, and Phase 3 first shipped this
gallery in a form that only renders where `<style>` is honoured. Every file here
is now checked to carry visible paint with its stylesheet stripped out.

## License

MIT. Geometry comes from [Natural Earth](https://www.naturalearthdata.com/),
which is public domain and carries no attribution requirement.
