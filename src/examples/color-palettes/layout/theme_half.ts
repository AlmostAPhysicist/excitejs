// theme_half.ts
//
// One theme panel ("half") of a palette page, painted in the theme itself
// through --p-* (base) and --a-* (accent) custom properties: base slots,
// accents, shade rows, extra official colors, and the in-use specimens
// (reading page, charts, controls, terminal, diff, code).

import { ACCENTS, ACCENT_NAMES, SLOTS, SLOT_NAMES, SLOT_ROLES, slotOr, themes, type Palette, type Theme, type ThemeColors } from "../palette_settings.ts";
import { MIXS, STEPS, contrast, derived, mix, okL, onColor, type RampStep } from "./color.ts";
import { sampleCharts, shapesSVG } from "./charts.ts";
import { metrics } from "./metrics.ts";
import { accentName, shade_modes } from "./state.ts";

const accentVar = (k: string) => `var(--a-${k})`;

// Inline style declaring the theme's --p-* and --a-* properties, with fallbacks for empty slots
export function themeVars(m: ThemeColors): string {
    const sub = slotOr(m, "tx2", m.tx!), faint = slotOr(m, "tx3", sub), bg2 = slotOr(m, "bg2", m.bg!), ui = slotOr(m, "ui", bg2), ui2 = slotOr(m, "ui2", ui);
    const vars: Record<string, string> = {
        "--p-bg": m.bg!, "--p-bg2": bg2, "--p-ui": ui, "--p-ui2": ui2,
        "--p-ui3": slotOr(m, "ui3", slotOr(m, "ui2", slotOr(m, "ui", faint))),
        "--p-tx3": faint, "--p-tx2": sub, "--p-tx": m.tx!,
    };
    ACCENTS.forEach(k => vars["--a-" + k] = m[k] || m.tx!);
    return Object.entries(vars).map(([a, b]) => `${a}:${b}`).join(";");
}

//// Shade rows

const SHADE_MODES = [["ramp", "Ramp 50–950"], ["tints", "Tints"], ["tones", "Tones"], ["shades", "Shades"]];

// A palette's own neutral ramp, when it has one: the "base" row of its
// official ramps, or its named neutrals for this theme
function officialNeutrals(p: Palette, h: Theme): RampStep[] | null {
    if (p.ramps && p.ramps.colors.base) return p.ramps.colors.base.map((x, i) => ({ s: p.ramps!.steps[i], hex: x }));
    const named = p.neutrals && p.neutrals[h.key];
    return named ? named.map(([s, hex]) => ({ s, hex })) : null;
}

