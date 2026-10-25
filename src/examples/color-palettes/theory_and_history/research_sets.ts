// research_sets.ts
//
// Accent sets from vision science that stay distinguishable for common
// color-vision deficiencies. Not editor themes, so they are not in palettes/.

import type { Swatch } from "../palette_settings.ts";

export interface ResearchSet { name: string; sub: string; url: string; text: string; cols: Swatch[] }

export const RESEARCH_SETS: ResearchSet[] = [
    {
        name: "Okabe–Ito", sub: "Masataka Okabe & Kei Ito, 2002", url: "https://jfly.uni-koeln.de/color/",
        text: "The standard color-universal-design set. Eight colors that stay distinct under protanopia, deuteranopia and tritanopia; recommended by several scientific journals.",
        cols: [["black", "#000000"], ["orange", "#E69F00"], ["sky blue", "#56B4E9"], ["bluish green", "#009E73"], ["yellow", "#F0E442"], ["blue", "#0072B2"], ["vermillion", "#D55E00"], ["reddish purple", "#CC79A7"]],
    },
    {
        name: "Paul Tol · Bright", sub: "Paul Tol, SRON", url: "https://personal.sron.nl/~pault/",
        text: "From a technical note on colors for scientific figures, tested for color-blind distinctness and grayscale printing. Tol also publishes muted, vibrant and light sets.",
        cols: [["blue", "#4477AA"], ["cyan", "#66CCEE"], ["green", "#228833"], ["yellow", "#CCBB44"], ["red", "#EE6677"], ["purple", "#AA3377"], ["grey", "#BBBBBB"]],
    },
];
