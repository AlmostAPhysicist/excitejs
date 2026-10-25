// create_page.ts
//
// The palette editor: name fields, the slot table (light and dark columns),
// the suggestions panel for the selected cell, theme generation, import /
// export, and below it the full palette body (stage + analysis) for the
// custom palette.
//
// Reactors on this page:
//   selection                                   → editor highlight
//   selection, gen_method, gen_bg_l, sugg_signal → suggestions panel
//   body_signal                                 → palette body (disposes the previous body's Reactors)
//   io_mode, export_format                      → import / export panel (custom_io.ts)
//   gen_method                                  → method buttons
//
// Edits mutate the custom palette in place and call changed(), which saves,
// refreshes the table and bumps the two signals after a short debounce.

import { Observable, Reactor } from "../../../core/index";
import { ACCENTS, ACCENT_NAMES, SLOTS, SLOT_NAMES, SLOT_ROLES } from "../palette_settings.ts";
import { PALETTES } from "./palette_list.ts";
import { MIXS, contrast, derived, lch, mix, oklch, parseColor, type RampStep } from "./color.ts";
import { score } from "./metrics.ts";
import { paletteBodyHTML, wireBody } from "./palette_page.ts";
import {
    HUE_STD, baseAt, counterpart, custom, customPalette, fillBase, fitLightness, gen_bg_l, gen_method, generateMode, getVal,
    isAccent, isExtra, loadCustom, makeReadable, mirrorLightness, pushHistory, saveCustom, setVal, slotLabel,
    spreadLightnessChroma, startFrom, starter, undo, type Side,
} from "./custom_model.ts";
import { IoPanel, io_mode } from "./custom_io.ts";
import { app, bar, esc, flash, page, selectHTML } from "./state.ts";

const $ = (id: string) => document.getElementById(id) as any;

//// Editor state (kept across visits, like the custom palette itself)

const selection = Observable<{ mode: Side; slot: string }>({ mode: "light", slot: "bl" });
const body_signal = Observable(null); // fired (debounced) to redraw the palette body
const sugg_signal = Observable(null); // fired (debounced) to redraw the suggestions
let body_timer: number | undefined, sugg_timer: number | undefined;

const other = (mode: Side): Side => mode === "light" ? "dark" : "light";

// After any edit: save, refresh the table now, redraw the rest shortly (or right away for `full` edits)
function changed(full = false): void {
    saveCustom();
    refreshEditor();
    clearTimeout(body_timer);
    body_timer = setTimeout(() => body_signal.trigger(), full ? 0 : 160);
    clearTimeout(sugg_timer);
    sugg_timer = setTimeout(() => sugg_signal.trigger(), full ? 0 : 60);
}

function syncMetaFields(): void {
    const c = custom.value;
    ["cu-name", "cu-by", "cu-desc", "cu-ln", "cu-dn"].forEach((id, i) => $(id).value = [c.name, c.by, c.description, c.names.light, c.names.dark][i]);
}

//// Slot table

function cellHTML(mode: Side, s: string): string {
    const v = getVal(mode, s), clearable = s !== "bg" && s !== "tx", sel = selection.value;
    return `<div class="cell${v ? "" : " empty"}${sel.mode === mode && sel.slot === s ? " on" : ""}" data-cell="${mode}|${s}"><input type="color" value="${(v || "#808080").toLowerCase()}" aria-label="${mode} ${slotLabel(s)} color"><input type="text" class="hx" value="${v || ""}" placeholder="empty" spellcheck="false" aria-label="${mode} ${slotLabel(s)} value"><span class="cr"></span>${clearable ? `<button class="clr" title="Clear" aria-label="Clear ${mode} ${slotLabel(s)}">×</button>` : "<span class='clr-sp'></span>"}</div>`;
}

