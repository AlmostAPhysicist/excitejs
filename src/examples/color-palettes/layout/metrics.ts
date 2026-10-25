// metrics.ts
//
// What gets measured for every theme (contrast, accent legibility, lightness
// spread, closest pairs with and without deuteranopia, chroma), the ranking
// criteria and weighted score, and the "What makes a good scheme" examples,
// which pick the strongest and weakest theme on the site for each metric.

import { ACCENTS, themes, type Palette, type ThemeColors, type Theme } from "../palette_settings.ts";
import { PALETTES } from "./palette_list.ts";
import { clamp, contrast, deltaE, deltaESim, okL, oklch } from "./color.ts";
import { accentName, weights } from "./state.ts";

export interface Pair { d: number; a?: string; b?: string }

export interface Metrics {
    text: number;          // body text contrast
    muted: number | null;  // tx-2 contrast
    acc_min: number;       // weakest accent contrast
    aa: number;            // accents ≥ 4.5:1
    n: number;             // accents present
    spread: number;        // accent OKLCH lightness range
    sigma_l: number;       // standard deviation of accent OKLCH lightness (σL): how far apart they sit in grayscale
    close: Pair;           // closest accent pair, ΔE
    close_deutan: Pair;    // closest pair under deuteranopia
    chroma: number;        // mean accent chroma ×100
    keys: string[];        // accents present
}

const memo: Record<string, Metrics> = {};

export function metrics(p: Palette, key: string, m: ThemeColors): Metrics {
    const memo_key = p.id + key;
    if (!p.custom && memo[memo_key]) return memo[memo_key];

    const ks = ACCENTS.filter(x => m[x]);
    const crs = ks.map(x => contrast(m[x]!, m.bg!)), ls = ks.map(x => okL(m[x]!)), cs = ks.map(x => oklch(m[x]!)[1]);
    let close: Pair = { d: 1e9 }, close_deutan: Pair = { d: 1e9 };
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
        const d = deltaE(m[ks[i]]!, m[ks[j]]!), dd = deltaESim(m[ks[i]]!, m[ks[j]]!, "deutan");
        if (d < close.d) close = { d, a: ks[i], b: ks[j] };
        if (dd < close_deutan.d) close_deutan = { d: dd, a: ks[i], b: ks[j] };
    }

    const res: Metrics = {
        text: contrast(m.tx!, m.bg!),
        muted: m.tx2 ? contrast(m.tx2, m.bg!) : null,
        acc_min: crs.length ? Math.min(...crs) : 0,
        aa: crs.filter(c => c >= 4.5).length,
        n: ks.length,
        spread: ls.length ? Math.max(...ls) - Math.min(...ls) : 0,
        sigma_l: ls.length ? Math.sqrt(ls.reduce((s, l) => s + (l - ls.reduce((a, b) => a + b, 0) / ls.length) ** 2, 0) / ls.length) : 0,
        close,
        close_deutan,
        chroma: cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length * 100 : 0,
        keys: ks,
    };
    if (!p.custom) memo[memo_key] = res;
    return res;
}

// Metrics of a palette's main light or dark theme
export const modeMetrics = (p: Palette, mode: "light" | "dark"): Metrics => metrics(p, mode, p[mode]);

// CSS class for a value: g(ood) ≥ good, o(k) ≥ ok, l(ow) otherwise
export const grade = (v: number, good: number, ok: number): string => v >= good ? "g" : v >= ok ? "o" : "l";

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const bothModes = (f: (mode: "light" | "dark") => number) => avg((["light", "dark"] as const).map(f));

//// Ranking criteria: each maps a palette to 0..1

export interface Criterion { key: string; name: string; color: string; fn: (p: Palette) => number }

