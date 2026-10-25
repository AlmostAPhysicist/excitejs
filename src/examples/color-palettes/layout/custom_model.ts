// custom_model.ts
//
// The palette being built in the editor: its state (an Observable, saved to
// localStorage), undo history, and the color logic behind the editor's
// suggestions: fitting a lightness to a target contrast, mapping a color to
// the other theme, generating a whole theme, rebuilding the base ramp.
//
// Edits mutate `custom.value` in place; the editor decides what to redraw.

import { Observable } from "../../../core/index";
import { ACCENTS, ACCENT_NAMES, SLOTS, SLOT_NAMES, type Palette, type ThemeColors } from "../palette_settings.ts";
import { PALETTES } from "./palette_list.ts";
import { clamp, contrast, lch, oklch } from "./color.ts";

export type Side = "light" | "dark";

export interface Extra { name: string; light: string | null; dark: string | null }

export interface Custom {
    name: string;
    by: string;
    description: string;            // one line, written at the top of every export
    names: { light: string; dark: string };
    labels: Record<string, string>; // slot/accent → the user's own name ("" = default)
    light: ThemeColors;
    dark: ThemeColors;
    extras: Extra[];
}

// Standard hue per accent, for empty slots and the starter palette
export const HUE_STD: Record<string, number> = { re: 27, or: 55, ye: 95, gr: 142, cy: 195, bl: 258, pu: 300, ma: 345 };
// Where each base slot sits between background (0) and text (1)
const BASE_T = [0, .05, .09, .13, .17, .3, .55, 1];
export const SLOT_ROLES_LONG: Record<string, string> = { bg: "page background", bg2: "panels and secondary background", ui: "borders", ui2: "hovered borders", ui3: "active borders", tx3: "faint text", tx2: "muted text", tx: "body text" };
//// State

export const custom = Observable<Custom>(null as unknown as Custom);
export const gen_method = Observable<"contrast" | "mirror">("contrast"); // how accents move to the other theme
export const gen_bg_l = Observable(.19);                                  // generated dark background lightness

export const blankLabels = (): Record<string, string> => Object.fromEntries([...SLOTS, ...ACCENTS].map(k => [k, ""]));
export const isAccent = (s: string) => ACCENTS.includes(s);
export const isExtra = (s: string) => s.startsWith("x"); // extras are "x0", "x1", …

const defaultName = (s: string) => isExtra(s) ? (custom.value.extras[+s.slice(1)] || {} as Extra).name || "extra" : SLOTS.includes(s) ? SLOT_NAMES[s] : ACCENT_NAMES[s];
export const slotLabel = (s: string) => isExtra(s) ? defaultName(s) : (custom.value.labels[s] || defaultName(s));

export function getVal(mode: Side, s: string): string | null {
    return isExtra(s) ? (custom.value.extras[+s.slice(1)] || {} as Extra)[mode] || null : custom.value[mode][s] || null;
}
export function setVal(mode: Side, s: string, v: string | null): void {
    if (isExtra(s)) {
        const e = custom.value.extras[+s.slice(1)];
        if (e) e[mode] = v;
    } else custom.value[mode][s] = v;
}

//// Undo history: edits within 700 ms of each other share one entry

const history: string[] = [];
let last_push = 0;

export function pushHistory(force = false): void {
    const now = Date.now();
    if (force || now - last_push > 700) {
        history.push(JSON.stringify(custom.value));
        if (history.length > 80) history.shift();
    }
    last_push = force ? 0 : now;
}

export function undo(): boolean {
    const s = history.pop();
    if (!s) return false;
    custom.value = JSON.parse(s);
    last_push = 0;
    return true;
}

export function saveCustom(): void {
    try { localStorage.setItem("cp-custom", JSON.stringify(custom.value)); } catch (_) { }
}

export function loadCustom(): void {
    try {
        const j = JSON.parse(localStorage.getItem("cp-custom") || "null");
        if (j && j.light && j.dark && j.light.bg) {
            custom.value = { names: { light: "Light", dark: "Dark" }, extras: [], description: "", ...j, labels: { ...blankLabels(), ...(j.labels || {}) } };
            return;
        }
    } catch (_) { }
    starter();
}

//// Color logic

// The color of chroma C and hue H whose lightness gives `target` contrast on bg
export function fitLightness(C: number, H: number, bg: string, target: number): string {
    const Lb = oklch(bg)[0], up = Lb < .6, f = (L: number) => contrast(lch(L, C, H), bg);
    let lo = up ? Lb : .1, hi = up ? .97 : Lb;
    for (let i = 0; i < 28; i++) {
        const m = (lo + hi) / 2;
        if (up) { if (f(m) >= target) hi = m; else lo = m; }
        else { if (f(m) >= target) lo = m; else hi = m; }
    }
    return lch(up ? hi : lo, C, H);
}

// Keep a color's position between background and text when moving it to another theme
export function mirrorLightness(hex: string, src: ThemeColors, dst: ThemeColors): string {
    const [L, C, H] = oklch(hex), Ls = oklch(src.bg!)[0], Lt = oklch(src.tx!)[0], Ld = oklch(dst.bg!)[0], Ldt = oklch(dst.tx!)[0];
    const t = Math.abs(Lt - Ls) > .01 ? (L - Ls) / (Lt - Ls) : 0;
    return lch(clamp(Ld + t * (Ldt - Ld)), C, H);
}