export function shadesBlock(p: Palette, h: Theme): string {
    const m = h.m, mode = shade_modes[p.id + h.key] || "ramp", ramps = p.ramps;
    const neutral_src = m.tx2 || m.tx3 || m.tx!;
    let rows: { n: string; tag?: string; list: RampStep[] }[] = [], head: (number | string)[];

    const chip = (x: RampStep, label: string) => `<button class="sw${x.base ? " is-base" : ""}" data-hex="${x.hex}" style="background:${x.hex};color:${onColor(x.hex)}" title="${x.s ?? ""} ${x.hex}" aria-label="${label} ${x.s ?? ""} ${x.hex}${x.base ? " (official)" : ""}">${x.base ? `<b class="bt">${x.lab || "base"}</b>` : ""}<span><em>${typeof x.s === "string" ? x.s : x.hex.slice(1)}</em></span></button>`;

    if (mode === "ramp") {
        head = ramps ? ramps.steps : STEPS;
        rows = (ramps ? ACCENTS : ACCENTS.filter(k => m[k])).map(k => ({
            n: accentName(k),
            list: ramps ? ramps.colors[k].map((x, i) => ({ s: ramps.steps[i], hex: x, base: ramps.steps[i] === ramps.base_step[h.kind] })) : derived(m[k]!),
        }));
        const off = officialNeutrals(p, h);
        rows.push(off
            ? {
                n: "neutral", tag: "official", list: off.map(x => {
                    const b = x.hex.toLowerCase() === m.bg!.toLowerCase(), t = x.hex.toLowerCase() === m.tx!.toLowerCase();
                    return { ...x, base: b || t, lab: b ? "bg" : t ? "tx" : "" };
                }),
            }
            : { n: "neutral", tag: "derived", list: derived(neutral_src) });
    } else {
        const target = ({ tints: "#FFFFFF", tones: "#8A8A8A", shades: "#000000" } as Record<string, string>)[mode];
        head = MIXS.map(t => t ? Math.round(t * 100) + "%" : "base");
        rows = ACCENTS.filter(k => m[k]).map(k => ({ n: accentName(k), list: MIXS.map((t, i) => ({ s: head[i], hex: mix(m[k]!, target, t), base: i === 0 })) }));
        rows.push({ n: "neutral", tag: "from tx-2", list: MIXS.map((t, i) => ({ s: head[i], hex: mix(neutral_src, target, t), base: i === 0 })) });
    }

    const tag = mode === "ramp" ? (ramps ? "official 50–950 ramp" : `derived in OKLCH from each ${p.custom ? "chosen" : "official"} color`)
        : mode === "tints" ? "mixed toward white" : mode === "tones" ? "mixed toward mid-gray" : "mixed toward black";
    return `<div class="hd"><span class="plab">${`<span class="select pselect ptitle"><select data-shade="${h.key}" aria-label="Shade type">${SHADE_MODES.map(([v, t]) => `<option value="${v}" ${v === mode ? "selected" : ""}>${t}</option>`).join("")}</select></span>`}</span><span class="ptag">${tag} · ringed chip is the ${p.custom ? "chosen" : "official"} color</span></div>
  <div class="shades"><div class="steps"><span></span><div>${head.map(s => `<span>${s}</span>`).join("")}</div></div>
  ${rows.map(r => `<div class="srow${r.n === "neutral" ? " nrow" : ""}"><span class="n">${r.n}${r.tag ? `<small>${r.tag}</small>` : ""}</span><div class="chips">${r.list.map(x => chip(x, r.n)).join("")}</div></div>`).join("")}</div>`;
}

// Shade type selects redraw only their own block
export function wireShades(p: Palette): void {
    document.querySelectorAll<HTMLSelectElement>("[data-shade]").forEach(s => s.onchange = () => {
        const key = s.dataset.shade!;
        shade_modes[p.id + key] = s.value;
        const h = themes(p).find(t => t.key === key)!;
        document.querySelector(`[data-shades="${key}"]`)!.innerHTML = shadesBlock(p, h);
        wireShades(p);
    });
}

//// In-use specimens

function codeSample(): string {
    const s = (k: string, t: string) => `<span style="color:var(--a-${k})">${t}</span>`, t2 = (t: string) => `<span style="color:var(--p-tx2)">${t}</span>`, t3 = (t: string) => `<span style="color:var(--p-tx3)">${t}</span>`;
    return [
        t3("// warm the reading lamp after sunset"),
        `${s("gr", "import")} ${s("bl", "{ dim }")} ${s("gr", "from")} ${s("cy", '"./light"')}${t2(";")}`,
        "",
        `${s("gr", "const")} ${s("bl", "KELVIN")} ${t2("=")} ${s("pu", "2700")}${t2(";")}`,
        `${s("gr", "export function")} ${s("or", "lamp")}${t2("(")}${s("bl", "room")}${t2(") {")}`,
        `  ${s("gr", "if")} ${t2("(!")}${s("bl", "room")}${t2(".")}${s("bl", "occupied")}${t2(")")} ${s("gr", "return")} ${s("ye", "null")}${t2(";")}`,
        `  ${s("gr", "return")} ${s("or", "dim")}${t2("(")}${s("bl", "room")}${t2(", {")} ${s("bl", "temp")}${t2(":")} ${s("bl", "KELVIN")}${t2(",")} ${s("bl", "level")}${t2(":")} ${s("pu", "0.4")} ${t2("});")}`,
        `${t2("}")}  ${s("re", "// FIXME")} ${s("ma", "@hue")}`,
    ].join("\n");
}

