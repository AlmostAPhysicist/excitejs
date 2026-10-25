// catppuccin.ts
//
// Catppuccin by the Catppuccin org (2021), MIT. https://catppuccin.com/palette/
// Repo: https://github.com/catppuccin/palette
//
// All four flavours, 26 named colors each, from the official palette.json:
//   fetch: https://raw.githubusercontent.com/catppuccin/palette/main/palette.json

import { makeTheme, swatchRow, type PaletteFile } from "../palette_settings.ts";
import { okL } from "../layout/color.ts";

// palette.json's colors, in its own order
const NAMES = ["rosewater", "flamingo", "pink", "mauve", "red", "maroon", "peach", "yellow", "green", "teal", "sky", "sapphire", "blue", "lavender", "text", "subtext1", "subtext0", "overlay2", "overlay1", "overlay0", "surface2", "surface1", "surface0", "base", "mantle", "crust"];
const FLAVOURS: Record<string, string> = {
    latte: "dc8a78 dd7878 ea76cb 8839ef d20f39 e64553 fe640b df8e1d 40a02b 179299 04a5e5 209fb5 1e66f5 7287fd 4c4f69 5c5f77 6c6f85 7c7f93 8c8fa1 9ca0b0 acb0be bcc0cc ccd0da eff1f5 e6e9ef dce0e8",
    frappe: "f2d5cf eebebe f4b8e4 ca9ee6 e78284 ea999c ef9f76 e5c890 a6d189 81c8be 99d1db 85c1dc 8caaee babbf1 c6d0f5 b5bfe2 a5adce 949cbb 838ba7 737994 626880 51576d 414559 303446 292c3c 232634",
    macchiato: "f4dbd6 f0c6c6 f5bde6 c6a0f6 ed8796 ee99a0 f5a97f eed49f a6da95 8bd5ca 91d7e3 7dc4e4 8aadf4 b7bdf8 cad3f5 b8c0e0 a5adcb 939ab7 8087a2 6e738d 5b6078 494d64 363a4f 24273a 1e2030 181926",
    mocha: "f5e0dc f2cdcd f5c2e7 cba6f7 f38ba8 eba0ac fab387 f9e2af a6e3a1 94e2d5 89dceb 74c7ec 89b4fa b4befe cdd6f4 bac2de a6adc8 9399b2 7f849c 6c7086 585b70 45475a 313244 1e1e2e 181825 11111b",
};
const NEUTRALS = ["crust", "mantle", "base", "surface0", "surface1", "surface2", "overlay0", "overlay1", "overlay2", "subtext0", "subtext1", "text"];

// flavour → { name: hex }
function colors(flavour: string): Record<string, string> {
    const hexes = FLAVOURS[flavour].split(" ").map(x => "#" + x);
    return Object.fromEntries(NAMES.map((n, i) => [n, hexes[i]]));
}

function catppuccinTheme(flavour: string) {
    const c = colors(flavour);
    return makeTheme(
        [c.base, c.mantle, c.surface0, c.surface1, c.surface2, c.overlay1, c.subtext0, c.text],
        [c.red, c.peach, c.yellow, c.green, c.teal, c.blue, c.mauve, c.pink],
    );
}

function catppuccinExtras(flavour: string, label: string) {
    const c = colors(flavour);
    return [
        swatchRow("All 14 accents", `The full ${label} accent set, in Catppuccin's own order.`, NAMES.slice(0, 14).map(n => [n, c[n]])),
        swatchRow("Neutral ramp", `Every named neutral in ${label}, crust to text.`, NEUTRALS.map(n => [n, c[n]])),
    ];
}

// The named neutrals, lightest first
const neutralRamp = (flavour: string): [string, string][] =>
    NEUTRALS.map(n => [n, colors(flavour)[n]] as [string, string]).sort((a, b) => okL(b[1]) - okL(a[1]));

const palette: PaletteFile = {
    id: "catppuccin",
    name: "Catppuccin",
    description: "Soothing pastels in four flavours, with the widest app support.",
    by: "Catppuccin org",
    year: "2021",
    tier: "aes",
    method: "Pastel; 14 accents and a 12-step neutral ramp per flavour",
    why: "Soothing pastels with the widest app support of any scheme here. Each of its four flavours has 14 accents and a named neutral ramp (crust, mantle, base, surfaces, overlays, subtexts, text). Latte is the light flavour; Frappé, Macchiato and Mocha get progressively darker.",
    variants: "Latte, Frappé, Macchiato, Mocha.",
    url: "https://catppuccin.com/palette/",
    license: "MIT",
    names: { light: "Latte", dark: "Mocha" },
    acc_note: { light: "accents", dark: "accents" },
    map: "base → bg, mantle → bg-2, surface0–2 → ui slots, overlay1 → tx-3, subtext0 → tx-2. Accents: peach → orange, teal → cyan, mauve → purple, pink → magenta. The other six accents are listed under each flavour.",
    light: catppuccinTheme("latte"),
    dark: catppuccinTheme("mocha"),
    flavors: [
        { key: "frappe", name: "Frappé", kind: "dark", m: catppuccinTheme("frappe") },
        { key: "macchiato", name: "Macchiato", kind: "dark", m: catppuccinTheme("macchiato") },
    ],
    extra: {
        light: catppuccinExtras("latte", "Latte"),
        dark: catppuccinExtras("mocha", "Mocha"),
        frappe: catppuccinExtras("frappe", "Frappé"),
        macchiato: catppuccinExtras("macchiato", "Macchiato"),
    },
    neutrals: { light: neutralRamp("latte"), dark: neutralRamp("mocha"), frappe: neutralRamp("frappe"), macchiato: neutralRamp("macchiato") },
    remix_labels: { bg: "base", bg2: "mantle", ui: "surface0", ui2: "surface1", ui3: "surface2", tx3: "overlay1", tx2: "subtext0", tx: "text", or: "peach", cy: "teal", pu: "mauve", ma: "pink" },
};

export default palette;
