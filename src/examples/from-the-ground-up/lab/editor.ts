// lab/editor.ts
//
// A small code editor: a transparent <textarea> over a highlighted copy of
// its own text, both inside one scrolling box. Typing writes the `source`
// Observable; a Reactor repaints the highlight. Tab indents, Enter keeps the
// indentation, Escape lets go of the keyboard (so Tab can leave the editor).
//
// Two kinds of marks sit behind the text:
//   fresh    lines a step has just added
//   region   one rounded rectangle over the lines being explained; when the
//            region changes it slides there

import { Observable, Reactor } from "../../../core/index";
import { el, highlight } from "../kit.ts";

export interface Region { from: number; to: number; color: number } // lines from..to, inclusive

export interface EditorOptions {
    file: Observable<string>;            // its extension picks the highlighting
    fresh: Observable<Set<number>>;
    region: Observable<Region | null>;
}

export function Editor(source: Observable<string>, options: EditorOptions): HTMLElement {
    const root = el("div", "ed");
    const inner = el("div", "ed-inner"); // sized by the painted text; the textarea fills it
    const box = el("div", "ed-region");
    box.hidden = true;
    const paint = el("pre", "ed-paint");
    paint.setAttribute("aria-hidden", "true");
    const input = el("textarea", "ed-input");
    input.spellcheck = false;
    input.autocapitalize = "off";
    input.setAttribute("autocorrect", "off");
    input.setAttribute("aria-label", "Code editor. Press Escape, then Tab, to leave it.");
    input.wrap = "off";
    inner.append(box, paint, input);
    root.append(inner);

    let tab_leaves = false;
    const edit = (text: string, caret: number) => {
        input.value = text;
        input.selectionStart = input.selectionEnd = caret;
        source.value = text;
    };

    input.addEventListener("input", () => source.value = input.value);
    input.addEventListener("blur", () => tab_leaves = false);
    input.addEventListener("keydown", e => {
        const { selectionStart: a, selectionEnd: b, value } = input;
        if (e.key === "Escape") { tab_leaves = true; return; }
        if (e.key === "Tab" && !tab_leaves && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            if (e.shiftKey) {
                const start = value.lastIndexOf("\n", a - 1) + 1;
                const strip = value.slice(start).match(/^ {1,4}/)?.[0].length ?? 0;
                if (strip) edit(value.slice(0, start) + value.slice(start + strip), Math.max(start, a - strip));
            } else edit(value.slice(0, a) + "    " + value.slice(b), a + 4);
        } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const line = value.slice(value.lastIndexOf("\n", a - 1) + 1, a);
            const indent = line.match(/^\s*/)![0] + (/[{(\[]\s*$/.test(line) ? "    " : "");
            edit(value.slice(0, a) + "\n" + indent + value.slice(b), a + 1 + indent.length);
        } else if (e.key === "}" && /^\s{4,}$/.test(value.slice(value.lastIndexOf("\n", a - 1) + 1, a))) {
            e.preventDefault(); // a closing brace on an empty line steps back out
            edit(value.slice(0, a - 4) + "}" + value.slice(b), a - 3);
        } else tab_leaves = false;
    });

    // the text
    Reactor(() => {
        const text = source.value, fresh = options.fresh.value;
        const lang = options.file.value.split(".").pop()!;
        if (input.value !== text) input.value = text;
        // each line is a block of its own (see .ln in guide.css)
        paint.innerHTML = highlight(text, lang).split("\n")
            .map((line, k) => `<span class="ln${fresh.has(k) ? " is-fresh" : ""}">${line || " "}</span>`).join("");
    });

    // the region rectangle: placed from the lines it covers, after the text is painted
    let shown = "";
    Reactor(() => {
        const r = options.region.value;
        source.value; options.fresh.value; // the lines may have moved
        const first = r && paint.children[r.from] as HTMLElement | undefined;
        const last = r && paint.children[Math.min(r.to, paint.children.length - 1)] as HTMLElement | undefined;
        box.hidden = !first || !last;
        if (!r || !first || !last) { shown = ""; return; }
        box.dataset.color = String(r.color);
        box.style.top = first.offsetTop - 3 + "px";
        box.style.height = last.offsetTop + last.offsetHeight - first.offsetTop + 6 + "px";
        // bring it into view when it moves to other lines, inside the editor only
        const key = `${options.file._value}:${r.from}-${r.to}`;
        if (key !== shown && paint.offsetHeight) {
            shown = key;
            if (first.offsetTop < root.scrollTop + 10 || last.offsetTop + last.offsetHeight > root.scrollTop + root.clientHeight - 10) {
                root.scrollTo({ top: Math.max(0, first.offsetTop - 28), behavior: "smooth" });
            }
        }
    });
    // The lines have no size until the editor is on the page, and they move
    // when fonts load or the page is resized: place the rectangle again then.
    new ResizeObserver(() => options.region.trigger()).observe(paint);

    // a step's first new line, when a step arrives
    Reactor(() => {
        const fresh = options.fresh._value;
        if (!fresh.size || options.region._value) return;
        const line = paint.children[Math.min(...fresh)] as HTMLElement | undefined;
        if (line) root.scrollTop = Math.max(0, line.offsetTop - 40);
    }, { deps: [options.fresh] });

    return root;
}
