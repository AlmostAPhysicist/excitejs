// kanagawa.ts
//
// Kanagawa by Tommaso Laurenzi (rebelot) (2021), MIT.
// Repo: https://github.com/rebelot/kanagawa.nvim
//
// Values from the named palette (waveRed, lotusBlue4, dragonAsh, …) in
// lua/kanagawa/colors.lua:
//   fetch: https://raw.githubusercontent.com/rebelot/kanagawa.nvim/master/lua/kanagawa/colors.lua

import { makeTheme, swatchRow, swatchRuns, type PaletteFile } from "../palette_settings.ts";

const palette: PaletteFile = {
    id: "kanagawa",
    name: "Kanagawa",
    description: "Dim, desaturated tones from Hokusai's Great Wave.",
    by: "Tommaso Laurenzi (rebelot)",
    year: "2021",
    tier: "comfort",
    method: "Dim, desaturated tones from Hokusai's Great Wave",
    why: "Colors drawn from Katsushika Hokusai's woodblock print, kept dim and desaturated for long sessions. Wave is the default dark, Dragon an even quieter dark, and Lotus a warm parchment light mode. The palette names many second and third shades per hue.",
    variants: "Wave, Dragon (dark) and Lotus (light).",
    url: "https: //github.com/rebelot/kanagawa.nvim",
    license: "MIT",
    names: { light: "Lotus", dark: "Wave" },
    acc_note: { light: "lotus hues", dark: "wave hues" },
    map: "Wave: waveRed, surimiOrange, carpYellow, springGreen, waveAqua2, crystalBlue, oniViolet, sakuraPink. Lotus: lotusRed, lotusOrange, lotusYellow, lotusGreen, lotusAqua, lotusBlue4, lotusViolet4, lotusPink. Dragon: dragonRed, dragonOrange, dragonYellow, dragonGreen, dragonAqua, dragonBlue2, dragonViolet, dragonPink.",
    light: makeTheme(
        ["#f2ecbc", "#e7dba0", "#e5ddb0", "#dcd5ac", "#d5cea3", "#8a8980", "#716e61", "#545464"],
        ["#c84053", "#cc6d00", "#77713f", "#6f894e", "#597b75", "#4d699b", "#624c83", "#b35b79"],
    ),
    dark: makeTheme(
        ["#1F1F28", "#16161D", "#2A2A37", "#363646", "#54546D", "#727169", "#C8C093", "#DCD7BA"],
        ["#E46876", "#FFA066", "#E6C384", "#98BB6C", "#7AA89F", "#7E9CD8", "#957FB8", "#D27E99"],
    ),
    flavors: [
        {
            key: "dragon",
            name: "Dragon",
            kind: "dark",
            after: true,
            m: makeTheme(
                ["#181616", "#12120f", "#282727", "#393836", "#625e5a", "#737c73", "#a6a69c", "#c5c9c5"],
                ["#c4746e", "#b6927b", "#c4b28a", "#87a987", "#8ea4a2", "#8ba4b0", "#8992a7", "#a292a3"],
            ),
        },
    ],
    extra: {
        light: [
            swatchRuns(
                "Lotus shade families",
                "Second, third and fourth shades named in the palette.",
                [
                    ["red", [["lotusRed", "#c84053"], ["red2", "#d7474b"], ["red3", "#e82424"], ["red4", "#d9a594"]]],
                    ["orange", [["lotusOrange", "#cc6d00"], ["orange2", "#e98a00"]]],
                    ["yellow", [["lotusYellow", "#77713f"], ["yellow2", "#836f4a"], ["yellow3", "#de9800"], ["yellow4", "#f9d791"]]],
                    ["green", [["lotusGreen", "#6f894e"], ["green2", "#6e915f"], ["green3", "#b7d0ae"]]],
                    [
                        "aqua/teal",
                        [["lotusAqua", "#597b75"], ["aqua2", "#5e857a"], ["teal1", "#4e8ca2"], ["teal2", "#6693bf"], ["teal3", "#5a7785"], ["cyan", "#d7e3d8"]],
                    ],
                    ["blue", [["blue1", "#c7d7e0"], ["blue2", "#b5cbd2"], ["blue3", "#9fb5c9"], ["blue4", "#4d699b"], ["blue5", "#5d57a3"]]],
                    ["violet", [["violet1", "#a09cac"], ["violet2", "#766b90"], ["violet3", "#c9cbd1"], ["violet4", "#624c83"]]],
                ],
            ),
        ],
        dark: [
            swatchRuns(
                "Wave extras",
                "Diagnostic, diff and secondary hues.",
                [
                    ["reds", [["autumnRed", "#C34043"], ["samuraiRed", "#E82424"], ["peachRed", "#FF5D62"], ["waveRed", "#E46876"]]],
                    ["yellows", [["roninYellow", "#FF9E3B"], ["autumnYellow", "#DCA561"], ["boatYellow1", "#938056"], ["boatYellow2", "#C0A36E"]]],
                    ["greens", [["autumnGreen", "#76946A"], ["waveAqua1", "#6A9589"], ["waveAqua2", "#7AA89F"]]],
                    [
                        "blues",
                        [["dragonBlue", "#658594"], ["springBlue", "#7FB4CA"], ["lightBlue", "#A3D4D5"], ["waveBlue1", "#223249"], ["waveBlue2", "#2D4F67"]],
                    ],
                    ["violets", [["springViolet1", "#938AA9"], ["springViolet2", "#9CABCA"], ["oniViolet2", "#b8b4d0"]]],
                    ["diff bg", [["winterGreen", "#2B3328"], ["winterYellow", "#49443C"], ["winterRed", "#43242B"], ["winterBlue", "#252535"]]],
                ],
            ),
        ],
        dragon: [
            swatchRow(
                "Dragon extras",
                "Second greens and oranges, plus the full black ramp.",
                [
                    ["dragonGreen2", "#8a9a7b"],
                    ["dragonOrange2", "#b98d7b"],
                    ["dragonTeal", "#949fb5"],
                    ["dragonAsh", "#737c73"],
                    ["dragonGray2", "#9e9b93"],
                    ["dragonGray3", "#7a8382"],
                    ["black0", "#0d0c0c"],
                    ["black2", "#1D1C19"],
                    ["black4", "#282727"],
                    ["black5", "#393836"],
                    ["black6", "#625e5a"],
                ],
            ),
        ],
    },
};

export default palette;
