// palette_page.ts
//
// A palette's page: header and facts, the view controls, the stage of theme
// panels, the color-vision comparison strip, and the analysis section. The
// body (controls + stage + analysis) is shared with the editor, which shows
// it for the custom palette.
//
// Reactors per body:
//   view, all_flavours, focus_key        → stage (which theme panels, how many columns)
//   cvd (+ the same three, for the strip) → CVD filter and normal-vs-simulated strip

import { Reactor } from "../../../core/index";
import { ACCENTS, themes, type Palette, type Theme } from "../palette_settings.ts";
import { PALETTES } from "./palette_list.ts";
import { deltaESim, okL } from "./color.ts";
import { sampleCharts, shapesSVG, spreadSVG, wheelSVG } from "./charts.ts";
import { grade, metrics, modeMetrics, score } from "./metrics.ts";
import { ThemeHalf, themeVars, wireShades } from "./theme_half.ts";
import { accentName, all_flavours, app, bar, cvd, flash, focus_key, go, page, reducedMotion, selectHTML, tierChip, view, type View } from "./state.ts";

const CVD_NAMES: Record<string, string> = { deutan: "Deuteranopia", protan: "Protanopia", tritan: "Tritanopia", gray: "Grayscale" };

const neighbours = (p: Palette) => {
    const i = PALETTES.indexOf(p);
    return { i, prev: PALETTES[(i + PALETTES.length - 1) % PALETTES.length], next: PALETTES[(i + 1) % PALETTES.length] };
};

// Themes currently on stage. Reads view, all_flavours and focus_key.
function currentShown(p: Palette): Theme[] {
    let ths = themes(p);
    if (!all_flavours.value) ths = ths.filter(t => t.key === "light" || t.key === "dark");
    const v = view.value;
    if (v !== "split") ths = ths.filter(t => t.kind === v);
    const f_key = focus_key.value;
    if (f_key) {
        const f = themes(p).find(t => t.key === f_key);
        if (f) ths = [f];
    }
    return ths;
}

function drawStage(p: Palette): void {
    const s = document.getElementById("stage")!, ths = currentShown(p), f_key = focus_key.value;
    s.style.setProperty("--cols", String(f_key || view.value !== "split" ? 1 : Math.min(2, ths.length)));
    s.innerHTML = ths.map(t => ThemeHalf(p, t)).join("");

    document.querySelectorAll("#viewseg button").forEach(b => b.setAttribute("aria-pressed", String(!f_key && (b as HTMLElement).dataset.v === view.value)));
    const af = document.getElementById("allfl") as HTMLInputElement | null;
    if (af) af.checked = all_flavours.value;

    s.querySelectorAll<HTMLButtonElement>("[data-focus]").forEach(b => {
        b.textContent = f_key === b.dataset.focus ? "Show all" : "Focus";
        b.onclick = () => {
            focus_key.value = focus_key.value === b.dataset.focus ? null : b.dataset.focus!;
            document.getElementById("stage")!.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
        };
    });
    s.querySelectorAll<HTMLButtonElement>("[data-fs]").forEach(b => b.onclick = () => {
        const el = document.getElementById("half-" + b.dataset.fs)!;
        if (document.fullscreenElement) { document.exitFullscreen().catch(() => { }); return; }
        const fallback = () => {
            focus_key.value = b.dataset.fs!;
            flash("Full screen isn't available here, so this theme is focused instead");
        };
        try {
            const r = el.requestFullscreen && el.requestFullscreen();
            if (r && r.catch) r.catch(fallback);
            else if (!r) fallback();
        } catch (_) { fallback(); }
    });
    wireShades(p);
}

