# Changelog

All notable changes to this project are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Pre-1.0 policy.** While on `0.x`, the minor bump carries breaking changes and
the patch bump carries everything else — the public API is not yet stable.
`1.0.0` is the publish, which is not scheduled; from there normal semver
applies.

**The class taxonomy is public API.** Renaming or reordering a class, a data
attribute, or a token is a breaking change, exactly like changing a function
signature — themes in the wild depend on those names.

## [Unreleased]

Phase 8 opens here. `invert()` first, because it is the one thing in the phase
nothing else can be built on top of.

### Added

- **`map.invert([x, y])`** — a point on the canvas as a coordinate, the inverse
  of `project()`. `project()` is enough for anyone placing a pin by hand: they
  know the coordinate and want the pixel. It is the wrong direction for anyone
  placing one with a pointer, where the drop arrives in pixels and has to be
  stored as lon/lat — store the pixel and the pin comes unstuck from the ground
  the moment the region, the projection or the canvas size changes. The
  annotation layer and the tool both rest on this.

  It returns `null` for a pixel that is not on the map, and finding out whether
  a pixel is on the map turned out to be the whole of the work. d3 clamps its
  inverse trigonometry instead of failing, so a point past the edge of an
  orthographic globe does not come back as nothing — it comes back as a
  coordinate on the limb, and the corner of a canvas invents a place in the
  Atlantic. So the answer is put back through the projection and checked
  against the pixel it came from: a real point returns within a thousandth of
  a unit, a clamped one misses by more than twenty.

  Tested as a geometric property rather than as markup, which is what it is —
  a round trip that closes in every projection, and a grid over a globe where
  nothing invert() answers is a place the map would not put back.

- **Ten gallery entries outside Western Europe.** Twelve of the thirty-two
  existing entries were the same thirteen countries, which demonstrates that
  the themes differ from one another and very little else. The additions are
  South Asia, Southeast Asia, East Africa, the Middle East, the Nordics, Japan
  and Korea, the Southern Cone, the Caribbean, South America and Central Asia —
  each a region the presets do not cover, each carrying an option the gallery
  exercised in one place or none.

  The one that matters most is `east-africa-choropleth`: the gallery contained
  no choropleth at all, every data map in it encoding quantity as height
  instead. 0.7 shipped a choropleth that exported as a single flat colour with
  the whole suite green, and until now nothing in the gallery would have caught
  that happening again.

  All ten were rendered with their stylesheets stripped and looked at. Five
  were changed as a result: the Caribbean dropped Trinidad, which sits seven
  degrees south of everything else and pushed its own label off the canvas; the
  Nordics moved from a portrait canvas to a landscape one, Iceland to Finland
  being 53° of longitude against 16° of latitude; and Southeast Asia moved off
  the moss palette, which grounds its sea in stone grey-green on purpose and
  washes out where three quarters of the frame is water.

  The last two were geography rather than composition, and neither would have
  failed a test. **Nassau was drawn in open sea**: at 110m the Bahamas simplify
  to a handful of blobs and New Providence is not one of them, while the city
  dot comes from a separate dataset at its true coordinate — so the Caribbean
  renders at 50m. And **East Africa had a hole in the Horn**, because Somaliland
  is one of the five features Natural Earth ships with no ISO code and the
  hand-written region list did not carry its user-assigned `XS`. It is in the
  region now and deliberately not in `values`: hatched instead, which is what
  hatching is for.

- **`npm run gallery`, a contact sheet of every snapshot.** Committing the SVGs
  only half solves the problem the gallery exists for: a directory of forty-two
  files is not something anyone opens either. This puts them all on one page, in
  the browser, at a size where a flat choropleth or a black square is obvious at
  a glance.

  What each map is said to demonstrate is read back off the markup rather than
  off the test that wrote it, so the page cannot claim a feature a file does not
  contain. That distinction is not academic — the first version tested the whole
  file and reported every feature on every map, because each bundled theme
  carries rules for `data-bin` and `.is-highlighted` whether the map uses them
  or not. Wrong in a way that looked right.

  The output is untracked, the same bargain the plan gets: three megabytes of
  inline SVG is a diff nobody can read, and the snapshots are the tracked thing.

### Fixed