function inUse(m: ThemeColors): string {
    const ks = ACCENTS.filter(k => m[k]), A = accentVar, c = sampleCharts(m);
    const tint = (k: string, pc: number) => `color-mix(in oklab, var(--a-${k}) ${pc}%, var(--p-bg))`;

    const page = `<div class="spec"><nav><span class="nl">Library</span><span class="on">Reading list</span><span>Highlights</span><span>Archive</span><span class="nl">Tags</span>${ks.slice(0, 4).map(k => `<span><b style="color:${A(k)}">●</b> ${accentName(k)}</span>`).join("")}</nav>
  <main><div><h4>The elusiveness of digital paper</h4><p class="muted">Saved 3 days ago · 8 min read · <span style="color:${A(ks[0])}">●</span> ${ACCENT_NAMES[ks[0]]}</p></div>
  <p>Screens emit light while paper reflects it, so a page that feels gentle on paper can glare on a monitor. This paragraph is set in the theme's body text at reading size so you can judge it over a few lines. <a href="#" onclick="return false">Links use the blue accent</a>, and <mark>highlighted passages</mark> use a yellow tint.</p>
  <blockquote>Color is a tool for meaning, not decoration.</blockquote>
  <div class="btns"><span style="background:${A("bl")};color:${onColor(m.bl || m.tx!)}">Save</span><span style="background:var(--p-bg2);border:1px solid var(--p-ui3)">Share</span><span style="color:${A("re")};border:1px solid ${tint("re", 40)}">Delete</span></div>
  <div class="tags">${ks.map(k => `<span style="background:${tint(k, 16)};color:${A(k)}">${accentName(k)}</span>`).join("")}</div>
  <div class="alerts"><div style="background:${tint("gr", 12)};border-color:${A("gr")}">Synced to all devices.</div><div style="background:${tint("ye", 14)};border-color:${A("ye")}">Two highlights could not be matched.</div><div style="background:${tint("re", 12)};border-color:${A("re")}">The source page is no longer available.</div></div></main></div>`;

    const term = `<span style="color:${A("gr")}">~/notes</span> <span style="color:${A("bl")}">main</span> <span style="color:var(--p-tx3)">❯</span> git status -s
<span style="color:${A("gr")}"> A</span> palettes/catppuccin.md
<span style="color:${A("ye")}"> M</span> index.html
<span style="color:${A("re")}"> D</span> old-theme.css
<span style="color:var(--p-tx3)">??</span> drafts/
<span style="color:${A("gr")}">~/notes</span> <span style="color:${A("bl")}">main</span> <span style="color:var(--p-tx3)">❯</span> ls
<span style="color:${A("bl")}">drafts/</span>  <span style="color:${A("cy")}">build.sh</span>  index.html  <span style="color:${A("pu")}">photo.jpg</span>  <span style="color:${A("ma")}">notes.zip</span>
<span style="color:${A("re")}">error</span>: lint failed in 2 files <span style="color:var(--p-tx3)">(0.4s)</span>
<span style="color:${A("gr")}">~/notes</span> <span style="color:var(--p-tx3)">❯</span> <span class="caret"></span>`;

    const diff = `<span style="color:${A("cy")}">@@ -12,4 +12,5 @@</span> function lamp(room) {
<span style="background:${tint("re", 14)};color:${A("re")}">-  const level = 0.8;</span>
<span style="background:${tint("gr", 14)};color:${A("gr")}">+  const level = room.evening ? 0.4 : 0.8;</span>
<span style="background:${tint("gr", 14)};color:${A("gr")}">+  const warmth = KELVIN;</span>
   return dim(room, { level });`;

    const ctrls = `<div class="ctrls"><div class="r"><span><span class="tg on"></span>Night mode</span><span><span class="tg"></span>Sync</span></div>
  <div class="r"><span><span class="cb on">✓</span>Spellcheck</span><span><span class="cb"></span>Line numbers</span></div>
  <div class="r"><span><span class="rd on"></span>Serif</span><span><span class="rd"></span>Sans</span><span><span class="rd"></span>Mono</span></div>
  <div class="fieldu">Search<div>warm paper<span class="caret"></span></div></div></div>`;

    const levels = [82, 64, 47, 35, 20];
    const prog = `<div class="prog">${ks.slice(0, 5).map((k, i) => `<div style="display:grid;grid-template-columns:62px 1fr 34px;gap:8px;align-items:center;height:auto;background:none;font-size:12px"><span style="color:var(--p-tx2)">${accentName(k)}</span><div><i style="width:${levels[i]}%;background:${A(k)}"></i></div><span class="mono" style="color:var(--p-tx2);font-size:11px">${levels[i]}%</span></div>`).join("")}</div>`;

    // calendar days 3, 6, 9, 13, 16, 20 are tinted with an accent; day 11 is "today"
    const cal_marks: Record<number, string> = { 2: "bl", 5: "gr", 8: "re", 12: "pu", 15: "ye", 19: "cy" };
    const status = `<div class="pills"><span style="color:${A("gr")}">Operational</span><span style="color:${A("ye")}">Degraded</span><span style="color:${A("re")}">Outage</span><span style="color:${A("bl")}">Maintenance</span></div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div class="avatars">${ks.slice(0, 5).map((k, i) => `<i style="background:${A(k)};color:${onColor(m[k]!)}">${"ASMJK"[i]}</i>`).join("")}</div><span style="font-size:12px;color:var(--p-tx2)">5 editing</span></div>
  <div class="cal">${["M", "T", "W", "T", "F", "S", "S"].map(d => `<span class="h">${d}</span>`).join("")}${Array.from({ length: 21 }, (_, i) => {
        const k = cal_marks[i];
        return `<span style="${k && m[k] ? `background:${tint(k, 22)};color:var(--p-tx);font-weight:600` : ""}${i === 10 ? ";outline:1.5px solid var(--a-or)" : ""}">${i + 1}</span>`;
    }).join("")}</div>`;

    const anim = `<div class="anim"><div><span class="spin"></span>spinner</div><div><span class="pulse">${ks.slice(0, 4).map(k => `<i style="background:${A(k)}"></i>`).join("")}</span>pulse</div><div><span class="orbit">${ks.slice(0, 4).map(k => `<i style="background:${A(k)}"></i>`).join("")}</span>orbit</div><div><span class="wave">${ks.map((k, i) => `<i style="background:${A(k)};animation-delay:${i * .09}s"></i>`).join("")}</span>equalizer</div><div style="grid-column:1 / -1"><span class="loadbar"><i></i></span>loading</div><div><span class="breath" style="background:${A("gr")}"></span>status</div></div>`;

    const card = (t: string, s: string, b: string, cls = "") => `<div class="card-u ${cls}"><div class="ct">${t}<small>${s}</small></div>${b}</div>`;
    return `<div class="blk"><div class="hd"><span class="plab">In use</span><span class="ptag">sample data</span></div>${page}
  <div class="use">
   ${card("Line chart", c.lk.map(k => accentName(k)).join(", "), c.line)}
   ${card("Bar chart", "every accent", c.bars)}
   ${card("Scatter", "4 clusters", c.sc)}
   ${card("Donut", "share", c.don)}
   ${card("Heatmaps", "accent mixed into bg", c.heat)}
   ${card("Sparklines", "dashboard rows", `<div style="display:grid;gap:8px">${c.spark}</div>`)}
   ${card("Shapes & dots", "composition", shapesSVG(m))}
   ${card("Motion", "respects reduced motion", anim)}
   ${card("Controls", "toggles, checks, radios", ctrls)}
   ${card("Progress", "bars", prog)}
   ${card("Status & team", "pills, avatars, calendar", status)}
   ${card("Terminal", "git + ls", `<pre class="term">${term}</pre>`)}
   ${card("Diff", "added / removed", `<pre class="term">${diff}</pre>`, "wide")}
  </div>
  <pre class="code">${codeSample()}</pre></div>`;
}

