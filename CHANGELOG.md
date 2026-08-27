# Changelog

All notable changes to this project are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Pre-1.0 policy.** While on `0.x`, the minor bump carries breaking changes and
the patch bump carries everything else — the public API is not yet stable.
`1.0.0` is Phase 7, and from there normal semver applies.

**The class taxonomy is public API.** Renaming or reordering a class, a data
attribute, or a token is a breaking change, exactly like changing a function
signature — themes in the wild depend on those names.

## [Unreleased]

Phase 4 — data pipeline.

## [0.3.0] — 2026-08-27

Phase 3 — theming, palettes and layer control. Maps stop being wireframes.

### Added

- **`theme`, `palette` and `tokens` on `MapperOptions`.** Applied in that
  order, and the ordering *is* the implementation — a palette beats a theme and
  an override beats a palette because each is a later declaration. No merge
  logic, no schema, no validation layer
- **The palette/theme split.** A theme carries structure — weights, dashes,
  type; a palette carries only colour. Both target users want the same move:
  keep the style, change the colours. Because tokens are named by role, a
  palette *is* a set of token values, so this cost nothing to implement
- Bundled themes `minimal` and `atlas`, palettes `dusk` and `sand`. Each can
  instead be a path to a `.css` file or a stylesheet passed inline
- **A token vocabulary of seventeen names**, exported as `TOKENS`. Six are
  reserved and unused; a theme can set them today and they begin working when
  their layer arrives, which is cheaper than revising every theme later
- **`layers`** — controls which slots carry content, never whether a slot
  exists. The stack is a fixed contract. The saving is file size, not
  appearance
- **`render(options?)`** on `MapResult` — the document as a portable artifact,
  without writing a file. `toFile()` is now `render()` plus a write
- **`inlineStyles`** — resolves the cascade onto presentation
  attributes for Figma and Illustrator, which ignore `<style>`, and for the
  renderers found in 0.2.0 that let an attribute beat a stylesheet. The
  stylesheet still ships alongside, so both paths resolve to the same paint
- **A gallery of eight committed renders** in `test/__snapshots__/gallery/`,
  across themes, palettes, projections and canvas shapes. 0.2.0 shipped a map
  that rendered as a solid black square while every string assertion passed;
  snapshots that a person can open are the fix — and each one is now checked to
  carry visible paint with its stylesheet stripped out, since the first version
  of this gallery rendered only where `<style>` was honoured
- `themes/*.css` and `palettes/*.css` are generated at build time from the
  same strings the library uses, so the published files cannot drift from the
  bundled ones

### Changed

- **`render()` and `toFile()` flatten the theme by default** (`inlineStyles`
  now defaults to `true`). A file gets opened by whatever the reader happens to
  have, and many viewers, thumbnailers and design tools ignore `<style>`
  entirely — which rendered a themed map as black shapes. `toString()` is
  unchanged and remains the small, stylesheet-only form for embedding in a page
- **The default `minimal` theme was too faint to read** against a white page.
  Land and border contrast raised; still minimal, now legible
- **Every rule is scoped to a class derived from a hash of the stylesheet**
  (`.mp.mp-t-k3f9a1z`). A `<style>` block inside inline SVG applies to the whole
  host page, so two themed maps would otherwise overwrite each other and a map
  would restyle anything sharing a class name. Hashing keeps it deterministic:
  same theme, same class, byte-identical output
- `map.svg` stays geometry-only but now carries the scope class, so a caller
  serving `map.css` separately still has something for it to match.
  `map.toString()` is the complete document
- `RenderOptions` gained `palette`, so one built map can be written several
  ways — light, dark, flattened — without recomputing the geometry

### Notes

- Theme stylesheets are authored as strings in `src/` rather than read from
  disk, so `mapper()` stays isomorphic. Reading a `.css` at call time would make
  the library Node-only, which is the constraint Phase 4 exists to remove
- `<style>` content is emitted raw, and wrapped in CDATA only when it contains
  `&` or `<`. Escaping is wrong there: an HTML parser treats style content as
  raw text, so `&gt;` would arrive as four literal characters and break a child
  selector. A stylesheet containing `</style` is rejected rather than emitted

## [0.2.0] — 2026-08-27

Phase 2 — class taxonomy and the node-tree emitter. The document shape is now
frozen, which is what everything after this builds against.

A minor bump because the emitted SVG changed shape, and by this project's own
policy the class taxonomy is public API.

### Added

- **The class taxonomy**, documented in the README and exported at runtime as
  `LAYERS`, `ROOT_CLASS`, `LAYER_CLASS`, `BACKGROUND_CLASS`, `HIGHLIGHT_CLASS`
  and `RESERVED_CLASSES`. Exporting it means the Phase 9 web tool never has to
  hard-code a class name, and that the docs cannot drift from the emitter
