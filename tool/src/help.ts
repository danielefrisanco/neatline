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
 * JavaScript, it is reachable from a keyboard, it does not vanish when the
 * pointer moves, and its open state survives the form being rebuilt because
 * nothing here holds state — the browser does.
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

  layers: [
    {
      title: "Sea as a shape",
      body:
        "Off, blue means “nothing was drawn here”, which is only the same as water when your region has coastline all the way round. On, the ocean is a real polygon — so land you did not ask for stops pretending to be sea.",
    },
    {
      title: "Neighbours",
      body:
        "Every country the canvas can see, drawn beneath your subject as context. It never moves the framing: your region stays exactly where it was.",
    },
    {
      title: "Land cover",
      body:
        "Desert, mountain and glacier, tinted over the land. There is no forest: Natural Earth publishes no forest polygon at any scale, and inventing one would be the only made-up thing on the map.",
    },
  ],

  lines: [
    {
      title: "Border width vs country outline",
      body:
        "Two different lines. The border is the boundary between two countries, drawn once. The outline is the edge of each country's own shape, drawn all the way round including its coast. Set both to zero and the land becomes a single silhouette.",
    },
  ],

  names: [
    {
      title: "Shown and named",
      body:
        "Cities are ranked 1–3: capitals and the largest, then everything over a million, then the rest. You can draw more dots than you name, and usually should — words collide where dots merely crowd.",
    },
  ],
};

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
  return details;
}
