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

## [0.9.0] — 2026-08-27

Two layer slots reserved. **Breaking**, in the way the pre-1.0 policy exists
for: inserting a layer restacks everything above it, so this is the last cheap
moment to do it. Nothing new draws.

### Added

- **A `graticule` layer**, at the very bottom of the stack — the grid the world
  is drawn on, which land covers. Parallels, meridians, the equator and the
  tropics, when they are built
- **A `terrain` layer**, directly above the land it tints and below the water,
  because a river runs over a forest. Land cover: desert, forest, mountain,
  glacier
- **Eight reserved tokens** — `--graticule`, `--graticule-width`, `--equator`,
  `--desert`, `--forest`, `--mountain`, `--glacier`, `--sea-ink` — with values
  in every bundled theme and palette, so the day either layer starts drawing,
  every preset already knows what it looks like

### Changed

- Both placements are the kind that can only be made once. Reserving them costs
  two empty groups; making the same decision after 1.0 would cost a major
- The colour-token test is now a rule rather than a list — anything named
  `-width` is a measurement — since a list is edited when the vocabulary grows
  and that is exactly the moment it gets forgotten

## [0.8.0] — 2026-08-27

Phase 5 — presets and fill modes. Five themes, two fill modes that need no
data, and the fix that made the last release's choropleth actually visible.

### Fixed

- **Attribute selectors were dropped when flattening.** `inline.ts` matched
  class selectors only, so every rule keyed on a data attribute was skipped on
  the way out: `[data-bin]`, `[data-kind]`, and — had this not been found —
  `[data-fill]`. The consequences shipped in 0.7 and went unnoticed because the
  tests only ever asserted on strings. A choropleth exported as one flat
  colour, and **rivers exported with no stroke at all**, which is to say
  invisible. Both worked in a browser, which is why the gallery looked fine to
  anything that reads `<style>` and wrong to everything else
- **Rivers ran off the map.** A river is one feature from source to mouth, so
  keeping the Danube because it crosses Austria kept all of it — it carried on
  across the sea to the Black Sea on every map of Western Europe. Water is now
  clipped to the land actually drawn, which is also the truer statement
- **Prism walls were lighter than the tops they carried**, inverting the light
  source and turning a choropleth prism map to mud. A wall is in shadow, so
  `--prism-side` is now darker than any band that can sit on it. The
  choropleth ramps were widened at the same time — five browns inside a narrow
  lightness range read as one brown
- **A highlight lost to a band.** `.mp-country.is-highlighted` and
  `.mp-country[data-bin="3"]` have identical specificity, so source order
  decided it, and the band was written last. Highlight is the caller naming a
  country outright; a band is a number it fell into. Highlight now wins, and a
  test holds the ordering
- **A highlighted prism wall used `filter: brightness()`**, a CSS filter
  function SVG 1.1 does not accept — so every viewer that ignores stylesheets
  drew the wall in the top's colour and flattened the prism to a silhouette.
  It is now the `--accent-side` token
- **Palettes covered half the colour vocabulary.** `dusk` set `--land` but no
  `--bin-n`, so a choropleth came out in pale daylight bands over a night sea
- **`mercator` and `equal-earth` never turned to face their region.**
  `fitExtent` scales and translates but does not rotate, so a map of Asia was
  drawn from a Greenwich-centred projection — 90° out from the part of it that
  is faithful, and sheared accordingly. The conics and `orthographic` already
  rotated, which is exactly why South America looked right and Asia did not.
  Both now centre on their region's meridian, and stop doing so past a 180°
  span, where a world map should keep the Atlantic in the middle
- **The central meridian was computed wrongly across the antimeridian.**
  `(west + east) / 2` puts Oceania — 113°E to -180°E — at 33°W, on the other
  side of the planet. Longitude span and centre are now computed with the wrap,
  which the conics and `orthographic` inherit as well

### Added

