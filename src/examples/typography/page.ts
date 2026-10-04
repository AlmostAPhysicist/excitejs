// page.ts
//
// Typography: a font playground. Paste GitHub folder links (or drop font files)
// and every .ttf / .otf / .woff / .woff2 inside is loaded with the FontFace
// API and grouped into families by file name. Pick a family for the whole
// document or just the selection, then style text with size, bold, italic,
// colours and markdown shortcuts.
//
// Event handlers only write state; Reactors write the DOM, on two stages:
//
//   sources ──────────────────────► [render] source list, saved links
//   families, doc_fam ────────────► [render] family list, family <select>, editor font
//   code_fam ─────────────────────► [render] --code-font, the font of code (Fira Code by default)
//   shown_fam, families ──────────► [render] face bar, status font
//   edits ────────────────────────► [render] word count
//   selection, families, doc_fam ─► [sync]   scope pill, toolbar size / family / B / I
//
// "render" is created first, so it flushes first: the <select> is rebuilt
// before the toolbar sync picks its value. Loading a folder of 36 fonts
// fires a progress update per file; each flush redraws the source list once.
//
// Two reactors use their returned cleanup (preaction) as a timer: the toast
// hides itself after a moment, and the draft is saved 600ms after the last
// edit, because each new edit clears the previous timer.

import { Observable, Reactor, Scheduler } from "../../core/index";
import "./page.css";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type ThemeMode = "system" | "light" | "dark";
type FontStyle = "normal" | "italic";

interface Face {
    family: string;
    key: string;
    weight: string; // CSS font-weight descriptor, "100 900" for variable fonts
    style: FontStyle;
    label: string;
    sort_w: number;
    file: string;
}

interface Family {
    id: string;
    name: string;
    css: string; // font-family stack
    faces: Face[];
    key?: string;
    css_name?: string; // the name registered with document.fonts
    source_id?: string;
    builtin?: boolean;
}

interface Source {
    id: string;
    link: string;
    label: string;
    sub?: string;
    state: "loading" | "ok" | "error";
    note: string;
    kind: "github" | "local";
}

interface GithubTarget {
    owner: string;
    repo: string;
    ref_parts?: string[]; // ref and path, not yet split: a branch name can contain slashes
    path?: string;
}

interface GithubTree {
    tree: { path: string; type: string; size?: number }[];
}

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const BOOK_LINK = "https://github.com/nicoverbruggen/ebook-fonts/tree/13834303660d071657b1aa885da02c2d075b5368/fonts/core";
const CODE_LINK = "https://github.com/ryanoasis/nerd-fonts/tree/master/patched-fonts/FiraCode";
const PREFERRED_START = "Libron";        // first document font, once BOOK_LINK loads
const CODE_FAMILY = "Fira Code Nerd Font Mono"; // default font of code, once any source provides it
const MAX_FILES = 200;

const BUILTINS: Family[] = [
    { id: "sys-serif", name: "System serif", css: 'Georgia, "Times New Roman", serif', faces: [], builtin: true },
    { id: "sys-sans", name: "System sans", css: 'system-ui, -apple-system, "Segoe UI", sans-serif', faces: [], builtin: true },
    { id: "sys-mono", name: "System mono", css: "ui-monospace, Menlo, Consolas, monospace", faces: [], builtin: true },
];

// The four faces every reading family should have: [label, style, weight]
const CORE_FACES: [string, FontStyle, number][] = [
    ["Regular", "normal", 400], ["Italic", "italic", 400], ["Bold", "normal", 700], ["Bold Italic", "italic", 700],
];
const PIPS = ["R", "I", "B", "BI"];

const ACCENTS = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "magenta"];

const SAMPLE = `### CHAPTER I.

# Down the Rabbit-Hole

Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice “without pictures or conversations?”

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, “Oh dear! Oh dear! I shall be late!” (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.

In another moment down went Alice after it, never once considering how in the world she was to get out again.

The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.

---

## Specimen

> Typography is a minor technicality of civilized life.
>
> — Stanley Morison (typographer who directed the design of Times New Roman)

> A man who would letterspace lower case would steal sheep, Frederic Goudy liked to say. If this wisdom needs updating, it is chiefly to add that a woman who would letterspace lower case would steal sheep as well.
>
> — Robert Bringhurst (Canadian poet and typographer), *The Elements of Typographic Style*

Numerals: chapter 1 of 24, page 0371, the year 1859. Punctuation: “quotes,” apostrophes’ curl, the dash — and the ellipsis…

Hamburgefonstiv · Il1| O0 · rn m · ff fi fl ffi · Åsa Ñoño Œuvre

The quick brown fox jumps over the lazy dog. **THE QUICK BROWN FOX** *jumps over the lazy dog.* ***Both at once, for the bold italic.***

Code is set in ${CODE_FAMILY}, ligatures and all:

\`\`\`
a = 2
b = 3
if a >= b:
    println(a - b)
else:
    println(b - a)
\`\`\`

Nerd Font icons work in inline code too: \`\uE0A0 main\`, \`\uF09B github\`.
`;

const TEMPLATE = `
<div class="app">
  <aside class="rail" aria-label="Font sources">
    <div class="brand">
      <h1>Typography <span>/ fonts</span></h1>
      <div class="theme" role="group" aria-label="Theme">
        <button type="button" data-theme-set="system">auto</button>
        <button type="button" data-theme-set="light">light</button>
        <button type="button" data-theme-set="dark">dark</button>
      </div>
    </div>

    <section class="add">
      <p class="label">Add from GitHub</p>
      <form id="add-form">
        <textarea id="repo-input" spellcheck="false" placeholder="https://github.com/owner/repo/tree/main/fonts&#10;one link per line, or owner/repo/path"></textarea>
        <div class="add-row">
          <button class="btn primary" type="submit" id="fetch-btn">Fetch fonts</button>
          <span class="hint">.ttf .otf .woff .woff2</span>
        </div>
        <p class="msg err" id="fetch-msg" role="status" hidden></p>
      </form>
    </section>

    <section>
      <p class="label">Sources <em id="src-count"></em></p>
      <ul class="sources" id="source-list"></ul>
      <label class="drop" id="drop">
        <input type="file" id="file-input" multiple accept=".ttf,.otf,.woff,.woff2">
        Drop font files here, or choose files
      </label>
    </section>

    <section>
      <p class="label">Families <em id="fam-count"></em></p>
      <ul class="fams" id="fam-list"></ul>
    </section>
  </aside>

  <main class="work">
    <div class="toolbar" role="toolbar" aria-label="Formatting">
      <div class="group font">
        <select class="tsel" id="family" aria-label="Font family"></select>
      </div>
      <div class="group">
        <button class="tb" type="button" id="size-down" aria-label="Smaller">−</button>
        <input class="tnum" id="size" type="number" min="8" max="160" step="1" value="20" aria-label="Font size in pixels">
        <button class="tb" type="button" id="size-up" aria-label="Larger">+</button>
        <span class="unit">px</span>
      </div>
      <span class="sep" aria-hidden="true"></span>
      <div class="group">
        <button class="tb b" type="button" id="bold" aria-label="Bold" title="Bold (Ctrl/⌘ B)">B</button>
        <button class="tb i" type="button" id="italic" aria-label="Italic" title="Italic (Ctrl/⌘ I)">I</button>
        <details class="pop" id="fg-pop">
          <summary class="tb" aria-label="Text color" title="Text color">
            <span class="stack"><span class="glyph">A</span><span class="chip" id="fg-chip"></span></span>
          </summary>
          <div class="panel">
            <div class="swatches" id="fg-swatches"></div>
            <label class="custom" for="fg-custom">Custom color <input type="color" id="fg-custom" value="#205ea6"></label>
          </div>
        </details>
        <details class="pop" id="bg-pop">
          <summary class="tb" aria-label="Background color" title="Background color">
            <span class="stack"><span class="glyph hl">A</span><span class="chip" id="bg-chip"></span></span>
          </summary>
          <div class="panel">
            <div class="swatches" id="bg-swatches"></div>
            <label class="custom" for="bg-custom">Custom color <input type="color" id="bg-custom" value="#faeec6"></label>
          </div>
        </details>
        <button class="tb" type="button" id="clear" title="Clear formatting in selection" aria-label="Clear formatting">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3h8M7 3l-2 10M10 9l4 4M14 9l-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </button>
      </div>
      <span class="scope" id="scope">whole document</span>
    </div>

    <div class="facebar" id="facebar"></div>

    <div class="stage">
      <article class="sheet" id="editor" contenteditable="true" spellcheck="false" aria-label="Playground text"></article>
    </div>

    <div class="statusline">
      <span id="stat-words">0 words</span>
      <span id="stat-font"></span>
      <span class="md">Markdown shortcuts: # ## &gt; - **bold** *italic* \`code\` \`\`\`↵ ·<button class="linkbtn" type="button" id="md-open">Edit as Markdown</button></span>
    </div>
  </main>
</div>

<dialog class="mdlg" id="md-dialog">
  <form method="dialog">
    <h2>Markdown</h2>
    <textarea id="md-text" spellcheck="false" aria-label="Markdown source"></textarea>
    <div class="row">
      <span class="hint">Keeps headings, lists, quotes, bold, italic and code. Fonts and colors stay in the editor only.</span>
      <button class="btn" type="button" id="md-copy">Copy</button>
      <button class="btn" type="button" id="md-cancel">Close</button>
      <button class="btn primary" type="button" id="md-load">Replace editor text</button>
    </div>
  </form>
</dialog>

<div class="toast" id="toast" hidden></div>
`;

