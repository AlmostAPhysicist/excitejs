// home.ts
//
// The home page: palette cards, color theory, metrics, the sortable
// "at a glance" table, the custom ranking and the research palettes.
//
// Reactors on this page:
//   preset            → preset buttons
//   weights           → sliders, ranked list, glance table (score() reads weights)
//   glance_sort       → glance table

import { Reactor } from "../../../core/index";
import { ACCENTS, PRESETS, themes, type Palette } from "../palette_settings.ts";
import { RESEARCH_SETS } from "../theory_and_history/research_sets.ts";
import { PALETTES } from "./palette_list.ts";
import { lch } from "./color.ts";
import { spreadSVG } from "./charts.ts";
import { CRITERIA, grade, metricExamplesHTML, modeMetrics, score, type Metrics } from "./metrics.ts";
import { theoryHTML } from "../theory_and_history/theory.ts";
import { TheoryWidgets } from "../theory_and_history/picker.ts";
import { HUE_STD } from "./custom_model.ts";
import { app, bar, glance_sort, preset, reducedMotion, themeStrip, tierChip, weights } from "./state.ts";

//// MathJax (theory formulas)

export function typeset(el: HTMLElement): void {
    const mj = (window as any).MathJax;
    try { if (mj && mj.typesetPromise) mj.typesetPromise([el]).catch(() => { }); } catch (_) { }
}

export function loadMathJax(): void {
    (window as any).MathJax = {
        tex: { inlineMath: [["\\(", "\\)"]] },
        svg: { fontCache: "global" },
        startup: {
            typeset: false,
            ready() {
                const mj = (window as any).MathJax;
                mj.startup.defaultReady();
                mj.startup.promise.then(() => { const a = document.getElementById("app"); if (a) typeset(a); });
            },
        },
    };
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.js";
    script.async = true;
    document.head.append(script);
}

//// Ranking

