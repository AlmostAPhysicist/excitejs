// palette.ts
//
// The Hubble palette (from the Color Palettes example) as CSS custom
// properties, mirrored into an Observable so canvas code can use the colors.
//
//   theme ──► [apply] <html data-theme> ──► CSS variables ──► colors
//
// `theme` starts from the viewer's saved choice, else the system setting,
// and follows the system until the viewer picks one with the toggle.

import { Observable, Reactor } from "../../core/index";
import "../color-palettes/palettes/hubble.css";
import "./theme.css";

export type Theme = "light" | "dark";

export interface Colors {
    bg: string; bg2: string; ui: string; ui2: string; ui3: string;
    tx: string; tx2: string; tx3: string;
    red: string; orange: string; yellow: string; green: string; cyan: string; blue: string; purple: string; magenta: string;
}

// The palette's accent names, for content drawn in them (the scene's shapes)
export type Accent = "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple" | "magenta";

const STORAGE_KEY = "pan-zoom:theme";
const system_dark = matchMedia("(prefers-color-scheme: dark)");

function savedTheme(): Theme | null {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === "light" || v === "dark" ? v : null;
    } catch { return null; }
}

export const theme = Observable<Theme>(savedTheme() ?? (system_dark.matches ? "dark" : "light"));

function read(): Colors {
    const style = getComputedStyle(document.documentElement);
    const v = (name: string) => style.getPropertyValue(name).trim();
    return {
        bg: v("--bg"), bg2: v("--bg-2"), ui: v("--ui"), ui2: v("--ui-2"), ui3: v("--ui-3"),
        tx: v("--tx"), tx2: v("--tx-2"), tx3: v("--tx-3"),
        red: v("--red"), orange: v("--orange"), yellow: v("--yellow"), green: v("--green"),
        cyan: v("--cyan"), blue: v("--blue"), purple: v("--purple"), magenta: v("--magenta"),
    };
}

export const colors = Observable<Colors>(read());

// apply: the attribute switches the CSS variables, then the canvas colors follow
Reactor(() => {
    document.documentElement.dataset.theme = theme.value;
    colors.value = read();
}, { deps: [theme], initFn: true });

// The viewer's pick: saved, and cross-faded where the browser can
export function chooseTheme(next: Theme): void {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { }
    const doc = document as Document & { startViewTransition?: (fn: () => void) => unknown };
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (doc.startViewTransition && !reduce) doc.startViewTransition(() => { theme.value = next; });
    else theme.value = next;
}

// Until the viewer picks, follow the system
system_dark.addEventListener("change", () => {
    if (!savedTheme()) theme.value = system_dark.matches ? "dark" : "light";
});
