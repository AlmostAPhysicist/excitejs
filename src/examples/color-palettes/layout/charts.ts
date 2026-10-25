// charts.ts
//
// SVG charts, built as strings. The analysis charts (hue/chroma wheel,
// lightness spread) draw in the page's own ink; the sample charts and shapes
// draw in a theme's accents through the --a-* custom properties, so the same
// markup restyles with whichever theme panel it sits in.

import { ACCENTS, ACCENT_NAMES, type ThemeColors } from "../palette_settings.ts";
import { clamp, lch, okL, oklch } from "./color.ts";
import { accentName } from "./state.ts";

const MONO = "IBM Plex Mono,monospace";
const SANS = "IBM Plex Sans,sans-serif";
const accentVar = (k: string) => `var(--a-${k})`;

//// Analysis charts

// Hue around the ring, chroma outward. Each set is a list of [name, hex]; shape "sq" or "star" or dots.
export function wheelSVG(sets: { cols: [string, string][]; shape?: string }[], size = 320): string {
    const c = size / 2, R = size / 2 - 18, ring = 14, max_c = .25;
    let g = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Hue and chroma wheel">`;
    for (let i = 0; i < 72; i++) {
        const a0 = i * 5, a1 = a0 + 5.4, p = (a: number, r: number) => [c + r * Math.cos(a * Math.PI / 180), c - r * Math.sin(a * Math.PI / 180)];
        const [x1, y1] = p(a0, R), [x2, y2] = p(a1, R), [x3, y3] = p(a1, R - ring), [x4, y4] = p(a0, R - ring);
        g += `<path d="M${x1} ${y1} A${R} ${R} 0 0 0 ${x2} ${y2} L${x3} ${y3} A${R - ring} ${R - ring} 0 0 1 ${x4} ${y4}Z" fill="${lch(.72, .13, a0 + 2.5)}"/>`;
    }
    const r0 = R - ring - 6;
    [.05, .1, .15, .2].forEach(k => { g += `<circle cx="${c}" cy="${c}" r="${r0 * k / max_c}" fill="none" stroke="var(--line)"/>`; });
    ([[0, "0°"], [90, "90°"], [180, "180°"], [270, "270°"]] as [number, string][]).forEach(([a, t]) => {
        const x = c + (r0 - 10) * Math.cos(a * Math.PI / 180), y = c - (r0 - 10) * Math.sin(a * Math.PI / 180);
        g += `<text x="${x}" y="${y + 3}" text-anchor="middle" font-size="9" fill="var(--ink-3)" font-family="${MONO}">${t}</text>`;
    });
    g += `<text x="${c + 4}" y="${c - r0 * .2 / max_c - 3}" font-size="9" fill="var(--ink-3)" font-family="${MONO}">C .20</text><text x="${c + 4}" y="${c - r0 * .1 / max_c - 3}" font-size="9" fill="var(--ink-3)" font-family="${MONO}">C .10</text>`;
    g += `<circle cx="${c}" cy="${c}" r="2.5" fill="var(--ink-3)"/>`;
    sets.forEach(({ cols, shape }) => cols.forEach(([n, h]) => {
        const [, C, H] = oklch(h);
        const r = Math.min(C, max_c) / max_c * r0, x = c + r * Math.cos(H * Math.PI / 180), y = c - r * Math.sin(H * Math.PI / 180);
        const t = `<title>${n} ${h} · hue ${H.toFixed(0)}° · chroma ${C.toFixed(3)}</title>`;
        g += shape === "sq" ? `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="3" fill="${h}" stroke="var(--ink)" stroke-width="1.5">${t}</rect>`
            : shape === "star" ? `<circle cx="${x}" cy="${y}" r="11" fill="${h}" stroke="var(--ink)" stroke-width="2.5">${t}</circle><circle cx="${x}" cy="${y}" r="15" fill="none" stroke="var(--ink)" stroke-dasharray="3 3"/>`
                : `<circle cx="${x}" cy="${y}" r="8" fill="${h}" stroke="var(--surface)" stroke-width="2.5">${t}</circle>`;
    }));
    return g + "</svg>";
}

