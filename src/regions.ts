import type { RegionPreset } from "./types.js";

/**
 * Region presets are saved lists of country codes, not a separate mechanism —
 * `"west-europe"` expands to exactly what a caller could have written by hand.
 *
 * They are explicit rather than derived from a continent field because the
 * topology carries no continent data, and because membership is an editorial
 * choice: "Western Europe" has no single correct definition, so it is better
 * stated in one visible place than inferred.
 */
export const REGION_PRESETS: Readonly<Record<Exclude<RegionPreset, "world">, readonly string[]>> = {
  "west-europe": [
    "PT", "ES", "FR", "BE", "NL", "LU", "DE", "CH", "AT", "IT", "GB", "IE", "DK",
  ],
  europe: [
    "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE",
    "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT", "XK", "LV", "LI", "LT",
    "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "SM",
    "RS", "SK", "SI", "ES", "SE", "CH", "UA", "GB", "VA",
  ],
  "north-america": [
    "CA", "US", "MX", "GT", "BZ", "SV", "HN", "NI", "CR", "PA", "CU", "HT",
    "DO", "JM", "BS", "TT", "BB", "GD", "LC", "VC", "AG", "KN", "DM", "GL",
  ],
  "south-america": [
    "AR", "BO", "BR", "CL", "CO", "EC", "FK", "GF", "GY", "PY", "PE", "SR",
    "UY", "VE",
  ],
  africa: [
    "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG",
    "CD", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN",
    "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ",
    "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD",
    "TZ", "TG", "TN", "UG", "EH", "ZM", "ZW", "XS",
  ],
  asia: [
    "AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "GE", "IN", "ID",
    "IR", "IQ", "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MY", "MV",
    "MN", "MM", "NP", "KP", "OM", "PK", "PS", "PH", "QA", "SA", "SG", "KR",
    "LK", "SY", "TW", "TJ", "TH", "TL", "TR", "TM", "AE", "UZ", "VN", "YE",
  ],
  oceania: [
    "AU", "FJ", "KI", "MH", "FM", "NR", "NZ", "PW", "PG", "WS", "SB", "TO",
    "TV", "VU", "NC", "PF",
  ],
  // One country, and the only preset that is a whole continent in a single
  // code. The French Southern and Antarctic Lands are deliberately left out:
  // Kerguelen and its neighbours sit thousands of kilometres north in the
  // Indian Ocean, and including them would frame an ocean rather than a
  // continent.
  antarctica: ["AQ"],

  // --- Sub-regions -------------------------------------------------------
  //
  // Added because the continent list left most of the world unreachable
  // without writing out codes by hand: a map of the Middle East, of Central
  // America, of the Sahel, had to be typed. These are the same mechanism —
  // saved lists a caller could have written — and, like the continents, they
  // are editorial choices rather than derived facts. Every one of them has a
  // defensible alternative, which is exactly why they are written down in one
  // visible place instead of inferred from a table.
  //
  // Overlap between presets is expected and fine. Turkey is in Europe, the
  // Middle East and Asia; Egypt is in Africa, North Africa and the Middle
  // East. A region is a frame someone wants, not a partition of the planet.

  "east-europe": [
    "PL", "CZ", "SK", "HU", "RO", "BG", "MD", "UA", "BY", "LT", "LV", "EE",
    "RU",
  ],
  nordics: ["NO", "SE", "FI", "DK", "IS", "FO", "AX", "GL"],
  // The former Yugoslavia plus its neighbours on the peninsula. Greece and
  // Turkey's European portion are in, because a Balkan map that stops at the
  // Greek border frames a shape no atlas draws.
  balkans: [
    "SI", "HR", "BA", "RS", "ME", "XK", "MK", "AL", "GR", "BG", "RO", "TR",
  ],
  // The basin, both shores. This is the one preset framed by a *sea* rather
  // than by land, which is the point of it — and it is the map the sea-name
  // layer was built for.
  mediterranean: [
    "ES", "FR", "MC", "IT", "MT", "SI", "HR", "BA", "ME", "AL", "GR", "TR",
    "CY", "SY", "LB", "IL", "PS", "EG", "LY", "TN", "DZ", "MA",
  ],

  // Mexico is in both this and North America, deliberately: it is
  // geographically North American and culturally Central American, and a map
  // of Central America without it is a map of the isthmus alone.
  "central-america": ["MX", "GT", "BZ", "SV", "HN", "NI", "CR", "PA"],
  caribbean: [
    "CU", "HT", "DO", "JM", "PR", "BS", "TT", "BB", "GD", "LC", "VC", "AG",
    "KN", "DM", "AW", "CW", "BQ", "KY", "TC", "VG", "VI", "AI", "MS", "BL",
    "MF", "SX", "GP", "MQ",
  ],

  // The Maghreb and the Nile, which is where the Sahara is. Sudan and
  // Mauritania are in: the desert does not stop at the Sahel on any map of it.
  "north-africa": ["MA", "EH", "DZ", "TN", "LY", "EG", "SD", "MR", "ML", "NE", "TD"],
  "west-africa": [
    "MR", "ML", "NE", "SN", "GM", "GW", "GN", "SL", "LR", "CI", "BF", "GH",
    "TG", "BJ", "NG", "CV",
  ],
  "east-africa": [
    "SD", "SS", "ER", "DJ", "ET", "SO", "KE", "UG", "RW", "BI", "TZ", "XS",
  ],
  "southern-africa": ["ZA", "NA", "BW", "ZW", "MZ", "ZM", "MW", "AO", "LS", "SZ", "MG"],

  // Israel and Palestine are both listed because the topology carries both,
  // and a hand-written list that omits one leaves a hole rather than a blank —
  // the same failure that unnamed Somaliland on the first map of Africa.
  "middle-east": [
    "TR", "SY", "LB", "IL", "PS", "JO", "IQ", "IR", "SA", "YE", "OM", "AE",
    "QA", "BH", "KW", "CY", "EG",
  ],
  "central-asia": ["KZ", "UZ", "TM", "TJ", "KG", "AF", "MN"],
  "south-asia": ["IN", "PK", "BD", "NP", "BT", "LK", "MV", "AF"],
  "southeast-asia": [
    "MM", "TH", "LA", "KH", "VN", "MY", "SG", "ID", "BN", "PH", "TL",
  ],
  "east-asia": ["CN", "MN", "KP", "KR", "JP", "TW", "HK", "MO"],

  // The islands without Australia and New Zealand, which are what `oceania`
  // is mostly framed by. Framing on the islands alone is a genuinely different
  // map — it is the Pacific, not the countries at its edge — and it is the one
  // that wants `center` on the antimeridian.
  pacific: [
    "FJ", "KI", "MH", "FM", "NR", "PW", "PG", "WS", "SB", "TO", "TV", "VU",
    "NC", "PF", "GU", "MP", "AS", "CK", "NU", "TK", "WF", "PN", "NF",
  ],
} as const;