export const CRITERIA: Criterion[] = [
    { key: "text", name: "Text contrast", color: "#4e79a7", fn: p => bothModes(md => clamp((modeMetrics(p, md).text - 4.5) / (9 - 4.5))) },
    { key: "legible", name: "Accent legibility", color: "#59a14f", fn: p => bothModes(md => modeMetrics(p, md).aa / Math.max(1, modeMetrics(p, md).n)) },
    { key: "balance", name: "Lightness balance", color: "#edc948", fn: p => bothModes(md => clamp((45 - modeMetrics(p, md).spread) / 30)) },
    { key: "distinct", name: "Hue distinctness", color: "#f28e2b", fn: p => bothModes(md => clamp((modeMetrics(p, md).close.d - 2) / 10)) },
    { key: "cvd", name: "Color-blind distinctness", color: "#b07aa1", fn: p => bothModes(md => clamp((modeMetrics(p, md).close_deutan.d - 2) / 8)) },
    { key: "calm", name: "Chroma restraint", color: "#76b7b2", fn: p => bothModes(md => clamp((20 - modeMetrics(p, md).chroma) / 12)) },
    { key: "coverage", name: "Hue coverage (8 slots)", color: "#9c755f", fn: p => bothModes(md => modeMetrics(p, md).n / 8) },
    { key: "parity", name: "Light/dark parity", color: "#bab0ac", fn: p => 1 - clamp(Math.abs(modeMetrics(p, "light").text - modeMetrics(p, "dark").text) / 8) },
    { key: "gray", name: "Grayscale separation", color: "#6f6f78", fn: p => bothModes(md => clamp((modeMetrics(p, md).sigma_l - 3) / 8)) },
    { key: "flavours", name: "Number of flavours", color: "#ff9da7", fn: p => clamp(themes(p).length / 6) },
];

// Weighted score, 0..100. Reads `weights`, so a Reactor that calls it tracks them.
export function score(p: Palette): number {
    const w = weights.value;
    let s = 0, t = 0;
    CRITERIA.forEach(c => { s += w[c.key] * c.fn(p); t += w[c.key]; });
    return t ? s / t * 100 : 0;
}

//// Metric examples (home page)

interface ThemeEntry { p: Palette; t: Theme; mt: Metrics }

function allThemes(): ThemeEntry[] {
    const out: ThemeEntry[] = [];
    PALETTES.forEach(p => themes(p).forEach(t => out.push({ p, t, mt: metrics(p, t.key, t.m) })));
    return out;
}