// One row per theme: accent lightness band, background (dashed) and text (solid)
export function spreadSVG(rows: { label: string; m: ThemeColors }[]): string {
    const W = 1000, rh = 32, top = 26, H = top + rows.length * rh + 24, x0 = 170, x1 = W - 20, X = (v: number) => x0 + (x1 - x0) * v / 100;
    let g = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Accent lightness spread">`;
    [0, 25, 50, 75, 100].forEach(v => { g += `<line x1="${X(v)}" x2="${X(v)}" y1="${top - 8}" y2="${H - 22}" stroke="var(--line)"/><text x="${X(v)}" y="${H - 6}" text-anchor="middle" font-size="12" fill="var(--ink-3)" font-family="${MONO}">${v}</text>`; });
    g += `<text x="${x0}" y="12" font-size="11.5" fill="var(--ink-3)" font-family="${SANS}">dashed = background · solid = text · dots = accents (OKLCH lightness, 0 black → 100 white)</text>`;
    rows.forEach(({ label, m }, i) => {
        const y = top + i * rh + rh / 2, ls = ACCENTS.filter(k => m[k]).map(k => okL(m[k]!));
        g += `<text x="0" y="${y + 4}" font-size="13" fill="var(--ink-2)" font-family="${SANS}">${label}</text>`;
        g += `<rect x="${X(Math.min(...ls))}" y="${y - 4}" width="${Math.max(1, X(Math.max(...ls)) - X(Math.min(...ls)))}" height="8" rx="4" fill="var(--line)"/>`;
        g += `<line x1="${X(okL(m.bg!))}" x2="${X(okL(m.bg!))}" y1="${y - 12}" y2="${y + 12}" stroke="var(--ink)" stroke-width="2" stroke-dasharray="3 3"/>`;
        g += `<line x1="${X(okL(m.tx!))}" x2="${X(okL(m.tx!))}" y1="${y - 12}" y2="${y + 12}" stroke="var(--ink)" stroke-width="2"/>`;
        ACCENTS.filter(k => m[k]).forEach(k => { g += `<circle cx="${X(okL(m[k]!))}" cy="${y}" r="7" fill="${m[k]}" stroke="var(--surface)" stroke-width="2"><title>${ACCENT_NAMES[k]} L${okL(m[k]!).toFixed(1)}</title></circle>`; });
    });
    return g + "</svg>";
}

//// Sample charts in a theme's accents (deterministic data)