// CVD filter on the stage, plus normal vs simulated minis for each shown theme
function drawCvd(p: Palette): void {
    const sim_type = cvd.value, s = document.getElementById("stage");
    if (s) s.style.filter = sim_type === "none" ? "" : `url(#cvd-${sim_type})`;
    const el = document.getElementById("cmp");
    if (!el) return;
    if (sim_type === "none") { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;

    const mini = (t: Theme, sim: boolean) => {
        const m = t.m, ks = ACCENTS.filter(k => m[k]), A = (k: string) => `var(--a-${k})`;
        return `<div class="cmp-cell" style="${themeVars(m)};${sim ? `filter:url(#cvd-${sim_type})` : ""}"><div class="cmp-t"><b>${sim ? CVD_NAMES[sim_type] + " (simulated)" : "Normal vision"}</b><span>${p.name} ${t.name}</span></div>
   <div class="cmp-acc">${ks.map(k => `<span><i style="background:${A(k)}"></i>${accentName(k)}</span>`).join("")}</div>
   <div class="cmp-row"><div class="cmp-chart">${sampleCharts(m).bars}</div><pre class="term" style="font-size:11px"><span style="color:${A("gr")}">+ added line</span>
<span style="color:${A("re")}">- removed line</span>
<span style="color:${A("ye")}">! warning</span>
<span style="color:${A("bl")}">→ link</span></pre></div></div>`;
    };
    el.innerHTML = `<div class="wrap cmp-h">Normal vision next to a ${CVD_NAMES[sim_type].toLowerCase()} simulation (Machado et al. 2009). The full theme panels below are simulated too.</div><div class="cmp-grid">${currentShown(p).map(t => mini(t, false) + mini(t, true)).join("")}</div>`;
}

//// Body: controls, stage, analysis

export function paletteBodyHTML(p: Palette): string {
    const ths = themes(p), has_flavours = ths.length > 2, { prev, next } = neighbours(p);
    const ml = modeMetrics(p, "light"), md = modeMetrics(p, "dark");
    const fmt = (v: number | string | null) => typeof v === "number" ? v.toFixed(1) : v;
    const an_rows = ths.map(t => ({ t, mt: metrics(p, t.key, t.m) }));

    // The four accent pairs hardest to tell apart under deuteranopia
    const pairs = (t: Theme) => {
        const m = t.m, ks = ACCENTS.filter(k => m[k]), ps: { a: string; b: string; dd: number }[] = [];
        for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) ps.push({ a: ks[a], b: ks[b], dd: deltaESim(m[ks[a]]!, m[ks[b]]!, "deutan") });
        return ps.sort((x, y) => x.dd - y.dd).slice(0, 4).map(x => `<div class="pair"><span class="d"><i style="background:${m[x.a]}"></i><i style="background:${m[x.b]}"></i><em>→</em><span style="display:flex;gap:3px;filter:url(#cvd-deutan)"><i style="background:${m[x.a]}"></i><i style="background:${m[x.b]}"></i></span></span><span class="lbar"><b style="width:${Math.min(100, x.dd / 30 * 100)}%;background:var(--ink-2)"></b></span><span class="num mono ${grade(x.dd, 8, 4)}" style="font-size:12px">${x.dd.toFixed(1)}</span></div>`).join("");
    };

    // The shapes graphic in color and in grayscale, with how spread out the
    // accents' lightnesses are (σL) and the two closest in lightness (the
    // pair a black-and-white print merges first)
    const grayTest = (t: Theme) => {
        const m = t.m, ks = ACCENTS.filter(k => m[k]), sigma_l = metrics(p, t.key, m).sigma_l;
        let close = { d: 1e9, a: "", b: "" };
        for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) {
            const d = Math.abs(okL(m[ks[a]]!) - okL(m[ks[b]]!));
            if (d < close.d) close = { d, a: ks[a], b: ks[b] };
        }
        return `<div class="gray-test"><div class="gray-t"><b>${t.name}</b><span>σL <span class="num mono ${grade(sigma_l, 8, 5)}">${sigma_l.toFixed(1)}</span>${close.a ? ` · closest: ${accentName(close.a)} & ${accentName(close.b)} <span class="num mono ${grade(close.d, 10, 5)}">ΔL ${close.d.toFixed(1)}</span>` : ""}</span></div>
     <div class="gray-pair" style="${themeVars(m)}"><div><span>color</span>${shapesSVG(m)}</div><div style="filter:url(#cvd-gray)"><span>grayscale</span>${shapesSVG(m)}</div></div></div>`;
    };

    const scorecard: [string, (x: ReturnType<typeof metrics>) => number | string | null, (v: any) => string][] = [
        ["Text contrast", x => x.text, v => grade(v, 7, 4.5)],
        ["Muted text contrast", x => x.muted ?? "—", v => typeof v === "number" ? grade(v, 4.5, 3) : ""],
        ["Weakest accent contrast", x => x.acc_min, v => grade(v, 4.5, 3)],
        ["Accents ≥ 4.5:1", x => `${x.aa}/${x.n}`, () => ""],
        ["Accent lightness spread", x => x.spread, v => v <= 25 ? "g" : v <= 35 ? "o" : "l"],
        ["Accent lightness σ (σL)", x => x.sigma_l, v => grade(v, 8, 5)],
        ["Closest accent pair ΔE", x => x.close.d, v => grade(v, 8, 4)],
        ["…under deuteranopia", x => x.close_deutan.d, v => grade(v, 8, 4)],
        ["Mean accent chroma ×100", x => x.chroma, () => ""],
    ];

    return `<div class="wrap">
  <div class="controls"><div class="seg" id="viewseg" aria-label="Which themes to show"><button data-v="light">Light only</button><button data-v="split">Light and dark</button><button data-v="dark">Dark only</button></div>
   ${has_flavours ? `<label class="switch"><input type="checkbox" id="allfl" ${all_flavours._value ? "checked" : ""}>All ${ths.length} flavours</label>` : `<span style="font-size:12.5px;color:var(--ink-3)">One light and one dark theme</span>`}
   <span class="sp"></span><span class="grp-l">Simulate ${selectHTML("cvd", [["none", "Normal vision"], ["deutan", "Deuteranopia"], ["protan", "Protanopia"], ["tritan", "Tritanopia"], ["gray", "Grayscale"]], cvd._value, "Simulate color vision")}</span></div></div>
  <div id="cmp" class="cmp" hidden></div><div id="stage"></div>
  <div class="wrap analysis">
   <h2>Analysis</h2>
   <div class="chart-card"><span class="label">Scorecard${has_flavours ? " · every flavour" : ""}</span><div style="overflow-x:auto"><table class="mt" style="min-width:${180 + ths.length * 110}px"><thead><tr><th>Metric</th>${ths.map(t => `<th>${t.name}</th>`).join("")}</tr></thead><tbody>
    ${scorecard.map(([n, f, g]) => `<tr><td>${n}</td>${an_rows.map(r => `<td class="num ${g(f(r.mt))}">${fmt(f(r.mt))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <p class="note">Closest pair: ${accentName(ml.close.a!)} & ${accentName(ml.close.b!)} (${p.names.light}), ${accentName(md.close.a!)} & ${accentName(md.close.b!)} (${p.names.dark}). Under deuteranopia: ${accentName(ml.close_deutan.a!)} & ${accentName(ml.close_deutan.b!)} (${p.names.light}), ${accentName(md.close_deutan.a!)} & ${accentName(md.close_deutan.b!)} (${p.names.dark}).</p></div>
   <div class="an-grid">
    <div class="chart-card"><span class="label">Hue and chroma · ● ${p.names.light} · ■ ${p.names.dark}</span><div style="max-width:340px;margin:0 auto;width:100%">${wheelSVG([{ cols: ACCENTS.filter(k => p.light[k]).map(k => [accentName(k), p.light[k]!]) }, { cols: ACCENTS.filter(k => p.dark[k]).map(k => [accentName(k), p.dark[k]!]), shape: "sq" }])}</div>
     <p class="note">Distance from center is chroma. ${md.chroma < 12 ? "The dark accents are muted overall." : md.chroma > 16 ? "The dark accents are vivid." : "The dark accents sit at moderate chroma."} Gaps around the ring are hues the palette leaves out.</p></div>
    <div class="chart-card"><span class="label">Hardest pairs for deuteranopia</span>${ths.map(t => `<div style="display:grid;gap:6px"><span style="font-size:12.5px;font-weight:600">${t.name}</span><div class="pairs">${pairs(t)}</div></div>`).join("")}
     <p class="note">Each row shows the pair with normal vision, then as seen with deuteranopia. Bars show the simulated ΔE; below 4, the pair is easy to confuse.</p></div>
   </div>
   <div class="chart-card"><span class="label">Accent lightness spread${has_flavours ? " · every flavour" : ""}</span>${spreadSVG(ths.map(t => ({ label: t.name, m: t.m })))}
    <p class="note">Accents span ${ml.spread.toFixed(0)} lightness points in ${p.names.light} and ${md.spread.toFixed(0)} in ${p.names.dark}. A narrow band means no accent jumps out brighter than the others.</p></div>
   ${p.custom ? "" : `<div class="chart-card"><span class="label">How this page maps the palette</span><p class="note">${p.map} ${p.ramps ? "" : "Shade ramps are derived here in OKLCH from each official accent, holding its hue and tapering chroma toward the ends; the official color is kept exactly at its nearest step."}</p></div>`}
   <div class="chart-card"><span class="label">Grayscale print test · shapes${has_flavours ? " · every flavour" : ""}</span><div class="gray-grid">${ths.map(grayTest).join("")}</div>
    <p class="note">The same composition with color removed, as a black-and-white printer or a grayscale screen shows it. Accents survive only through lightness. <b>σL</b> is the standard deviation of their OKLCH lightness: how spread out the grays are overall (8 or more reads as clearly different grays, under 5 they bunch together). <b>ΔL</b> is the gap between the two closest: under about 5 points that pair merges into one gray.</p></div>
   ${p.custom
            ? `<div class="pn"><a class="btn" href="#" data-go="">All palettes</a><button class="btn primary" id="export-this">Export this palette</button></div>`
            : `<div class="pn"><a class="btn" href="#${prev.id}" data-go="${prev.id}">← ${prev.name}</a><a class="btn" href="#" data-go="">All palettes</a><a class="btn" href="#${next.id}" data-go="${next.id}">${next.name} →</a></div>`}
  </div>`;
}

// Wires a freshly inserted body; returns its Reactors
export function wireBody(p: Palette): Reactor[] {
    document.getElementById("viewseg")!.onclick = e => {
        const b = (e.target as HTMLElement).closest("button");
        if (!b) return;
        focus_key._value = null; // silent: the view change redraws anyway
        view.value = b.dataset.v as View;
    };
    const af = document.getElementById("allfl") as HTMLInputElement | null;
    if (af) af.onchange = () => { focus_key._value = null; all_flavours.value = af.checked; };
    (document.getElementById("cvd") as HTMLSelectElement).onchange = e => cvd.value = (e.target as HTMLSelectElement).value;

    return [Reactor(() => drawStage(p)), Reactor(() => drawCvd(p))];
}

//// Page

export function PalettePage(p: Palette): Reactor[] {
    page.palette = p;
    const { i, prev, next } = neighbours(p);
    bar.innerHTML = `<a class="brand" href="#" data-go=""><i></i>Color Palettes</a>
  ${selectHTML("jump", [...PALETTES.map(x => [x.id, x.name]), ["create", "Create your own…"]], p.id, "Jump to palette")}
  <a class="btn" href="#${prev.id}" data-go="${prev.id}" aria-label="Previous palette: ${prev.name}">←</a><a class="btn" href="#${next.id}" data-go="${next.id}" aria-label="Next palette: ${next.name}">→</a>`;
    app.innerHTML = `<div class="wrap"><div class="p-head">
   <div><span class="label">Palette ${i + 1} of ${PALETTES.length}</span><h1 style="margin-top:6px">${p.name}</h1>${p.description ? `<p class="desc">${p.description}</p>` : ""}<p class="byline">${[p.by, p.year, p.license].filter(Boolean).join(" · ")}</p>${p.why ? `<p class="why">${p.why}</p>` : ""}</div>
   <div class="facts"><div><span class="label">Basis</span><span>${tierChip(p)}</span></div>${p.method ? `<div><span class="label">Method</span><span>${p.method}</span></div>` : ""}<div><span class="label">Variants</span><span>${p.variants}</span></div><div><span class="label">Weighted score</span><span class="mono">${score(p).toFixed(0)} / 100 <a href="#" data-go="" style="font-family:var(--body);font-size:12.5px">adjust weights</a></span></div>${p.url ? `<div><span class="label">Source</span><a href="${p.url}" target="_blank" rel="noopener">${p.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a></div>` : ""}</div></div></div>
  ${paletteBodyHTML(p)}`;
    const reactors = wireBody(p);
    (document.getElementById("jump") as HTMLSelectElement).onchange = e => go((e.target as HTMLSelectElement).value);
    return reactors;
}

//// Global listeners (installed once)

export function installPaletteShortcuts(): void {
    document.addEventListener("fullscreenchange", () => document.querySelectorAll<HTMLElement>("[data-fs]").forEach(b =>
        b.textContent = document.fullscreenElement && document.fullscreenElement.id === "half-" + b.dataset.fs ? "Exit full screen" : "Full screen"));

    // l / d / s: light, dark, split · f: all flavours · ← →: previous / next palette
    document.addEventListener("keydown", e => {
        if ((e.target as HTMLElement).matches("input,select,textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
        const cur = page.palette;
        if (!cur || !document.getElementById("stage")) return;
        const k = e.key.toLowerCase();
        if (k === "l" || k === "d" || k === "s") {
            focus_key._value = null;
            view.value = k === "l" ? "light" : k === "d" ? "dark" : "split";
        } else if (k === "f" && cur.flavors.length) {
            focus_key._value = null;
            all_flavours.value = !all_flavours.value;
        } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !cur.custom) {
            const i = PALETTES.indexOf(cur);
            go(PALETTES[(i + (e.key === "ArrowRight" ? 1 : PALETTES.length - 1)) % PALETTES.length].id);
        }
    });
}
