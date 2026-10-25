// tokyo_night.ts
//
// Tokyo Night by enkia; Neovim port by folke (2020), Apache-2.0 / MIT.
// Repo: https://github.com/folke/tokyonight.nvim
//
// Night, Storm and Moon from lua/tokyonight/colors/. Day has no hand-written
// palette: colors/day.lua inverts the dark one at runtime, so Day's values
// are from the generated extras/lua/tokyonight_day.lua.
//   fetch: https://raw.githubusercontent.com/folke/tokyonight.nvim/main/lua/tokyonight/colors/night.lua
//   fetch: https://raw.githubusercontent.com/folke/tokyonight.nvim/main/lua/tokyonight/colors/storm.lua
//   fetch: https://raw.githubusercontent.com/folke/tokyonight.nvim/main/lua/tokyonight/colors/moon.lua
//   fetch: https://raw.githubusercontent.com/folke/tokyonight.nvim/main/extras/lua/tokyonight_day.lua

import { makeTheme, swatchRow, type PaletteFile } from "../palette_settings.ts";

const palette: PaletteFile = {
    id: "tokyonight",
    name: "Tokyo Night",
    description: "Neon-city indigos with bright, slightly cool accents.",
    by: "enkia; Neovim port by folke",
    year: "2020",
    tier: "aes",
    method: "Neon-city blues and violets; light mode is derived from the dark palette",
    why: "Inspired by the lights of downtown Tokyo at night, with deep indigo backgrounds and bright, slightly cool accents. The Neovim port by folke ships four styles and defines its light 'Day' style by transforming the dark palette, so the hues stay consistent across modes.",
    variants: "Night, Storm, Moon and Day.",
    url: "https://github.com/folke/tokyonight.nvim",
    license: "Apache-2.0 / MIT",
    names: { light: "Day", dark: "Night" },
    acc_note: { light: "accents", dark: "accents" },
    map: "bg_dark → bg-2, bg_highlight → ui, fg_gutter → ui-2, terminal_black → ui-3, comment → tx-3, fg_dark → tx-2. Tokyo Night's 'magenta' is a lilac and its 'purple' a deeper violet, so the purple and magenta slots sit close together (Moon's 'purple' is pink).",
    light: makeTheme(
        ["#e1e2e7", "#d0d5e3", "#c4c8da", "#a8aecb", "#a1a6c5", "#848cb5", "#6172b0", "#3760bf"],
        ["#f52a65", "#b15c00", "#8c6c3e", "#587539", "#007197", "#2e7de9", "#7847bd", "#9854f1"],
    ),
    dark: makeTheme(
        ["#1a1b26", "#16161e", "#292e42", "#3b4261", "#414868", "#565f89", "#a9b1d6", "#c0caf5"],
        ["#f7768e", "#ff9e64", "#e0af68", "#9ece6a", "#7dcfff", "#7aa2f7", "#9d7cd8", "#bb9af7"],
    ),
    flavors: [
        {
            key: "storm",
            name: "Storm",
            kind: "dark",
            m: makeTheme(
                ["#24283b", "#1f2335", "#292e42", "#3b4261", "#414868", "#565f89", "#a9b1d6", "#c0caf5"],
                ["#f7768e", "#ff9e64", "#e0af68", "#9ece6a", "#7dcfff", "#7aa2f7", "#9d7cd8", "#bb9af7"],
            ),
        },
        {
            key: "moon",
            name: "Moon",
            kind: "dark",
            m: makeTheme(
                ["#222436", "#1e2030", "#2f334d", "#3b4261", "#444a73", "#636da6", "#828bb8", "#c8d3f5"],
                ["#ff757f", "#ff966c", "#ffc777", "#c3e88d", "#86e1fc", "#82aaff", "#c099ff", "#fca7ea"],
            ),
        },
    ],
    extra: {
        light: [
            swatchRow(
                "Secondary accents",
                "Extra blues, greens and reds used for UI and diagnostics.",
                [
                    ["blue0", "#7890dd"],
                    ["blue1", "#188092"],
                    ["blue2", "#07879d"],
                    ["blue5", "#006a83"],
                    ["blue6", "#2e5857"],
                    ["blue7", "#92a6d5"],
                    ["green1", "#387068"],
                    ["green2", "#38919f"],
                    ["teal", "#118c74"],
                    ["red1", "#c64343"],
                    ["magenta2", "#d20065"],
                ],
            ),
        ],
        dark: [
            swatchRow(
                "Secondary accents",
                "Extra blues, greens and reds used for UI and diagnostics.",
                [
                    ["blue0", "#3d59a1"],
                    ["blue1", "#2ac3de"],
                    ["blue2", "#0db9d7"],
                    ["blue5", "#89ddff"],
                    ["blue6", "#b4f9f8"],
                    ["blue7", "#394b70"],
                    ["green1", "#73daca"],
                    ["green2", "#41a6b5"],
                    ["teal", "#1abc9c"],
                    ["red1", "#db4b4b"],
                    ["magenta2", "#ff007c"],
                ],
            ),
        ],
        moon: [swatchRow("Secondary accents", "", [["blue1", "#65bcff"], ["teal", "#4fd6be"], ["red1", "#c53b53"], ["fg_dark", "#828bb8"]])],
    },
};

export default palette;