- **Three presets — `noir`, `blueprint`, `contrast`** — joining `minimal` and
  `atlas`. `noir` is dark ground and hairline linework with no fills to speak
  of; `blueprint` is white linework on drafting blue, monospaced, with dashed
  boundaries; `contrast` is black and white sized for legibility, and is the
  one preset that overrides the shared structure — a filled lake in black and
  white reads as a hole punched in the land, so its lakes are outlines
- **A dark block on every preset.** Tokens are role-named, so it is a value
  swap and nothing structural. An explicit `palette` still wins, because it is
  applied after the theme and the cascade settles it: asking for `sand` gets
  sand whatever the reader's system is set to
- **`fill: "political"`** — every country a colour none of its neighbours has,
  written out as `data-fill`. No data needed. The adjacency was already known:
  the border mesh visits every shared arc to find the boundaries, so recording
  the graph costs one more pass and no new geometry. Welsh–Powell colouring,
  ties broken on the code so the same map always comes out the same way. Four
  colours suffice for Europe, five for the world, and there are six to draw on
- **`stripe`** — diagonal hatching over named countries, for the thing a map
  has to say that is not a quantity: disputed, claimed, excluded, no data.
  Drawn as an overlay rather than a fill, so a hatched country keeps whatever
  colour it already had and the two readings stack. The first thing to use the
  `<defs>` slot reserved in Phase 2 for a pattern
- **A shared structural stylesheet.** Five themes repeating forty rules is five
  places for them to drift, so the rules live once in `structure.ts` and read
  entirely from tokens. New tokens carry what the duplication used to:
  `--land-edge-width`, `--border-dash`, `--water-width`, `--accent-side`,
  `--stripe`, `--stripe-width`, and `--fill-1` … `--fill-6`
- **An `antarctica` region preset**, and a gallery image for every continent.
  `north-america` and `oceania` were never rendered before; `oceania` is the one
  that matters, since it straddles the antimeridian. Antarctica is one country
  and the one place a cylindrical projection cannot describe — the pole is a
  line there rather than a point — so it is drawn orthographic
- **`test/presets.test.ts`** — what a preset has to be, as tests rather than as
  prose: every live token defined, a dark block that introduces nothing new,
  every colour parseable, highlight ordered after the bands, and no country
  anywhere sharing a neighbour's political fill

### Changed

- `inline.ts` understands attribute selectors — presence and equality, quoted
  or not. Still not a CSS engine; anything it cannot read is still skipped and
  reported rather than half-applied
- The `<defs>` block is no longer always empty: it carries the land clip path
  when water is drawn, and any pattern or filter the stylesheet references

## [0.7.0] — 2026-08-27

Choropleth colour, and three prism fixes.

### Added

- **`values` and `bins`** — classify a value per country into bands, written out
  as `data-bin` and `data-value` for a theme to colour. The library still never
  picks a colour. Bands are by **rank**, not by equal value intervals: map data
  is usually skewed enough that five equal slices of European GDP put Germany
  alone at the top and everything else at the bottom, which shows nothing
- `values` defaults to whatever `extrude` was given, so one set of numbers
  drives height and colour together — or either alone
- `--bin-1` … `--bin-5` tokens, with a sequential ramp in both bundled themes
- **`.mp-prism-edge`** — a raised country's own share of the shared borders,
  lifted onto its surface

### Fixed

- **Corsica painted over Sardinia.** Paint order used each country's lowest
  projected point, and France's geometry reaches French Guiana, which projects
  far below the canvas — so France sorted frontmost in Europe. Only geometry the
  reader can actually see now decides depth
- **Belgrade appeared on a map of Western Europe.** Places were tied to a drawn
  country only when Natural Earth recorded an ISO code for them; Serbia has
  none, so its cities passed through unattributed. Those are now placed by
  containment
- **Borders cut through raised prisms.** A mesh line is shared by two countries,
  so once they stand at different heights there is no single height it can sit
  at. Each country now carries its own share, lifted to its own surface —
  briefly they were suppressed entirely, which was the wrong answer
