// markdown.ts
//
// A small, safe markdown -> HTML renderer for the circular note.
// The source is HTML-escaped first; only the constructs below are turned back
// into markup, and link/image URLs are limited to http(s), mailto, relative
// paths and #anchors.
//
// Blocks:  # / ## / ### headings, - bullets, 1. numbers, a. letters,
//          - [ ] / - [x] checklists, > quotes, --- rules, [^n]: footnotes.
//          Single newlines are kept as line breaks (note-style, not paragraph-style).
// Inline:  **bold**, _italic_ / *italic*, <u>underline</u>, ==highlight==,
//          ~~strike~~, `code`, [links](url), ![images](url), [^n] refs,
//          <span style="color:#hex">colored text</span>

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// `url` is already escaped. Anything with a scheme other than http(s)/mailto is dropped.
function safeUrl(url: string): string | null {
    const has_scheme = /^[a-z][a-z0-9+.-]*:/i.test(url);
    if (!has_scheme || /^(https?|mailto):/i.test(url)) return url;
    return null;
}

function renderInline(escaped: string): string {
    // Finished fragments are stashed behind placeholders so later patterns
    // (e.g. `_italic_`) can't mangle URLs or code.
    const stash: string[] = [];
    const hold = (html: string) => `\u0000${stash.push(html) - 1}\u0000`;

    let s = escaped;
    s = s.replace(/`([^`]+)`/g, (_, code) => hold(`<code>${code}</code>`));
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt, url) => {
        const safe = safeUrl(url);
        return safe ? hold(`<img src="${safe}" alt="${alt}">`) : match;
    });
    s = s.replace(/\[([^\]^][^\]]*)\]\(([^)\s]+)\)/g, (match, label, url) => {
        const safe = safeUrl(url);
        return safe ? hold(`<a href="${safe}" target="_blank" rel="noopener noreferrer">${renderInline(label)}</a>`) : match;
    });
    s = s.replace(/\[\^([\w-]+)\]/g, (_, id) => hold(`<sup class="md-ref" data-ref="${id}">[${id}]</sup>`));

    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__(.+?)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\s](?:[^*]*[^*\s])?)\*(?!\*)/g, "$1<em>$2</em>");
    s = s.replace(/(^|[^\w])_([^_\s](?:[^_]*[^_\s])?)_(?![\w])/g, "$1<em>$2</em>");
    s = s.replace(/~~(.+?)~~/g, "<del>$1</del>");
    s = s.replace(/==(.+?)==/g, "<mark>$1</mark>");
    s = s.replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, "<u>$1</u>");
    s = s.replace(
        /&lt;span style=&quot;color:\s*(#[0-9a-fA-F]{3,8})&quot;&gt;(.+?)&lt;\/span&gt;/g,
        '<span style="color:$1">$2</span>'
    );

    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]);
}

type ListKind = "ul" | "ol" | "ol-alpha" | "check";

export function renderMarkdown(source: string): string {
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const out: string[] = [];

    let paragraph: string[] = [];
    let quote: string[] = [];
    let list: { kind: ListKind; items: string[] } | null = null;

    const flushParagraph = () => {
        if (paragraph.length) out.push(`<p>${paragraph.join("<br>")}</p>`);
        paragraph = [];
    };
    const flushQuote = () => {
        if (quote.length) out.push(`<p class="md-quote">${quote.join("<br>")}</p>`);
        quote = [];
    };
    const flushList = () => {
        if (!list) return;
        const tag = list.kind === "ul" || list.kind === "check" ? "ul" : "ol";
        const attrs = list.kind === "check" ? ' class="md-checklist"' : list.kind === "ol-alpha" ? ' type="a"' : "";
        out.push(`<${tag}${attrs}>${list.items.join("")}</${tag}>`);
        list = null;
    };
    const flushAll = () => {
        flushParagraph();
        flushQuote();
        flushList();
    };
    const pushItem = (kind: ListKind, html: string) => {
        flushParagraph();
        flushQuote();
        if (list && list.kind !== kind) flushList();
        if (!list) list = { kind, items: [] };
        list.items.push(html);
    };

    lines.forEach((raw, line_index) => {
        const line = escapeHtml(raw);
        let m: RegExpMatchArray | null;

        if (!line.trim()) return flushAll();

        if ((m = line.match(/^\[\^([\w-]+)\]:\s?(.*)$/))) {
            flushAll();
            out.push(`<p class="md-footnote" data-footnote="${m[1]}"><sup>[${m[1]}]</sup> ${renderInline(m[2])}</p>`);
        } else if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
            flushAll();
            const level = m[1].length;
            out.push(`<h${level}>${renderInline(m[2])}</h${level}>`);
        } else if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
            flushAll();
            out.push('<p class="md-hr">· · ·</p>');
        } else if ((m = line.match(/^\s*[-*+]\s+\[( |x|X)\]\s*(.*)$/))) {
            const checked = m[1] !== " " ? " checked" : "";
            pushItem("check", `<li><input type="checkbox" data-line="${line_index}"${checked}> ${renderInline(m[2])}</li>`);
        } else if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
            pushItem("ul", `<li>${renderInline(m[1])}</li>`);
        } else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
            pushItem("ol", `<li value="${Number(m[1])}">${renderInline(m[2])}</li>`);
        } else if ((m = line.match(/^\s*([a-zA-Z])[.)]\s+(.*)$/))) {
            const value = m[1].toLowerCase().charCodeAt(0) - 96;
            pushItem("ol-alpha", `<li value="${value}">${renderInline(m[2])}</li>`);
        } else if ((m = line.match(/^&gt;\s?(.*)$/))) {
            flushParagraph();
            flushList();
            quote.push(renderInline(m[1]));
        } else {
            flushQuote();
            flushList();
            paragraph.push(renderInline(line));
        }
    });
    flushAll();

    return out.join("");
}

// Flip the checkbox on a `- [ ]` / `- [x]` source line.
export function toggleChecklistLine(source: string, line_index: number): string {
    const lines = source.split("\n");
    const line = lines[line_index];
    if (line === undefined) return source;
    lines[line_index] = line.replace(/^(\s*[-*+]\s+\[)( |x|X)(\])/, (_, a, mark, b) => `${a}${mark === " " ? "x" : " "}${b}`);
    return lines.join("\n");
}