function drawEditor(): void {
    const c = custom.value;
    const row = (s: string) => `<tr><td class="slot"><b>${SLOTS.includes(s) ? SLOT_NAMES[s] : ACCENT_NAMES[s]}</b><small>${SLOTS.includes(s) ? SLOT_ROLES[s] : "accent"}</small></td><td><input class="nm" data-name="${s}" value="${esc(c.labels[s] || "")}" placeholder="${SLOTS.includes(s) ? SLOT_NAMES[s] : ACCENT_NAMES[s]}" aria-label="Name for ${s}"></td><td>${cellHTML("light", s)}</td><td>${cellHTML("dark", s)}</td></tr>`;
    $("cu-ed").innerHTML = `<table class="ed"><thead><tr><th>Slot</th><th>Name</th><th>${esc(c.names.light || "Light")}</th><th>${esc(c.names.dark || "Dark")}</th></tr></thead><tbody>
  <tr class="grp-r"><td colspan="4">Base · backgrounds, borders, text</td></tr>${SLOTS.map(row).join("")}
  <tr class="grp-r"><td colspan="4">Accents</td></tr>${ACCENTS.map(row).join("")}
  <tr class="grp-r"><td colspan="4">Extra colors · named, not part of the metrics</td></tr>
  ${c.extras.map((e, i) => `<tr><td class="slot"><button class="x-del" data-xdel="${i}" aria-label="Remove ${esc(e.name)}">Remove</button></td><td><input class="nm" data-xname="${i}" value="${esc(e.name)}" placeholder="name" aria-label="Extra color name"></td><td>${cellHTML("light", "x" + i)}</td><td>${cellHTML("dark", "x" + i)}</td></tr>`).join("")}
  <tr><td colspan="4"><button class="btn" id="cu-addx">+ Add a named color</button></td></tr></tbody></table>`;
    refreshEditor();
}

// Values, highlight and contrast readouts, without rebuilding the table
function refreshEditor(): void {
    const sel = selection.value;
    document.querySelectorAll<HTMLElement>("#cu-ed [data-cell]").forEach(c => {
        const [mode, s] = c.dataset.cell!.split("|") as [Side, string], v = getVal(mode, s), bg = custom.value[mode].bg!;
        c.classList.toggle("empty", !v);
        c.classList.toggle("on", sel.mode === mode && sel.slot === s);
        const ci = c.querySelector<HTMLInputElement>("input[type=color]")!;
        if (v) ci.value = v.toLowerCase();
        const hx = c.querySelector<HTMLInputElement>(".hx")!;
        if (document.activeElement !== hx) { hx.value = v || ""; hx.classList.remove("bad"); }
        const cr = c.querySelector<HTMLElement>(".cr")!;
        if (!v || s === "bg") { cr.textContent = ""; return; }
        const k = contrast(v, bg);
        cr.textContent = k.toFixed(1) + ":1";
        const textual = s === "tx" || s === "tx2" || isAccent(s) || isExtra(s);
        cr.className = "cr" + (textual ? " " + (k >= 4.5 ? "g" : k >= 3 ? "o" : "l") : "");
        cr.title = `contrast against ${mode} bg`;
    });
}

function selectCell(mode: Side, s: string): void {
    const sel = selection.value;
    if (sel.mode === mode && sel.slot === s) return;
    selection.value = { mode, slot: s };
}

//// Suggestions

function chipRow(mode: Side, s: string, list: (string | RampStep)[], cur: string): string {
    return `<div class="row">${list.map((x: any) => {
        const h = x.hex || x;
        return `<button data-apply="${mode}|${s}|${h}" title="${x.s != null ? x.s + " · " : ""}${h}" aria-label="Use ${h}" class="${h.toUpperCase() === (cur || "").toUpperCase() ? "cur" : ""}" style="background:${h}"></button>`;
    }).join("")}</div>`;
}

const option = (mode: Side, s: string, h: string, t: string, sub: string) =>
    `<button class="opt" data-apply="${mode}|${s}|${h}"><i style="background:${h}"></i><span>${t}<small>${h}${sub ? " · " + sub : ""}</small></span></button>`;