function rng(seed: number): () => number {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export interface SampleCharts { line: string; bars: string; sc: string; don: string; heat: string; spark: string; lk: string[] }

export function sampleCharts(m: ThemeColors): SampleCharts {
    const ks = ACCENTS.filter(k => m[k]), A = accentVar, r = rng(7);
    const axisT = (x: number, y: number, t: string | number, a = "middle") => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="9" fill="var(--p-tx3)" font-family="${MONO}">${t}</text>`;

    // line
    const lk = ks.filter(k => ["bl", "gr", "or", "pu", "re", "cy"].includes(k)).slice(0, 4);
    let line = `<svg viewBox="0 0 300 160" role="img" aria-label="Line chart, sample data">`;
    [0, 1, 2, 3].forEach(i => { const y = 20 + i * 40; line += `<line x1="24" x2="296" y1="${y}" y2="${y}" stroke="var(--p-ui)"/>` + axisT(18, y + 3, (30 - i * 10), "end"); });
    lk.forEach((k, si) => {
        let v = 12 + si * 4;
        const pts: number[][] = [];
        for (let i = 0; i < 12; i++) { v = Math.max(2, Math.min(29, v + (r() - .45) * 6)); pts.push([24 + i * 24.7, 140 - v * 4]); }
        line += `<path d="M${pts.map(p => p.join(" ")).join(" L")} L${pts[11][0]} 140 L24 140Z" fill="${A(k)}" opacity=".08"/><polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="${A(k)}" stroke-width="2" stroke-linejoin="round"/><circle cx="${pts[11][0]}" cy="${pts[11][1]}" r="3" fill="${A(k)}"/>`;
    });
    ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].forEach((t, i) => line += axisT(24 + i * 24.7, 154, t));
    line += "</svg>";

    // bars
    let bars = `<svg viewBox="0 0 300 160" role="img" aria-label="Bar chart, sample data">`;
    const bw = 272 / ks.length;
    [0, 1, 2, 3].forEach(i => { bars += `<line x1="24" x2="296" y1="${20 + i * 40}" y2="${20 + i * 40}" stroke="var(--p-ui)"/>`; });
    ks.forEach((k, i) => { const h = 30 + r() * 95, x = 26 + i * bw; bars += `<rect x="${x + bw * .15}" y="${140 - h}" width="${bw * .7}" height="${h}" rx="3" fill="${A(k)}"/>` + axisT(x + bw / 2, 154, accentName(k).slice(0, 3)); });
    bars += "</svg>";

    // scatter
    let sc = `<svg viewBox="0 0 300 160" role="img" aria-label="Scatter plot, sample data"><line x1="24" y1="140" x2="296" y2="140" stroke="var(--p-ui3)"/><line x1="24" y1="10" x2="24" y2="140" stroke="var(--p-ui3)"/>`;
    ks.slice(0, 4).forEach((k, ci) => {
        const cx = 70 + ci * 60, cy = 110 - ci * 22;
        for (let i = 0; i < 14; i++) { const x = cx + (r() - .5) * 60, y = cy + (r() - .5) * 44; sc += `<circle cx="${x}" cy="${y}" r="${2.5 + r() * 3}" fill="${A(k)}" fill-opacity=".75" stroke="${A(k)}"/>`; }
    });
    sc += "</svg>";

    // donut
    let don = `<svg viewBox="0 0 160 160" role="img" aria-label="Donut chart, sample data" style="max-width:170px;margin:0 auto">`;
    const vals = ks.map(() => .5 + r()), tot = vals.reduce((a, b) => a + b, 0);
    let a0 = -90;
    ks.forEach((k, i) => {
        const ang = vals[i] / tot * 360, a1 = a0 + ang, R = 64, ri = 40, L = ang > 180 ? 1 : 0;
        const p = (a: number, rr: number) => [80 + rr * Math.cos(a * Math.PI / 180), 80 + rr * Math.sin(a * Math.PI / 180)];
        const [x1, y1] = p(a0 + .8, R), [x2, y2] = p(a1 - .8, R), [x3, y3] = p(a1 - .8, ri), [x4, y4] = p(a0 + .8, ri);
        don += `<path d="M${x1} ${y1} A${R} ${R} 0 ${L} 1 ${x2} ${y2} L${x3} ${y3} A${ri} ${ri} 0 ${L} 0 ${x4} ${y4}Z" fill="${A(k)}"/>`;
        a0 = a1;
    });
    don += `<text x="80" y="78" text-anchor="middle" font-size="20" font-weight="700" fill="var(--p-tx)" font-family="Bricolage Grotesque,sans-serif">${ks.length}</text><text x="80" y="94" text-anchor="middle" font-size="9" fill="var(--p-tx2)" font-family="${SANS}">accents</text></svg>`;

    // heatmaps: sequential + diverging
    const hb = m.bl ? "bl" : ks[0];
    let heat = `<svg viewBox="0 0 300 120" role="img" aria-label="Heatmaps, sample data">`;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 12; x++) {
        const v = clamp(.5 + .45 * Math.sin(x * .55 + y * .9) + (r() - .5) * .3);
        heat += `<rect x="${x * 12.4}" y="${y * 22}" width="11" height="20" rx="2" fill="color-mix(in oklab, ${A(hb)} ${Math.round(v * 100)}%, var(--p-bg))"/>`;
    }
    const neg = m.re ? "re" : m.or ? "or" : ks[0], pos = m.bl ? "bl" : m.cy ? "cy" : ks[ks.length - 1];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 12; x++) {
        const v = Math.sin(x * .5 - y * .7) * .9;
        heat += `<rect x="${152 + x * 12.4}" y="${y * 22}" width="11" height="20" rx="2" fill="color-mix(in oklab, ${A(v < 0 ? neg : pos)} ${Math.round(Math.abs(v) * 100)}%, var(--p-bg))"/>`;
    }
    heat += axisT(74, 118, "sequential") + axisT(226, 118, "diverging") + "</svg>";

    // sparkline rows
    const spark = ks.slice(0, 4).map((k, i) => {
        let v = 10;
        const pts: string[] = [];
        for (let j = 0; j < 16; j++) { v = Math.max(1, Math.min(19, v + (r() - .5) * 6)); pts.push(`${j * 6},${20 - v}`); }
        return `<div style="display:grid;grid-template-columns:62px 1fr 40px;gap:8px;align-items:center;font-size:12px"><span style="color:var(--p-tx2)">${["Visits", "Signups", "Errors", "Latency"][i]}</span><svg viewBox="0 0 90 20" style="height:20px" aria-hidden="true"><polyline points="${pts.join(" ")}" fill="none" stroke="${A(k)}" stroke-width="1.6"/></svg><b class="mono" style="font-size:11.5px;color:${A(k)}">${(r() * 90 + 10).toFixed(0)}</b></div>`;
    }).join("");

    return { line, bars, sc, don, heat, spark, lk };
}

export function shapesSVG(m: ThemeColors): string {
    const ks = ACCENTS.filter(k => m[k]), A = accentVar, r = rng(23);
    let g = `<svg viewBox="0 0 300 160" role="img" aria-label="Geometric composition">`;
    for (let y = 0; y < 6; y++) for (let x = 0; x < 14; x++) {
        const k = ks[(x + y * 3) % ks.length];
        g += `<circle cx="${10 + x * 21}" cy="${12 + y * 12}" r="${2 + ((x * y) % 3)}" fill="${A(k)}" opacity="${.35 + ((x + y) % 4) * .18}"/>`;
    }
    const shapes = [
        (x: number, y: number, k: string) => `<circle cx="${x}" cy="${y}" r="20" fill="${A(k)}"/>`,
        (x: number, y: number, k: string) => `<rect x="${x - 18}" y="${y - 18}" width="36" height="36" rx="5" fill="${A(k)}"/>`,
        (x: number, y: number, k: string) => `<polygon points="${x},${y - 22} ${x + 21},${y + 16} ${x - 21},${y + 16}" fill="${A(k)}"/>`,
        (x: number, y: number, k: string) => `<rect x="${x - 20}" y="${y - 8}" width="40" height="16" rx="8" fill="${A(k)}"/>`,
    ];
    ks.forEach((k, i) => { g += shapes[i % 4](24 + i * (252 / Math.max(1, ks.length - 1)), 125 + (i % 2 ? 6 : -6), k); });
    g += `<path d="M0 95 Q 75 ${80 + r() * 20} 150 95 T 300 95" fill="none" stroke="var(--p-tx3)" stroke-width="1.5" stroke-dasharray="4 4"/></svg>`;
    return g;
}