- **A scattered country can carry its own name.** The fit test measured a name
  against the width of the shape beneath the anchor, which is right for a
  landmass and wrong for an archipelago: no single Philippine island is as wide
  as the word *Philippines*, so the name was written into every document and
  then hidden as unfittable — while every printed atlas sets it across the whole
  group, over the water between the islands, because the group is the thing
  being named.

  So when a country is more than one piece and no piece can hold its name, the
  room it has is now the reach of the group. **The anchor does not move**: it
  stays on the largest island and the name overhangs from there, the way
  *Portugal* overhangs into the Atlantic. Only the measurement changes, which
  means this can reveal a name and can never relocate one.

  It reveals Philippines on every map of Asia, and Angola, Chile, Fiji, Japan
  and Indonesia on the world maps. Brunei and Timor-Leste stay hidden, which is
  correct — they are genuinely too small, and that is what the test is for.

### Changed

- **The Node floor is 20.** `engines` said `>=18` and nothing ever tested it.
  It could not be tested either: `vitest` 4 depends on `rolldown`, which imports
  `styleText` from `node:util` — added in Node 20.12 — so the suite failed at
  startup on 18 before a single test ran. Rather than keep an untested promise
  alive with a separate build-then-run-on-18 job, the floor moves to 20, which
  is what the toolchain needs and what CI actually exercises. Node 18 left
  maintenance in April 2025.

  Breaking in principle; nothing is published, so nobody is on it.


## [0.12.0] — 2026-08-28

Phase 7 — harden. Nothing new to look at; everything here is about the library
being safe to hand to someone else.

This phase was called **Ship** and it bundled two different things: being ready
to publish, and publishing. Only the first is engineering work, so they split.
Publishing is now an unscheduled `1.0.0` and nothing downstream waits on it.

### Added

- **The cross product, as invariants rather than as pictures.** Nine regions by
  five projections by five themes is 225 maps. Committing 225 snapshots means
  nobody ever opens one, which is the exact failure this project has had three
  times. So the gallery stays curated and human-sized, and the combinations
  nobody will look at are checked for the things that can be stated as facts:
  it renders, it draws land, every coordinate is finite, the land is on the
  canvas, the same input gives the same output, and every token resolves.
  153 new assertions in about five seconds.
- **A contract lock.** The policy at the top of this file says a class, a data
  attribute or a token is public API. A policy stated only in prose gets broken
  by accident — someone tidies a name, the suite stays green, and every theme
  in the wild stops matching. `test/contract.test.ts` snapshots the layers,
  reserved classes, tokens and preset names, plus a separate assertion on paint
  order, which a snapshot of names alone cannot catch.
- **A `LICENSE` file.** `package.json` has declared MIT since Phase 0 and the
  text was never there.
- **A licence table in the README**, naming every source and its obligation.
  A map made with this carries no attribution requirement, which is deliberate
  rather than lucky, and worth writing down before a source that *does* require
  one is ever added.

### Notes

- One invariant is weaker than it looks and is kept anyway: *the land is on the
  canvas* passes for every combination today, including Mercator at the poles,
  because framing solves through `fitExtent` and clamps. It is a regression
  guard for a framing change, not a bug it caught.
- "README built around the class taxonomy" was already true — the taxonomy has
  been the second section since Phase 3.

## [0.11.0] — 2026-08-28

The library is called **neatline**. `mapper` was taken on npm, and it named the
machine rather than the thing it makes — a neatline is the ruled border drawn
around a finished map, which is closer to what this produces.

**Breaking**, under the pre-1.0 policy. Nothing about the output changed: every
map this version renders is byte-identical to what `0.10.0` rendered. What
changed is what you type.

### Changed

- `mapper()` is now `neatline()`, and the package is `neatline`.
- `MapperOptions` is now `MapOptions`, which pairs with the `MapResult` it has
  always returned.
- Error messages are prefixed `neatline:` instead of `mapper:`.
- Subpath imports follow the package: `neatline/themes/atlas.css`,
  `neatline/palettes/moss.css`, `neatline/typefaces/condensed.css`.

### Unchanged

- **The whole class taxonomy.** `mp` is short for *map*, not for the old
  package name, so every selector any theme has ever written still matches.
  `mp-` also stays clear of `nl-`, which would have read as the ISO code for
  the Netherlands sitting in a document full of `data-iso` attributes.