function drawSugg(): void {
    const el = $("cu-sugg");
    if (!el) return;
    const c = custom.value;
    let { mode, slot: s } = selection.value;
    if (isExtra(s) && !c.extras[+s.slice(1)]) { s = "bl"; selection._value = { mode, slot: s }; } // removed extra
    const m = c[mode], o = other(mode);

    let hex = getVal(mode, s);
    const empty = !hex;
    if (empty) hex = isAccent(s) ? fitLightness(.13, HUE_STD[s], m.bg!, 4.5) : SLOTS.includes(s) ? baseAt(mode, s) : lch(.6, .1, 200);
    const [L, C, H] = oklch(hex!), cr = contrast(hex!, m.bg!), textual = s === "tx" || s === "tx2" || isAccent(s) || isExtra(s), accentish = isAccent(s) || isExtra(s);
    const cp = counterpart(s, hex!, mode), other_cur = getVal(o, s);

    let h = `<div class="sg-head"><i style="background:${hex}"></i><div><b>${esc(slotLabel(s))}</b> · ${esc(c.names[mode] || mode)}<small>${empty ? "empty · suggestion shown" : hex} · L ${(L * 100).toFixed(0)} · C ${C.toFixed(3)} · ${H.toFixed(0)}°${s !== "bg" ? ` · ${cr.toFixed(1)}:1` : ""}</small></div></div>`;
    if (empty) h += `<div class="sg"><span class="t">Fill this slot</span><div class="opts">${option(mode, s, hex!, "Suggested", isAccent(s) ? "standard hue, 4.5:1" : "between bg and text")}</div></div>`;

    // matching color for the other theme, by the current method and by the alternative
    const cp_label = accentish ? (gen_method.value === "contrast" ? "Same contrast" : "Mirrored lightness") : s === "bg" ? "Matching background" : s === "tx" ? "Matching text" : "Same position in the ramp";
    const alt = () => {
        if (gen_method.value === "contrast") return mirrorLightness(hex!, m, c[o]);
        const [, c2, h2] = oklch(hex!);
        return fitLightness(c2, h2, c[o].bg!, cr);
    };
    h += `<div class="sg"><span class="t">For the ${esc(c.names[o] || o)} theme</span><div class="opts">${option(o, s, cp, cp_label, s !== "bg" ? contrast(cp, c[o].bg!).toFixed(1) + ":1" : "")}${accentish ? option(o, s, alt(), gen_method.value === "contrast" ? "Mirrored lightness" : "Same contrast", "") : ""}</div>
  ${other_cur ? `<small class="sg-note">Currently ${other_cur} (${s !== "bg" ? contrast(other_cur, c[o].bg!).toFixed(1) + ":1" : "background"})</small>` : ""}</div>`;

    if (textual && s !== "tx") {
        const aa = fitLightness(C, H, m.bg!, 4.5), aaa = fitLightness(C, H, m.bg!, 7);
        h += `<div class="sg"><span class="t">Readable on this background</span><div class="opts">${option(mode, s, aa, "AA · 4.5:1", contrast(aa, m.bg!).toFixed(1) + ":1")}${option(mode, s, aaa, "AAA · 7:1", contrast(aaa, m.bg!).toFixed(1) + ":1")}</div></div>`;
    }

    const toward = (t: string) => MIXS.map(x => mix(hex!, t, x));
    h += `<div class="sg"><span class="t">Ramp 50–950 · same hue</span>${chipRow(mode, s, derived(hex!), hex!)}<span class="t">Tints · + white</span>${chipRow(mode, s, toward("#FFFFFF"), hex!)}<span class="t">Tones · + gray</span>${chipRow(mode, s, toward("#8A8A8A"), hex!)}<span class="t">Shades · + black</span>${chipRow(mode, s, toward("#000000"), hex!)}<small class="sg-note">Click a cell to use it. The outlined cell is the current color.</small></div>`;
    if (accentish) h += `<div class="sg"><span class="t">Harmonies · same lightness and chroma</span><div class="opts">${([["Complement", 180], ["Analogous −30°", -30], ["Analogous +30°", 30], ["Triad +120°", 120], ["Triad −120°", -120]] as [string, number][]).map(([n, d]) => option(mode, s, lch(L, C, (H + d + 360) % 360), n, "")).join("")}</div></div>`;
    h += `<div class="sg"><span class="t">Whole ${esc(c.names[mode] || mode)} theme</span><div class="acts-s">
  ${SLOTS.includes(s) ? `<button class="btn" data-act="fill|${mode}">Rebuild base ramp from bg and text</button>` : ""}
  ${isAccent(s) && !empty ? `<button class="btn" data-act="spread|${mode}|${s}">Give every accent this lightness and chroma</button>` : ""}
  <button class="btn" data-act="aa|${mode}">Make every accent readable (4.5:1)</button></div></div>`;
    el.innerHTML = h;
}