- **Nine layer groups in fixed paint order**, every one emitted even when
  empty: `mp-neighbours`, `mp-land`, `mp-hydro`, `mp-borders`, `mp-roads`,
  `mp-places`, `mp-labels`, `mp-annotations`, `mp-furniture`. Adding a layer later would
  restack everything beneath it and break themes in the wild; thirty bytes per
  empty slot is the cheapest insurance in the project
- **`.mp-furniture`** — the one non-geographic layer, reserved and empty. Credit
  lines, watermarks and legends are placed on the canvas in fixed user units
  rather than at a coordinate, so they must not move when the camera does.
  Reserved alongside `.mp-credit`, `.mp-watermark`, `.mp-legend`, `.mp-scale`
  and `.mp-compass`
- **`.mp-bg`** — a rectangle covering the canvas, so a theme can colour the
  ocean without the consumer wrapping the SVG in a styled element
- **Real international borders**, meshed from shared arcs so each boundary is
  drawn once rather than once per neighbour. Invisible for an opaque hairline,
  obviously wrong for a translucent or dashed one. No new dependency:
  `topojson-client` already shipped `mesh`
- **Accessibility**: `role="img"` plus `aria-label` and a matching `<title>` on
  the root, and a per-country `<title>` for hover. The root role keeps assistive
  technology from announcing two hundred paths
- **`title` option** — the generated label can only ever describe geography, and
  a map of election results is not "a map of Western Europe"
- **Caller-supplied GeoJSON as a region.** `Region` has always included
  `FeatureCollection`; the resolver threw on it. The declared type no longer
  lies

### Changed

- The SVG is built as a **node tree and serialised once** (`src/svg.ts`) rather
  than concatenated. Escaping now happens in one place instead of at each call
  site, and Phase 8 appends to a node that already exists
- Root `<svg>` carries explicit `width`/`height` alongside `viewBox`, so files
  written with `toFile()` have an intrinsic size in design tools and raster
  converters. CSS overrides both
- `preserveAspectRatio="xMidYMid meet"` is explicit rather than relying on the
  SVG default
- Internal: `loadCountries()` became `loadWorld()`, returning a `World` that
  exposes `borders()` as a capability instead of leaking the topology. Not a
  public export; Phase 4 can serve borders from a precomputed mesh without any
  caller noticing

### Fixed

- **The background rectangle painted the whole map black.** `.mp-bg` shipped
  without a `fill`, and SVG's default fill is black, so a full-canvas rect
  covered the document before any layer drew — an unthemed map rendered as a
  solid black square. It now carries `fill="none"`, which is structural rather
  than stylistic, and which any theme rule overrides. Regression-tested, and
  the geometry-only render verified against a real renderer rather than by
  reading the markup
- The neighbours layer sits **above the background and below the land**. The
  plan placed it above the water, which was wrong — lakes and rivers are drawn
  on top of the land they sit in, so context would have covered its own subject

### Notes

- `.mp-hydro`, `.mp-roads`, `.mp-places` and `.mp-labels` are reserved and
  always empty: `world-atlas` carries country polygons and nothing else. The
  populated-places and hydrography data they need arrives in Phase 4
- The water *layer* is `.mp-hydro` rather than `.mp-water` so it does not
  collide with the `.mp-water` feature class. Layers are plural, features are
  singular, and this is the one place where English forced an exception

## [0.1.0] — 2026-08-27

Phase 1 — geometry core. `mapper()` now produces real maps.

### Added

- Region resolvers: presets, code lists, bounding boxes. Presets are saved
  code lists rather than a separate mechanism, and are explicit because the
  topology carries no continent field and because membership is an editorial
  call — "Western Europe" has no single correct definition
- Projection registry as a lookup table: `mercator`, `conic-conformal`,
  `albers`, `equal-earth`, `orthographic`. Conic standard parallels are derived
  from the region's latitude span, so a conic works anywhere without the caller
  knowing what a parallel is
- `fitExtent` camera, coordinate rounding via `geoPath.digits(1)`
- `map.project([lon, lat])` — the hook the annotation layer will hang from
- Country identity: alpha-2, ISO numeric and user-assigned codes all resolve to
  one canonical id, emitted as `data-iso`
- `isoTable()` publishing every accepted code
- Highlighting via `highlight: ["FR"]`, emitted as `.is-highlighted`
- Unrecognised codes throw rather than silently producing an empty map

### Changed

- **`mapper()` is now async.** The full dataset is 8 MB across detail tiers, so
  geometry has to be loaded per region rather than bundled wholesale. Deciding
  this now avoids a breaking change later
