// gruvbox.ts
//
// Gruvbox by Pavel Pertsev (2012), MIT.
// Repo: https://github.com/morhetz/gruvbox
//
// Values from the palette in colors/gruvbox.vim (dark0_hard … light4,
// neutral / bright / faded rows) and the README palette images' labels:
//   fetch: https://raw.githubusercontent.com/morhetz/gruvbox/master/colors/gruvbox.vim
//   fetch: https://raw.githubusercontent.com/morhetz/gruvbox/master/README.md

import { makeTheme, swatchRow, accentSwatches, type PaletteFile } from "../palette_settings.ts";

// The three accent rows: faded (light mode), neutral (terminals), bright (dark mode)
const FADED = accentSwatches(["#9d0006", "#af3a03", "#b57614", "#79740e", "#427b58", "#076678", "#8f3f71", null]);
const NEUTRAL = accentSwatches(["#cc241d", "#d65d0e", "#d79921", "#98971a", "#689d6a", "#458588", "#b16286", null]);
const BRIGHT = accentSwatches(["#fb4934", "#fe8019", "#fabd2f", "#b8bb26", "#8ec07c", "#83a598", "#d3869b", null]);

const palette: PaletteFile = {
    id: "gruvbox",
    name: "Gruvbox",
    description: "Warm, earthy retro colors that stay distinguishable.",
    by: "Pavel Pertsev",
    year: "2012",
    tier: "comfort",
    method: "Warm retro palette with faded, neutral and bright accent rows",
    why: "A warm, earthy scheme designed to keep colors distinguishable while staying easy on the eyes. Light mode uses darker 'faded' accents and dark mode uses 'bright' ones, so each holds contrast on its own background. A 'neutral' row sits between the two.",
    variants: "Dark and light, each with hard, medium and soft backgrounds.",
    url: "https://github.com/morhetz/gruvbox",
    license: "MIT",
    names: { light: "Light Medium", dark: "Dark Medium" },
    acc_note: { light: "faded row", dark: "bright row" },
    map: "Gruvbox's 'aqua' fills cyan. It has no magenta; its purple is a dusty pink. Hard and soft change only the page background.",
    light: makeTheme(
        ["#fbf1c7", "#ebdbb2", "#d5c4a1", "#bdae93", "#a89984", "#928374", "#7c6f64", "#3c3836"],
        ["#9d0006", "#af3a03", "#b57614", "#79740e", "#427b58", "#076678", "#8f3f71", null],
    ),
    dark: makeTheme(
        ["#282828", "#3c3836", "#504945", "#665c54", "#7c6f64", "#928374", "#a89984", "#ebdbb2"],
        ["#fb4934", "#fe8019", "#fabd2f", "#b8bb26", "#8ec07c", "#83a598", "#d3869b", null],
    ),
    flavors: [
        {
            key: "lhard",
            name: "Light Hard",
            kind: "light",
            m: makeTheme(
                ["#f9f5d7", "#ebdbb2", "#d5c4a1", "#bdae93", "#a89984", "#928374", "#7c6f64", "#3c3836"],
                ["#9d0006", "#af3a03", "#b57614", "#79740e", "#427b58", "#076678", "#8f3f71", null],
            ),
        },
        {
            key: "lsoft",
            name: "Light Soft",
            kind: "light",
            m: makeTheme(
                ["#f2e5bc", "#ebdbb2", "#d5c4a1", "#bdae93", "#a89984", "#928374", "#7c6f64", "#3c3836"],
                ["#9d0006", "#af3a03", "#b57614", "#79740e", "#427b58", "#076678", "#8f3f71", null],
            ),
        },
        {
            key: "dsoft",
            name: "Dark Soft",
            kind: "dark",
            m: makeTheme(
                ["#32302f", "#3c3836", "#504945", "#665c54", "#7c6f64", "#928374", "#a89984", "#ebdbb2"],
                ["#fb4934", "#fe8019", "#fabd2f", "#b8bb26", "#8ec07c", "#83a598", "#d3869b", null],
            ),
        },
        {
            key: "dhard",
            name: "Dark Hard",
            kind: "dark",
            after: true,
            m: makeTheme(
                ["#1d2021", "#3c3836", "#504945", "#665c54", "#7c6f64", "#928374", "#a89984", "#ebdbb2"],
                ["#fb4934", "#fe8019", "#fabd2f", "#b8bb26", "#8ec07c", "#83a598", "#d3869b", null],
            ),
        },
    ],
    extra: {
        light: [swatchRow("Neutral accents", "The middle row, used for terminal colors in both modes.", NEUTRAL), swatchRow("Bright accents", "The dark mode's row, for comparison.", BRIGHT)],
        dark: [swatchRow("Neutral accents", "The middle row, used for terminal colors in both modes.", NEUTRAL), swatchRow("Faded accents", "The light mode's row, for comparison.", FADED)],
    },
    remix_labels: { cy: "aqua" },
};

export default palette;