function drawWeights(): void {
    const w = document.getElementById("weights")!;
    const current = weights.value;
    w.innerHTML = `<div style="display:grid;gap:8px"><span class="label">Presets</span><div class="presets">${Object.keys(PRESETS).map(n => `<button data-preset="${n}">${n}</button>`).join("")}</div></div>
  ${CRITERIA.map(c => `<div class="wrow"><label for="w-${c.key}"><span style="color:var(--ink);font:500 13px var(--body)"><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${c.color};margin-right:6px"></i>${c.name}</span><span id="wv-${c.key}">${current[c.key]}</span></label><input type="range" id="w-${c.key}" min="0" max="5" step="1" value="${current[c.key]}"></div>`).join("")}
  <p style="font-size:12.5px;color:var(--ink-2)">Weight 0 ignores a metric. The bar on each palette shows how much each metric contributed to its score.</p>`;
    w.querySelectorAll<HTMLInputElement>("input[type=range]").forEach(r => r.oninput = () => {
        preset.value = null;
        weights.value = { ...weights.value, [r.id.slice(2)]: +r.value };
    });
    w.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach(b => b.onclick = () => {
        preset.value = b.dataset.preset!;
        weights.value = { ...PRESETS[b.dataset.preset!] };
    });
}

function syncWeights(): void {
    const current = weights.value;
    CRITERIA.forEach(c => {
        (document.getElementById("w-" + c.key) as HTMLInputElement).value = String(current[c.key]);
        document.getElementById("wv-" + c.key)!.textContent = String(current[c.key]);
    });
}

function drawRanked(): void {
    const w = weights.value, tot = CRITERIA.reduce((s, c) => s + w[c.key], 0) || 1;
    const rows = PALETTES.map(p => ({ p, s: score(p), parts: CRITERIA.map(c => ({ c, v: w[c.key] * c.fn(p) / tot * 100 })) })).sort((a, b) => b.s - a.s);
    document.getElementById("ranked")!.innerHTML = `<div class="legend">${CRITERIA.filter(c => w[c.key] > 0).map(c => `<span><i style="background:${c.color}"></i>${c.name}</span>`).join("")}</div>`
        + rows.map((r, i) => `<button class="rk" data-go="${r.p.id}"><span class="pos">${i + 1}</span><span class="nm">${r.p.name}</span><span class="stack" title="${r.parts.filter(x => x.v > 0).map(x => `${x.c.name} ${x.v.toFixed(1)}`).join(" · ")}">${r.parts.map(x => `<i style="width:${x.v}%;background:${x.c.color}"></i>`).join("")}</span><span class="sc">${r.s.toFixed(0)}</span></button>`).join("");
}

function drawGlance(): void {
    const t = document.getElementById("glance-t");
    if (!t) return;
    const { key: sort_key, dir: sort_dir } = glance_sort.value;
    const L = (p: Palette) => modeMetrics(p, "light"), D = (p: Palette) => modeMetrics(p, "dark");
    const cols: [string, string, ((p: Palette) => number | string) | null][] = [
        ["name", "Palette", p => p.name], ["l", "Light", null], ["d", "Dark", null], ["score", "Score", p => score(p)],
        ["text", "Text contrast", p => D(p).text], ["aa", "Accents ≥ 4.5", p => L(p).aa + D(p).aa], ["spread", "Lightness spread", p => -D(p).spread],
        ["close", "Closest pair ΔE", p => Math.min(L(p).close.d, D(p).close.d)], ["cvd", "Deuteranopia ΔE", p => Math.min(L(p).close_deutan.d, D(p).close_deutan.d)],
        ["chroma", "Chroma", p => -D(p).chroma], ["sigma", "Lightness σ", p => Math.min(L(p).sigma_l, D(p).sigma_l)], ["fl", "Themes", p => themes(p).length], ["go", "", null],
    ];
    const rows = [...PALETTES];
    const sort_col = cols.find(c => c[0] === sort_key);
    if (sort_col && sort_col[2]) {
        const f = sort_col[2];
        rows.sort((a, b) => {
            const x = f(a), y = f(b);
            return typeof x === "string" ? sort_dir * -1 * x.localeCompare(y as string) : sort_dir * ((y as number) - x);
        });
    }
    // "light / dark" pair of graded values
    const two = (p: Palette, f: (m: Metrics) => number, fmt: (v: number, m: Metrics) => string, gr: (v: number, m: Metrics) => string) => {
        const a = f(L(p)), b = f(D(p));
        return `<span class="${gr(a, L(p))}">${fmt(a, L(p))}</span> / <span class="${gr(b, D(p))}">${fmt(b, D(p))}</span>`;
    };
    t.innerHTML = `<thead><tr>${cols.map(([k, n, f]) => `<th>${f ? `<button data-sort="${k}" ${sort_key === k ? `aria-sort="${sort_dir < 0 ? "descending" : "ascending"}"` : ""}>${n}${sort_key === k ? (sort_dir < 0 ? " ↓" : " ↑") : ""}</button>` : n}</th>`).join("")}</tr></thead><tbody>${rows.map(p => `<tr style="cursor:pointer" data-go="${p.id}">
  <td><b>${p.name}</b><br>${tierChip(p)}</td><td>${themeStrip(p.light)}</td><td>${themeStrip(p.dark)}</td>
  <td class="num"><b>${score(p).toFixed(0)}</b></td>
  <td class="num">${two(p, m => m.text, v => v.toFixed(1), v => grade(v, 7, 4.5))}</td>
  <td class="num">${two(p, m => m.aa, (v, m) => `${v}/${m.n}`, (v, m) => v === m.n ? "g" : v >= m.n / 2 ? "o" : "l")}</td>
  <td class="num">${two(p, m => m.spread, v => v.toFixed(0), v => v <= 25 ? "g" : v <= 35 ? "o" : "l")}</td>
  <td class="num">${two(p, m => m.close.d, v => v.toFixed(1), v => grade(v, 8, 4))}</td>
  <td class="num">${two(p, m => m.close_deutan.d, v => v.toFixed(1), v => grade(v, 8, 4))}</td>
  <td class="num">${two(p, m => m.chroma, v => v.toFixed(1), () => "")}</td>
  <td class="num">${two(p, m => m.sigma_l, v => v.toFixed(1), v => grade(v, 8, 5))}</td>
  <td class="num">${themes(p).length}</td>
  <td><a href="#${p.id}" data-go="${p.id}">Open →</a></td></tr>`).join("")}</tbody>`;
    t.querySelectorAll<HTMLButtonElement>("[data-sort]").forEach(b => b.onclick = e => {
        e.stopPropagation();
        const k = b.dataset.sort!, cur = glance_sort.value;
        glance_sort.value = cur.key === k ? { key: k, dir: -cur.dir } : { key: k, dir: -1 };
    });
}

//// Page

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
const countWord = (n: number) => NUMBER_WORDS[n] || String(n);

function paletteCard(p: Palette): string {
    const ts = themes(p);
    return `<a class="pcard" href="#${p.id}" data-go="${p.id}">
    <div class="top"><b>${p.name}</b>${tierChip(p)}</div>
    <div class="duo"><div style="background:${p.light.bg}"><span style="color:${p.light.tx}">${p.names.light}</span>${ACCENTS.filter(k => p.light[k]).map(k => `<i style="background:${p.light[k]}"></i>`).join("")}</div><div style="background:${p.dark.bg}"><span style="color:${p.dark.tx}">${p.names.dark}</span>${ACCENTS.filter(k => p.dark[k]).map(k => `<i style="background:${p.dark[k]}"></i>`).join("")}</div></div>
    ${p.description ? `<p class="desc">${p.description}</p>` : ""}
    <p>${[p.method, [p.by, p.year].filter(Boolean).join(", ")].filter(Boolean).join(". ")}${p.method || p.by || p.year ? "." : ""}</p>
    <span class="fl">${ts.length} theme${ts.length > 1 ? "s" : ""}: ${ts.map(t => t.name).join(", ")}</span>
    <span class="go">Open full palette →</span></a>`;
}

export function HomePage(): Reactor[] {
    bar.innerHTML = `<a class="brand" href="#" data-go=""><i></i>Color Palettes</a>
  <span class="nav-h">${[["list", "Palettes"], ["theory", "Color theory"], ["metrics", "Metrics"], ["glance", "At a glance"], ["ranking", "Ranking"]].map(([i, t]) => `<button class="btn ghost" data-scroll="${i}">${t}</button>`).join("")}<a class="btn" href="#create" data-go="create">Create your own</a></span>`;

    app.innerHTML = `<div class="wrap">
 <section class="hero">
  <span class="label">A field guide to color schemes that are easy on the eyes</span>
  <h1>Color Palettes</h1>
  <p class="lede">${countWord(PALETTES.filter(p => p.url).length)} well-documented color schemes in the spirit of Flexoki, from ones built on color science and accessibility standards to ones designed by eye for comfort. Each has its own page with true light and dark themes, every flavour, every shade, and an analysis of what makes it work.</p>
 </section>

 <section class="h-sec" id="list">
  <div class="sec-head"><h2>The palettes</h2><p class="lede">The tag describes the basis, not the quality. A scheme designed by eye can still be very comfortable, and Alabaster is here as a deliberate counterpoint: what if you used almost no color?</p></div>
  <div class="cards">${PALETTES.map(paletteCard).join("")}<a class="pcard pc-create" href="#create" data-go="create"><div class="top"><b>Create your own</b><span class="tier t-aes">Editor</span></div><div class="cr-dots">${ACCENTS.map(k => `<i style="background:${lch(.62, .13, HUE_STD[k])}"></i>`).join("")}</div><p>Start from scratch or from any palette here. Get ramps, tints, tones, shades and a matching dark theme for every color, see the full analysis, and export as design tokens, CSS or Tailwind.</p><span class="go">Open the editor →</span></a></div>
 </section>

 ${theoryHTML()}

 <section class="h-sec" id="metrics">
  <div class="sec-head"><h2>What makes a good scheme</h2><p class="lede">Six properties that can be measured from the hex values alone. The examples are picked automatically: the strongest and weakest theme on this site for each one. The grey box under each says when you can safely ignore it, because none of these numbers proves a palette is pleasant.</p></div>
  <div class="metrics" id="metric-list">${metricExamplesHTML()}</div>
  <div class="chart-card"><span class="label">Accent lightness spread · dark themes</span>${spreadSVG(PALETTES.map(p => ({ label: p.name, m: p.dark })))}</div>
  <div class="chart-card"><span class="label">Accent lightness spread · light themes</span>${spreadSVG(PALETTES.map(p => ({ label: p.name, m: p.light })))}
   <p class="note">Solarized and Nord use one accent set for both modes, so their bands sit in the same place while the background moves. Modus pushes text to the extremes (pure black or white) to guarantee 7:1. Alabaster's few accents scatter widely because each one has a single, distinct job.</p></div>
 </section>

 <section class="h-sec" id="glance">
  <div class="sec-head"><h2>Palettes at a glance</h2><p class="lede">Every metric for the main light and dark theme, shown as light / dark. Click a column to sort; click a row to open the palette. Colors mark <span class="g">clear</span>, <span class="o">borderline</span> and <span class="l">weak</span> values.</p></div>
  <div class="tbl-wrap"><table id="glance-t"></table></div>
 </section>

 <section class="h-sec" id="ranking">
  <div class="sec-head"><h2>Custom ranking</h2><p class="lede">Set how much each property matters to you. Every metric is scaled to 0–1 (averaged across the light and dark theme) and combined using your weights. Your weights are remembered in this browser.</p></div>
  <div class="rank"><div class="weights" id="weights"></div><div class="ranked" id="ranked"></div></div>
 </section>

 <section class="h-sec" id="cvd">
  <div class="sec-head"><h2>Research palettes for color-blind safety</h2><p class="lede">Not editor themes, but accent sets from vision science that stay distinguishable for common color-vision deficiencies. Borrow them for charts, tags and status colors on top of any base above.</p></div>
  <div class="theory">${RESEARCH_SETS.map(s => `<div class="fig"><div><h3>${s.name}</h3><span class="label" style="text-transform:none;letter-spacing:0;font-weight:400">${s.sub}</span></div><p>${s.text}</p>
   <div class="chipset">${s.cols.map(([n, h]) => `<button class="sw" data-hex="${h}"><i style="background:${h}"></i>${n}<span>${h}</span></button>`).join("")}</div>
   <a href="${s.url}" target="_blank" rel="noopener" style="font-size:13px">Source</a></div>`).join("")}</div>
 </section>
 </div>
 <footer><div class="wrap">Values come from each project's official palette file or documentation. Metrics are calculated in your browser from those hex values. Click any swatch on any page to copy it.</div></footer>`;

    const reactors = TheoryWidgets();
    drawWeights();
    reactors.push(
        Reactor(() => {
            const current = preset.value;
            document.querySelectorAll("#weights [data-preset]").forEach(b => b.setAttribute("aria-pressed", String((b as HTMLElement).dataset.preset === current)));
        }),
        Reactor(syncWeights),
        Reactor(drawRanked),
        Reactor(drawGlance),
    );
    typeset(app);
    bar.querySelectorAll<HTMLButtonElement>("[data-scroll]").forEach(b => b.onclick = () => document.getElementById(b.dataset.scroll!)!.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" }));
    return reactors;
}