// ----------------------------------------------------------------------------
// Helpers: storage, escaping
// ----------------------------------------------------------------------------

// localStorage can be missing or throw (private windows, blocked storage).
// Bump STORE_PREFIX when the sample text or default links change, so old drafts don't hide them.
const STORE_PREFIX = "typography:v1:";
const store = {
    get<T>(key: string, fallback: T): T {
        try {
            const v = localStorage.getItem(STORE_PREFIX + key);
            return v == null ? fallback : JSON.parse(v);
        } catch { return fallback; }
    },
    set(key: string, value: unknown): void {
        try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); } catch { }
    },
};

// Short stable hash, so a family's CSS name is the same on every visit and saved drafts keep their fonts
function hash(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
    return (h >>> 0).toString(36);
}

function esc(s: string): string {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

const isFont = (path: string) => /\.(ttf|otf|woff2?)$/i.test(path);

// Runs fn over items with at most n in flight
async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
    let i = 0;
    const runners = Array.from({ length: Math.min(n, items.length) }, async () => {
        while (i < items.length) await fn(items[i++]);
    });
    await Promise.all(runners);
}

// ----------------------------------------------------------------------------
// Font file name parsing: "NV_Garamond-BoldItalic.ttf" → family, weight, style
// ----------------------------------------------------------------------------

const WEIGHT_WORDS: [string, number][] = [
    ["hairline", 100], ["thin", 100], ["extralight", 200], ["ultralight", 200], ["semilight", 350], ["light", 300],
    ["book", 400], ["regular", 400], ["normal", 400], ["roman", 400], ["retina", 450], ["medium", 500],
    ["semibold", 600], ["demibold", 600], ["extrabold", 800], ["ultrabold", 800], ["bold", 700],
    ["extrablack", 950], ["black", 900], ["heavy", 900],
];
const WEIGHT_NAMES: Record<number, string> = {
    100: "Thin", 200: "ExtraLight", 300: "Light", 350: "SemiLight", 400: "Regular", 450: "Retina", 500: "Medium",
    600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black", 950: "ExtraBlack",
};
const STYLE_RE = /^(hairline|thin|extra ?light|ultra ?light|semi ?light|light|book|regular|normal|roman|retina|medium|semi ?bold|demi ?bold|extra ?bold|ultra ?bold|bold|extra ?black|black|heavy)?(italic|oblique|it)?$/i;
const TRAIL_RE = /^(.*?)(hairline|thin|extralight|ultralight|semilight|light|book|regular|normal|roman|retina|medium|semibold|demibold|extrabold|ultrabold|bold|extrablack|black|heavy)?(italic|oblique)?$/i;

function parseFontName(filename: string): Face {
    let base = filename.split("/").pop()!.replace(/\.(ttf|otf|woff2?)$/i, "");
    const variable = /\[[^\]]*\]|variable|[-_]VF$/i.test(base);
    base = base.replace(/\[[^\]]*\]/g, "").replace(/[-_ ]?(variablefont|variable|VF)$/i, "").replace(/[-_ ]+$/, "");

    // Split "Family-Style" on the last dash, else peel a weight/style word off the end
    let family = base, style_str = "";
    const dash = base.lastIndexOf("-");
    if (dash > 0 && STYLE_RE.test(base.slice(dash + 1).replace(/[_ ]/g, ""))) {
        family = base.slice(0, dash);
        style_str = base.slice(dash + 1);
    } else {
        const m = base.match(TRAIL_RE);
        if (m && m[1] && (m[2] || m[3])) { family = m[1]; style_str = (m[2] || "") + (m[3] || ""); }
    }
    family = family.replace(/[-_]+$/, "");

    const s = style_str.toLowerCase().replace(/[\s_-]/g, "");
    const italic = /italic|oblique/.test(s) || (/^it$|[a-z]it$/.test(s) && s !== "");
    let weight = 400;
    for (const [word, w] of WEIGHT_WORDS) if (s.includes(word)) { weight = w; break; }

    // "NV_Legible_Next" → "NV Legible Next"; a name with no separators is split on case: "FiraCodeNerdFont" → "Fira Code Nerd Font"
    const spaced = /[_\s]/.test(family) ? family.replace(/_/g, " ") : family.replace(/([a-z])([A-Z])/g, "$1 $2");
    const display = spaced.replace(/\s+/g, " ").trim();
    let label: string;
    if (variable) label = italic ? "Variable Italic" : "Variable";
    else if (weight === 400) label = italic ? "Italic" : "Regular";
    else label = WEIGHT_NAMES[weight] + (italic ? " Italic" : "");

    return {
        family: display,
        key: display.toLowerCase(),
        weight: variable ? "100 900" : String(weight),
        style: italic ? "italic" : "normal",
        label,
        sort_w: variable ? 400 : weight,
        file: filename,
    };
}

// ----------------------------------------------------------------------------
// GitHub: link parsing and fetching
// ----------------------------------------------------------------------------

function parseGithub(raw: string): GithubTarget | null {
    let s = raw.trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
    if (!s) return null;
    s = s.replace(/^git@github\.com:/, "github.com/").replace(/\.git$/, "");
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^(?:https?:\/\/)?raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(.+)$/i))) {
        return { owner: m[1], repo: m[2], ref_parts: m[3].split("/") };
    }
    s = s.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "");
    const parts = s.split("/").filter(Boolean).map(decodeURIComponent);
    if (parts.length < 2) return null;
    const [owner, repo, kind, ...rest] = parts;
    if (kind === "tree" || kind === "blob") return { owner, repo, ref_parts: rest };
    return { owner, repo, path: [kind, ...rest].filter(Boolean).join("/") };
}

