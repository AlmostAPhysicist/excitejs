// custom_io.ts
//
// Export the custom palette as a palette file (.ts, for palettes/), design
// tokens (W3C DTCG), CSS variables, Tailwind v4 or simple JSON; import any of
// those (or loosely named CSS / JSON from elsewhere) back; and the editor
// panel that does both. Parsing lives in palette_format.ts, shared with the
// palettes/ loader. Every format carries the palette's description.

import { Observable, Reactor } from "../../../core/index";
import { ACCENTS, ACCENT_NAMES, SLOTS, SLOT_NAMES } from "../palette_settings.ts";
import { EXT, fromCSS, fromJSON, slug, type ParsedPalette } from "./palette_format.ts";
import { esc, flash } from "./state.ts";
import { SLOT_ROLES_LONG, custom, pushHistory, type Side } from "./custom_model.ts";

//// Export

// Unique, slugged CSS / token names per slot ("x0"… for extras)
function tokenKeys(): Record<string, string> {
    const c = custom.value, used = new Set<string>(), out: Record<string, string> = {};
    const unique = (n: string) => {
        let k = n || "color", i = 2;
        while (used.has(k)) k = (n || "color") + "-" + i++;
        used.add(k);
        return k;
    };
    [...SLOTS, ...ACCENTS].forEach(s => out[s] = unique(slug(c.labels[s]) || (SLOTS.includes(s) ? SLOT_NAMES[s] : ACCENT_NAMES[s])));
    c.extras.forEach((e, i) => out["x" + i] = unique(slug(e.name) || "extra"));
    return out;
}

// One line, safe inside a /* */ comment
const oneLine = (s: string) => String(s || "").replace(/\s+/g, " ").replace(/\*\//g, "* /").trim();

// "// "-prefixed lines, wrapped near 76 columns
function lineComment(text: string): string {
    const words = oneLine(text).split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
        if (cur && cur.length + w.length + 1 > 76) { lines.push(cur); cur = w; }
        else cur = cur ? cur + " " + w : w;
    }
    if (cur) lines.push(cur);
    return lines.map(l => "// " + l).join("\n");
}

// A file name for the export
export function exportFileName(fmt: string): string {
    const base = slug(custom.value.name) || "palette";
    return fmt === "module" ? base.replace(/-/g, "_") + ".ts" : base + (fmt === "css" || fmt === "tailwind" ? ".css" : ".json");
}

// A palette module in the same shape as the built-in ones in palettes/
function exportModule(): string {
    const c = custom.value, q = JSON.stringify;
    const row = (md: Side, keys: string[]) => "[" + keys.map(k => c[md][k] ? q(c[md][k]) : "null").join(", ") + "]";
    const theme = (md: Side) => `    ${md}: makeTheme(\n        ${row(md, SLOTS)},\n        ${row(md, ACCENTS)},\n    ),`;
    const extras = (md: Side) => c.extras.filter(e => e[md]).map(e => `[${q(e.name || "extra")}, ${q(e[md])}]`);
    const has_extras = c.extras.some(e => e.light || e.dark);
    const labels = Object.entries(c.labels).filter(([, v]) => v);
    const credit = `${c.name || "Untitled palette"}${c.by ? " by " + c.by : ""}. Exported from the Color Palettes editor; put this file in palettes/ and it is listed with the others.`;
    return [
        `// ${exportFileName("module")}`,
        "//",
        ...(c.description ? [lineComment(c.description), "//"] : []),
        lineComment(credit),
        "",
        `import { makeTheme, ${has_extras ? "swatchRow, " : ""}type PaletteFile } from "../palette_settings.ts";`,
        "",
        "const palette: PaletteFile = {",
        `    id: ${q(slug(c.name) || "palette")},`,
        `    name: ${q(c.name || "Untitled palette")},`,
        `    description: ${q(oneLine(c.description))},`,
        `    by: ${q(c.by)},`,
        `    names: { light: ${q(c.names.light || "Light")}, dark: ${q(c.names.dark || "Dark")} },`,
        "    // base: bg, bg-2, ui, ui-2, ui-3, tx-3, tx-2, tx · accents: red, orange, yellow, green, cyan, blue, purple, magenta",
        theme("light"),
        theme("dark"),
        ...(labels.length ? [`    labels: { ${labels.map(([k, v]) => `${k}: ${q(v)}`).join(", ")} },`] : []),
        ...(has_extras ? [
            "    extra: {",
            ...(["light", "dark"] as Side[]).map(md => `        ${md}: [${extras(md).length ? `swatchRow("Extra colors", "", [${extras(md).join(", ")}])` : ""}],`),
            "    },",
        ] : []),
        "};",
        "",
        "export default palette;",
        "",
    ].join("\n");
}

