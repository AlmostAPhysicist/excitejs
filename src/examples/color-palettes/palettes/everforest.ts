// everforest.ts
//
// Everforest by sainnhe (2019), MIT.
// Repo: https://github.com/sainnhe/everforest
//
// Values from the palette definitions in autoload/everforest.vim (backgrounds
// per contrast level, foregrounds per mode) and the tables in palette.md:
//   fetch: https://raw.githubusercontent.com/sainnhe/everforest/master/autoload/everforest.vim
//   fetch: https://raw.githubusercontent.com/sainnhe/everforest/master/palette.md

import { makeTheme, swatchRow, type PaletteFile } from "../palette_settings.ts";

const palette: PaletteFile = {
    id: "everforest",
    name: "Everforest",
    description: "Muted forest greens and warm text, in three contrast levels.",
    by: "sainnhe",
    year: "2019",
    tier: "comfort",
    method: "Low-saturation greens; hard, medium and soft background contrast",
    why: "A green-based scheme its author describes as comfortable and pleasant, with muted forest tones and warm text that avoid glare. Each mode offers three background contrast levels so you can match it to your room's lighting. The medium level is the default.",
    variants: "Dark and light, each in hard, medium and soft. Tinted backgrounds per hue for diffs and diagnostics.",
    url: "https://github.com/sainnhe/everforest",
    license: "MIT",
    names: { light: "Light Medium", dark: "Dark Medium" },
    acc_note: { light: "accents", dark: "accents" },
    map: "Everforest's 'aqua' fills cyan. Its 'purple' is a pink-purple, and it has no separate magenta. grey0/grey2 are used as tx-3/tx-2. The background ramp maps bg0 → bg, bg1 → bg-2, bg2–bg4 → ui slots.",
    light: makeTheme(
        ["#FDF6E3", "#F4F0D9", "#EFEBD4", "#E6E2CC", "#E0DCC7", "#A6B0A0", "#829181", "#5C6A72"],
        ["#F85552", "#F57D26", "#DFA000", "#8DA101", "#35A77C", "#3A94C5", "#DF69BA", null],
    ),
    dark: makeTheme(
        ["#2D353B", "#343F44", "#3D484D", "#475258", "#4F585E", "#7A8478", "#9DA9A0", "#D3C6AA"],
        ["#E67E80", "#E69875", "#DBBC7F", "#A7C080", "#83C092", "#7FBBB3", "#D699B6", null],
    ),
    flavors: [
        {
            key: "lhard",
            name: "Light Hard",
            kind: "light",
            m: makeTheme(
                ["#FFFBEF", "#F8F5E4", "#F2EFDF", "#EDEADA", "#E8E5D5", "#A6B0A0", "#829181", "#5C6A72"],
                ["#F85552", "#F57D26", "#DFA000", "#8DA101", "#35A77C", "#3A94C5", "#DF69BA", null],
            ),
        },
        {
            key: "lsoft",
            name: "Light Soft",
            kind: "light",
            m: makeTheme(
                ["#F3EAD3", "#EAE4CA", "#E5DFC5", "#DDD8BE", "#D8D3BA", "#A6B0A0", "#829181", "#5C6A72"],
                ["#F85552", "#F57D26", "#DFA000", "#8DA101", "#35A77C", "#3A94C5", "#DF69BA", null],
            ),
        },
        {
            key: "dsoft",
            name: "Dark Soft",
            kind: "dark",
            m: makeTheme(
                ["#333C43", "#3A464C", "#434F55", "#4D5960", "#555F66", "#7A8478", "#9DA9A0", "#D3C6AA"],
                ["#E67E80", "#E69875", "#DBBC7F", "#A7C080", "#83C092", "#7FBBB3", "#D699B6", null],
            ),
        },
        {
            key: "dhard",
            name: "Dark Hard",
            kind: "dark",
            after: true,
            m: makeTheme(
                ["#272E33", "#2E383C", "#374145", "#414B50", "#495156", "#7A8478", "#9DA9A0", "#D3C6AA"],
                ["#E67E80", "#E69875", "#DBBC7F", "#A7C080", "#83C092", "#7FBBB3", "#D699B6", null],
            ),
        },
    ],
    extra: {
        light: [
            swatchRow(
                "Tinted backgrounds",
                "Used behind selections, errors, warnings and diff lines.",
                [["visual", "#EAEDC8"], ["red", "#FDE3DA"], ["yellow", "#FAEDCD"], ["green", "#F0F1D2"], ["blue", "#E9F0E9"], ["purple", "#FAE8E2"]],
            ),
            swatchRow(
                "Greys and status line",
                "",
                [
                    ["grey0", "#A6B0A0"],
                    ["grey1", "#939F91"],
                    ["grey2", "#829181"],
                    ["statusline1", "#93B259"],
                    ["statusline2", "#708089"],
                    ["statusline3", "#E66868"],
                ],
            ),
        ],
        dark: [
            swatchRow(
                "Tinted backgrounds",
                "Used behind selections, errors, warnings and diff lines.",
                [["visual", "#543A48"], ["red", "#514045"], ["yellow", "#4D4C43"], ["green", "#425047"], ["blue", "#3A515D"], ["purple", "#4A444E"]],
            ),
            swatchRow("Greys", "", [["grey0", "#7A8478"], ["grey1", "#859289"], ["grey2", "#9DA9A0"], ["bg_dim", "#232A2E"], ["bg5", "#56635f"]]),
        ],
    },
    remix_labels: { cy: "aqua" },
};

export default palette;