class FetchError extends Error {
    kind: string;
    constructor(msg: string, kind: string) { super(msg); this.kind = kind; }
}

async function gh(url: string): Promise<any> {
    let res: Response;
    try { res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } }); }
    catch { throw new FetchError("blocked", "network"); }
    if (res.status === 403 || res.status === 429) {
        const reset = Number(res.headers.get("x-ratelimit-reset"));
        const when = reset ? new Date(reset * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "an hour";
        throw new FetchError(`GitHub's limit for anonymous requests is used up. Try again after ${when}.`, "rate");
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new FetchError(`GitHub answered ${res.status}.`, "http");
    return res.json();
}

// Repo paths of the font files at `path` (a folder, searched recursively, or one font file).
// Asks for the tree of "ref:folder" only: big repos (nerd-fonts) have megabyte-sized full trees.
// Returns null if the ref or folder doesn't exist.
async function fontFilesAt(api: string, ref: string, path: string): Promise<string[] | null> {
    const is_file = isFont(path);
    const dir = is_file ? path.split("/").slice(0, -1).join("/") : path;
    const tree: GithubTree | null = await gh(`${api}/git/trees/${encodeURIComponent(dir ? `${ref}:${dir}` : ref)}?recursive=1`);
    if (!tree || !tree.tree) return null;
    const prefix = dir ? dir + "/" : "";
    const files = tree.tree.filter(t => t.type === "blob" && isFont(t.path)).map(t => prefix + t.path);
    return is_file ? files.filter(f => f === path) : files;
}

async function resolveFiles(p: GithubTarget): Promise<{ ref: string; path: string; files: string[] }> {
    const api = `https://api.github.com/repos/${p.owner}/${p.repo}`;
    if (p.ref_parts) {
        // A branch name can contain slashes, so try the shortest ref first and lengthen it.
        for (let n = 1; n <= p.ref_parts.length; n++) {
            const ref = p.ref_parts.slice(0, n).join("/");
            const path = p.ref_parts.slice(n).join("/");
            const files = await fontFilesAt(api, ref, path);
            if (files) return { ref, path, files };
        }
        throw new FetchError("Couldn't find that repository, branch or folder. Check the link and that the repo is public.", "missing");
    }
    const info = await gh(api);
    if (!info) throw new FetchError("Couldn't find that repository. Check the link and that the repo is public.", "missing");
    const ref: string = info.default_branch;
    const path = p.path || "";
    const files = await fontFilesAt(api, ref, path);
    if (!files) throw new FetchError(`Couldn't find ${path || "the repository's files"}.`, "missing");
    return { ref, path, files };
}

// Regular faces first, then the other core faces, so text settles early on a big folder
function loadRank(path: string): number {
    const face = parseFontName(path);
    const core = CORE_FACES.findIndex(([, style, weight]) => face.style === style && face.sort_w === weight);
    return core < 0 ? CORE_FACES.length : core;
}

// ----------------------------------------------------------------------------
// Markdown: import and export
// ----------------------------------------------------------------------------

function inlineMd(s: string): string {
    return esc(s)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_m, a, b) => `<strong>${a || b}</strong>`)
        .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)|(^|[^_\w])_([^_\s][^_]*?)_(?![_\w])/g,
            (_m, p1, a, p2, b) => `${p1 ?? p2 ?? ""}<em>${a ?? b}</em>`)
        .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function mdToHtml(md: string): string {
    const lines = md.replace(/\r/g, "").split("\n");
    const out: string[] = [];
    let para: string[] = [], quote: string[] = [];
    let list: { tag: "ul" | "ol"; items: string[] } | null = null;

    const flushPara = () => { if (para.length) { out.push(`<p>${inlineMd(para.join(" "))}</p>`); para = []; } };
    const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map(i => `<li>${inlineMd(i)}</li>`).join("")}</${list.tag}>`); list = null; } };
    // A bare ">" line splits a quote into paragraphs; one starting with a dash is the attribution
    const flushQuote = () => {
        if (!quote.length) return;
        const paras = quote.join("\n").split(/\n\s*\n/).map(p => p.replace(/\n/g, " ").trim()).filter(Boolean);
        out.push(`<blockquote>${paras.map(p => `<p${/^(—|--)\s/.test(p) ? ' class="cite"' : ""}>${inlineMd(p)}</p>`).join("")}</blockquote>`);
        quote = [];
    };
    const flushAll = () => { flushPara(); flushList(); flushQuote(); };
    let fence: { lang: string; lines: string[] } | null = null; // inside a ``` block

    for (const line of lines) {
        let m: RegExpMatchArray | null;
        if (fence) {
            if (/^\s*```\s*$/.test(line)) { out.push(codeBlockHtml(fence.lines.join("\n"), fence.lang)); fence = null; }
            else fence.lines.push(line);
            continue;
        }
        if ((m = line.match(/^\s*```\s*([\w+#.-]*)\s*$/))) { flushAll(); fence = { lang: m[1], lines: [] }; continue; }
        if (!line.trim()) { flushAll(); continue; }
        if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flushAll(); out.push(`<h${m[1].length}>${inlineMd(m[2])}</h${m[1].length}>`); continue; }
        if (/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/.test(line)) { flushAll(); out.push("<hr>"); continue; }
        if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); continue; }
        if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
            flushPara(); flushQuote();
            if (!list || list.tag !== "ul") { flushList(); list = { tag: "ul", items: [] }; }
            list.items.push(m[1]);
            continue;
        }
        if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
            flushPara(); flushQuote();
            if (!list || list.tag !== "ol") { flushList(); list = { tag: "ol", items: [] }; }
            list.items.push(m[1]);
            continue;
        }
        flushList(); flushQuote(); para.push(line.trim());
    }
    flushAll();
    if (fence) out.push(codeBlockHtml(fence.lines.join("\n"), fence.lang)); // unclosed fence runs to the end
    return out.join("\n") || "<p><br></p>";
}

function codeBlockHtml(text: string, lang = ""): string {
    return `<pre${lang ? ` data-lang="${esc(lang)}"` : ""}><code>${esc(text)}</code></pre>`;
}

// Text of a code block. Editing can leave <br>s or <div>s inside, so those count as line breaks.
// A single trailing newline is dropped: the editor keeps one there so an empty last line shows.
function codeText(pre: HTMLElement): string {
    let out = "";
    const walk = (n: Node) => {
        if (n.nodeType === Node.TEXT_NODE) { out += (n as Text).data; return; }
        if (n.nodeType !== Node.ELEMENT_NODE) return;
        const tag = (n as HTMLElement).tagName;
        if (tag === "BR") { out += "\n"; return; }
        if ((tag === "DIV" || tag === "P") && out && !out.endsWith("\n")) out += "\n";
        n.childNodes.forEach(walk);
    };
    walk(pre);
    return out.replace(/\u200B/g, "").replace(/\n$/, "");
}

