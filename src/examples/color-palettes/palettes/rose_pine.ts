// rose_pine.ts
//
// Rosé Pine by the Rosé Pine community (2020), MIT. https://rosepinetheme.com/palette/
// Repo: https://github.com/rose-pine/neovim (the reference implementation)
//
// Main, Moon and Dawn values from lua/rose-pine/palette.lua; the highlight
// levels (low / med / high) also from the palette page:
//   fetch: https://raw.githubusercontent.com/rose-pine/neovim/main/lua/rose-pine/palette.lua
//   fetch: https://rosepinetheme.com/palette/ingredients/
//
// Dawn's text is #464261 upstream; older releases (and the older
// rose-pine/rose-pine-palette repo) used #575279.

import { makeTheme, swatchRow, type PaletteFile } from "../palette_settings.ts";

const palette: PaletteFile = {
    id: "rosepine",
    name: "Rosé Pine",
    description: "Soft, low-contrast hues, each with a documented job.",
    by: "Rosé Pine community",
    year: "2020",
    tier: "aes",
    method: "Six named hues, each with a documented role",
    why: "A soft, low-contrast palette with an unusually clear spec: six accents (love, gold, rose, pine, foam, iris), each with a stated job, and three highlight levels for selections. Main is dark, Moon a softer dark, Dawn the light mode. It has no green.",
    variants: "Main, Moon and Dawn.",
    url: "https://rosepinetheme.com/palette/",
    license: "MIT",
    names: { light: "Dawn", dark: "Main" },
    acc_note: { light: "accents", dark: "accents" },
    map: "love → red, rose → orange slot, gold → yellow, foam → cyan, pine → blue, iris → purple. No green or magenta.",
    light: makeTheme(
        ["#faf4ed", "#fffaf3", "#f2e9e1", "#dfdad9", "#cecacd", "#9893a5", "#797593", "#464261"],
        ["#b4637a", "#d7827e", "#ea9d34", null, "#56949f", "#286983", "#907aa9", null],
    ),
    dark: makeTheme(
        ["#191724", "#1f1d2e", "#26233a", "#403d52", "#524f67", "#6e6a86", "#908caa", "#e0def4"],
        ["#eb6f92", "#ebbcba", "#f6c177", null, "#9ccfd8", "#31748f", "#c4a7e7", null],
    ),
    flavors: [
        {
            key: "moon",
            name: "Moon",
            kind: "dark",
            m: makeTheme(
                ["#232136", "#2a273f", "#393552", "#44415a", "#56526e", "#6e6a86", "#908caa", "#e0def4"],
                ["#eb6f92", "#ea9a97", "#f6c177", null, "#9ccfd8", "#3e8fb0", "#c4a7e7", null],
            ),
        },
    ],
    extra: {
        light: [
            swatchRow(
                "Highlights",
                "Low, medium and high highlight levels for selections and cursors.",
                [["low", "#f4ede8"], ["med", "#dfdad9"], ["high", "#cecacd"]],
            ),
            swatchRow(
                "Roles",
                "Each accent's documented job.",
                [
                    ["love · errors", "#b4637a"],
                    ["gold · warnings", "#ea9d34"],
                    ["rose · matches", "#d7827e"],
                    ["pine · keywords", "#286983"],
                    ["foam · info", "#56949f"],
                    ["iris · hints", "#907aa9"],
                ],
            ),
        ],
        dark: [
            swatchRow(
                "Highlights",
                "Low, medium and high highlight levels for selections and cursors.",
                [["low", "#21202e"], ["med", "#403d52"], ["high", "#524f67"]],
            ),
        ],
        moon: [swatchRow("Highlights", "", [["low", "#2a283e"], ["med", "#44415a"], ["high", "#56526e"]])],
    },
    remix_labels: { bg: "base", bg2: "surface", ui: "overlay", tx3: "muted", tx2: "subtle", tx: "text", re: "love", or: "rose", ye: "gold", cy: "foam", bl: "pine", pu: "iris" },
};

export default palette;
