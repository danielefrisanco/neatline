/**
 * The little `?` beside a control that has a real answer behind it.
 *
 * Half the options here are cartography rather than software, and the names are
 * only obvious to someone who already knows them. "Mercator" and "Albers" are
 * two dead men to most readers; "50m" is a number with no unit; and nothing on
 * the form says why you would ever want a conic projection. A dropdown that
 * cannot be reasoned about gets used by trial and error, or not at all.
 *
 * Deliberately a `<details>` rather than a tooltip or a modal. It works without
 * JavaScript, it is reachable from a keyboard, and it does not vanish when the
 * pointer moves.
 *
 * **It is positioned rather than laid out, and that is not decoration.** The
 * panel it is anchored in scrolls, and a scrolling box clips anything inside it
 * — so an explanation that sits in the flow is cropped by the sidebar and made
 * as narrow as the sidebar is. Taking it out of the flow with `position: fixed`
 * is what fixes that, and it is the whole of what was needed.
 *
 * It opens **at the `?` that was clicked** — below it and to the right, the way
 * a popover has opened since menus were invented — and not, as it did at first,
 * shoved clear of the panel and out over the map. That was a second decision
 * riding on the first, and it was wrong: fixed positioning already escapes the
 * scrolling box, so pushing the explanation away from the thing it explains
 * bought nothing and cost the connection between them.
 *
 * Which leaves the two things the browser stops doing once a box is fixed. It
 * does not follow its anchor when the panel scrolls — so it is **repositioned**
 * on every scroll rather than closed, because closing a paragraph somebody is
 * halfway through reading is the rudest possible answer to them nudging a
 * wheel. And nothing dismisses it, so a click anywhere outside does. Both are
 * handled once, at the document, however many `?`s the form is rebuilt with.
 */

export interface HelpEntry {
  readonly title: string;
  readonly body: string;
}

/**
 * Projections, described by what they do to the map rather than by their
 * mathematics — an equal-area projection is one where two countries that look
 * the same size are the same size, and that sentence is the whole of what a
 * reader needs.
 */
const LAYERS: readonly HelpEntry[] = [
  {
    title: "Sea as a shape",
    body:
      "Off, blue means “nothing was drawn here”, which is only the same as water when your region has coastline all the way round. On, the ocean is a real polygon — so land you did not ask for stops pretending to be sea.",
  },
  {
    title: "Land cover",
    body:
      "Desert, mountain and glacier, tinted over the land. There is no forest: Natural Earth publishes no forest polygon at any scale, and inventing one would be the only made-up thing on the map.",
  },
  {
    title: "The graticule, and its numbers",
    body:
      "Parallels and meridians, with the equator and the tropics drawn apart from the rest. Degree labels write each line's latitude or longitude on the frame — where the line meets it, which is why a globe gets none: its meridians end on the limb, in the middle of the picture.",
  },
];

const NAMES: readonly HelpEntry[] = [
  {
    title: "Shown and named",
    body:
      "Cities are ranked 1–3: capitals and the largest, then everything over a million, then the rest. You can draw more dots than you name, and usually should — words collide where dots merely crowd.",
  },
];

