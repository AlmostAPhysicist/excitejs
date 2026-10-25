// modus.ts
//
// Modus Themes by Protesilaos Stavrou (2019), GPL-3.0. Built into GNU Emacs.
// https://protesilaos.com/emacs/modus-themes
// Repo: https://github.com/protesilaos/modus-themes
//
// The per-theme files (modus-operandi-theme.el etc.) only load their palette;
// every palette (Operandi, Vivendi and both Tinted variants) is defined in
// modus-themes.el, which is where these values are from:
//   fetch: https://raw.githubusercontent.com/protesilaos/modus-themes/main/modus-themes.el

import { makeTheme, swatchRow, swatchRuns, type PaletteFile } from "../palette_settings.ts";

const palette: PaletteFile = {
    id: "modus",
    name: "Modus Themes",
    description: "WCAG AAA throughout: at least 7:1 contrast for every text pairing.",
    by: "Protesilaos Stavrou",
    year: "2019",
    tier: "std",
    method: "WCAG AAA: at least 7:1 for every text and background pairing",
    why: "Built into GNU Emacs. Every foreground and background combination meets a 7:1 contrast ratio, the strictest WCAG tier, and each palette review is published with reproducible contrast tables. Each hue comes in base, warmer, cooler, faint and intense forms, and there are dedicated variants for red-green and blue-yellow color deficiency.",
    variants: "Operandi and Vivendi, each with tinted, deuteranopia and tritanopia versions (8 themes).",
    url: "https://protesilaos.com/emacs/modus-themes",
    license: "GPL-3.0",
    names: { light: "Operandi", dark: "Vivendi" },
    acc_note: { light: "base hues", dark: "base hues" },
    map: "Modus has no orange; its 'rust' color fills that slot. Purple is magenta-cooler and magenta is magenta-warmer. tx-3 is empty because Modus keeps all text at 7:1. The deuteranopia and tritanopia themes mostly reassign which hue does which job (errors become yellow, for example) rather than changing the named colors, so they are not repeated as flavours here.",
    light: makeTheme(
        ["#ffffff", "#f2f2f2", "#e0e0e0", "#c4c4c4", "#9f9f9f", null, "#595959", "#000000"],
        ["#a60000", "#8a290f", "#6f5500", "#006800", "#005e8b", "#0031a9", "#531ab6", "#8f0075"],
    ),
    dark: makeTheme(
        ["#000000", "#1e1e1e", "#303030", "#535353", "#646464", null, "#989898", "#ffffff"],
        ["#ff5f59", "#db7b5f", "#d0bc00", "#44bc44", "#00d3d0", "#2fafff", "#b6a0ff", "#f78fe7"],
    ),
    flavors: [
        {
            key: "otinted",
            name: "Operandi Tinted",
            kind: "light",
            m: makeTheme(
                ["#fbf7f0", "#efe9dd", "#dfd5cf", "#c9b9b0", "#9f9690", null, "#595959", "#000000"],
                ["#a60000", "#8a290f", "#6d5000", "#006300", "#00598b", "#0031a9", "#531ab6", "#8f0075"],
            ),
        },
        {
            key: "vtinted",
            name: "Vivendi Tinted",
            kind: "dark",
            after: true,
            m: makeTheme(
                ["#0d0e1c", "#1d2235", "#2b3045", "#4a4f69", "#61647a", null, "#989898", "#ffffff"],
                ["#ff5f59", "#db8b3f", "#d0bc00", "#44bc44", "#00d3d0", "#2fafff", "#b6a0ff", "#f78fe7"],
            ),
        },
    ],
    extra: {
        light: [
            swatchRuns(
                "Foreground families",
                "Each hue in base, warmer, cooler, faint and intense forms. All but 'intense' clear 7:1 on white.",
                [
                    ["red", [["base", "#a60000"], ["warmer", "#972500"], ["cooler", "#a0132f"], ["faint", "#7f0000"], ["intense", "#d00000"]]],
                    ["green", [["base", "#006800"], ["warmer", "#316500"], ["cooler", "#00663f"], ["faint", "#2a5045"], ["intense", "#008900"]]],
                    ["yellow", [["base", "#6f5500"], ["warmer", "#884900"], ["cooler", "#7a4f2f"], ["faint", "#624416"], ["intense", "#808000"]]],
                    ["blue", [["base", "#0031a9"], ["warmer", "#3548cf"], ["cooler", "#0000b0"], ["faint", "#003497"], ["intense", "#0000ff"]]],
                    ["magenta", [["base", "#721045"], ["warmer", "#8f0075"], ["cooler", "#531ab6"], ["faint", "#7c318f"], ["intense", "#dd22dd"]]],
                    ["cyan", [["base", "#005e8b"], ["warmer", "#3f578f"], ["cooler", "#005f5f"], ["faint", "#005077"], ["intense", "#008899"]]],
                ],
            ),
            swatchRuns(
                "Background tiers",
                "Intense, subtle and nuanced backgrounds. Any Modus foreground stays legible on the nuanced tier.",
                [
                    ["red", [["intense", "#ff8f88"], ["subtle", "#ffcfbf"], ["nuanced", "#ffe8e8"]]],
                    ["green", [["intense", "#8adf80"], ["subtle", "#b3fabf"], ["nuanced", "#e0f6e0"]]],
                    ["yellow", [["intense", "#f3d000"], ["subtle", "#fff576"], ["nuanced", "#f8f0d0"]]],
                    ["blue", [["intense", "#bfc9ff"], ["subtle", "#ccdfff"], ["nuanced", "#ecedff"]]],
                    ["magenta", [["intense", "#dfa0f0"], ["subtle", "#ffddff"], ["nuanced", "#f8e6f5"]]],
                    ["cyan", [["intense", "#a4d5f9"], ["subtle", "#bfefff"], ["nuanced", "#e0f2fa"]]],
                ],
            ),
            swatchRow(
                "Uncommon accents",
                "Extra named hues for finer distinctions.",
                [
                    ["rust", "#8a290f"],
                    ["gold", "#6c501c"],
                    ["olive", "#4c6000"],
                    ["slate", "#2f3f83"],
                    ["indigo", "#4a3a8a"],
                    ["maroon", "#731c52"],
                    ["pink", "#7b435c"],
                ],
            ),
        ],
        dark: [
            swatchRuns(
                "Foreground families",
                "Each hue in base, warmer, cooler, faint and intense forms, all tuned for pure black.",
                [
                    ["red", [["base", "#ff5f59"], ["warmer", "#ff6b55"], ["cooler", "#ff7f86"], ["faint", "#ff9580"], ["intense", "#ff5f5f"]]],
                    ["green", [["base", "#44bc44"], ["warmer", "#70b900"], ["cooler", "#00c06f"], ["faint", "#88ca9f"], ["intense", "#44df44"]]],
                    ["yellow", [["base", "#d0bc00"], ["warmer", "#fec43f"], ["cooler", "#dfaf7a"], ["faint", "#d2b580"], ["intense", "#efef00"]]],
                    ["blue", [["base", "#2fafff"], ["warmer", "#79a8ff"], ["cooler", "#00bcff"], ["faint", "#82b0ec"], ["intense", "#338fff"]]],
                    ["magenta", [["base", "#feacd0"], ["warmer", "#f78fe7"], ["cooler", "#b6a0ff"], ["faint", "#caa6df"], ["intense", "#ff66ff"]]],
                    ["cyan", [["base", "#00d3d0"], ["warmer", "#4ae2f0"], ["cooler", "#6ae4b9"], ["faint", "#9ac8e0"], ["intense", "#00eff0"]]],
                ],
            ),
            swatchRuns(
                "Background tiers",
                "Intense, subtle and nuanced backgrounds for highlights, diffs and selections.",
                [
                    ["red", [["intense", "#9d1f1f"], ["subtle", "#620f2a"], ["nuanced", "#3a0c14"]]],
                    ["green", [["intense", "#2f822f"], ["subtle", "#00422a"], ["nuanced", "#092f1f"]]],
                    ["yellow", [["intense", "#7a6100"], ["subtle", "#4a4000"], ["nuanced", "#381d0f"]]],
                    ["blue", [["intense", "#1640b0"], ["subtle", "#242679"], ["nuanced", "#12154a"]]],
                    ["magenta", [["intense", "#7030af"], ["subtle", "#552f5f"], ["nuanced", "#2f0c3f"]]],
                    ["cyan", [["intense", "#2266ae"], ["subtle", "#004065"], ["nuanced", "#042837"]]],
                ],
            ),
            swatchRow(
                "Uncommon accents",
                "Extra named hues for finer distinctions.",
                [
                    ["rust", "#db7b5f"],
                    ["gold", "#c0965b"],
                    ["olive", "#9cbd6f"],
                    ["slate", "#76afbf"],
                    ["indigo", "#9099d9"],
                    ["maroon", "#cf7fa7"],
                    ["pink", "#d09dc0"],
                ],
            ),
        ],
    },
};

export default palette;
