// palette_format.ts
//
// Reading palette files that aren't TypeScript: CSS custom properties and
// JSON (W3C design tokens or the editor's simple JSON). The editor's import
// uses the same parsers, and palette_list.ts uses them for .css / .json
// files in palettes/.
//
// Optional comments a CSS file can start with (the editor writes both):
//   /* Name by Author · Light and Dark · exported from Color Palettes */
//   /* description: One line about the palette */

import { ACCENTS, ACCENT_NAMES, SLOTS, SLOT_NAMES, makeTheme, swatchRow, type Mode, type PaletteFile } from "../palette_settings.ts";
import { clamp, parseColor } from "./color.ts";

export const EXT = "color-palettes"; // $extensions namespace in design tokens
const ext = (o: any) => (o.$extensions || {})[EXT] || (o.$extensions || {})["calm-palettes"]; // also the old name

export const slug = (s: string) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Common names for each slot
const SYNONYMS: Record<string, string> = {
    background: "bg", base: "bg", page: "bg", canvas: "bg", bg0: "bg", bg1: "bg2", background2: "bg2", surface: "bg2", panel: "bg2", mantle: "bg2", bgalt: "bg2",
    border: "ui", ui1: "ui", ui: "ui", ui2: "ui2", ui3: "ui3", faint: "tx3", comment: "tx3", comments: "tx3", subtle: "tx3", tx3: "tx3",
    muted: "tx2", subtext: "tx2", secondary: "tx2", tx2: "tx2", fg: "tx", foreground: "tx", text: "tx", body: "tx", ink: "tx", tx: "tx", bg2: "bg2", bg: "bg",
    red: "re", orange: "or", yellow: "ye", green: "gr", cyan: "cy", blue: "bl", purple: "pu", magenta: "ma", aqua: "cy", teal: "cy", violet: "pu", mauve: "pu",
    pink: "ma", peach: "or", gold: "ye", amber: "ye", re: "re", or: "or", ye: "ye", gr: "gr", cy: "cy", bl: "bl", pu: "pu", ma: "ma",
};
const guessSlot = (k: string): string | null => SYNONYMS[String(k).toLowerCase().replace(/[^a-z0-9]/g, "")] || null;

