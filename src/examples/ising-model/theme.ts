// theme.ts
//
// The Hubble palette lives in CSS custom properties (imported from the
// Color Palettes example). Canvases can't use var(--x), so this mirrors the
// properties into one Observable and refreshes it when the system switches
// between light and dark. Anything that draws reads `colors.value`, so it
// redraws on a theme change for free.

import { Observable } from "../../core/index";
import "../color-palettes/palettes/hubble.css";

export interface Colors {
    bg: string; bg2: string; ui: string; ui2: string; ui3: string;
    tx: string; tx2: string; tx3: string;
    red: string; orange: string; yellow: string; green: string; cyan: string; blue: string; purple: string;
    up: string;   // spin up: the ink
    down: string; // spin down: the paper
}

function read(): Colors {
    const style = getComputedStyle(document.documentElement);
    const v = (name: string) => style.getPropertyValue(name).trim();
    return {
        bg: v("--bg"), bg2: v("--bg-2"), ui: v("--ui"), ui2: v("--ui-2"), ui3: v("--ui-3"),
        tx: v("--tx"), tx2: v("--tx-2"), tx3: v("--tx-3"),
        red: v("--red"), orange: v("--orange"), yellow: v("--yellow"), green: v("--green"),
        cyan: v("--cyan"), blue: v("--blue"), purple: v("--purple"),
        up: v("--tx"), down: v("--bg"),
    };
}

export const colors = Observable<Colors>(read());

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => colors.value = read());

// "#rrggbb" → a little-endian RGBA word for ImageData
export function hexToU32(hex: string): number {
    const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (255 << 24 | b << 16 | g << 8 | r) >>> 0;
}

// Temperature as a color, by phase: Hubble blue below the critical
// temperature (ordered), Hubble orange above it (disordered). The two are
// complementary, so blending them would pass through grey; switching at
// T_c says something true instead. The thermometer does the same in CSS.
export function phaseColor(c: Colors, T: number, t_critical: number): string {
    return T < t_critical ? c.blue : c.orange;
}