- Every token, data attribute, layer name and paint order.

## [0.10.0] — 2026-08-27

Names. Country and settlement labels, the layer slot reserved since Phase 2.

**Breaking**, under the pre-1.0 policy: every map now carries names by default,
so existing output changes. `layers: { labels: false }` restores the old
document exactly.

### Added

- **Country names**, placed at the balance point of the largest piece of the
  country *that is on the canvas* — not the centroid of the whole geometry,
  which puts "France" in the Atlantic, because France's geometry reaches French
  Guiana. That is the same fact that once made France the frontmost country in
  Europe for prism depth sorting; it has now cost two features.
- **A deeper anchor when the balance point will not do.** Where the centroid
  falls outside the country — every crescent, every Croatia — the name goes to
  the point furthest from any edge, found by refining a grid. The plan called
  for a curated table of thirty hand-tuned anchors instead; the geometry knows
  the answer, and unlike a table it cannot go stale when the source data does.
- **Two-line names**, broken at the most even word gap, when one line does not
  fit. This is what rescues *United Kingdom*, *South Korea*, *Sri Lanka* and
  *Papua New Guinea*.
- **Settlement names**, beside their dots, governed by `labelRank` — one step
  tighter than `placeRank` by default, because a dot is a mark and a name is a
  word. A name is never written for a settlement whose dot was filtered out.
- **`--place-label-size`, `--label-halo` and `--label-halo-width`**, live in all
  five presets and both palettes. The casing is one `paint-order: stroke`
  rather than a second copy of every label.
- **`names`** — replace the name of anything the map labels, keyed by ISO code
  for a country and by name for a city. This is how a map is produced in a
  language other than English: the bundled sources carry English only, and
  neither `world-atlas` nor the vendored Natural Earth places file has a single
  translated name field, so a `language` option would mean shipping name tables
  this package does not have. The override is what can honestly be offered
  today, and it covers every language rather than a chosen list.
- Four gallery renders: `europe-named`, `west-europe-named-cities`,
  `asia-named-blueprint`, and `west-europe-unnamed` for the layer switched off.

- **A `typeface` axis** — `"humanist"`, `"serif"`, `"grotesk"`, `"condensed"`,
  `"mono"`, a `.css` path, or a stylesheet. What a palette is for colour, this
  is for lettering: tokens only, so it lays over any theme and never fights one
  over structure. Colour has had a swappable axis since 0.3; type could only be
  changed by naming an exact font stack and guessing at sizes to match it.
  Resolution order is now theme → palette → typeface → tokens, and tokens still
  win, as they always have.
- **`--label-advance`**, the one token that is a measurement rather than a
  style: how wide the chosen face runs, as a fraction of the label size. The
  fit test has no font metrics — SVG cannot measure text outside a browser — so
  the stylesheet that chose the face is the only thing that knows. `condensed`
  declares `0.46` against `humanist`'s `0.58`, which is what earns it the extra
  names it can genuinely carry.
- **`--label-track` and `--label-weight`**, so a typeface can set tracking and
  weight rather than only a stack.
- **Two more palettes**, `slate` (cool neutral, the register of a report) and
  `moss` (warm greens on stone, a walking map). Four in total.

### Fixed

- **noir was too dark to read.** Land sat ten values off the sea in every
  channel, on the theory that a dark editorial map should whisper. At that
  separation the continents were not quiet, they were gone: on a world map the
  coastline hairline was the only evidence there was land at all. Land, borders
  and the political fills all step up; the theme is still dark and still
  restrained.
- **A country name no longer sits on its own capital's name.** A capital
  usually sits near the middle of its country, which is exactly where the
  country's name goes — "Madrid" ran through "Spain", "Bern" through
  "Switzerland" and "Amsterdam" through "Netherlands" on the same map. The
  country name steps one line up or down, and only if the step keeps it on the
  country: moving "Belgium" clear of "Brussels" by putting it in France helps
  nobody.
- **A world map is no longer mush.** Names are laid down in order and anything
  landing on one already placed is marked `data-fit="0"`. This is not a
  placement solver — nothing is moved twice and nothing is retried — but the
  world has some two hundred capitals and a world map has room for about
  thirty, and without it every one of them was drawn.