export const HELP: Readonly<Record<string, readonly HelpEntry[]>> = {
  projection: [
    {
      title: "mercator",
      body:
        "Keeps every shape locally correct and every angle true, at the cost of size: Greenland comes out as big as Africa when it is fourteen times smaller. Right for navigation and for small areas, misleading for anything that spans a lot of latitude.",
    },
    {
      title: "equal-earth",
      body:
        "Areas are honest — two countries drawn the same size are the same size — and shapes are only gently distorted. The safe default for a world map, and the one to use if the map is about how much of something is where.",
    },
    {
      title: "orthographic",
      body:
        "The globe as seen from space. Half the world at a time, with the edges foreshortened the way a real sphere is. Use it when you want the map to read as a planet rather than as a chart. It is the only projection here that can be centred on a latitude as well as a longitude.",
    },
    {
      title: "conic-conformal",
      body:
        "Shapes stay true and the distortion is spread along two lines of latitude rather than one, which suits a region that is wider than it is tall in the middle latitudes — Europe, the United States. The usual choice for a national or continental map.",
    },
    {
      title: "albers",
      body:
        "The equal-area cousin of conic-conformal: same fan-shaped frame, but areas are preserved and shapes give a little instead. Use it when the map is carrying a quantity.",
    },
  ],

  detail: [
    {
      title: "What the number means",
      body:
        "The scale the source data was drawn for: 1 : 110 million, and 1 : 50 million. Smaller number, finer coastline. It is a property of the data, not of your canvas.",
    },
    {
      title: "110m — coarse, fast",
      body:
        "177 countries and a simplified coastline, about 150 KB. Right for a world map or a continent, where the extra detail would not survive being drawn a few hundred pixels wide anyway.",
    },
    {
      title: "50m — fine",
      body:
        "241 countries, ten times the coastline detail, about 1.5 MB. Right for anything smaller than a continent. It also carries small countries and islands that 110m drops entirely — which is why the country list changes when you switch.",
    },
  ],

  region: [
    {
      title: "Presets and codes",
      body:
        "A preset is a saved list of countries — nothing you could not have picked by hand. They overlap on purpose: Turkey is in Europe, the Balkans and the Middle East, because a region is a frame someone wants and not a division of the world.",
    },
    {
      title: "The frame is not the list",
      body:
        "The canvas has its own shape, so it almost always shows more ground than the countries you named. Turn on Neighbours to fill that margin with the land that is really there, drawn as context beneath your subject.",
    },
  ],

  theme: [
    {
      title: "Theme, palette, typeface",
      body:
        "Three independent choices. The theme is the whole look; a palette recolours it without touching the layout; a typeface changes the lettering. Any combination works — and a palette replaces the theme's dark mode, so a dark palette stays dark in daylight.",
    },
  ],

  frame: [
    {
      title: "The canvas is part of the map",
      body:
        "Width and height are not a preview size — they are the paper. A tall canvas of the same region shows more ground above and below it, because the region is fitted to whichever axis binds and the other one gets the slack.",
    },
    {
      title: "Neighbours",
      body:
        "Every country the canvas can see, drawn beneath your subject as context. It never moves the framing: your region stays exactly where it was, and the land that was already in the picture stops pretending to be sea.",
    },
  ],

  layers: LAYERS,

  lines: [
    {
      title: "Border width vs country outline",
      body:
        "Two different lines. The border is the boundary between two countries, drawn once. The outline is the edge of each country's own shape, drawn all the way round including its coast. Set both to zero and the land becomes a single silhouette.",
    },
  ],

  marks: [
    {
      title: "One click, two clicks, a sequence",
      body:
        "A pin is one click, an arrow is two — tail then head — and a route is a stop for every click until you finish it. Highlighting is the odd one out: it clicks a country rather than a place, so it only works on the countries you asked for, not on the neighbours drawn behind them.",
    },
    {
      title: "Marks are on the ground, not on the paper",
      body:
        "Every mark is stored as a longitude and a latitude, so changing the projection, the region or the canvas size moves the map underneath them and leaves them where you put them. The credit line is the opposite: that one is on the paper and stays in its corner.",
    },
    {
      title: "Without a mouse",
      body:
        "Tab to the map and a small cross appears. The arrow keys move it — ten units a press, one with Shift held — and Enter places the mark where it stands. Escape puts it away. The coordinate above the map follows the cross as well as the pointer, so you can see where you are before committing to it.",
    },
    {
      title: "The far side of a globe",
      body:
        "An orthographic map shows half a world, and the canvas corners outside the disc are not anywhere at all. A click that lands there is refused rather than guessed at — the same rule the library uses when it declines to draw a pin behind the horizon.",
    },
  ],

  names: NAMES,

  // The group that carries both, since they answer one question between
  // them: what is on the map besides the land.
  shows: [...LAYERS, ...NAMES],
};

/** Gap between the `?` and the box it opens, in pixels. */
const GAP = 8;
/** How close to the window's edge the box may come. */
const MARGIN = 12;

