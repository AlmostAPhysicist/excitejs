// kit.ts
//
// The small parts both pages (the guide and the docs) are made of.
//
//   el()          an element with a class and inner HTML
//   highlight()   code → HTML with syntax colors
//   Source()      a piece of a real source file, with notes beside it
//   Fold()        a fold-away block for source and longer asides
//   Snippet()     a short piece of code to read
//   Exercise()    a task with one answer folded away
//   Section()     a titled part of the guide

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html) node.innerHTML = html;
    return node;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// a token may span lines; each line gets its own tag, so lines can be wrapped one by one
const tag = (cls: string, text: string) => text.split("\n").map(t => t ? `<i class="${cls}">${escapeHtml(t)}</i>` : "").join("\n");

const KEYWORDS = new Set(("const let var function return if else for while of in new typeof import export from type interface "
    + "extends as null undefined true false this void break continue async await class").split(" "));
const TOKEN = /(\/\/.*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_$][\w$]*)|(=>|[-+*/%=<>!&|?]+)/g;

// c comment, s string, n number, k keyword, f a capitalized call (a factory), o operator
function highlightScript(code: string): string {
    let out = "", at = 0;
    for (const m of code.matchAll(TOKEN)) {
        out += escapeHtml(code.slice(at, m.index));
        at = m.index + m[0].length;
        const word = m[0];
        if (m[1]) out += tag("c", word);
        else if (m[2]) out += tag("s", word);
        else if (m[3]) out += tag("n", word);
        else if (m[5]) out += tag("o", word);
        else if (KEYWORDS.has(word)) out += tag("k", word);
        else if (/^[A-Z][a-z]/.test(word) && code[at] === "(") out += tag("f", word);
        else out += escapeHtml(word);
    }
    return out + escapeHtml(code.slice(at));
}

const highlightCss = (code: string) => escapeHtml(code)
    .replace(/(\/\*[\s\S]*?\*\/)/g, m => m.split("\n").map(t => `<i class="c">${t}</i>`).join("\n"))
    .replace(/(^|\n)([ \t]*)([\w-]+)(\s*:)(?=[^\n{]*;)/g, `$1$2<i class="k">$3</i>$4`);

const highlightHtml = (code: string) => escapeHtml(code)
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, m => m.split("\n").map(t => `<i class="c">${t}</i>`).join("\n"))
    .replace(/(&lt;\/?)([\w-]+)/g, `$1<i class="f">$2</i>`)
    .replace(/("[^"\n]*")/g, `<i class="s">$1</i>`);

export function highlight(code: string, lang = "ts"): string {
    return lang === "css" ? highlightCss(code) : lang === "html" ? highlightHtml(code) : highlightScript(code);
}

//// Cutting real source

function dedent(lines: string[]): string {
    const indent = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^ */)![0].length));
    return lines.map(l => l.slice(indent)).join("\n");
}

// From the first line containing `from`, up to (not including) the next line
// containing `to`; or that many lines, if `to` is a number. `extra` lines
// past that are included too.
export function excerpt(raw: string, from: string, to: string | number, extra = 0): string {
    const lines = raw.split(/\r?\n/);
    const a = lines.findIndex(l => l.includes(from));
    const b = typeof to === "number" ? a + to : lines.findIndex((l, i) => i > a && l.includes(to));
    if (a < 0 || b < 0) throw new Error(`excerpt "${from}" … "${to}" not found`);
    return dedent(lines.slice(a, b + extra));
}

const trimBlank = (lines: string[]) => lines.join("\n").replace(/^\s*\n/, "").replace(/\s+$/, "");
const noteHtml = (s: string) => escapeHtml(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*([^*]+)\*/g, "<em>$1</em>");

const REPO = "https://github.com/AlmostAPhysicist/excitejs/blob/main/";

// A piece of a real file, cut out when the page loads. Each note starts a
// segment at the first line containing its anchor, and sits beside it.
export function Source(file: string, raw: string, from: string, to: string | number, notes: [anchor: string, note: string][] = [], extra = 0): HTMLElement {
    const lines = excerpt(raw, from, to, extra).split("\n");
    const cuts: { at: number; note: string }[] = [];
    let start = 0;
    for (const [anchor, note] of notes) {
        const at = lines.findIndex((l, i) => i >= start && l.includes(anchor));
        if (at < 0) throw new Error(`note anchor "${anchor}" not found in ${file}`);
        cuts.push({ at, note });
        start = at + 1;
    }
    const segs: { code: string; note: string }[] = [];
    if (!cuts.length || cuts[0].at > 0) segs.push({ code: trimBlank(lines.slice(0, cuts[0]?.at)), note: "" });
    cuts.forEach((c, k) => segs.push({ code: trimBlank(lines.slice(c.at, cuts[k + 1]?.at)), note: c.note }));

    const fig = el("figure", "src");
    const cap = el("figcaption");
    const a = el("a", "", escapeHtml(file));
    a.href = REPO + file; a.target = "_blank"; a.rel = "noopener";
    cap.append(a);
    fig.append(cap);
    for (const s of segs) {
        if (!s.code) continue;
        const row = el("div", "src-seg" + (s.note ? " has-note" : ""));
        const pre = el("pre");
        pre.append(el("code", "", highlight(s.code)));
        row.append(pre);
        if (s.note) row.append(el("aside", "", noteHtml(s.note)));
        fig.append(row);
    }
    return fig;
}

export const Prose = (html: string) => el("div", "prose", html);

export function Fold(title: string, ...children: (HTMLElement | string)[]): HTMLElement {
    const box = el("details", "fold");
    box.append(el("summary", "", title));
    for (const c of children) box.append(typeof c === "string" ? Prose(c) : c);
    return box;
}

export function Snippet(code: string, lang = "js"): HTMLElement {
    const pre = el("pre", "snippet");
    pre.append(el("code", "", highlight(code.replace(/^\n+|\s+$/g, ""), lang)));
    return pre;
}

export function Note(title: string, html: string): HTMLElement {
    const box = el("aside", "note");
    box.append(el("h4", "", title), Prose(html));
    return box;
}

// A task for the reader, with one answer folded away
export function Exercise(task: string, ...answer: (HTMLElement | string)[]): HTMLElement {
    const box = el("div", "exercise");
    box.append(Prose(task), Fold("One way to do it", ...answer));
    return box;
}

export interface Section { id: string; title: string; parts: [id: string, title: string][]; node: HTMLElement }

// items: "## id | Title" starts a part; other strings are prose
export function Section(id: string, title: string, lead: string, items: (string | HTMLElement)[]): Section {
    const node = el("section", "section");
    node.id = id;
    node.append(el("h2", "", title), el("p", "lead", lead));
    const parts: [string, string][] = [];
    for (const item of items) {
        if (typeof item !== "string") { node.append(item); continue; }
        const m = item.match(/^## (\S+) \| (.+)$/);
        if (m) {
            const h = el("h3", "", m[2]);
            h.id = `${id}-${m[1]}`;
            parts.push([h.id, m[2]]);
            node.append(h);
        } else node.append(Prose(item));
    }
    return { id, title, parts, node };
}