export function metricExamplesHTML(): string {
    const all = allThemes();
    const by = (f: (x: ThemeEntry) => number) => [...all].sort((x, y) => f(x) - f(y));
    const last = (a: ThemeEntry[]) => a[a.length - 1];

    const card = (x: ThemeEntry, verdict: string, body: string) =>
        `<div class="exc" style="background:${x.t.m.bg};color:${x.t.m.tx}"><div class="v"><span>${x.p.name} ${x.t.name}</span><span class="verdict">${verdict}</span></div>${body}</div>`;
    const dots = (m: ThemeColors) => `<div class="dots">${ACCENTS.filter(k => m[k]).map(k => `<i style="background:${m[k]}"></i>`).join("")}</div>`;
    const words = (m: ThemeColors) => `<p>${ACCENTS.filter(k => m[k]).map(k => `<b style="color:${m[k]}">${accentName(k)}</b>`).join(" · ")}</p>`;
    const pairBody = (x: ThemeEntry, d: number, sim = false) => {
        const m = x.t.m, c = sim ? x.mt.close_deutan : x.mt.close;
        const pr = (f: boolean) => `<div class="dots" style="${f ? "filter:url(#cvd-deutan)" : ""}"><i style="background:${m[c.a!]};width:34px;height:34px"></i><i style="background:${m[c.b!]};width:34px;height:34px"></i></div>`;
        return sim
            ? `<div style="display:flex;gap:14px;flex-wrap:wrap"><div style="display:grid;gap:4px;font-size:11px">${pr(false)}normal</div><div style="display:grid;gap:4px;font-size:11px">${pr(true)}deuteranopia</div></div><p>${accentName(c.a!)} vs ${accentName(c.b!)} · ΔE ${d.toFixed(1)} when simulated</p>`
            : `${pr(false)}<p>${accentName(c.a!)} vs ${accentName(c.b!)} · ΔE ${d.toFixed(1)}</p>`;
    };

    const tc = by(x => x.mt.text), mid = by(x => Math.abs(x.mt.text - 12))[0];
    const lg = by(x => x.mt.aa / x.mt.n), sp = by(x => x.mt.spread), ds = by(x => x.mt.close.d);
    const cv = by(x => x.mt.close_deutan.d), ch = by(x => x.mt.chroma);

    const items = [
        {
            t: "1 · Text contrast", d: "The WCAG 2 ratio between body text and the page background. Too low and your eyes work harder to separate letters from the page.", r: "≥ 7 strong · ≥ 4.5 passes AA · below 4.5 fails",
            ex: [card(tc[0], "lowest", `<p>Body text at ${tc[0].mt.text.toFixed(1)}:1. Pleasant for a glance, tiring for an hour of reading.</p>`), card(mid, "middle", `<p>Body text at ${mid.mt.text.toFixed(1)}:1. Many calm schemes land between 10 and 16.</p>`), card(last(tc), "highest", `<p>Body text at ${last(tc).mt.text.toFixed(1)}:1. The maximum possible on a screen.</p>`)],
            c: "<b>Is more always better?</b> No. Above roughly 15:1 the gain in legibility is tiny, and some people (especially with astigmatism) find pure white on pure black blurry or glaring. Low contrast is a genuine problem; very high contrast is a matter of taste and room lighting.",
        },
        {
            t: "2 · Accent legibility", d: "How many accents can be used as readable text on the page background. Syntax highlighting, links and error messages are text, so an accent below 4.5:1 is fine for a dot or a border but tiring to read as words.", r: "accents ≥ 4.5:1 against bg, out of those present",
            ex: [card(last(lg), `${last(lg).mt.aa}/${last(lg).mt.n}`, words(last(lg).t.m)), card(lg[0], `${lg[0].mt.aa}/${lg[0].mt.n}`, words(lg[0].t.m))],
            c: "<b>Does it matter?</b> Only for accents you use as text. If yellow is only ever a warning icon or a highlight background, its low contrast is irrelevant. Light themes almost always lose here, because a light yellow on a light page is physically limited.",
        },
        {
            t: "3 · Lightness balance", d: "The spread in perceived lightness across the accents. A narrow band means no single color jumps out (yellow is the usual offender). Solarized was designed around this idea.", r: "OKLCH L range of accents · ~10–25 balanced · over 35 uneven",
            ex: [card(sp[0], `${sp[0].mt.spread.toFixed(0)} pts`, words(sp[0].t.m) + dots(sp[0].t.m)), card(last(sp), `${last(sp).mt.spread.toFixed(0)} pts`, words(last(sp).t.m) + dots(last(sp).t.m))],
            c: "<b>Can it be too balanced?</b> Yes. If every accent has the same lightness, the only difference left is hue, which is exactly what color-blind readers cannot see, and grayscale prints become a uniform gray. Some unevenness is a feature: it lets important colors stand out on purpose.",
        },
        {
            t: "4 · Hue distinctness", d: "The Oklab distance between the two most similar accents. If green and cyan, or purple and magenta, are too close, highlighting stops carrying information.", r: "closest pair ΔE · ≥ 8 clear · ≥ 4 close · below 4 easy to confuse",
            ex: [card(last(ds), "most distinct", pairBody(last(ds), last(ds).mt.close.d)), card(ds[0], "least distinct", pairBody(ds[0], ds[0].mt.close.d))],
            c: "<b>Does it matter?</b> Only if both colors appear side by side with different meanings. Many themes use near-identical purple and magenta for related roles on purpose. A low score is a warning to check how the pair is used, not a verdict.",
        },
        {
            t: "5 · Color-blind distinctness", d: "The same closest-pair distance after simulating deuteranopia, the most common color-vision deficiency (about 1 in 16 men have some form of red-green deficiency). Uses the Machado, Oliveira & Fernandes 2009 model.", r: "closest pair ΔE under deuteranopia · same thresholds",
            ex: [card(last(cv), "holds up", pairBody(last(cv), last(cv).mt.close_deutan.d, true)), card(cv[0], "collapses", pairBody(cv[0], cv[0].mt.close_deutan.d, true))],
            c: "<b>Does it matter?</b> It matters a lot if your work is shared, and not at all if only you use it and you have typical color vision. Even then, red/green diff colors are the classic failure, and adding a symbol (+/−) fixes it regardless of palette.",
        },
        {
            t: "6 · Chroma restraint", d: "Average colorfulness of the accents. Lower chroma reads as muted and calm; higher reads as vivid and energetic.", r: "mean OKLCH chroma × 100 · under ~12 muted · over ~16 vivid",
            ex: [card(ch[0], `C ${ch[0].mt.chroma.toFixed(1)}`, words(ch[0].t.m) + dots(ch[0].t.m)), card(last(ch), `C ${last(ch).mt.chroma.toFixed(1)}`, words(last(ch).t.m) + dots(last(ch).t.m))],
            c: "<b>Is muted better?</b> Not inherently. Muted accents are easier to live with for hours, but they can be harder to tell apart, especially on dim or low-quality screens. Vivid accents read clearly from across a room. This one is closest to pure preference.",
        },
    ];

    return items.map(x => `<div class="metric"><div class="txt"><h3>${x.t}</h3><p>${x.d}</p><p class="rule">${x.r}</p><div class="caveat">${x.c}</div></div><div class="ex">${x.ex.join("")}</div></div>`).join("");
}