export const REGION_PRESET_NAMES = [
  "world",
  ...Object.keys(REGION_PRESETS),
] as readonly RegionPreset[];

export function isRegionPreset(value: string): value is RegionPreset {
  return value === "world" || value in REGION_PRESETS;
}

/** Expand a preset to the codes it stands for. `"world"` means every feature. */
export function expandPreset(preset: RegionPreset): readonly string[] | null {
  if (preset === "world") return null;
  return REGION_PRESETS[preset];
}

/**
 * Human-readable names, for the root `aria-label` and `<title>`.
 *
 * Kept beside the code lists so a new preset cannot ship without one: an
 * unnamed map is an inaccessible map.
 */
const PRESET_LABELS: Readonly<Record<RegionPreset, string>> = {
  world: "the world",
  europe: "Europe",
  "west-europe": "Western Europe",
  "north-america": "North America",
  "south-america": "South America",
  africa: "Africa",
  asia: "Asia",
  oceania: "Oceania",
  antarctica: "Antarctica",
  "east-europe": "Eastern Europe",
  nordics: "the Nordic countries",
  balkans: "the Balkans",
  mediterranean: "the Mediterranean",
  "central-america": "Central America",
  caribbean: "the Caribbean",
  "north-africa": "North Africa",
  "west-africa": "West Africa",
  "east-africa": "East Africa",
  "southern-africa": "Southern Africa",
  "middle-east": "the Middle East",
  "central-asia": "Central Asia",
  "south-asia": "South Asia",
  "southeast-asia": "Southeast Asia",
  "east-asia": "East Asia",
  pacific: "the Pacific",
};

export function presetLabel(preset: RegionPreset): string {
  return PRESET_LABELS[preset];
}