//// The panel

export function ThemeHalf(p: Palette, h: Theme): string {
    const m = h.m, mt = metrics(p, h.key, m), faint = slotOr(m, "tx3", slotOr(m, "tx2", m.tx!));

    const base = SLOTS.map(k => m[k]
        ? `<button class="sw" data-hex="${m[k]}" style="background:${m[k]};color:${onColor(m[k]!)}" aria-label="${SLOT_NAMES[k]} ${m[k]}"><span>${SLOT_NAMES[k]}<em>${m[k]!.toUpperCase()}<br>${(p.labels && p.labels[k]) || SLOT_ROLES[k]}</em></span></button>`
        : `<div class="none" style="color:${faint}" title="No official ${SLOT_NAMES[k]}"><span>${SLOT_NAMES[k]}</span></div>`).join("");

    const accents = ACCENTS.map(k => {
        if (!m[k]) return `<div class="acc miss"><span class="c"></span><div class="m" style="color:var(--p-tx3)"><b>${accentName(k)}</b><span>none</span></div></div>`;
        const cr = contrast(m[k]!, m.bg!);
        return `<button class="sw acc" data-hex="${m[k]}" aria-label="${accentName(k)} ${m[k]}"><span class="c" style="background:${m[k]}"></span><div class="m"><b>${accentName(k)}</b><span style="color:${cr >= 4.5 ? "var(--p-tx)" : "var(--p-tx3)"}">${cr.toFixed(1)}:1</span></div><div class="m" style="color:var(--p-tx2)"><span>${m[k]!.toUpperCase()}</span><span>L${okL(m[k]!).toFixed(0)}</span></div></button>`;
    }).join("");

    const extras = ((p.extra || {})[h.key] || []).map(g => {
        let body = "";
        if (g.type === "row") body = `<div class="gsw">${g.sw.map(([n, x]) => `<button class="sw" data-hex="${x}"><i style="background:${x}"></i>${n}<small>${x.toUpperCase()}${contrast(x, m.bg!) >= 4.5 ? ` · ${contrast(x, m.bg!).toFixed(1)}:1` : ""}</small></button>`).join("")}</div>`;
        if (g.type === "runs") body = `<div class="gruns">${g.rows.map(([n, sw]) => `<div class="grun"><span class="n">${n}</span><div class="r">${sw.map(([sn, x]) => `<button class="sw" data-hex="${x}" style="background:${x};color:${onColor(x)}" title="${sn} ${x}"><span>${sn}</span></button>`).join("")}</div></div>`).join("")}</div>`;
        return `<div class="grp"><div class="gt">${g.title} <span class="ptag" style="margin-left:6px">${p.custom ? "custom" : "official"}</span></div>${g.note ? `<div class="gn">${g.note}</div>` : ""}${body}</div>`;
    }).join("");

    return `<section class="half ${h.kind}" id="half-${h.key}" data-kind="${h.kind}" data-key="${h.key}" style="${themeVars(m)}" aria-label="${p.name} ${h.name}"><div class="hin">
  <div class="h-top"><div><span class="plab">${h.kind === "light" ? "Light theme" : "Dark theme"}</span><h3>${p.name} ${h.name}</h3><div class="sub">bg ${m.bg!.toUpperCase()} · text ${mt.text.toFixed(1)}:1 · ${mt.aa}/${mt.n} accents pass AA · spread ${mt.spread.toFixed(0)}</div></div>
   <div class="acts"><button class="pbtn" data-focus="${h.key}">Focus</button><button class="pbtn" data-fs="${h.key}">Full screen</button></div></div>
  <div class="blk"><div class="hd"><span class="plab">Base</span><span class="ptag">${SLOTS.filter(k => m[k]).length} of 8 slots ${p.custom ? "set" : "official"}</span></div><div class="base">${base}</div></div>
  <div class="blk"><div class="hd"><span class="plab">Accents · contrast vs bg · lightness</span><span class="ptag">${(p.acc_note || {})[h.key] || "accents"}</span></div><div class="accs">${accents}</div></div>
  <div class="blk" data-shades="${h.key}">${shadesBlock(p, h)}</div>
  ${extras ? `<div class="blk"><div class="hd"><span class="plab">${p.custom ? "Extra colors" : "More official colors"}</span></div>${extras}</div>` : ""}
  ${inUse(m)}
 </div></section>`;
}