//// Palette body (stage + analysis for the custom palette)

// Returns a cleanup that disposes the body's Reactors
function drawBody(): (() => void) | undefined {
    const b = $("cbody");
    if (!b) return;
    const c = custom.value, p = customPalette();
    page.palette = p;
    const few = (["light", "dark"] as Side[]).filter(md => ACCENTS.filter(k => c[md][k]).length < 2);
    $("cu-score").textContent = few.length ? "—" : `${score(p).toFixed(0)} / 100`;
    if (few.length) {
        b.innerHTML = `<div class="wrap"><div class="chart-card"><p class="note">Add at least two accents to each theme to see the full preview and analysis.</p></div></div>`;
        return;
    }
    const y = window.scrollY;
    b.innerHTML = paletteBodyHTML(p);
    const reactors = wireBody(p);
    $("export-this").onclick = () => {
        io_mode.value = "export";
        $("create").scrollIntoView({ behavior: "smooth" });
    };
    if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
    return () => reactors.forEach(r => r.dispose());
}

//// Wiring

function wireCreate(): void {
    const root = $("create");
    const c = () => custom.value;

    const meta: [string, (v: string) => void][] = [["cu-name", v => c().name = v], ["cu-by", v => c().by = v], ["cu-desc", v => c().description = v], ["cu-ln", v => c().names.light = v], ["cu-dn", v => c().names.dark = v]];
    meta.forEach(([id, f]) => $(id).oninput = (e: Event) => {
        pushHistory();
        f((e.target as HTMLInputElement).value);
        if (id === "cu-ln" || id === "cu-dn") {
            const th = document.querySelectorAll("#cu-ed thead th");
            th[2].textContent = c().names.light || "Light";
            th[3].textContent = c().names.dark || "Dark";
        }
        changed();
    });

    $("cu-start").onchange = (e: Event) => {
        const t = e.target as HTMLSelectElement, v = t.value;
        if (!v) return;
        pushHistory(true);
        if (v === "starter") starter(); else startFrom(v);
        t.value = "";
        syncMetaFields();
        drawEditor();
        changed(true);
        flash("Loaded. Undo reverts it.");
    };
    $("cu-undo").onclick = () => {
        if (!undo()) { flash("Nothing to undo"); return; }
        syncMetaFields();
        drawEditor();
        changed(true);
    };

    $("cu-meth").onclick = (e: Event) => {
        const b = (e.target as HTMLElement).closest("button");
        if (b) gen_method.value = b.dataset.m as "contrast" | "mirror";
    };
    $("cu-bgl").onchange = (e: Event) => gen_bg_l.value = +(e.target as HTMLSelectElement).value;
    root.querySelectorAll("[data-gen]").forEach((b: HTMLElement) => b.onclick = () => {
        pushHistory(true);
        generateMode(b.dataset.gen as Side);
        drawEditor();
        changed(true);
        flash(b.dataset.gen === "light" ? "Dark theme generated from light" : "Light theme generated from dark");
    });
    root.querySelectorAll("[data-io]").forEach((b: HTMLElement) => b.onclick = () => {
        io_mode.value = io_mode.value === b.dataset.io ? null : b.dataset.io!;
    });

    // slot table: select, clear, add / remove extras, rename, edit values
    const ed = $("cu-ed");
    const cellOf = (t: EventTarget | null) => (t as HTMLElement).closest<HTMLElement>("[data-cell]");
    ed.addEventListener("focusin", (e: Event) => {
        const cell = cellOf(e.target);
        if (cell) { const [m, s] = cell.dataset.cell!.split("|"); selectCell(m as Side, s); }
    });
    ed.addEventListener("click", (e: Event) => {
        const t = e.target as HTMLElement, cell = cellOf(t);
        if (cell && !t.closest(".clr")) { const [m, s] = cell.dataset.cell!.split("|"); selectCell(m as Side, s); }
        const x = t.closest(".clr");
        if (x) {
            const [m, s] = cellOf(x)!.dataset.cell!.split("|");
            pushHistory(true);
            setVal(m as Side, s, null);
            changed(true);
        }
        if (t.closest("#cu-addx")) {
            pushHistory(true);
            const light = lch(.55, .12, 200);
            c().extras.push({ name: "color " + (c().extras.length + 1), light, dark: null });
            c().extras[c().extras.length - 1].dark = counterpart("x", light, "light");
            selection._value = { mode: "light", slot: "x" + (c().extras.length - 1) };
            drawEditor();
            changed(true);
        }
        const d = t.closest<HTMLElement>("[data-xdel]");
        if (d) {
            pushHistory(true);
            c().extras.splice(+d.dataset.xdel!, 1);
            if (isExtra(selection.value.slot)) selection._value = { mode: "light", slot: "bl" };
            drawEditor();
            changed(true);
        }
    });
    ed.addEventListener("input", (e: Event) => {
        const t = e.target as HTMLInputElement, cell = cellOf(t);
        if (t.dataset.name) { pushHistory(); c().labels[t.dataset.name] = t.value.trim(); changed(); return; }
        if (t.dataset.xname) { pushHistory(); c().extras[+t.dataset.xname].name = t.value; changed(); return; }
        if (!cell) return;
        const [m, s] = cell.dataset.cell!.split("|") as [Side, string];
        if (t.type === "color") { pushHistory(); setVal(m, s, t.value.toUpperCase()); changed(); return; }
        if (t.classList.contains("hx")) {
            const v = t.value.trim();
            if (!v) {
                if (s !== "bg" && s !== "tx") { pushHistory(); setVal(m, s, null); t.classList.remove("bad"); changed(); }
                return;
            }
            const r = parseColor(v);
            if (!r) { t.classList.add("bad"); return; }
            t.classList.remove("bad");
            pushHistory();
            setVal(m, s, r.hex);
            changed();
        }
    });

    // suggestions: apply a color or a whole-theme action
    $("cu-sugg").addEventListener("click", (e: Event) => {
        const t = e.target as HTMLElement, a = t.closest<HTMLElement>("[data-apply]");
        if (a) {
            const [m, s, h] = a.dataset.apply!.split("|");
            pushHistory(true);
            setVal(m as Side, s, h);
            changed(true);
            flash(`${slotLabel(s)} (${c().names[m as Side] || m}) set to ${h}`);
            return;
        }
        const b = t.closest<HTMLElement>("[data-act]");
        if (b) {
            const [act, m, s] = b.dataset.act!.split("|");
            pushHistory(true);
            if (act === "fill") fillBase(m as Side);
            if (act === "aa") makeReadable(m as Side);
            if (act === "spread") spreadLightnessChroma(m as Side, s);
            changed(true);
            flash("Updated. Undo reverts it.");
        }
    });
}

