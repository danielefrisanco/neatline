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
};

export function presetLabel(preset: RegionPreset): string {
  return PRESET_LABELS[preset];
}