- Dropped the Phase 0 tests that asserted the absence of geometry

### Fixed

- **Framing no longer includes overseas territories.** France governs French
  Guiana, so its geometry reaches South America; fitting to raw bounds framed
  the Atlantic and squashed Europe into a corner. Outlying pieces are rejected
  by angular distance from the region's centre — not by area, since Guyane is
  13% of France and an area threshold would never catch it. A safety valve
  leaves genuinely dispersed regions (Oceania, the world) untouched

### Decided

- **Outlying pieces are dropped from the output, not just the camera** — a map
  of France is continental France. This is a default, not a statement about
  what belongs to whom: Guyane is France. Representing overseas territories
  properly, with insets or an explicit opt-in, is planned work
- **ISO codes are the canonical id, not the topology's numeric.** Five features
  (Kosovo, Somaliland, N. Cyprus, Indian Ocean Ter., Siachen Glacier) ship with
  no id at all, so "fall back to the number" had nothing to fall back to. They
  get user-assigned codes from the `X` range ISO reserves for private use —
  `XK`, `XS`, `XN`, `XI`, `XG`. These are ours, not ISO, and are flagged as
  such in `isoTable()`

### Known

- `world-atlas` is a devDependency and geometry is read from disk, so the
  library is Node-only until Phase 4 bundles per-region extracts. The seam is
  isolated in `src/topology.ts`
- Regions are drawn without surrounding context — a West Europe map ends at the
  German border rather than fading into Poland. Context is a Phase 2 question

## [0.0.1] — 2026-08-27

Phase 0 — scaffold. No geometry yet; the package builds, tests, and imports.

### Added

- npm package with dual ESM/CJS output via `exports`, types emitted for both
- Runtime dependencies pinned to exactly two: `d3-geo`, `topojson-client`
- TypeScript strict, plus `noUncheckedIndexedAccess` for the coordinate work
  ahead. `lib` excludes DOM on purpose, so the emitter cannot reach for
  `document` and break under Node
- Public type surface settled in `src/types.ts` — regions, projections, detail
  tiers, render options, `MapResult`. Every option is plain, JSON-serialisable
  data; no callbacks anywhere, which is what will let an editor UI drive the
  same API later
- `mapper()` stub emitting a valid, correctly sized, empty document
- vitest with SVG file snapshots — snapshots land in `test/__snapshots__/` as
  real `.svg` files that open in a browser, so geometry regressions are visible
  rather than a string diff
- Two tests asserting Phase 0's *boundaries* (no `<path>` emitted, `project()`
  still deferred), so scope creep fails loudly
- `scripts/verify-exports.mjs` — imports the built artifacts under both module
  systems and calls them
- `npm run check`: typecheck → test → build → verify exports

### Decided

- **npm, not pnpm.** pnpm is not installed on the dev machine and there is no
  workspace to gain from it. One command to switch if that changes.
- **No default export.** Mixing it with named exports forces CJS consumers to
  write `.default`; the API is `mapper({...})` regardless.
- **Snapshots as `.svg` files** rather than `.snap`, for a library whose output
  is meant to be looked at.

### Known

- The npm name `mapper` is taken (v0.2.5), as is `svg-mapper`. A real name is
  needed before `1.0.0`; a scoped name is the zero-effort fallback. Nothing is
  blocked until publish.
- One `low` audit advisory remains in the esbuild dev-server chain —
  Windows-only, dev-server-only, devDependency, never reaching consumers.
  `npm audit fix` does not resolve it.

## Planned

Version targets for the remaining phases, so the roadmap and the release
history stay the same document.

| Version | Phase | Ships |
| --- | --- | --- |
| `0.2.0` | 2 · Taxonomy & emitter | Class contract, node-tree emitter, highlighting |
| `0.3.0` | 3 · Theming | Tokens, theme resolution, inline-styles pass |
| `0.4.0` | 4 · Data pipeline | Bundled Natural Earth, topology simplification |
| `0.5.0` | 5 · Presets | Five hand-tuned themes, light and dark |
| `0.6.0` | 6 · Labels | Placement, rank thinning, curated overrides |
| `1.0.0` | 7 · Ship | Stable taxonomy, published, documented |
| `1.1.0` | 8 · Annotations | Pins, arrows, callouts, icons |

[Unreleased]: https://github.com/danielefrisanco/mapper/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/danielefrisanco/mapper/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/danielefrisanco/mapper/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/danielefrisanco/mapper/releases/tag/v0.1.0
[0.0.1]: https://github.com/danielefrisanco/mapper/releases/tag/v0.0.1