//// Page

export function CreatePage(): Reactor[] {
    page.palette = null;
    bar.innerHTML = `<a class="brand" href="#" data-go=""><i></i>Color Palettes</a><a class="btn ghost" href="#" data-go="">All palettes</a>`;
    loadCustom();
    const c = custom.value;
    app.innerHTML = `<div class="wrap" id="create">
  <div class="p-head">
   <div><span class="label">Build your own</span><h1 style="margin-top:6px">Create a palette</h1>
    <p class="why">Set a background, text colors and accents for a light and a dark theme. Click any color to get suggestions: its ramp, tints, tones and shades, versions that stay readable, and a matching color for the other theme. Every chart and metric below updates as you edit. Your palette is saved in this browser.</p></div>
   <div class="facts">
    <label class="fl-in"><span class="label">Palette name</span><input type="text" id="cu-name" value="${esc(c.name)}"></label>
    <label class="fl-in"><span class="label">Author</span><input type="text" id="cu-by" value="${esc(c.by)}" placeholder="optional"></label>
    <label class="fl-in"><span class="label">Description</span><textarea id="cu-desc" rows="2" placeholder="optional · one line, written at the top of every export">${esc(c.description)}</textarea></label>
    <div class="fl-two"><label class="fl-in"><span class="label">Light theme</span><input type="text" id="cu-ln" value="${esc(c.names.light)}"></label><label class="fl-in"><span class="label">Dark theme</span><input type="text" id="cu-dn" value="${esc(c.names.dark)}"></label></div>
    <div><span class="label">Weighted score</span><span class="mono" id="cu-score"></span></div></div></div>
  <div class="ctool">
   <span class="grp-l">Start from ${selectHTML("cu-start", [["", "Choose…"], ["starter", "Generated starter"], ...PALETTES.map(p => [p.id, `${p.name} (${p.names.light} + ${p.names.dark})`])], "", "Start from")}</span>
   <button class="btn" id="cu-undo">Undo</button>
   <span class="sp"></span>
   <button class="btn" data-io="import">Import</button><button class="btn primary" data-io="export">Export</button></div>
  <div class="gen"><b style="color:var(--ink)">Generate the other theme</b>
   <div class="seg" id="cu-meth" aria-label="Accent method"><button data-m="contrast">Match contrast</button><button data-m="mirror">Mirror lightness</button></div>
   <span class="grp-l">Dark background ${selectHTML("cu-bgl", [[".15", "Deep (L 0.15)"], [".19", "Standard (L 0.19)"], [".24", "Soft (L 0.24)"]], String(gen_bg_l.value).replace(/^0/, ""), "Dark background lightness")}</span>
   <button class="btn" data-gen="light">Dark from light →</button><button class="btn" data-gen="dark">← Light from dark</button>
   <p class="gen-note">Hue and chroma are kept. Base colors keep their position between background and text. With <b>Match contrast</b>, each accent gets the lightness that gives it the same contrast against the new background, so both themes read equally well; <b>Mirror lightness</b> places accents like base colors. Undo reverts it.</p></div>
  <div id="cu-io"></div>
  <div class="ed-grid"><div class="ed-card" id="cu-ed"></div><aside class="sugg" id="cu-sugg" aria-label="Suggestions"></aside></div>
 </div><div id="cbody"></div>`;

    drawEditor();
    const reactors = [
        Reactor(refreshEditor, { deps: [selection] }),
        Reactor(drawSugg, { deps: [selection, gen_method, gen_bg_l, sugg_signal], initFn: true }),
        Reactor(drawBody, { deps: [body_signal], initFn: true }),
    ];
    wireCreate();
    reactors.push(
        Reactor(() => {
            const m = gen_method.value;
            $("cu-meth").querySelectorAll("button").forEach((b: HTMLElement) => b.setAttribute("aria-pressed", String(b.dataset.m === m)));
        }),
        IoPanel(() => { syncMetaFields(); drawEditor(); changed(true); }),
    );
    return reactors;
}
