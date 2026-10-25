// solarized.ts
//
// Solarized by Ethan Schoonover (2011), MIT. https://ethanschoonover.com/solarized/
// Repo: https://github.com/altercation/solarized
//
// Values from the "The Values" table in the repo README:
//   fetch: https://raw.githubusercontent.com/altercation/solarized/master/README.md

import { makeTheme, swatchRow, type PaletteFile } from "../palette_settings.ts";

// base3 (lightest) → base03 (darkest)
const BASE_RAMP: [string, string][] = [["base3", "#fdf6e3"], ["base2", "#eee8d5"], ["base1", "#93a1a1"], ["base0", "#839496"], ["base00", "#657b83"], ["base01", "#586e75"], ["base02", "#073642"], ["base03", "#002b36"]];

// Shown under both themes
const BASE_ROW = swatchRow("The full base ramp", "All eight monotones, dark to light. Light mode reads from the right end, dark mode from the left.", [["base03", "#002b36"], ["base02", "#073642"], ["base01", "#586e75"], ["base00", "#657b83"], ["base0", "#839496"], ["base1", "#93a1a1"], ["base2", "#eee8d5"], ["base3", "#fdf6e3"]]);

const palette: PaletteFile = {
    id: "solarized",
    name: "Solarized",
    description: "The original color-science scheme: sixteen colors, mirrored light and dark.",
    by: "Ethan Schoonover",
    year: "2011",
    tier: "model",
    method: "CIELAB lightness, symmetric light/dark",
    why: "The first widely used scheme built from color science, and Flexoki's main inspiration. Its 16 colors were chosen by CIELAB lightness so the light and dark modes are mirror images: the same 8 accents work on both backgrounds, and swapping modes keeps the same contrast between text and background.",
    variants: "8 monotone base tones and 8 accents, shared by both modes. No official shades.",
    url: "https://ethanschoonover.com/solarized/",
    license: "MIT",
    names: { light: "Light", dark: "Dark" },
    acc_note: { light: "shared accents", dark: "shared accents" },
    map: "Solarized has no separate UI tones, so ui slots are empty; base2/base02 double as highlights. Text uses base01/base00/base1 (light) and base1/base0/base01 (dark).",
    light: makeTheme(
        ["#fdf6e3", "#eee8d5", null, null, null, "#93a1a1", "#657b83", "#586e75"],
        ["#dc322f", "#cb4b16", "#b58900", "#859900", "#2aa198", "#268bd2", "#6c71c4", "#d33682"],
    ),
    dark: makeTheme(
        ["#002b36", "#073642", null, null, null, "#586e75", "#839496", "#93a1a1"],
        ["#dc322f", "#cb4b16", "#b58900", "#859900", "#2aa198", "#268bd2", "#6c71c4", "#d33682"],
    ),
    flavors: [],
    extra: { light: [BASE_ROW], dark: [BASE_ROW] },
    neutrals: { light: BASE_RAMP, dark: BASE_RAMP },
};

export default palette;