function exportTokens(): string {
    const c = custom.value, K = tokenKeys();
    const mode = (md: Side) => {
        const base: Record<string, unknown> = {}, acc: Record<string, unknown> = {}, ext: Record<string, unknown> = {};
        SLOTS.forEach(s => { const v = c[md][s]; if (v) base[K[s]] = { "$value": v, "$description": SLOT_ROLES_LONG[s], "$extensions": { [EXT]: { slot: s } } }; });
        ACCENTS.forEach(s => { const v = c[md][s]; if (v) acc[K[s]] = { "$value": v, "$extensions": { [EXT]: { slot: s } } }; });
        c.extras.forEach((e, i) => { if (e[md]) ext[K["x" + i]] = { "$value": e[md], "$extensions": { [EXT]: { name: e.name } } }; });
        const o: Record<string, unknown> = { "$type": "color", base, accent: acc };
        if (Object.keys(ext).length) o.extra = ext;
        return o;
    };
    return JSON.stringify({
        "$description": c.description ? oneLine(c.description) : `${c.name}${c.by ? " by " + c.by : ""}. Light and dark color tokens exported from Color Palettes.`,
        "$extensions": { [EXT]: { name: c.name, author: c.by, light: c.names.light, dark: c.names.dark, description: oneLine(c.description) } },
        light: mode("light"),
        dark: mode("dark"),
    }, null, 2);
}

function exportCSS(tailwind: boolean): string {
    const c = custom.value, K = tokenKeys();
    const decl = (md: Side, ind: string) => {
        const lines: string[] = [];
        [...SLOTS, ...ACCENTS].forEach(s => { const v = c[md][s]; if (v) lines.push(`${ind}--${K[s]}: ${v}; /* slot:${s} */`); });
        c.extras.forEach((e, i) => { if (e[md]) lines.push(`${ind}--${K["x" + i]}: ${e[md]}; /* name:${String(e.name).replace(/\*\//g, "")} */`); });
        return lines.join("\n");
    };
    const head = `/* ${c.name}${c.by ? " by " + c.by : ""} · ${c.names.light} and ${c.names.dark} · exported from Color Palettes */\n`
        + (c.description ? `/* description: ${oneLine(c.description)} */\n` : "")
        + (tailwind ? `/* Tailwind CSS v4: add this after @import "tailwindcss"; then use classes like bg-${K.bg} or text-${K.re}. */\n` : "");
    let s = `${head}\n:root {\n  color-scheme: light;\n${decl("light", "  ")}\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n    color-scheme: dark;\n${decl("dark", "    ")}\n  }\n}\n`;
    if (tailwind) {
        const ks = [...[...SLOTS, ...ACCENTS].filter(x => c.light[x] || c.dark[x]).map(x => K[x]), ...c.extras.map((_, i) => K["x" + i])];
        s += `\n@theme inline {\n${ks.map(k => `  --color-${k}: var(--${k});`).join("\n")}\n}\n`;
    }
    return s;
}

function exportSimple(): string {
    const c = custom.value;
    const pick = (md: Side) => Object.fromEntries([...SLOTS, ...ACCENTS].filter(s => c[md][s]).map(s => [s, c[md][s]]));
    return JSON.stringify({
        name: c.name, author: c.by, description: oneLine(c.description), themes: { light: c.names.light, dark: c.names.dark },
        labels: Object.fromEntries(Object.entries(c.labels).filter(([, v]) => v)),
        light: pick("light"), dark: pick("dark"),
        extras: c.extras.map(e => ({ name: e.name, light: e.light, dark: e.dark })),
    }, null, 2);
}

// format key → [label, exporter, note]
export const EXPORTS: Record<string, [string, () => string, string]> = {
    module: ["Palette file (.ts)", exportModule, "A palette module in the same shape as the built-in ones. Save it in this example's palettes/ folder and it appears with the others (so do this page's CSS and JSON exports)."],
    tokens: ["Design tokens (JSON)", exportTokens, "Follows the W3C Design Tokens Community Group format ($value, $type), which tools such as Style Dictionary and Tokens Studio read. Slot ids are kept under $extensions so the file imports back here."],
    css: ["CSS variables", () => exportCSS(false), "Custom properties on :root, with the dark theme in a prefers-color-scheme media query. Use them as var(--name)."],
    tailwind: ["Tailwind v4", () => exportCSS(true), "The CSS variables plus an @theme block, so every color becomes a Tailwind utility (bg-…, text-…, border-…)."],
    simple: ["Simple JSON", exportSimple, "A flat object keyed by slot id. Easy to read from any language."],
};

//// Import

