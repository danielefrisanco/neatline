# Build plan

**The full plan is a published page:**
<https://claude.ai/code/artifact/1ad97eac-6e9c-4944-96fb-3e6530d9e83d>

A copy of it sits in this directory as `neatline-plan.html`, untracked — open it
in a browser. It is gitignored on purpose: it is a 75 KB single-file page and
the published version is canonical, so a tracked copy would only drift. This
file is the tracked summary — the parts worth having in a diff.

What is being built, in what order, and why each thing waits for the one before
it. The [CHANGELOG](CHANGELOG.md) is the record of what shipped; this is the
record of what is intended.

## Two products, one document shape

**`neatline`** is a library. It takes a region and a stylesheet and returns an
SVG. It fetches nothing at runtime, calls no model, and returns byte-identical
output for byte-identical input. Everything below that would compromise that
promise belongs in the tool, not the library.

**The tool** is a web app built on the library. It is where a person who does
not write TypeScript makes a map: pick options from dropdowns, see a preview,
drop icons on it, build a legend, export an image.

The line between them is worth stating precisely, because it decides where each
feature below lands:

> The library emits a document. The tool emits a picture.

A document is themeable, diffable, and re-renderable at any size forever. A
picture is finished. PNG export, drag-and-drop, and undo are picture concerns
and live in the tool. Layers, classes, tokens and projections are document
concerns and live in the library.

## The tool

The flow, as specified:

1. **Choose.** Dropdowns for region, projection, theme, palette, typeface, and
   which layers are on. Every one of these is already a library option, so this
   screen is a form over `MapOptions` and nothing more.
2. **Preview.** Render the map live. The library returns SVG and CSS
   separately, so the preview is the SVG in the DOM with the CSS in a
   `<style>` — which is also the fastest possible re-render when a dropdown
   changes, because only the stylesheet swaps.
3. **Annotate.** A palette of icons the user drags onto the map.
4. **Explain.** Build a legend by pairing each placed icon with a meaning.
   Place the legend on the map, or grow the canvas so the legend sits beside it.
5. **Export.** Produce a PNG (and the SVG, which costs nothing to also offer).

### Where the tool needs the library to change

Most of it already works. These are the real gaps, in dependency order:

| Need | Status today | Gap |
| --- | --- | --- |
| Options as dropdowns | `MapOptions`, `THEME_NAMES`, `PALETTE_NAMES`, `TYPEFACE_NAMES`, `LAYERS` all exported | none |
| Thicker borders | `--border-width` is a live token | none — expose it as a slider |
| Live preview | `svg` and `css` returned separately | none |
| Drop an icon at a point | `project(position)` turns lon/lat into pixels | **no inverse.** A drop happens in pixels and must be stored as lon/lat, or it detaches the moment the region or projection changes |
| Draw the icon | `annotations` layer and `mp-pin` / `mp-anno` are reserved | not emitted; needs an `annotations` option and inlined icon geometry |
| Legend | `mp-legend` reserved in the `furniture` layer | not emitted; and "grow the canvas to fit it" is a framing change, not a drawing one |
| Sea | `--bg` paints the whole canvas under the land | sea by subtraction — correct on a coastline, wrong inland (see below) |
| Brighter palette | four palettes, all fairly muted | one more palette file |
| Roads and rail | `roads` layer reserved | **no data bundled, and no class for rail at all** |
| PNG | `render()` returns self-contained SVG | belongs in the tool: canvas + `toBlob()` |

## The five features, decided

### Sea — needs real geometry, not a background colour

`--bg` is documented as "the ocean, or transparent", and on a map framed to a
coastline that is exactly right: paint the canvas blue, draw land over it, and
what remains is sea. It is wrong the moment the frame contains land the map is
not drawing — an inland region, or any map with `neighbours` off — because
then the blue leaks into places that are not water.

The fix is an actual ocean polygon. `sane-topojson`, already a dependency,
ships `ocean` and `coastlines` objects that the data bundle currently discards;
it keeps only countries, lakes, rivers and places. Adding `ocean` gives a real
sea that stops at the shoreline.

This wants its own layer at the very bottom of the stack, below `graticule`,
with its own token — and going at the bottom is what makes it **additive rather
than breaking**. The policy calls renaming or reordering a class breaking;
adding a layer beneath everything reorders nothing above it, which is the same
bargain furniture got by being reserved at the very top.

### Brighter palette — one file

Purely additive: a fifth palette alongside `sand`, `slate`, `moss` and `dusk`.
The palette tests already enforce that it covers the whole colour vocabulary,
so the only real work is choosing the colours.

### Thicker borders — already possible

`tokens: { "--border-width": "2" }` works today. The tool exposes it as a
control. No library change.

### Roads and rail — a data problem, not a drawing problem

The `roads` layer has been reserved since Phase 2 with `data-kind` values for
motorway, trunk and primary. Nothing blocks drawing them except that **there is
no data**: neither `world-atlas` nor `sane-topojson` carries roads or railways,
and the bundle contains neither.

Natural Earth does publish `ne_10m_roads` and `ne_10m_railroads`, and they are
public domain like the rest. Three honest caveats before committing to them:

- They exist only at 10m. There is no 110m or 50m road set, so a world map has
  no thinned version to fall back to and would draw every road it has.
- Coverage is strongest in North America and Europe and thin elsewhere. A map
  of the Sahel with the roads layer on looks broken rather than sparse.
- They are large enough to matter even given that package size is deliberately
  not a priority here.

Rail additionally has **no class at all**. `mp-road` with `data-kind="rail"`
would be a lie, so this needs either a sibling `routes` layer or an honest
rename — and either is a taxonomy change, therefore breaking.

The recommendation is to treat this as its own phase with a data-acquisition
step, not to fold it into the tool work.

### Icons — inline them, never fetch them

Icons from a CDN would break the one promise the library makes, so whatever set
is chosen gets **inlined as path geometry at build time**. The candidates, all
free:

- **[Maki](https://labs.mapbox.com/maki-icons/)** — CC0, drawn specifically for
  maps at small sizes, and it has the vocabulary this tool wants (airport, rail,
  hospital, factory, port). The strongest fit, and CC0 means no attribution
  obligation to propagate into every generated map.
- **Tabler** (MIT) and **Lucide** (ISC) — larger and more general, but both
  require a licence notice to ship with the package.

A curated subset, not a whole set: the icons a map actually uses.

## Phase order

| Version | Phase | Ships |
| --- | --- | --- |
| `0.12.0` | 7 · Harden | Snapshot suite, README rebuilt on the taxonomy, semver policy, licence and repo furniture |
| `0.13.0` | 8 · Annotations | `invert()`, the annotations layer, inlined icons, the legend, the ocean layer, a brighter palette |
| `0.14.0` | 9 · Routes | Roads and rail — bundling the data, and the class it needs |
| `1.0.0` | — · Publish | npm publish with provenance. **Not scheduled.** |
| — | 10 · Tool | The web app |

Phase 8 grew: it was "pins, arrows, callouts, icons" and it now also carries the
legend, the ocean and the palette, because every one of those is a thing the
tool needs and none is large on its own. Routes split out of it because that one
is large, and is gated on data rather than on drawing.

Publishing stays unscheduled and stays a decision rather than a phase. Nothing
downstream is blocked on it — the tool can build against the repository.

## Decided against

- **Any model call, anywhere.** Deterministic by construction.
- **Runtime fetching** of tiles, fonts or icons. A map is a standalone file.
- **Built-in translation tables.** The `names` option takes caller-supplied
  words and covers every language; vendoring Natural Earth's `name_de`,
  `name_fr` and `name_es` was considered and declined.