- **`neighbours` was still marked `reserved` in the taxonomy** after shipping
  in 0.8.0. The status was wrong, not the layer.

### Changed

- The `labels` layer is `live`. `--label-size` now means the country label
  size specifically; settlement names read `--place-label-size`.
- `Recorder` and the plane geometry the prism layer used moved to `src/rings.ts`,
  because labels need the same projected outlines.
- The colour-token test now derives what counts as a colour from a rule — not a
  `-width` or a `-size`, not `--font` or `--border-dash` — instead of listing
  the exceptions, which had to be edited every time the vocabulary grew.

### Known limits

Two country names can still overlap on a crowded map, and a settlement name can
cross a border it does not belong to. There is no font metrics engine: label
width is estimated from an average glyph advance, and a write-time token
override passed to `render()` arrives after the geometry is settled, so the fit
test cannot follow it. Ranks exist so a theme can thin its way out.

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

- **`theme`, `palette` and `tokens` on `MapOptions`.** Applied in that
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
  disk, so `neatline()` stays isomorphic. Reading a `.css` at call time would make
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

Phase 1 — geometry core. `neatline()` now produces real maps.

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

- **`neatline()` is now async.** The full dataset is 8 MB across detail tiers, so
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
- `neatline()` stub emitting a valid, correctly sized, empty document
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
  write `.default`; the API is `neatline({...})` regardless.
- **Snapshots as `.svg` files** rather than `.snap`, for a library whose output
  is meant to be looked at.

### Known

- The npm name `neatline` is taken (v0.2.5), as is `svg-neatline`. A real name is
  needed before `1.0.0`; a scoped name is the zero-effort fallback. Nothing is
  blocked until publish.
- One `low` audit advisory remains in the esbuild dev-server chain —
  Windows-only, dev-server-only, devDependency, never reaching consumers.
  `npm audit fix` does not resolve it.

## Planned

Version targets for the remaining phases, so the roadmap and the release
history stay the same document.

The original table guessed one version per phase and was wrong from Phase 5
onward — phases landed across several releases each, so Phase 5 shipped at
`0.8.0` and Phase 6 at `0.10.0`, not `0.5.0` and `0.6.0`. The release history
above is the record of what shipped; this table is only what is left.

| Version | Phase | Ships |
| --- | --- | --- |
| `0.13.0` | 8 · Annotations | `invert()`, annotations layer, inlined icons, legend, ocean layer, a brighter palette |
| `0.14.0` | 9 · Routes | Roads and rail — bundling the data, and the class it needs |
| `1.0.0` | — · Publish | npm publish with provenance. **Not scheduled.** |
| — | 10 · Tool | The web app the library exists to feed |

See the [build plan](https://claude.ai/code/artifact/1ad97eac-6e9c-4944-96fb-3e6530d9e83d) for what each of those means and why they are in
that order. It is the single source for the roadmap; this table is only the
version ledger.

**Publishing is a decision, not a phase.** Phase 7 was originally "Ship", which
bundled *being ready to publish* with *publishing*. Those are different things
and only the first one is engineering work, so they are split: Phase 7 does
everything that has to be true before a `1.0.0` — the snapshot suite, the
documentation, the written semver policy — and stops. The publish itself waits
until it is asked for.

Phase 8 keeps its meaning from the entries above, which refer to it by number,
and grew to carry the legend, the ocean layer and a brighter palette — each is
something the tool needs and none is large alone. Routes split out of it because
that one is gated on acquiring data, not on drawing it.

[Unreleased]: https://github.com/danielefrisanco/neatline/compare/v0.12.0...HEAD
[0.12.0]: https://github.com/danielefrisanco/neatline/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/danielefrisanco/neatline/compare/v0.10.0...v0.11.0
[0.7.0]: https://github.com/danielefrisanco/neatline/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/danielefrisanco/neatline/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/danielefrisanco/neatline/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/danielefrisanco/neatline/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/danielefrisanco/neatline/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/danielefrisanco/neatline/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/danielefrisanco/neatline/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/danielefrisanco/neatline/releases/tag/v0.1.0
[0.0.1]: https://github.com/danielefrisanco/neatline/releases/tag/v0.0.1