function applyImport(R: ParsedPalette): string {
    if (!R.n) throw "No colors were recognised. Paste design tokens, CSS custom properties or JSON exported from here.";
    pushHistory(true);
    const c = custom.value;
    (["light", "dark"] as Side[]).forEach(md => Object.assign(c[md], R[md]));
    Object.entries(R.labels).forEach(([k, v]) => { if (k in c.labels) c.labels[k] = v; });
    const xs = Object.entries(R.extras).filter(([, v]) => v && (v.light || v.dark));
    if (xs.length) c.extras = xs.map(([name, v]) => ({ name, light: v.light || null, dark: v.dark || null }));
    if (R.meta.name) c.name = R.meta.name;
    if (R.meta.author != null) c.by = R.meta.author;
    if (R.meta.light) c.names.light = R.meta.light;
    if (R.meta.dark) c.names.dark = R.meta.dark;
    if (R.meta.description) c.description = R.meta.description;
    const no_dark = !Object.keys(R.dark).length;
    return `Imported ${R.n} color values.${no_dark ? " No dark colors were found; use “Dark from light” to generate them." : ""}`;
}

// Parses and applies pasted text; returns a summary or throws a message
export function importText(text: string): string {
    const t = (text || "").trim();
    if (!t) throw "Paste something to import first.";
    if (t[0] === "{") {
        let j: any;
        try { j = JSON.parse(t); } catch (e) { throw "That JSON could not be read: " + (e as Error).message; }
        return applyImport(fromJSON(j));
    }
    return applyImport(fromCSS(t));
}

//// Import / export panel

export const io_mode = Observable<string | null>(null); // "import" | "export" | null
const export_format = Observable("tokens");
const $ = (id: string) => document.getElementById(id) as any;

function drawIO(onImported: () => void): void {
    const el = $("cu-io");
    if (!el) return;
    const mode = io_mode.value, fmt = export_format.value;
    document.querySelectorAll<HTMLElement>("[data-io]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.io === mode)));
    if (!mode) { el.innerHTML = ""; return; }

    if (mode === "export") {
        el.innerHTML = `<div class="io"><div class="io-top"><div class="seg" id="exp-fmt">${Object.entries(EXPORTS).map(([k, [n]]) => `<button data-f="${k}" aria-pressed="${k === fmt}">${n}</button>`).join("")}</div><span class="sp"></span><button class="btn" id="exp-save">Download ${esc(exportFileName(fmt))}</button><button class="btn primary" id="exp-copy">Copy</button></div>
   <p class="io-note">${EXPORTS[fmt][2]}${fmt === "tokens" ? ` <a href="https://www.designtokens.org/" target="_blank" rel="noopener">designtokens.org</a>` : ""}</p><textarea id="exp-out" readonly spellcheck="false" aria-label="Exported palette">${esc(EXPORTS[fmt][1]())}</textarea></div>`;
        $("exp-fmt").onclick = (e: Event) => {
            const b = (e.target as HTMLElement).closest("button");
            if (b) export_format.value = b.dataset.f!;
        };
        $("exp-save").onclick = () => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([$("exp-out").value], { type: "text/plain" }));
            a.download = exportFileName(fmt);
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        };
        $("exp-copy").onclick = () => {
            const ta = $("exp-out");
            const fallback = () => { ta.focus(); ta.select(); flash("Selected; press Ctrl/Cmd+C to copy"); };
            try { navigator.clipboard.writeText(ta.value).then(() => flash("Copied " + EXPORTS[fmt][0]), fallback); } catch (_) { fallback(); }
        };
        return;
    }

    el.innerHTML = `<div class="io"><div class="io-top"><b>Import a palette</b><span class="sp"></span><label class="btn" for="imp-file">Open a file…</label><input type="file" id="imp-file" accept=".json,.css,.txt,application/json,text/css" hidden><button class="btn primary" id="imp-go">Import</button></div>
   <p class="io-note">Paste design tokens (JSON), CSS custom properties or simple JSON, including anything exported from this page. Colors are matched to slots by their saved slot id, or by names like background, text, red or teal; anything else becomes a named extra color. Undo reverts an import.</p>
   <textarea id="imp-in" spellcheck="false" placeholder=":root {\n  --background: #fdf6e3;\n  --text: #586e75;\n  --red: #dc322f;\n}" aria-label="Palette to import"></textarea><span class="err" id="imp-msg" hidden></span></div>`;
    $("imp-file").onchange = (e: Event) => {
        const f = (e.target as HTMLInputElement).files![0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => $("imp-in").value = r.result;
        r.readAsText(f);
    };
    $("imp-go").onclick = () => {
        const msg = $("imp-msg");
        try {
            const ok = importText($("imp-in").value);
            onImported();
            msg.hidden = true;
            flash("Import complete");
            io_mode.value = null;
            flash(ok);
        } catch (err) {
            msg.hidden = false;
            msg.textContent = String(err);
        }
    };
}

// The panel's Reactor; onImported redraws the editor after an import
export const IoPanel = (onImported: () => void): Reactor =>
    Reactor(() => drawIO(onImported), { deps: [io_mode, export_format], initFn: true });