// A token value (string, {hex}, or DTCG {colorSpace, components}) → hex
function tokenValue(v: any): string | null {
    if (typeof v === "string") { const r = parseColor(v); return r ? r.hex : null; }
    if (v && typeof v === "object") {
        if (v.hex) { const r = parseColor(v.hex); return r ? r.hex : null; }
        if (Array.isArray(v.components) && (!v.colorSpace || v.colorSpace === "srgb")) {
            const c = v.components.map((x: unknown) => Math.round(clamp(+(x as number)) * 255));
            if (c.every((n: number) => !isNaN(n))) return "#" + c.map((n: number) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
        }
    }
    return null;
}

export interface ParsedPalette {
    light: Record<string, string>;
    dark: Record<string, string>;
    labels: Record<string, string>;
    extras: Record<string, { light?: string | null; dark?: string | null }>;
    meta: { name?: string; author?: string; light?: string; dark?: string; description?: string };
    n: number; // color values found
}

const newResult = (): ParsedPalette => ({ light: {}, dark: {}, labels: {}, extras: {}, meta: {}, n: 0 });

// Record one color. No mode means both; no slot means guess from the name, else an extra.
function put(R: ParsedPalette, mode: Mode | null, key: string, hex: string | null, slot: string | null): void {
    if (!hex) return;
    slot = slot || guessSlot(key);
    (mode ? [mode] : ["light", "dark"] as Mode[]).forEach(md => {
        if (slot) R[md][slot] = hex;
        else (R.extras[key] = R.extras[key] || {})[md] = hex;
        R.n++;
    });
    if (slot && key && slug(key) !== slug(SLOTS.includes(slot) ? SLOT_NAMES[slot] : ACCENT_NAMES[slot]) && slug(key) !== slot) R.labels[slot] = key;
}

export function fromTokens(j: any): ParsedPalette {
    const R = newResult(), X = ext(j);
    if (X) R.meta = X;
    const walk = (o: any, path: string[]) => {
        if (!o || typeof o !== "object") return;
        if ("$value" in o) {
            const md = path.some(p => /dark/i.test(p)) ? "dark" : path.some(p => /light/i.test(p)) ? "light" : null;
            const ex = ext(o) || {};
            put(R, md, ex.name || path[path.length - 1], tokenValue(o.$value), ex.slot);
            return;
        }
        Object.entries(o).forEach(([k, v]) => { if (!k.startsWith("$")) walk(v, [...path, k]); });
    };
    walk(j, []);
    return R;
}

export function fromSimple(j: any): ParsedPalette {
    const R = newResult();
    R.meta = { name: j.name, author: j.author, light: j.themes && j.themes.light, dark: j.themes && j.themes.dark, description: j.description };
    (["light", "dark"] as Mode[]).forEach(md => Object.entries(j[md] || {}).forEach(([k, v]) => put(R, md, k, tokenValue(v), [...SLOTS, ...ACCENTS].includes(k) ? k : null)));
    Object.assign(R.labels, j.labels || {});
    (j.extras || []).forEach((e: any) => {
        const l = tokenValue(e.light || ""), d = tokenValue(e.dark || "");
        if (l || d) { R.extras[e.name || "extra"] = { light: l, dark: d }; R.n += (l ? 1 : 0) + (d ? 1 : 0); }
    });
    return R;
}

// The editor's header comments, if present
function cssMeta(t: string): ParsedPalette["meta"] {
    const meta: ParsedPalette["meta"] = {};
    const head = t.match(/^\s*\/\*\s*(.+?)(?: by (.+?))? · (.+?) and (.+?) · exported from (?:Color|Calm) Palettes\s*\*\//);
    if (head) Object.assign(meta, { name: head[1], author: head[2] || "", light: head[3], dark: head[4] });
    const desc = t.match(/\/\*\s*description:\s*([\s\S]*?)\s*\*\//);
    if (desc) meta.description = desc[1].replace(/\s+/g, " ");
    return meta;
}

// CSS custom properties; a dark selector or media query above a declaration makes it dark
export function fromCSS(t: string): ParsedPalette {
    const R = newResult(), stack: string[] = [];
    R.meta = cssMeta(t);
    let buf = "";
    const handle = (decl: string, after: string) => {
        const d = decl.replace(/\/\*[\s\S]*?\*\//g, "").trim(), m = d.match(/^--([\w-]+)\s*:\s*(.+)$/);
        if (!m) return;
        if (stack.some(h => /@theme/.test(h))) return;
        const md = stack.some(h => /dark/i.test(h)) ? "dark" : "light";
        const sm = after.match(/^[ \t]*\/\*\s*slot:(\w+)\s*\*\//), nm = after.match(/^[ \t]*\/\*\s*name:(.*?)\s*\*\//);
        const slot = sm && [...SLOTS, ...ACCENTS].includes(sm[1]) ? sm[1] : null;
        put(R, md, nm ? nm[1] : m[1], tokenValue(m[2].trim()), slot);
    };
    for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (c === "/" && t[i + 1] === "*") {
            const e = t.indexOf("*/", i + 2), end = e < 0 ? t.length : e + 2;
            buf += t.slice(i, end);
            i = end - 1;
            continue;
        }
        if (c === "{") { stack.push(buf.replace(/\/\*[\s\S]*?\*\//g, "").trim()); buf = ""; }
        else if (c === "}") { if (buf.trim()) handle(buf, ""); stack.pop(); buf = ""; }
        else if (c === ";") { const nl = t.indexOf("\n", i); handle(buf, t.slice(i + 1, nl < 0 ? t.length : nl)); buf = ""; }
        else buf += c;
    }
    return R;
}

// JSON text: simple JSON (light.bg is a string) or design tokens
export function fromJSON(j: any): ParsedPalette {
    return j.light && typeof j.light.bg === "string" ? fromSimple(j) : fromTokens(j);
}

// A parsed .css / .json file in palettes/ → a palette, or null if it lacks a background and text
export function parsedToPalette(R: ParsedPalette, file_name: string): PaletteFile | null {
    const ok = (md: Mode) => R[md].bg && R[md].tx;
    if (!ok("light") || !ok("dark")) return null;
    const theme = (md: Mode) => makeTheme(SLOTS.map(s => R[md][s] || null), ACCENTS.map(s => R[md][s] || null));
    const extra_rows = (md: Mode) => {
        const sw = Object.entries(R.extras).filter(([, v]) => v[md]).map(([n, v]) => [n, v[md]!] as [string, string]);
        return sw.length ? [swatchRow("Extra colors", "", sw)] : [];
    };
    const labels = Object.fromEntries(Object.entries(R.labels).filter(([, v]) => v));
    return {
        id: slug(file_name.replace(/\.[^.]+$/, "")),
        name: R.meta.name || file_name.replace(/\.[^.]+$/, ""),
        description: R.meta.description || "",
        by: R.meta.author || "",
        names: { light: R.meta.light || "Light", dark: R.meta.dark || "Dark" },
        light: theme("light"),
        dark: theme("dark"),
        extra: { light: extra_rows("light"), dark: extra_rows("dark") },
        ...(Object.keys(labels).length ? { labels } : {}),
    };
}