- Settlement dots ride up with the prism they stand on

## [0.6.0] — 2026-08-27

Prism maps: height as quantity. Brought forward from v2 — the reserved class
names turned out to be most of the design.

### Added

- **`extrude`** — raise each country off the map so height reads as quantity.
  A number lifts everything uniformly; `{ values }` lifts each country in
  proportion, taking raw numbers (GDP, headcount, anything) and scaling them
  against the largest, so the caller never has to think in SVG units.
  `height` sets what the largest becomes
- `.mp-prism` wrapping `.mp-prism-side` and `.mp-prism-top`, carrying
  `data-iso`, `data-name` and `data-height`. `.is-highlighted` works on a prism
  exactly as it does on a flat country
- `--prism-side` token; two gallery renders, `europe-gdp-prism` and
  `italy-raised`
- `createProjection` takes optional headroom, so an extruded map leaves room
  above the geometry instead of clipping its tallest prism at the top edge

### Notes

- The solid is built by sweeping the projected outline: the footprint, one quad
  per edge running up to the raised copy, and the raised copy on top. That works
  for any polygon — concave, holed or in pieces — with no geometry library. Each
  quad is wound consistently before being written, because the winding of an
  edge follows whichever way the outline happens to run, and two quads of
  opposite winding punch a hole in each other under the nonzero fill rule
- Countries are drawn back to front by their lowest point, so a nearer prism
  stands in front of the one behind rather than being cut into by it

## [0.5.0] — 2026-08-27

Neighbours, built-in filters, and two water fixes. Brought forward from later
phases because each turned out to be small once the slots were reserved.

### Added

- **`neighbours: true`** — the surrounding countries drawn as context beneath
  the region, into the layer reserved in Phase 2. Never labelled, never
  highlighted, and excluded from the camera, so turning context on cannot move
  the subject. Planned for v1.2; the reserved slot made it a filter and a class
- **Built-in SVG filters**, referenced from a theme by name:
  `filter: url(#mp-relief)`. A stylesheet cannot create SVG elements, so
  effects needing markup were out of a theme's reach — these close that gap, and
  are the first real use of the reserved `<defs>` block. Emitted only when
  referenced. `FILTER_NAMES` lists them
- `mp-relief` and `mp-relief-soft` — lit relief rather than a drop shadow. A
  shadow only separates a shape from its ground; relief needs a lit face and an
  unlit one, so the land's own alpha is blurred into a height map and lit with
  `feDiffuseLighting`. The light is **multiplied**, not added: a specular
  highlight bleaches the land to white and throws the theme's colour away.
  Its constant is normalised by `1/sin(elevation)` so flat ground returns at
  full brightness and only the slopes shade
- `inlineStyles` also materialises a CSS `drop-shadow()` into a real
  `feDropShadow`, since SVG 1.1 only permits `url(#id)` in the `filter`
  attribute and older viewers drop the CSS function silently
- `west-europe-neighbours` gallery render; `--neighbour` is now a live token

### Fixed

- **Water was matched by bounding box, which put Lake Constance on a map of
  France.** France's box spans Guadeloupe to Réunion — those are France — so box
  overlap admitted anything in between. Boxes are still used as a cheap
  pre-filter, but the question is now answered with `geoContains` against the
  countries actually drawn
- **Rivers were invisible.** They were being emitted correctly, but every
  palette's water sat a shade away from its land colour at 0.8 stroke width.
  Water is now distinctly blue across all four, and rivers are stroked at 1.1

## [0.4.0] — 2026-08-27

Phase 4 — data pipeline. Maps now carry water and cities.

### Added

- **A build step producing `data/`**, and `loadWorld()` reads only that. The
  library no longer resolves a devDependency off disk at call time, which is
  what tied it to Node — sources stay on the build machine, the extract ships
- **Lakes and rivers** in `.mp-hydro`, from `sane-topojson`. 275 lakes and 461
  rivers at 50m. Water is matched against the countries actually drawn, not the
  framed rectangle — filtering on the viewport alone floats Scandinavian lakes
  over open sea on a map whose northern edge stops at Denmark
