// flexoki.ts
//
// Flexoki by Steph Ango (2023), MIT. https://stephango.com/flexoki
// Repo: https://github.com/kepano/flexoki
//
// Every value here (base, accents and all thirteen 50–950 ramps) is listed in
// the palette tables of the repo README:
//   fetch: https://raw.githubusercontent.com/kepano/flexoki/main/README.md

import { makeTheme, type PaletteFile } from "../palette_settings.ts";

// Official 13-step ramps, 50–950, for every accent and the base
const STEPS = [50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950];
const RAMPS: Record<string, string[]> = {
    re: ["#FFE1D5", "#FFCABB", "#FDB2A2", "#F89A8A", "#E8705F", "#D14D41", "#C03E35", "#AF3029", "#942822", "#6C201C", "#551B18", "#3E1715", "#261312"],
    or: ["#FFE7CE", "#FED3AF", "#FCC192", "#F9AE77", "#EC8B49", "#DA702C", "#CB6120", "#BC5215", "#9D4310", "#71320D", "#59290D", "#40200D", "#27180E"],
    ye: ["#FAEEC6", "#F6E2A0", "#F1D67E", "#ECCB60", "#DFB431", "#D0A215", "#BE9207", "#AD8301", "#8E6B01", "#664D01", "#503D02", "#3A2D04", "#241E08"],
    gr: ["#EDEECF", "#DDE2B2", "#CDD597", "#BEC97E", "#A0AF54", "#879A39", "#768D21", "#66800B", "#536907", "#3D4C07", "#313D07", "#252D09", "#1A1E0C"],
    cy: ["#DDF1E4", "#BFE8D9", "#A2DECE", "#87D3C3", "#5ABDAC", "#3AA99F", "#2F968D", "#24837B", "#1C6C66", "#164F4A", "#143F3C", "#122F2C", "#101F1D"],
    bl: ["#E1ECEB", "#C6DDE8", "#ABCFE2", "#92BFDB", "#66A0C8", "#4385BE", "#3171B2", "#205EA6", "#1A4F8C", "#163B66", "#133051", "#12253B", "#101A24"],
    pu: ["#F0EAEC", "#E2D9E9", "#D3CAE6", "#C4B9E0", "#A699D0", "#8B7EC8", "#735EB5", "#5E409D", "#4F3685", "#3C2A62", "#31234E", "#261C39", "#1A1623"],
    ma: ["#FEE4E5", "#FCCFDA", "#F9B9CF", "#F4A4C2", "#E47DA8", "#CE5D97", "#B74583", "#A02F6F", "#87285E", "#641F46", "#4F1B39", "#39172B", "#24131D"],
    base: ["#F2F0E5", "#E6E4D9", "#DAD8CE", "#CECDC3", "#B7B5AC", "#9F9D96", "#878580", "#6F6E69", "#575653", "#403E3C", "#343331", "#282726", "#1C1B1A"],
};

const palette: PaletteFile = {
    id: "flexoki",
    name: "Flexoki",
    description: "Inky, paper-warm colors for prose and code, derived in Oklab.",
    by: "Steph Ango",
    year: "2023",
    tier: "model",
    method: "Oklab-derived lightness, modeled on ink on paper",
    why: "An inky color scheme for prose and code, inspired by analog inks and warm shades of paper. Colors are derived in Oklab so lightness relationships hold at both ends of the scale, and intensity ramps up exponentially as colors get lighter or darker to imitate how pigment stays vibrant when diluted.",
    variants: "One light, one dark. Every accent has 13 official steps (50–950).",
    url: "https://stephango.com/flexoki",
    license: "MIT",
    names: { light: "Light", dark: "Dark" },
    acc_note: { light: "600 values", dark: "400 values" },
    map: "Slot names match Flexoki's own variables (bg, bg-2, ui, ui-2, ui-3, tx-3, tx-2, tx).",
    light: makeTheme(
        ["#FFFCF0", "#F2F0E5", "#E6E4D9", "#DAD8CE", "#CECDC3", "#B7B5AC", "#6F6E69", "#100F0F"],
        ["#AF3029", "#BC5215", "#AD8301", "#66800B", "#24837B", "#205EA6", "#5E409D", "#A02F6F"],
    ),
    dark: makeTheme(
        ["#100F0F", "#1C1B1A", "#282726", "#343331", "#403E3C", "#575653", "#878580", "#CECDC3"],
        ["#D14D41", "#DA702C", "#D0A215", "#879A39", "#3AA99F", "#4385BE", "#8B7EC8", "#CE5D97"],
    ),
    flavors: [],
    extra: {},
    ramps: { steps: STEPS, base_step: { light: 600, dark: 400 }, colors: RAMPS },
};

export default palette;