function htmlToMd(root: HTMLElement): string {
    const inline = (n: Node): string => {
        if (n.nodeType === Node.TEXT_NODE) return (n as Text).data.replace(/\u200B/g, "");
        if (n.nodeType !== Node.ELEMENT_NODE) return "";
        const el = n as HTMLElement;
        const inner = [...el.childNodes].map(inline).join("");
        switch (el.tagName) {
            case "STRONG": case "B": return inner.trim() ? `**${inner}**` : inner;
            case "EM": case "I": return inner.trim() ? `*${inner}*` : inner;
            case "CODE": return "`" + inner + "`";
            case "A": return `[${inner}](${el.getAttribute("href")})`;
            case "BR": return "\n";
            default: return inner;
        }
    };
    const blocks: string[] = [];
    for (const n of root.childNodes) {
        if (n.nodeType === Node.TEXT_NODE) { const t = (n as Text).data.trim(); if (t) blocks.push(t); continue; }
        if (n.nodeType !== Node.ELEMENT_NODE) continue;
        const el = n as HTMLElement;
        const t = el.tagName;
        if (/^H[1-3]$/.test(t)) blocks.push("#".repeat(+t[1]) + " " + inline(el).trim());
        else if (t === "BLOCKQUOTE") {
            const paras = el.querySelector(":scope > p") ? [...el.children].map(c => inline(c).trim()) : [inline(el).trim()];
            blocks.push(paras.filter(Boolean).join("\n\n").split("\n").map(l => (l ? "> " + l : ">")).join("\n"));
        }
        else if (t === "UL" || t === "OL") blocks.push([...el.children].map((li, i) => (t === "UL" ? "- " : `${i + 1}. `) + inline(li).trim()).join("\n"));
        else if (t === "HR") blocks.push("---");
        else if (t === "PRE") blocks.push("```" + (el.dataset.lang || "") + "\n" + codeText(el) + "\n```");
        else blocks.push(inline(el).trim());
    }
    return blocks.filter(Boolean).join("\n\n") + "\n";
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export function Page(): HTMLElement {
    //// Scheduler: "render" (rebuild lists) flushes before "sync" (toolbar state)
    const scheduler = Scheduler();
    const render_s = scheduler.getOrCreate("render");
    const sync_s = scheduler.getOrCreate("sync");

    //// State
    const theme = Observable<ThemeMode>(store.get<ThemeMode>("theme", "system"));
    // Sources and families are mutated in place, then trigger()ed when a redraw is due
    const sources = Observable<Source[]>([]);
    const families = Observable<Family[]>([]);
    const doc_fam = Observable<Family>(BUILTINS[0]);   // font of the whole document
    const code_fam = Observable<Family | null>(null);  // font of code blocks and inline code; null: the stylesheet's mono
    const shown_fam = Observable<Family>(BUILTINS[0]); // last family applied, to the document or a selection
    const selection = Observable<Range | null>(null);  // last range inside the editor; null once focus leaves
    const doc_size = Observable<number | null>(null);  // null: the stylesheet's size
    const doc_color = Observable("");
    const doc_bg = Observable("");
    const fg_chip = Observable("var(--tx)");           // last picked colours, shown under the toolbar buttons
    const bg_chip = Observable("var(--hl-yellow)");
    const edits = Observable(0);                        // bumped on every edit
    const fetch_msg = Observable<string | null>(null);
    const fetching = Observable(false);
    const drag_over = Observable(false);
    const toast_text = Observable<string | null>(null);

    let fam_seq = 0, src_seq = 0;
    let local_source: Source | null = null;

    //// Layout
    const root = document.createElement("div");
    root.className = "typography";
    root.innerHTML = TEMPLATE;
    const q = <T extends Element = HTMLElement>(selector: string) => root.querySelector(selector) as T;

    const editor = q("#editor");
    const family_select = q<HTMLSelectElement>("#family");
    const size_input = q<HTMLInputElement>("#size");
    const theme_buttons = [...root.querySelectorAll<HTMLButtonElement>("[data-theme-set]")];
    const md_dialog = q<HTMLDialogElement>("#md-dialog");
    const md_text = q<HTMLTextAreaElement>("#md-text");
    const repo_input = q<HTMLTextAreaElement>("#repo-input");
    const drop = q("#drop");

    //// Lookups (peek with _value: these run in handlers, not reactions)
    const allFamilies = () => [...families._value, ...BUILTINS];
    const famById = (id: string) => allFamilies().find(f => f.id === id);
    const inEditor = (node: Node | null) => !!node && (node === editor || editor.contains(node));

    function hasSelection(): boolean {
        const r = selection._value;
        return !!r && !r.collapsed && inEditor(r.commonAncestorContainer);
    }

    function restoreSelection(): boolean {
        const r = selection._value;
        if (!r) return false;
        editor.focus({ preventScroll: true });
        const sel = getSelection()!;
        sel.removeAllRanges();
        sel.addRange(r);
        return true;
    }

    function setDocFamily(f: Family): void {
        doc_fam.value = f;
        shown_fam.value = f;
    }

    function toast(text: string): void {
        toast_text.value = text;
    }

    // ------------------------------------------------------------------
    // Reactors
    // ------------------------------------------------------------------

    //// Theme: unscheduled, so it applies before the first paint
    Reactor(() => {
        const mode = theme.value;
        if (mode === "system") document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme", mode);
        for (const b of theme_buttons) b.setAttribute("aria-pressed", String(b.dataset.themeSet === mode));
        store.set("theme", mode);
    });

    //// Sources list
    Reactor(() => {
        const list = sources.value;
        const ul = q("#source-list");
        ul.innerHTML = list.length ? "" : '<li class="empty">No sources yet. Paste a GitHub folder link above.</li>';
        for (const s of list) {
            const li = document.createElement("li");
            li.className = "source";
            li.dataset.state = s.state;
            li.innerHTML = `<div class="path"><b>${esc(s.label)}</b>${s.sub ? `<br>${esc(s.sub)}` : ""}</div>
                <button class="x" type="button" aria-label="Remove ${esc(s.label)}" title="Remove">×</button>
                <div class="meta"><span class="dot"></span><span>${esc(s.note)}</span></div>`;
            li.querySelector(".x")!.addEventListener("click", () => removeSource(s));
            ul.appendChild(li);
        }
        q("#src-count").textContent = list.length ? String(list.length) : "";
    }, { reaction_schedule: render_s });

    //// Saved links: explicit deps, so nothing is written at creation
    Reactor(() => {
        store.set("links", sources.value.filter(s => s.kind === "github").map(s => s.link));
    }, { deps: [sources], reaction_schedule: render_s });

    //// Family list
    Reactor(() => {
        const list = families.value;
        const current = doc_fam.value;
        const ul = q("#fam-list");
        ul.innerHTML = list.length ? "" : '<li class="empty">Families appear here once a source loads.</li>';
        for (const f of list) {
            const li = document.createElement("li");
            li.innerHTML = `<button class="fam" type="button" aria-current="${current.id === f.id}">
                <span class="nm" style="font-family:${esc(f.css)}">${esc(f.name)}</span>
                <span class="faces">${facePips(f)}</span></button>`;
            li.firstElementChild!.addEventListener("click", () => applyFamily(f.id));
            ul.appendChild(li);
        }
        q("#fam-count").textContent = list.length ? String(list.length) : "";
    }, { reaction_schedule: render_s });

    //// Family <select>: tracks families only; sources are peeked, as they
    //// change on every progress update and the groups only matter once a
    //// source's families exist
    Reactor(() => {
        const list = families.value;
        const keep = family_select.value;
        family_select.innerHTML = "";
        for (const s of sources._value) {
            const fams = list.filter(f => f.source_id === s.id);
            if (!fams.length) continue;
            const group = document.createElement("optgroup");
            group.label = s.label + (s.sub ? " · " + s.sub : "");
            for (const f of fams) group.appendChild(new Option(`${f.name}  (${f.faces.length})`, f.id));
            family_select.appendChild(group);
        }
        const system = document.createElement("optgroup");
        system.label = "System";
        for (const f of BUILTINS) system.appendChild(new Option(f.name, f.id));
        family_select.appendChild(system);
        family_select.value = keep && famById(keep) ? keep : doc_fam._value.id;
    }, { reaction_schedule: render_s });

    //// Document styles
    Reactor(() => { editor.style.fontFamily = doc_fam.value.css; }, { reaction_schedule: render_s });
    // Code reads --code-font (page.css), so a font picked for the document leaves code alone
    Reactor(() => {
        const f = code_fam.value;
        if (f) editor.style.setProperty("--code-font", `"${f.css_name}", ui-monospace, Menlo, Consolas, monospace`);
        else editor.style.removeProperty("--code-font");
    }, { reaction_schedule: render_s });
    Reactor(() => { editor.style.fontSize = doc_size.value ? doc_size.value + "px" : ""; }, { reaction_schedule: render_s });
    Reactor(() => { editor.style.color = doc_color.value; }, { reaction_schedule: render_s });
    Reactor(() => { editor.style.backgroundColor = doc_bg.value; }, { reaction_schedule: render_s });
    Reactor(() => { q("#fg-chip").style.background = fg_chip.value; }, { reaction_schedule: render_s });
    Reactor(() => { q("#bg-chip").style.background = bg_chip.value; }, { reaction_schedule: render_s });

    //// Face bar and status font: also tracks families, since faces arrive as files load
    Reactor(() => {
        const f = shown_fam.value;
        void families.value;
        const src = sources._value.find(s => s.id === f.source_id);
        let tags: string;
        if (f.builtin) tags = '<span class="facetag">Browser default faces</span>';
        else {
            const covered = new Set<string>();
            tags = CORE_FACES.map(([label, style, weight]) => {
                const hit = f.faces.find(x => x.style === style && x.sort_w === weight);
                if (hit) covered.add(hit.label);
                return `<span class="facetag${hit ? "" : " missing"}" style="font-family:${esc(f.css)};font-style:${style};font-weight:${weight}" title="${hit ? esc(hit.file) : "Not in this source; the browser will fake it"}">${label}</span>`;
            }).join("") + f.faces.filter(x => !covered.has(x.label)).map(x =>
                `<span class="facetag" style="font-family:${esc(f.css)};font-style:${x.style};font-weight:${x.sort_w}" title="${esc(x.file)}">${esc(x.label)}</span>`).join("");
        }
        q("#facebar").innerHTML = `<span class="fname">${esc(f.name)}</span>${tags}${src ? `<span class="src">${esc(src.label)}${src.sub ? " · " + esc(src.sub) : ""}</span>` : ""}`;
        q("#stat-font").textContent = `${f.name}${f.builtin ? "" : ` · ${f.faces.length} faces`}`;
    }, { reaction_schedule: render_s });

    //// Word count: explicit deps, so the first count waits until the editor is in the page
    const word_counter = Reactor(() => {
        const words = (editor.innerText.replace(/\u200B/g, "").match(/\S+/g) || []).length;
        q("#stat-words").textContent = `${words} words`;
    }, { deps: [edits], reaction_schedule: render_s });

    //// Draft: each edit clears the previous timer, so it saves 600ms after the last one
    Reactor(() => {
        const id = setTimeout(() => store.set("draft", editor.innerHTML), 600);
        return () => clearTimeout(id);
    }, { deps: [edits] });

    //// Toolbar state follows the selection (or the document when there is none)
    Reactor(() => {
        const range = selection.value;
        const sel_on = hasSelection();
        const scope = q("#scope");
        scope.textContent = sel_on ? "selection" : "whole document";
        scope.classList.toggle("sel", sel_on);

        let node: Node | null = range ? range.startContainer : null;
        if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        if (!node || !inEditor(node)) node = editor;
        const el = node as HTMLElement;
        const cs = getComputedStyle(el);

        size_input.value = String(Math.round(parseFloat(cs.fontSize)));
        const first = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
        const match = families.value.find(f => f.css_name === first);
        family_select.value = (match ?? doc_fam.value).id;
        q("#bold").setAttribute("aria-pressed", String(Number(cs.fontWeight) >= 600 && el !== editor && !/^H[1-3]$/.test(el.tagName)));
        q("#italic").setAttribute("aria-pressed", String(cs.fontStyle === "italic" && el.tagName !== "BLOCKQUOTE"));
    }, { deps: [selection, families, doc_fam], reaction_schedule: sync_s });

    //// Add form
    Reactor(() => {
        const msg = q("#fetch-msg");
        msg.hidden = !fetch_msg.value;
        msg.textContent = fetch_msg.value ?? "";
    });
    Reactor(() => { q<HTMLButtonElement>("#fetch-btn").disabled = fetching.value; });
    Reactor(() => { drop.classList.toggle("over", drag_over.value); });

    //// Toast: the returned cleanup cancels the hide timer when a new toast replaces it
    Reactor(() => {
        const el = q("#toast");
        const text = toast_text.value;
        el.hidden = !text;
        if (!text) return;
        el.textContent = text;
        const id = setTimeout(() => { toast_text.value = null; }, 2600);
        return () => clearTimeout(id);
    });

    // ------------------------------------------------------------------
    // Font loading
    // ------------------------------------------------------------------

    function facePips(f: Family): string {
        const pips = PIPS.filter((_pip, i) => f.faces.some(x => x.style === CORE_FACES[i][1] && x.sort_w === CORE_FACES[i][2]));
        const extra = f.faces.length - pips.length;
        return pips.map(pip => `<span class="facepip">${pip}</span>`).join("")
            + (extra > 0 ? `<span class="facepip">+${extra}</span>` : "");
    }

    // Registers one font file. Mutates families silently; callers trigger once loading is done.
    async function addFace(source: Source, file_name: string, buffer: ArrayBuffer): Promise<Family> {
        const info = parseFontName(file_name);
        let fam = families._value.find(f => f.source_id === source.id && f.key === info.key);
        if (!fam) {
            const css_name = `tc-${hash(source.link || "local")}-${info.key.replace(/[^a-z0-9]+/g, "-")}`;
            fam = { id: "f" + (++fam_seq), name: info.family, key: info.key, css_name, css: `"${css_name}", Georgia, serif`, source_id: source.id, faces: [] };
            families._value.push(fam);
        }
        const face = new FontFace(fam.css_name!, buffer, { weight: info.weight, style: info.style });
        await face.load();
        document.fonts.add(face);
        // Code switches over on the first face; the browser restyles as the other weights arrive
        if (!code_fam._value && fam.name === CODE_FAMILY) code_fam.value = fam;
        if (!fam.faces.some(f => f.label === info.label)) fam.faces.push(info);
        fam.faces.sort((a, b) => a.sort_w - b.sort_w || Number(a.style === "italic") - Number(b.style === "italic"));
        return fam;
    }

    function setSourceState(source: Source, state: Source["state"], note: string): void {
        source.state = state;
        source.note = note;
        sources.trigger();
    }

    function familyCount(source: Source): number {
        return families._value.filter(f => f.source_id === source.id).length;
    }

    function finishSource(source: Source, n_files: number): void {
        const n = familyCount(source);
        setSourceState(source, "ok", `${n} ${n === 1 ? "family" : "families"} · ${n_files} files`);
        families.trigger();
        if (doc_fam._value.builtin) {
            // The document wants a text face: skip code fonts, which may well finish loading first
            const fams = families._value.filter(f => f.source_id === source.id);
            const pick = fams.find(f => f.name === PREFERRED_START)
                || fams.find(f => !/\b(code|mono)\b/i.test(f.name))
                || (source.link === CODE_LINK ? undefined : fams[0]);
            if (pick) setDocFamily(pick);
        }
    }

    async function loadSource(source: Source): Promise<void> {
        const p = parseGithub(source.link);
        if (!p) { setSourceState(source, "error", "That doesn't look like a GitHub link."); return; }
        source.label = `${p.owner}/${p.repo}`;
        setSourceState(source, "loading", "Reading folder…");
        try {
            const { ref, path, files } = await resolveFiles(p);
            source.sub = `${path || "/"} @ ${/^[0-9a-f]{40}$/.test(ref) ? ref.slice(0, 7) : ref}`;
            if (!files.length) throw new FetchError(`No .ttf, .otf, .woff or .woff2 files under ${path || "the repo root"}.`, "empty");
            if (files.length > MAX_FILES) throw new FetchError(`That folder holds ${files.length} font files. Point to a smaller subfolder.`, "big");
            files.sort((a, b) => loadRank(a) - loadRank(b));

            const raw_base = `https://raw.githubusercontent.com/${p.owner}/${p.repo}/${ref.split("/").map(encodeURIComponent).join("/")}/`;
            let done = 0;
            await pool(files, 5, async (file) => {
                let res: Response;
                try { res = await fetch(raw_base + file.split("/").map(encodeURIComponent).join("/")); }
                catch { throw new FetchError("blocked", "network"); }
                if (!res.ok) throw new FetchError(`Couldn't download ${file.split("/").pop()} (${res.status}).`, "http");
                try { await addFace(source, file, await res.arrayBuffer()); }
                catch (e) { console.warn("Skipped unreadable font", file, e); }
                setSourceState(source, "loading", `Loading ${++done} of ${files.length} files…`);
            });
            finishSource(source, files.length);
        } catch (e) {
            const msg = e instanceof FetchError && e.kind === "network"
                ? "Couldn't reach GitHub. Check your connection, or drop the font files below."
                : (e instanceof Error && e.message) || "Something went wrong while loading.";
            setSourceState(source, "error", msg);
        }
    }

    function addLinks(text: string): Promise<void[]> {
        const links = text.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
        const added: Source[] = [];
        for (const link of links) {
            if (sources._value.some(s => s.link === link)) continue;
            const src: Source = { id: "s" + (++src_seq), link, label: link, state: "loading", note: "", kind: "github" };
            sources._value.push(src);
            added.push(src);
        }
        sources.trigger();
        return Promise.all(added.map(loadSource));
    }

    function removeSource(source: Source): void {
        if (source === local_source) local_source = null;
        sources.value = sources._value.filter(s => s !== source);
        families.value = families._value.filter(f => f.source_id !== source.id);
        if (doc_fam._value.source_id === source.id) setDocFamily(families._value[0] || BUILTINS[0]);
        else if (shown_fam._value.source_id === source.id) shown_fam.value = doc_fam._value;
        if (code_fam._value?.source_id === source.id) code_fam.value = null;
    }

    async function addLocalFiles(file_list: FileList): Promise<void> {
        const files = [...file_list].filter(f => isFont(f.name));
        if (!files.length) { toast("Those weren't font files (.ttf, .otf, .woff, .woff2)."); return; }
        if (!local_source) {
            local_source = { id: "s" + (++src_seq), link: "", label: "Your files", sub: "added in this browser", state: "loading", note: "", kind: "local" };
            sources._value.push(local_source);
        }
        const source = local_source;
        setSourceState(source, "loading", `Loading ${files.length} files…`);
        let ok = 0;
        for (const f of files) {
            try { await addFace(source, f.name, await f.arrayBuffer()); ok++; }
            catch (e) { console.warn("Skipped", f.name, e); }
        }
        const n = familyCount(source);
        if (ok) setSourceState(source, "ok", `${n} ${n === 1 ? "family" : "families"} · ${ok} files`);
        else setSourceState(source, "error", "None of those files could be read as fonts.");
        families.trigger();
        const last = families._value.filter(f => f.source_id === source.id).pop();
        if (last) setDocFamily(last);
    }

    // ------------------------------------------------------------------
    // Styling: the selection if there is one, else the whole document
    // ------------------------------------------------------------------

    function textNodesIn(range: Range): Text[] {
        const container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) return [container as Text];
        const out: Text[] = [];
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) if ((n as Text).data.length && range.intersectsNode(n)) out.push(n as Text);
        return out;
    }

    // Wraps each selected run of text in a span.tc carrying the given styles (null removes one)
    function styleSelection(props: Record<string, string | null>): boolean {
        if (!hasSelection()) return false;
        const r = selection._value!;
        const items = textNodesIn(r).map(n => ({
            n,
            s: n === r.startContainer ? r.startOffset : 0,
            e: n === r.endContainer ? r.endOffset : n.data.length,
        })).filter(x => x.e > x.s);
        if (!items.length) return false;

        const wrapped: Text[] = [];
        for (const it of items) {
            let node = it.n;
            if (it.e < node.data.length) node.splitText(it.e);
            if (it.s > 0) node = node.splitText(it.s);
            const parent = node.parentElement!;
            let span: HTMLElement;
            if (parent.classList.contains("tc") && parent.childNodes.length === 1) span = parent;
            else {
                span = document.createElement("span");
                span.className = "tc";
                parent.insertBefore(span, node);
                span.appendChild(node);
            }
            for (const [k, v] of Object.entries(props)) {
                if (v == null) span.style.removeProperty(k);
                else span.style.setProperty(k, v);
            }
            wrapped.push(node);
        }
        const nr = document.createRange();
        nr.setStart(wrapped[0], 0);
        const last = wrapped[wrapped.length - 1];
        nr.setEnd(last, last.data.length);
        selection.value = nr;
        restoreSelection();
        return true;
    }

    function applyFamily(id: string): void {
        const f = famById(id);
        if (!f) return;
        if (styleSelection({ "font-family": f.css })) shown_fam.value = f;
        else setDocFamily(f);
    }

    function applySize(px: number): void {
        px = Math.max(8, Math.min(160, Math.round(px) || 20));
        size_input.value = String(px);
        if (!styleSelection({ "font-size": px + "px" })) doc_size.value = px;
    }

    function applyColor(v: string): void {
        fg_chip.value = v;
        if (!styleSelection({ color: v })) doc_color.value = v;
    }

    function applyBg(v: string): void {
        const none = v === "transparent";
        bg_chip.value = none ? "var(--ui-2)" : v;
        if (!styleSelection({ "background-color": none ? null : v, "border-radius": none ? null : "0.15em" })) {
            doc_bg.value = none ? "" : v;
        }
    }

    function exec(cmd: string): void {
        restoreSelection();
        document.execCommand("styleWithCSS", false, "false");
        document.execCommand(cmd);
        selection.trigger();
    }

    function clearFormatting(): void {
        if (hasSelection()) {
            restoreSelection();
            document.execCommand("removeFormat");
            // removeFormat leaves our spans' styles in some browsers; strip them inside the selection.
            const sel = getSelection()!;
            const r = sel.rangeCount ? sel.getRangeAt(0) : null;
            if (r) editor.querySelectorAll("span.tc").forEach(s => { if (r.intersectsNode(s)) s.removeAttribute("style"); });
        } else {
            editor.querySelectorAll("span.tc").forEach(s => s.replaceWith(...s.childNodes));
            doc_color.value = "";
            doc_bg.value = "";
            fg_chip.value = "var(--tx)";
            toast("Cleared colors, sizes and fonts set on parts of the text.");
        }
        selection.trigger();
    }

    // ------------------------------------------------------------------
    // Event handlers: state writes (plus the editor's own DOM work)
    // ------------------------------------------------------------------

    //// Theme
    for (const b of theme_buttons) b.addEventListener("click", () => { theme.value = b.dataset.themeSet as ThemeMode; });

    //// Selection tracking
    document.addEventListener("selectionchange", () => {
        const sel = getSelection();
        if (sel && sel.rangeCount && inEditor(sel.anchorNode)) selection.value = sel.getRangeAt(0).cloneRange();
    });
    document.addEventListener("pointerdown", (e) => {
        if (!(e.target as Element).closest?.(".toolbar, .sheet, .mdlg")) selection.value = null;
    });

    //// Toolbar. Pressing a button must not steal the editor's selection.
    root.querySelectorAll(".toolbar button, .toolbar summary").forEach(b => b.addEventListener("mousedown", e => e.preventDefault()));
    family_select.addEventListener("change", () => applyFamily(family_select.value));
    size_input.addEventListener("change", () => applySize(Number(size_input.value)));
    size_input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); applySize(Number(size_input.value)); }
    });
    q("#size-down").addEventListener("click", () => applySize(Number(size_input.value) - 2));
    q("#size-up").addEventListener("click", () => applySize(Number(size_input.value) + 2));
    q("#bold").addEventListener("click", () => exec("bold"));
    q("#italic").addEventListener("click", () => exec("italic"));
    q("#clear").addEventListener("click", clearFormatting);

    //// Colour swatches
    function swatch(name: string, kind: string, fill: string, color: string, glyph: string, onPick: () => void): HTMLButtonElement {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "sw";
        b.title = name;
        b.setAttribute("aria-label", `${name} ${kind}`);
        b.style.background = fill;
        b.style.color = color;
        b.textContent = glyph;
        b.addEventListener("mousedown", e => e.preventDefault());
        b.addEventListener("click", onPick);
        return b;
    }
    const fg_pop = q<HTMLDetailsElement>("#fg-pop");
    const bg_pop = q<HTMLDetailsElement>("#bg-pop");
    const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

    const fg_list: [string, string][] = [["Text", "var(--tx)"], ["Muted", "var(--tx-2)"], ...ACCENTS.map(a => [capital(a), `var(--${a})`] as [string, string])];
    for (const [name, v] of fg_list) {
        q("#fg-swatches").appendChild(swatch(name, "text", "var(--bg)", v, "A", () => { applyColor(v); fg_pop.open = false; }));
    }
    const bg_list: [string, string][] = [["None", "transparent"], ["Paper", "var(--bg-2)"], ...ACCENTS.map(a => [capital(a), `var(--hl-${a})`] as [string, string])];
    for (const [name, v] of bg_list) {
        const none = v === "transparent";
        q("#bg-swatches").appendChild(swatch(name, "background", none ? "var(--bg)" : v, "var(--tx)", none ? "∅" : "A", () => { applyBg(v); bg_pop.open = false; }));
    }
    q<HTMLInputElement>("#fg-custom").addEventListener("input", e => applyColor((e.target as HTMLInputElement).value));
    q<HTMLInputElement>("#bg-custom").addEventListener("input", e => applyBg((e.target as HTMLInputElement).value));
    document.addEventListener("click", (e) => {
        for (const d of root.querySelectorAll<HTMLDetailsElement>(".pop[open]")) if (!d.contains(e.target as Node)) d.open = false;
    });

    //// Code blocks. Typing ``` then Enter opens one. Inside, Enter adds a line, Tab indents,
    //// and Enter on an empty last line (or Backspace in an empty block) leaves it.
    function codeBlockOf(node: Node | null): HTMLElement | null {
        const el = node && (node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement);
        const pre = el ? el.closest("pre") : null;
        return pre && editor.contains(pre) ? pre : null;
    }

    function placeCaret(node: Node, offset: number): void {
        const r = document.createRange();
        r.setStart(node, offset);
        r.collapse(true);
        const sel = getSelection()!;
        sel.removeAllRanges();
        sel.addRange(r);
    }

    // The block's text on either side of the range
    function textAround(block: HTMLElement, r: Range): [string, string] {
        const before = document.createRange();
        before.selectNodeContents(block);
        before.setEnd(r.startContainer, r.startOffset);
        const after = document.createRange();
        after.selectNodeContents(block);
        after.setStart(r.endContainer, r.endOffset);
        return [before.toString(), after.toString()];
    }

    // DOM position of a character offset into a block's text
    function pointAt(block: HTMLElement, offset: number): [Node, number] {
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
            const len = (n as Text).length;
            if (offset <= len) return [n, offset];
            offset -= len;
        }
        return [block, block.childNodes.length];
    }

    // Inserts text at the caret as is. execCommand("insertText") would turn "\n" into a new paragraph.
    function insertCode(pre: HTMLElement, text: string): void {
        const r = getSelection()!.getRangeAt(0);
        r.deleteContents();
        const node = document.createTextNode(text);
        r.insertNode(node);
        // A trailing newline doesn't render, so a block ending in one gets a spare to show its empty last line
        const rest = document.createRange();
        rest.selectNodeContents(pre);
        rest.setStartAfter(node);
        if (text.endsWith("\n") && rest.toString() === "") node.after("\n");
        placeCaret(node, node.length);
        edits.value++; // DOM edits made by hand fire no input event
    }

    function leaveCodeBlock(pre: HTMLElement, before: string): void {
        const p = document.createElement("p");
        p.appendChild(document.createElement("br"));
        if (before === "") pre.replaceWith(p); // the block was empty
        else {
            // Drop the empty last line, then continue in a paragraph below
            const cut = document.createRange();
            const [node, offset] = pointAt(pre, before.length - 1);
            cut.setStart(node, offset);
            cut.setEnd(pre, pre.childNodes.length);
            cut.deleteContents();
            pre.after(p);
        }
        placeCaret(p, 0);
        edits.value++;
    }

    function openCodeBlock(block: HTMLElement, lang: string): void {
        const pre = document.createElement("pre");
        if (lang) pre.dataset.lang = lang;
        const code = document.createElement("code");
        const line = document.createTextNode("\n"); // one empty line to type on
        code.appendChild(line);
        pre.appendChild(code);
        block.replaceWith(pre);
        placeCaret(line, 0);
        edits.value++;
    }

    editor.addEventListener("keydown", (e) => {
        if (e.isComposing) return;
        const sel = getSelection();
        if (!sel || !sel.rangeCount) return;
        const r = sel.getRangeAt(0);
        const pre = codeBlockOf(r.startContainer);

        if (pre) {
            if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                document.execCommand("insertText", false, "    ");
            } else if (e.key === "Enter") {
                e.preventDefault();
                const [before, after] = textAround(pre, r);
                const on_empty_last_line = sel.isCollapsed && (before === "" || before.endsWith("\n")) && after.replace(/\n$/, "") === "";
                if (on_empty_last_line && !e.shiftKey) leaveCodeBlock(pre, before);
                else insertCode(pre, "\n");
            } else if (e.key === "Backspace" && codeText(pre) === "") {
                e.preventDefault();
                leaveCodeBlock(pre, "");
            }
            return;
        }

        if (e.key === "Enter" && !e.shiftKey && sel.isCollapsed) {
            const block = blockOf(r.startContainer);
            const m = block && /^(P|DIV)$/.test(block.tagName)
                ? (block.textContent || "").replace(/\u200B/g, "").trim().match(/^```([\w+#.-]*)$/)
                : null;
            if (m) { e.preventDefault(); openCodeBlock(block!, m[1]); }
        }
    });

    //// Markdown shortcuts as you type: block prefixes on space
    document.execCommand("defaultParagraphSeparator", false, "p");
    const BLOCK_SHORTCUTS: Record<string, [string, string?]> = {
        "#": ["formatBlock", "h1"], "##": ["formatBlock", "h2"], "###": ["formatBlock", "h3"], ">": ["formatBlock", "blockquote"],
        "-": ["insertUnorderedList"], "*": ["insertUnorderedList"], "1.": ["insertOrderedList"],
    };

    function blockOf(node: Node | null): HTMLElement | null {
        while (node && node !== editor) {
            if (node.nodeType === Node.ELEMENT_NODE && /^(P|DIV|H1|H2|H3|LI|BLOCKQUOTE)$/.test((node as HTMLElement).tagName)) return node as HTMLElement;
            node = node.parentNode;
        }
        return null;
    }

    editor.addEventListener("keydown", (e) => {
        if (e.key !== " ") return;
        const sel = getSelection();
        if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
        const r = sel.getRangeAt(0);
        const block = blockOf(r.startContainer);
        if (!block || !/^(P|DIV)$/.test(block.tagName)) return;
        const pre = document.createRange();
        pre.selectNodeContents(block);
        pre.setEnd(r.startContainer, r.startOffset);
        const shortcut = BLOCK_SHORTCUTS[pre.toString()];
        if (!shortcut) return;
        e.preventDefault();
        sel.removeAllRanges();
        sel.addRange(pre);
        document.execCommand("delete");
        document.execCommand(shortcut[0], false, shortcut[1]);
    });

    //// Markdown shortcuts as you type: inline **bold**, *italic*, `code` on the closing delimiter
    const INLINE_RULES: [RegExp, string, string][] = [
        [/\*\*([^*\n]+?)\*\*$/, "strong", "**"], [/__([^_\n]+?)__$/, "strong", "__"],
        [/(?:^|[^*])\*([^*\s][^*\n]*?)\*$/, "em", "*"], [/(?:^|[^_\w])_([^_\s][^_\n]*?)_$/, "em", "_"],
        [/`([^`\n]+)`$/, "code", "`"],
    ];
    editor.addEventListener("input", (e) => {
        edits.value++;
        const ie = e as InputEvent;
        if (ie.inputType !== "insertText" || !/[*`_]/.test(ie.data || "")) return;
        const sel = getSelection();
        if (!sel || !sel.rangeCount) return;
        const r = sel.getRangeAt(0);
        const node = r.startContainer;
        if (node.nodeType !== Node.TEXT_NODE || codeBlockOf(node)) return; // code is literal
        const text = node as Text;
        const before = text.data.slice(0, r.startOffset);
        for (const [re, tag, delim] of INLINE_RULES) {
            const m = before.match(re);
            if (!m) continue;
            const inner = m[1];
            const start = r.startOffset - inner.length - delim.length * 2;
            const after = text.splitText(r.startOffset);
            const mid = text.splitText(start);
            const el = document.createElement(tag);
            el.textContent = inner;
            mid.replaceWith(el);
            const spacer = document.createTextNode("\u200B"); // gives the caret a place outside the new element
            el.after(spacer);
            const nr = document.createRange();
            nr.setStart(spacer, 1);
            nr.collapse(true);
            sel.removeAllRanges();
            sel.addRange(nr);
            if (!after.data) after.remove();
            break;
        }
    });

    //// Paste: plain text, or markdown converted, so the playground font stays in charge
    editor.addEventListener("paste", (e) => {
        const text = e.clipboardData && e.clipboardData.getData("text/plain");
        if (text == null) return;
        e.preventDefault();
        const pre = codeBlockOf(getSelection()?.anchorNode ?? null);
        if (pre) insertCode(pre, text.replace(/\r\n?/g, "\n"));
        else if (/\n\s*\n|^#{1,3}\s|^\s*[-*]\s|^\s*```/m.test(text)) document.execCommand("insertHTML", false, mdToHtml(text));
        else document.execCommand("insertText", false, text);
    });

    //// Markdown dialog
    q("#md-open").addEventListener("click", () => {
        md_text.value = htmlToMd(editor);
        try { md_dialog.showModal(); } catch { md_dialog.setAttribute("open", ""); }
    });
    q("#md-cancel").addEventListener("click", () => md_dialog.close());
    q("#md-load").addEventListener("click", () => {
        editor.innerHTML = mdToHtml(md_text.value);
        md_dialog.close();
        selection.value = null;
        edits.value++;
        toast("Editor text replaced.");
    });
    q("#md-copy").addEventListener("click", () => {
        const fallback = () => { md_text.focus(); md_text.select(); toast("Selected. Press Ctrl/⌘ C to copy."); };
        try { navigator.clipboard.writeText(md_text.value).then(() => toast("Markdown copied."), fallback); }
        catch { fallback(); }
    });

    //// Add form
    const add_form = q<HTMLFormElement>("#add-form");
    add_form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = repo_input.value.trim();
        if (!text) { fetch_msg.value = "Paste a GitHub link first."; return; }
        const bad = text.split(/[\s,]+/).filter(Boolean).filter(l => !parseGithub(l));
        if (bad.length) { fetch_msg.value = `Not a GitHub link: ${bad[0]}`; return; }
        fetch_msg.value = null;
        repo_input.value = "";
        fetching.value = true;
        await addLinks(text);
        fetching.value = false;
    });
    repo_input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); add_form.requestSubmit(); }
    });

    //// Local files: picker and drag & drop
    const file_input = q<HTMLInputElement>("#file-input");
    file_input.addEventListener("change", () => {
        if (file_input.files) addLocalFiles(file_input.files);
        file_input.value = "";
    });
    for (const type of ["dragenter", "dragover"]) {
        document.addEventListener(type, (e) => {
            const dt = (e as DragEvent).dataTransfer;
            if (!dt || ![...dt.types].includes("Files")) return;
            e.preventDefault();
            // Observables don't check equality; skip the write so dragover doesn't re-run the reactor constantly
            if (!drag_over._value) drag_over.value = true;
        });
    }
    for (const type of ["dragleave", "drop"]) {
        document.addEventListener(type, (e) => {
            if (type === "dragleave" && (e as DragEvent).relatedTarget) return;
            drag_over.value = false;
        });
    }
    document.addEventListener("drop", (e) => {
        const files = e.dataTransfer?.files;
        if (!files?.length) return;
        e.preventDefault();
        addLocalFiles(files);
    });

    // ------------------------------------------------------------------
    // Start
    // ------------------------------------------------------------------

    const draft = store.get<string | null>("draft", null);
    editor.innerHTML = draft || mdToHtml(SAMPLE.replace(/\*\*\*([^*]+)\*\*\*/g, "**_$1_**"));
    if (!draft) editor.querySelector("p")?.classList.add("first"); // drop cap on the opening paragraph
    word_counter.schedule(); // queued on "render", which flushes after main.ts mounts the page

    const links = store.get<string[] | null>("links", null);
    addLinks((links && links.length ? links : [BOOK_LINK, CODE_LINK]).join("\n"));

    return root;
}