- **Cities** in `.mp-places`, from Natural Earth populated places, vendored.
  Ranked 1–3: capitals and the largest cities, then everything over a million,
  then the rest. Capitals are promoted regardless of size — a map showing Milan
  but not Bern is wrong — but the bands are otherwise population, so Hamburg,
  Lyon and Turin appear where a capitals-only rule would have missed them
- **`placeRank`** — how far down the ranking to draw. Default 2
- Four new gallery renders: `west-europe-cities`, `france-rivers`,
  `europe-no-water`, and `west-europe-relief` — the raised-landmass look, which
  needs no data and no markup at all: `filter: drop-shadow(...)` is a CSS
  declaration, so a theme can simply say it. `filter` is carried through the
  `inlineStyles` pass with the other paint properties
- `--place` token; `--water` is now live rather than reserved

### Fixed

- **Framing and drawing are now separate questions**, which they should always
  have been. The camera is fitted to each country's core; everything is then
  drawn into it. What falls outside the frame is invisible rather than deleted —
  what a paper atlas does, and the only arrangement where nothing can go missing
  from a map that is showing it. Previously the outlying pieces were removed
  from the output, which meant a world map had no Alaska and no French Guiana
- **Sicily and Sardinia were being clipped off Italy**, along with several
  Japanese islands. Two mistakes: the core's scale was measured from the
  distance to its centroid — near zero for any country with one dominant
  landmass — instead of from the core's own extent; and distances were measured
  from the country's centroid, which for France sits in the Atlantic because
  French Guiana drags it there, putting mainland France 7° from its own centre.
  The core is now anchored on the largest piece and scaled by its extent
- **Framing is judged one country at a time.** It was judged across the
  whole region, which broke at 50m: France carries dozens of polygons there,
  enough of them overseas that the outlier threshold stretched until it caught
  nothing, and a map of France framed the Atlantic from Guadeloupe to Réunion.
  Country-by-country is also the only framing that gets every case right —
  French Guiana is 15% of France by area, Alaska 17% of the US and Patagonia
  14% of South America, so no threshold on *size* can separate them, and no
  threshold on distance can either. What distinguishes them is that Guiana and
  Alaska are outliers within their own country while Patagonia is simply where
  Argentina is. Continental France, the lower 48 and mainland Portugal now frame
  correctly, while Indonesia's archipelago and New Zealand stay whole

### Notes

- `data/` is generated and not committed; `vendor/` holds the raw Natural Earth
  input. `npm run check` builds the data first
- Oceania still spans the antimeridian, which widens its frame. Pre-existing,
  and a projection problem rather than a framing one

## [0.3.1] — 2026-08-27

### Added

- **A reserved `<defs>` block**, emitted empty ahead of everything drawn. A
  stylesheet can express more than expected — the raised-landmass relief look is
  `filter: drop-shadow(...)`, plain CSS with no markup — but gradients, patterns
  and the arrow markers a flow map needs are SVG *elements*, not declarations,
  and anything referenced by `url(#…)` needs a home that exists from v1
- Reserved class names for data-driven renderings: `.mp-prism`, `.mp-prism-top`,
  `.mp-prism-side`, `.mp-flow`, `.mp-symbol`. A prism map extrudes each country
  by its value, so a country stops being one path and becomes a top face plus
  side walls — a different rendering of the land layer rather than a new layer,
  which is why these are classes and not a slot

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

[Unreleased]: https://github.com/danielefrisanco/mapper/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/danielefrisanco/mapper/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/danielefrisanco/mapper/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/danielefrisanco/mapper/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/danielefrisanco/mapper/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/danielefrisanco/mapper/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/danielefrisanco/mapper/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/danielefrisanco/mapper/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/danielefrisanco/mapper/releases/tag/v0.1.0
[0.0.1]: https://github.com/danielefrisanco/mapper/releases/tag/v0.0.1