function backgroundFrom(src_bg: string, to_dark: boolean): string {
    const [, C, H] = oklch(src_bg);
    return to_dark ? lch(gen_bg_l.value, Math.min(C, .03), H) : lch(.975, Math.min(C, .025), H);
}

function textFrom(src: ThemeColors, to_dark: boolean): string {
    const [, Cb, Hb] = oklch(src.bg!), [, Ct, Ht] = oklch(src.tx!);
    return lch(to_dark ? .88 : .25, Math.min(Math.max(Cb, Ct), .03), Cb >= Ct ? Hb : Ht);
}

function convert(hex: string, src: ThemeColors, dst: ThemeColors, accent: boolean): string {
    if (accent && gen_method.value === "contrast") {
        const [, C, H] = oklch(hex);
        return fitLightness(C, H, dst.bg!, contrast(hex, src.bg!));
    }
    return mirrorLightness(hex, src, dst);
}

// The matching color for a slot in the other theme
export function counterpart(slot: string, hex: string, src_mode: Side): string {
    const dst_mode = src_mode === "light" ? "dark" : "light", src = custom.value[src_mode], dst = custom.value[dst_mode], to_dark = dst_mode === "dark";
    if (slot === "bg") return backgroundFrom(hex, to_dark);
    if (slot === "tx") return textFrom({ bg: src.bg, tx: hex }, to_dark);
    return convert(hex, src, dst, isAccent(slot) || isExtra(slot));
}

// Replace the other theme entirely, generated from this one
export function generateMode(src_mode: Side): void {
    const c = custom.value, dst_mode = src_mode === "light" ? "dark" : "light", to_dark = dst_mode === "dark", src = c[src_mode], dst: ThemeColors = {};
    dst.bg = backgroundFrom(src.bg!, to_dark);
    dst.tx = textFrom(src, to_dark);
    SLOTS.forEach(k => { if (k !== "bg" && k !== "tx") dst[k] = src[k] ? mirrorLightness(src[k]!, src, dst) : null; });
    ACCENTS.forEach(k => dst[k] = src[k] ? convert(src[k]!, src, dst, true) : null);
    c.extras.forEach(e => e[dst_mode] = e[src_mode] ? convert(e[src_mode]!, src, dst, true) : null);
    c[dst_mode] = dst;
}

// A base slot at its standard position between bg and text
export function baseAt(mode: Side, slot: string): string {
    const m = custom.value[mode], t = BASE_T[SLOTS.indexOf(slot)], [Lb, Cb, Hb] = oklch(m.bg!), [Lt, Ct, Ht] = oklch(m.tx!);
    return lch(Lb + t * (Lt - Lb), Cb + (Ct - Cb) * t, Cb >= Ct ? Hb : Ht);
}

export function fillBase(mode: Side): void {
    SLOTS.forEach(k => { if (k !== "bg" && k !== "tx") custom.value[mode][k] = baseAt(mode, k); });
}

// Raise every accent below 4.5:1 to exactly 4.5:1
export function makeReadable(mode: Side): void {
    const m = custom.value[mode];
    ACCENTS.forEach(k => {
        if (m[k] && contrast(m[k]!, m.bg!) < 4.5) {
            const [, C, H] = oklch(m[k]!);
            m[k] = fitLightness(C, H, m.bg!, 4.5);
        }
    });
}

// Give every accent this slot's lightness and chroma, keeping their hues
export function spreadLightnessChroma(mode: Side, slot: string): void {
    const m = custom.value[mode], [L, C] = oklch(m[slot]!);
    ACCENTS.forEach(k => { if (k !== slot) m[k] = lch(L, C, m[k] ? oklch(m[k]!)[2] : HUE_STD[k]); });
}

//// Starting points

export function starter(): void {
    const l: ThemeColors = { bg: lch(.985, .012, 85), tx: lch(.24, .02, 265) };
    custom.value = { name: "Untitled palette", by: "", description: "", names: { light: "Light", dark: "Dark" }, labels: blankLabels(), light: l, dark: {}, extras: [] };
    fillBase("light");
    ACCENTS.forEach(k => l[k] = lch(.56, .14, HUE_STD[k]));
    makeReadable("light");
    generateMode("light");
}

export function startFrom(pid: string): void {
    const p = PALETTES.find(x => x.id === pid)!;
    custom.value = { name: p.name + " remix", by: "", description: p.description, names: { ...p.names }, labels: { ...blankLabels(), ...(p.remix_labels || {}) }, light: { ...p.light }, dark: { ...p.dark }, extras: [] };
}

// The custom palette in the shape palette pages use
export function customPalette(): Palette {
    const c = custom.value;
    const extra_rows = (md: Side) => {
        const sw = c.extras.filter(e => e[md]).map(e => [e.name || "extra", e[md]!] as [string, string]);
        return sw.length ? [{ type: "row" as const, title: "Extra colors", note: "", sw }] : [];
    };
    return {
        id: "custom", custom: true, name: c.name || "Untitled palette", description: c.description || "", by: c.by || "", year: "", tier: "custom", method: "", why: "", variants: "", url: "", license: "",
        names: { light: c.names.light || "Light", dark: c.names.dark || "Dark" }, acc_note: {}, map: "",
        light: { ...c.light }, dark: { ...c.dark }, flavors: [],
        extra: { light: extra_rows("light"), dark: extra_rows("dark") }, labels: { ...c.labels },
    };
}