/**
 * Where the explanation goes: at the `?`, and on the screen.
 *
 * Measured rather than guessed at, because the answer changes with the width of
 * the window and the height of the entry — the projection list is five
 * paragraphs and would run off the bottom of a short window if it opened level
 * with a control near the foot of the panel. So it opens downward when there is
 * room below and upward when there is not, which is the one thing a popover has
 * to get right.
 */
function position(details: HTMLDetailsElement, body: HTMLElement): void {
  const anchor = details.getBoundingClientRect();
  const room = { width: window.innerWidth, height: window.innerHeight };

  const width = Math.min(420, room.width - 2 * MARGIN);
  body.style.width = `${width}px`;
  // Aligned with the `?` and extending right, pulled back only when that would
  // run it off the window.
  body.style.left = `${Math.max(MARGIN, Math.min(anchor.left, room.width - MARGIN - width))}px`;

  // Measured at its final width, since the width decides how many lines it is.
  body.style.top = "0px";
  const height = body.getBoundingClientRect().height;
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - height;
  // Below unless below does not fit and above does — a box that opens upward
  // when it did not have to is a box that seems to move on its own.
  const top = below + height <= room.height - MARGIN || above < MARGIN ? below : above;
  body.style.top = `${Math.max(MARGIN, Math.min(top, room.height - MARGIN - height))}px`;
}

/**
 * Keep an open explanation on its `?` while the panel scrolls.
 *
 * Throttled to a frame, because a scroll event fires far faster than anything
 * needs to be redrawn and each of these measures a box.
 */
let following = false;

function follow(): void {
  if (following) return;
  following = true;
  requestAnimationFrame(() => {
    following = false;
    for (const open of document.querySelectorAll<HTMLDetailsElement>("details.help[open]")) {
      const body = open.querySelector<HTMLElement>(".help-body");
      if (body === null) continue;
      // Once the `?` itself has been scrolled out of the panel there is nothing
      // left to point at, and a paragraph floating beside an empty strip of
      // form is worse than no paragraph.
      const anchor = open.getBoundingClientRect();
      const panel = open.closest(".panel")?.getBoundingClientRect();
      if (panel !== undefined && (anchor.bottom < panel.top || anchor.top > panel.bottom)) {
        open.open = false;
        continue;
      }
      position(open, body);
    }
  });
}

function closeAll(): void {
  for (const open of document.querySelectorAll<HTMLDetailsElement>("details.help[open]")) {
    open.open = false;
  }
}

/** Registered once for the life of the page, not once per `?`. */
let watching = false;

function watchOnce(): void {
  if (watching) return;
  watching = true;

  // A click anywhere that is not inside the open explanation closes it —
  // including on another `?`, so two are never open at once.
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    for (const open of document.querySelectorAll<HTMLDetailsElement>("details.help[open]")) {
      if (!open.contains(target)) open.open = false;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (document.querySelector("details.help[open]") === null) return;
    closeAll();
    // Escape means "close this", not "abandon the arrow I was half way through
    // drawing" — the map's own handler is on the window and must not also fire.
    event.stopPropagation();
  });

  // A fixed box does not travel with its anchor, so a scrolled panel would
  // leave the explanation behind. It is moved to keep up rather than closed:
  // somebody reading a paragraph and nudging the wheel has not asked for it to
  // go away.
  document.addEventListener("scroll", follow, true);
  window.addEventListener("resize", follow);
}

/** A `?` that opens a short explanation. */
export function helpFor(topic: string): HTMLElement | null {
  const entries = HELP[topic];
  if (entries === undefined) return null;

  const details = document.createElement("details");
  details.className = "help";

  const summary = document.createElement("summary");
  summary.textContent = "?";
  summary.setAttribute("aria-label", `About ${topic}`);
  summary.title = `About ${topic}`;
  details.append(summary);

  const body = document.createElement("div");
  body.className = "help-body";
  for (const entry of entries) {
    const term = document.createElement("p");
    term.className = "help-term";
    term.textContent = entry.title;
    const text = document.createElement("p");
    text.className = "help-text";
    text.textContent = entry.body;
    body.append(term, text);
  }
  details.append(body);

  details.addEventListener("toggle", () => {
    if (details.open) position(details, body);
  });
  watchOnce();
  return details;
}
