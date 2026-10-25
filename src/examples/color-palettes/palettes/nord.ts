// nord.ts
//
// Nord by Arctic Ice Studio (Sven Greb) (2016), MIT.
// https://www.nordtheme.com/docs/colors-and-palettes
// Repo: https://github.com/nordtheme/nord
//
// nord0–nord15 from the reference stylesheet src/nord.css:
//   fetch: https://raw.githubusercontent.com/nordtheme/nord/develop/src/nord.css

import { makeTheme, swatchRow, type PaletteFile } from "../palette_settings.ts";

// Snow Storm (lightest) → Polar Night (darkest)
const BASE_RAMP: [string, string][] = [["nord6", "#eceff4"], ["nord5", "#e5e9f0"], ["nord4", "#d8dee9"], ["nord3", "#4c566a"], ["nord2", "#434c5e"], ["nord1", "#3b4252"], ["nord0", "#2e3440"]];

// Shown under both ambiances
const GROUPS = [
    swatchRow("Frost", "Four blues, from glacial teal to deep sea.", [["nord7", "#8fbcbb"], ["nord8", "#88c0d0"], ["nord9", "#81a1c1"], ["nord10", "#5e81ac"]]),
    swatchRow("Polar Night and Snow Storm", "The seven base colors.", [["nord0", "#2e3440"], ["nord1", "#3b4252"], ["nord2", "#434c5e"], ["nord3", "#4c566a"], ["nord4", "#d8dee9"], ["nord5", "#e5e9f0"], ["nord6", "#eceff4"]]),
];

const palette: PaletteFile = {
    id: "nord",
    name: "Nord",
    description: "Arctic, north-bluish: sixteen low-saturation colors.",
    by: "Arctic Ice Studio (Sven Greb)",
    year: "2016",
    tier: "aes",
    method: "16 colors in four named groups",
    why: "An arctic, north-bluish scheme with one 16-color set: Polar Night (dark bases), Snow Storm (light bases), Frost (blues) and Aurora (accents). The docs describe a dark and a bright ambiance built from the same colors. Low saturation throughout, and no magenta.",
    variants: "One set of 16 colors used for dark and bright ambiances.",
    url: "https://www.nordtheme.com/docs/colors-and-palettes",
    license: "MIT",
    names: { light: "Bright Ambiance", dark: "Dark Ambiance" },
    acc_note: { light: "shared aurora/frost", dark: "shared aurora/frost" },
    map: "Aurora gives red, orange, yellow, green, purple; Frost nord8 is cyan and nord10 is blue. The same accents are used on both backgrounds, so yellow and cyan get very low contrast in the bright ambiance.",
    light: makeTheme(
        ["#eceff4", "#e5e9f0", "#d8dee9", null, null, "#4c566a", "#3b4252", "#2e3440"],
        ["#bf616a", "#d08770", "#ebcb8b", "#a3be8c", "#88c0d0", "#5e81ac", "#b48ead", null],
    ),
    dark: makeTheme(
        ["#2e3440", "#3b4252", "#434c5e", "#4c566a", null, null, "#e5e9f0", "#d8dee9"],
        ["#bf616a", "#d08770", "#ebcb8b", "#a3be8c", "#88c0d0", "#5e81ac", "#b48ead", null],
    ),
    flavors: [],
    extra: { light: GROUPS, dark: GROUPS },
    neutrals: { light: BASE_RAMP, dark: BASE_RAMP },
    remix_labels: { bg: "nord0", tx: "nord4" },
};

export default palette;
