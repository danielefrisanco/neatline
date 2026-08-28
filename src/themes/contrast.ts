import { compose } from "./structure.js";

/**
 * Pure black and white, sized for legibility rather than for elegance.
 *
 * Every choice here is the accessible one: no muted ink, because a secondary
 * grey is the first thing to fail a contrast check; heavy boundaries, because
 * a hairline disappears when a map is printed or projected; larger labels than
 * any other preset. Its bands and political fills are steps of grey with wide
 * gaps between them, so they stay distinguishable in greyscale, at low
 * resolution, and to a reader with any form of colour blindness.
 *
 * The one thing black and white cannot express is a filled lake, which would
 * read as a hole punched in the land — so lakes are drawn as outlines instead,
 * the only structural override any bundled theme needs.
 *
 * The sea is a light grey rather than white. Pure white on both sides of the
 * coastline leaves land and water telling apart only by which side of a line
 * they fall on, which is exactly the reading this theme exists to spare
 * someone. The grey is not doing the work — the black coastline is, at 21:1
 * against either — but it removes the ambiguity for nothing.
 */
export const contrast = compose({
  tokens: `
  --bg: #E8E8E8;
  --land: #FFFFFF;
  --land-edge: #000000;
  --land-edge-width: 2;
  --border: #000000;
  --border-width: 3.5;
  --border-dash: none;
  --accent: #000000;
  --accent-edge: #FFFFFF;
  --bin-1: #FFFFFF;
  --bin-2: #C4C4C4;
  --bin-3: #8A8A8A;
  --bin-4: #4F4F4F;
  --bin-5: #141414;
  --fill-1: #FFFFFF;
  --fill-2: #D0D0D0;
  --fill-3: #A0A0A0;
  --fill-4: #707070;
  --fill-5: #404040;
  --fill-6: #1A1A1A;
  --prism-side: #000000;
  --accent-side: #4A4A4A;
  --place: #000000;
  --ink: #000000;
  --ink-muted: #000000;
  --font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --label-size: 15;
  --place-label-size: 13;
  --label-track: 0;
  --label-weight: 700;
  --label-advance: 0.58;
  --label-halo: #FFFFFF;
  --label-halo-width: 3.5;

  --stripe: #000000;
  --stripe-width: 2.4;
  --water: #000000;
  --water-width: 1.4;
  --graticule: #8A8A8A;
  --graticule-width: 0.6;
  --equator: #000000;
  --desert: #E0E0E0;
  --forest: #C0C0C0;
  --mountain: #A8A8A8;
  --glacier: #FFFFFF;
  --sea-ink: #000000;
  --road: #000000;
  --neighbour: #E8E8E8;
  --anno: #000000;
  --anno-ink: #FFFFFF;
  --furniture-ink: #000000;`,
  dark: `
  --bg: #171717;
  --land: #000000;
  --land-edge: #FFFFFF;
  --border: #FFFFFF;
  --accent: #FFFFFF;
  --accent-edge: #000000;
  --bin-1: #000000;
  --bin-2: #3B3B3B;
  --bin-3: #757575;
  --bin-4: #B0B0B0;
  --bin-5: #EBEBEB;
  --fill-1: #000000;
  --fill-2: #2F2F2F;
  --fill-3: #5F5F5F;
  --fill-4: #8F8F8F;
  --fill-5: #BFBFBF;
  --fill-6: #E5E5E5;
  --prism-side: #FFFFFF;
  --accent-side: #B5B5B5;
  --place: #FFFFFF;
  --ink: #FFFFFF;
  --ink-muted: #FFFFFF;
  --label-halo: #000000;
  --water: #FFFFFF;
  --neighbour: #171717;
  --anno: #FFFFFF;
  --anno-ink: #000000;
  --stripe: #FFFFFF;
  --furniture-ink: #FFFFFF;`,
  extra: `
.mp .mp-water[data-kind="lake"] {
  fill: var(--bg);
  stroke: var(--land-edge);
  stroke-width: var(--land-edge-width);
}`,
});
