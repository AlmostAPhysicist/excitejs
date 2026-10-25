// state.ts
//
// App-wide state as Observables, plus the small helpers every page shares.
// Anything that outlives one page render lives here (and some of it in
// localStorage). Pages create their own Reactors on top of these and dispose
// them when the route changes.

import { Observable, Reactor } from "../../../core/index";
import { ACCENT_NAMES, TIERS, SLOTS, ACCENTS, PRESETS, type Palette, type ThemeColors } from "../palette_settings.ts";

function load(key: string): any {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { return null; }
}
function store(key: string, value: unknown): void {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { }
}

//// Page shell (built once in main.ts)

export const bar = document.createElement("div");
bar.className = "wrap";
bar.id = "bar";
export const app = document.createElement("div");
app.id = "app";
export const toast = document.createElement("div");
toast.className = "toast";
toast.id = "toast";
toast.setAttribute("role", "status");
toast.setAttribute("aria-live", "polite");

//// Routing: "" is home, "create" the editor, anything else a palette id

export const route = Observable(location.hash.slice(1));

export function go(id: string): void {
    try { history.pushState(null, "", id ? "#" + id : location.pathname + location.search); } catch (_) { }
    route.value = id;
}

// The palette whose accent labels and keyboard shortcuts apply right now
// (a built-in palette, the custom one in the editor, or none on home)
export const page = { palette: null as Palette | null };

//// Palette page view

export type View = "light" | "split" | "dark";

const saved_view = load("cp-view");
export const view = Observable<View>(saved_view ? saved_view.view || "split" : "split");
export const all_flavours = Observable<boolean>(saved_view ? !!saved_view.allFl : false);
export const focus_key = Observable<string | null>(null); // one theme shown alone
export const cvd = Observable("none");                    // simulated color vision
Reactor(() => store("cp-view", { view: view.value, allFl: all_flavours.value }), { deps: [view, all_flavours] });

// Shade row type per palette theme ("ramp" | "tints" | "tones" | "shades")
export const shade_modes: Record<string, string> = {};

//// Ranking weights

const saved_weights = load("cp-weights");
export const weights = Observable<Record<string, number>>({ ...PRESETS["Balanced"], ...(saved_weights || {}) });
export const preset = Observable<string | null>(saved_weights ? null : "Balanced");
Reactor(() => store("cp-weights", weights.value), { deps: [weights] });

export const glance_sort = Observable({ key: "score", dir: -1 });

//// Theory color picker

export interface Pick {
    L: number;  // lightness
    C: number;  // chroma actually shown (Cw limited by the screen)
    Cw: number; // chroma asked for
    H: number;  // hue
    a: number;  // alpha
}

const saved_pick = load("cp-pick");
export const pick = Observable<Pick>({ L: 0.62, C: 0.19, Cw: 0.19, H: 262, a: 1, ...(saved_pick && isFinite(saved_pick.L) ? saved_pick : {}) });
Reactor(() => store("cp-pick", pick.value), { deps: [pick] });
export const overlay_key = Observable("catppuccin:dark");

//// Shared helpers

// Accent label: the custom palette's own names when it has them
export const accentName = (k: string): string => (page.palette && page.palette.labels && page.palette.labels[k]) || ACCENT_NAMES[k];

let toast_timer: number | undefined;
export function flash(text: string): void {
    toast.textContent = text;
    toast.classList.add("on");
    clearTimeout(toast_timer);
    toast_timer = setTimeout(() => toast.classList.remove("on"), 1400);
}

export const esc = (s: unknown): string =>
    String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export const reducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

export const tierChip = (p: Palette): string => `<span class="tier ${TIERS[p.tier][1]}">${TIERS[p.tier][0]}</span>`;

export const themeStrip = (m: ThemeColors): string =>
    `<div class="tstrip">${SLOTS.filter(k => m[k]).map(k => `<i class="b" style="background:${m[k]}"></i>`).join("")}${ACCENTS.map(k => m[k] ? `<i style="background:${m[k]}"></i>` : `<i class="hatch"></i>`).join("")}</div>`;

export const selectHTML = (id: string, opts: string[][], value: string, label: string): string =>
    `<span class="select"><select id="${id}" aria-label="${label}">${opts.map(([v, t]) => `<option value="${v}" ${v === value ? "selected" : ""}>${t}</option>`).join("")}</select></span>`;
