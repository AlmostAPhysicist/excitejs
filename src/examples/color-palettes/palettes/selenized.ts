// selenized.ts
//
// Selenized by Jan Warchoł (2017–2020), MIT.
// Repo: https://github.com/jan-warchol/selenized
//
// Values (all four variants, normal and bright accents) from the RGB columns
// of the-values.md, which converts the canonical CIE L*a*b* definitions:
//   fetch: https://raw.githubusercontent.com/jan-warchol/selenized/master/the-values.md

import { makeTheme, swatchRow, accentSwatches, type PaletteFile } from "../palette_settings.ts";

const palette: PaletteFile = {
    id: "selenized",
    name: "Selenized",
    description: "Solarized redesigned for higher contrast and clearer accents.",
    by: "Jan Warchoł",
    year: "2017–2020",
    tier: "model",
    method: "CIE L*a*b* values are canonical; RGB is converted from them",
    why: "A redesign of Solarized after four years of testing and fine-tuning lightness in CIE Lab. It fixes Solarized's two usual complaints, low text contrast and accents that are hard to tell apart, and improves compliance with WCAG. Each variant has normal and bright accents.",
    variants: "Dark, black, light and white. Each has 8 accents plus 8 bright accents.",
    url: "https://github.com/jan-warchol/selenized",
    license: "MIT",
    names: { light: "Light", dark: "Dark" },
    acc_note: { light: "normal accents", dark: "normal accents" },
    map: "Selenized's violet fills the purple slot. bg_2 is used as ui-3; dim_0 as tx-3; fg_0 as tx-2; fg_1 as tx.",
    light: makeTheme(
        ["#fbf3db", "#ece3cc", null, null, "#d5cdb6", "#909995", "#53676d", "#3a4d53"],
        ["#d2212d", "#c25d1e", "#ad8900", "#489100", "#009c8f", "#0072d4", "#8762c6", "#ca4898"],
    ),
    dark: makeTheme(
        ["#103c48", "#184956", null, null, "#2d5b69", "#72898f", "#adbcbc", "#cad8d9"],
        ["#fa5750", "#ed8649", "#dbb32d", "#75b938", "#41c7b9", "#4695f7", "#af88eb", "#f275be"],
    ),
    flavors: [
        {
            key: "white",
            name: "White",
            kind: "light",
            m: makeTheme(
                ["#ffffff", "#ebebeb", null, null, "#cdcdcd", "#878787", "#474747", "#282828"],
                ["#d6000c", "#d04a00", "#c49700", "#1d9700", "#00ad9c", "#0064e4", "#7f51d6", "#dd0f9d"],
            ),
        },
        {
            key: "black",
            name: "Black",
            kind: "dark",
            after: true,
            m: makeTheme(
                ["#181818", "#252525", null, null, "#3b3b3b", "#777777", "#b9b9b9", "#dedede"],
                ["#ed4a46", "#e67f43", "#dbb32d", "#70b433", "#3fc5b7", "#368aeb", "#a580e2", "#eb6eb7"],
            ),
        },
    ],
    extra: {
        light: [
            swatchRow(
                "Bright accents",
                "Official br_ values, a step darker for emphasis on light backgrounds.",
                accentSwatches(["#cc1729", "#bc5819", "#a78300", "#428b00", "#00978a", "#006dce", "#825dc0", "#c44392"]),
            ),
        ],
        dark: [
            swatchRow(
                "Bright accents",
                "Official br_ values, a step lighter for emphasis on dark backgrounds.",
                accentSwatches(["#ff665c", "#fd9456", "#ebc13d", "#84c747", "#53d6c7", "#58a3ff", "#bd96fa", "#ff84cd"]),
            ),
        ],
        white: [swatchRow("Bright accents", "", accentSwatches(["#bf0000", "#ba3700", "#af8500", "#008400", "#009a8a", "#0054cf", "#6b40c3", "#c7008b"]))],
        black: [swatchRow("Bright accents", "", accentSwatches(["#ff5e56", "#fa9153", "#efc541", "#83c746", "#56d8c9", "#4f9cfe", "#b891f5", "#ff81ca"]))],
    },
    remix_labels: { pu: "violet" },
};

export default palette;
