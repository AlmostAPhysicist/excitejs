// alabaster.ts
//
// Alabaster by Nikita Prokopov (tonsky) (2018), MIT.
// Repo: https://github.com/tonsky/sublime-scheme-alabaster
//
// Values from the two Sublime Text schemes. Light's punctuation gray #777777
// is from the VS Code port (tonsky/vscode-theme-alabaster); dark's "mistakes"
// red is written #c33 in the dark scheme.
//   fetch: https://raw.githubusercontent.com/tonsky/sublime-scheme-alabaster/master/Alabaster.sublime-color-scheme
//   fetch: https://raw.githubusercontent.com/tonsky/sublime-scheme-alabaster/master/Alabaster%20Dark.sublime-color-scheme
//   fetch: https://raw.githubusercontent.com/tonsky/vscode-theme-alabaster/master/theme/alabaster-color-theme.json
//   not upstream: #1a2223 (dark bg-2: the scheme's #ffffff10 line highlight, approximated on its background)

import { makeTheme, swatchRow, type PaletteFile } from "../palette_settings.ts";

const palette: PaletteFile = {
    id: "alabaster",
    name: "Alabaster",
    description: "Minimal highlighting: color only where it carries meaning.",
    by: "Nikita Prokopov (tonsky)",
    year: "2018",
    tier: "philo",
    method: "Minimal highlighting: four classes of code get color, nothing else",
    why: "A deliberate counterpoint to the rest of this list. Alabaster colors only strings, constants, comments and global definitions. Keywords like if and else stay plain, comments are full-contrast instead of dimmed, and there are no bold or italic tricks. The argument: if everything is colored, color stops meaning anything.",
    variants: "Light and Dark, plus BG (colored backgrounds instead of text) and Mono variants.",
    url: "https://github.com/tonsky/sublime-scheme-alabaster",
    license: "MIT",
    names: { light: "Light", dark: "Dark" },
    acc_note: { light: "4 roles + find", dark: "4 roles + cursor" },
    map: "Light: comments red #AA3731, strings green, constants magenta (shown as purple), definitions blue; orange #FFBC5D is the find-highlight background and #007ACC the cursor (shown as cyan). Dark: comments are yellow #DFDF8E, the cursor is orange #CD974B, and red #CC3333 marks mistakes. Most slots are intentionally empty.",
    light: makeTheme(
        ["#F7F7F7", "#f0f0f0", "#E0E0E0", "#BFDBFE", null, "#777777", null, "#000000"],
        ["#AA3731", "#FFBC5D", null, "#448C27", "#007ACC", "#325CC0", "#7A3E9D", null],
    ),
    dark: makeTheme(
        ["#0E1415", "#1a2223", "#293334", null, null, "#708B8D", null, "#CECECE"],
        ["#CC3333", "#CD974B", "#DFDF8E", "#95CB82", null, "#71ADE7", "#CC8BC9", null],
    ),
    flavors: [],
    extra: {
        light: [
            swatchRow(
                "What gets color",
                "The four highlighted classes in the light scheme.",
                [
                    ["comments", "#AA3731"],
                    ["strings", "#448C27"],
                    ["constants", "#7A3E9D"],
                    ["definitions", "#325CC0"],
                    ["punctuation", "#777777"],
                    ["selection", "#BFDBFE"],
                    ["find", "#FFBC5D"],
                    ["cursor", "#007ACC"],
                ],
            ),
        ],
        dark: [
            swatchRow(
                "What gets color",
                "The four highlighted classes in the dark scheme.",
                [
                    ["comments", "#DFDF8E"],
                    ["strings", "#95CB82"],
                    ["constants", "#CC8BC9"],
                    ["definitions", "#71ADE7"],
                    ["punctuation", "#708B8D"],
                    ["selection", "#293334"],
                    ["cursor", "#CD974B"],
                    ["mistakes", "#CC3333"],
                ],
            ),
        ],
    },
};

export default palette;
