// circular_note.ts
//
// A shaped markdown note ("node"), built on Observable + Reactor + Scheduler.
//
//   - Text flows *into* the node's shape. For the circular node that shape is
//     the boolean AND of two semi-inscribed squares (one axis-aligned, one
//     rotated 45°): a regular octagon whose vertices touch the circle.
//   - A scroll wheel runs along the rim (a straight bar for square nodes);
//     drag it, click the track, or use the mouse wheel.
//   - Rendered markdown when idle; click to edit the raw markdown in place.
//   - Right-click: Resize [auto], Reshape, Copy, Paste, Lock, Flow, Color,
//     Border, Suggest. While editing, a text options toolbar sits below.
//
// How the shaped text works: two half-width floats with `shape-outside`
// polygons carve the region out of the text column, so the browser wraps
// every line to the shape (markdown styling, links and the caret included).
// To scroll, the column is translated up by `scroll` px while zero-width
// spacer floats push the carving floats down by the same amount. The carved
// window therefore stays fixed on screen and the text flows through it,
// re-wrapping as it goes.

import { Observable, Reactor, Scheduler } from "../../core/index";
import { renderMarkdown, toggleChecklistLine } from "./markdown.ts";
import "./circular_note.css";

type NodeShape = "circle" | "square" | "star" | "free";
type Align = "left" | "center" | "right" | "justify";

interface Point {
    x: number;
    y: number;
}

// A text region: left and right boundary chains, each running top -> bottom,
// in node pixels. Every horizontal slice is a single interval.
interface Region {
    left: Point[];
    right: Point[];
    top: number;
    bottom: number;
}

// A scroll track, parameterised by t in [0, 1] along its length.
interface Track {
    d(t0: number, t1: number): string;
    paramAt(x: number, y: number): number;
}

export interface CircularNoteOptions {
    initial_text?: string;
    onSuggest?: (text: string) => void;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const SHAPE_ORDER: NodeShape[] = ["circle", "square", "star", "free"];
const SHAPE_GLYPH: Record<NodeShape, string> = { circle: "◯", square: "▢", star: "✵", free: "∿" };
const COLOR_SWATCHES = ["#e8e6df", "#f07b6f", "#e0a458", "#8fb96a", "#6aaee6", "#c98ae0"];
const FONT_OPTIONS = ["Arial", "Georgia", "Trebuchet MS", "Courier New", "Times New Roman"];
const LINE_HEIGHTS = [1.15, 1.45, 1.75, 2];
const MIN_SIZE = 200;
const MAX_SIZE = 760;
const RIM_GAP = 16; // px between the rim and the text region (room for the scroll wheel)
const WHEEL_SPEED = 0.45; // fraction of the wheel delta applied to the note
const SCROLL_EASE = 0.18; // fraction of the remaining distance covered per frame

let note_counter = 0;

const LIST_PREFIX = /^\s*([-*+]\s+\[[ xX]\]\s*|[-*+]\s+|\d+[.)]\s+|[a-zA-Z][.)]\s+)/;
const BULLET_PREFIX = /^\s*[-*+]\s+(?!\[[ xX]\])/;
const CHECK_PREFIX = /^\s*[-*+]\s+\[[ xX]\]\s*/;
const NUMBER_PREFIX = /^\s*\d+[.)]\s+/;
const LETTER_PREFIX = /^\s*[a-zA-Z][.)]\s+/;

// ----------------------------------------------------------------------------
// Geometry
// ----------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, v));
}

function mirrorRegion(c: number, right_rel: Point[]): Region {
    return {
        right: right_rel.map((p) => ({ x: c + p.x, y: c + p.y })),
        left: right_rel.map((p) => ({ x: c - p.x, y: c + p.y })),
        top: c + right_rel[0].y,
        bottom: c + right_rel[right_rel.length - 1].y,
    };
}

// The text region: the boolean AND of an axis-aligned square and the same
// square rotated 45°, both of half-side `s`: |x| <= s, |y| <= s, |x|+|y| <= s√2.
// That's a regular octagon. With s = R·cos(22.5°) the squares are
// semi-inscribed (their corners poke past the circle) and the octagon's
// vertices land exactly on the circle of radius R.
function octagonRegion(c: number, s: number): Region {
    const e = s * (Math.SQRT2 - 1); // half-length of each octagon edge
    return mirrorRegion(c, [{ x: e, y: -s }, { x: s, y: -e }, { x: s, y: e }, { x: e, y: s }]);
}

// The star node's outline: the boolean OR of the axis square and the 45°
// diamond inscribed in radius R (an 8-point star).
function starOutline(c: number, R: number): Region {
    const a = R / Math.SQRT2;
    const b = R - a;
    return mirrorRegion(c, [
        { x: 0, y: -R }, { x: b, y: -a }, { x: a, y: -a }, { x: a, y: -b },
        { x: R, y: 0 },
        { x: a, y: b }, { x: a, y: a }, { x: b, y: a }, { x: 0, y: R },
    ]);
}

const COS_22_5 = Math.cos(Math.PI / 8);

function rectRegion(x0: number, y0: number, x1: number, y1: number): Region {
    return {
        left: [{ x: x0, y: y0 }, { x: x0, y: y1 }],
        right: [{ x: x1, y: y0 }, { x: x1, y: y1 }],
        top: y0,
        bottom: y1,
    };
}

function regionFor(shape: NodeShape, size: number, flow: boolean): Region {
    const c = size / 2;
    if (shape === "circle" || shape === "star") {
        const R = c - RIM_GAP;
        if (!flow) {
            const a = R / Math.SQRT2;
            return rectRegion(c - a, c - a, c + a, c + a);
        }
        // circle: octagon inscribed in the circle; star: the AND of the star's own two squares
        return octagonRegion(c, shape === "circle" ? R * COS_22_5 : R / Math.SQRT2);
    }
    return rectRegion(18, 18, size - RIM_GAP - 10, size - 18);
}

// Closed outline of a region, without repeated vertices.
function regionPolygon(region: Region): Point[] {
    const points = [...region.right, ...[...region.left].reverse()];
    return points.filter((p, i) => {
        const prev = points[(i - 1 + points.length) % points.length];
        return Math.abs(p.x - prev.x) > 0.01 || Math.abs(p.y - prev.y) > 0.01;
    });
}

function cssPolygon(points: Point[]): string {
    return `polygon(${points.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(", ")})`;
}

// The left float excludes everything left of the region's left chain.
function leftFloatShape(region: Region, half: number, height: number): string {
    return cssPolygon([
        { x: 0, y: 0 }, { x: half, y: 0 }, { x: half, y: region.top },
        ...region.left,
        { x: half, y: region.bottom }, { x: half, y: height }, { x: 0, y: height },
    ]);
}

// The right float (its box starts at x = half) excludes everything right of the right chain.
function rightFloatShape(region: Region, half: number, width: number, height: number): string {
    const w = width - half;
    return cssPolygon([
        { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: height }, { x: 0, y: height },
        { x: 0, y: region.bottom },
        ...[...region.right].reverse().map((p) => ({ x: p.x - half, y: p.y })),
        { x: 0, y: region.top },
    ]);
}

function expandPolygon(points: Point[], c: number, by: number): Point[] {
    return points.map((p) => {
        const dx = p.x - c;
        const dy = p.y - c;
        const len = Math.hypot(dx, dy) || 1;
        return { x: p.x + (dx / len) * by, y: p.y + (dy / len) * by };
    });
}

function pathOf(points: Point[]): string {
    return points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("") + "Z";
}

function circlePath(c: number, r: number): string {
    return `M${c - r} ${c}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

function roundedRectPath(x0: number, y0: number, x1: number, y1: number, r: number): string {
    return `M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}` +
        `H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`;
}

function arcTrack(c: number, r: number, deg0: number, deg1: number): Track {
    const at = (t: number) => {
        const a = ((deg0 + (deg1 - deg0) * t) * Math.PI) / 180;
        return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
    };
    return {
        d(t0, t1) {
            const a = at(t0);
            const b = at(t1);
            return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}A${r} ${r} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
        },
        paramAt(x, y) {
            const deg = (Math.atan2(y - c, x - c) * 180) / Math.PI;
            return (deg - deg0) / (deg1 - deg0);
        },
    };
}

function lineTrack(x: number, y0: number, y1: number): Track {
    return {
        d: (t0, t1) => `M${x} ${y0 + (y1 - y0) * t0}L${x} ${y0 + (y1 - y0) * t1}`,
        paramAt: (_x, y) => (y - y0) / (y1 - y0),
    };
}

function trackFor(shape: NodeShape, size: number): Track {
    const c = size / 2;
    if (shape === "circle") return arcTrack(c, c - 8, -50, 50);
    if (shape === "star") return arcTrack(c, c - 8, -32, 32);
    return lineTrack(size - 9, 22, size - 22);
}

// ----------------------------------------------------------------------------
// DOM helpers
// ----------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(tag: K, class_name = ""): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (class_name) node.className = class_name;
    return node;
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, class_name = ""): SVGElementTagNameMap[K] {
    const node = document.createElementNS(SVG_NS, tag);
    if (class_name) node.setAttribute("class", class_name);
    return node;
}

// Plain text of an editable element (text nodes, <br> and block breaks).
function textOf(node: Node): string {
    let out = "";
    node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) out += (child as Text).data;
        else if (child.nodeName === "BR") out += "\n";
        else {
            if ((child.nodeName === "DIV" || child.nodeName === "P") && out && !out.endsWith("\n")) out += "\n";
            out += textOf(child);
        }
    });
    return out;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function CircularNote(options: CircularNoteOptions = {}): HTMLDivElement {
    const scheduler = Scheduler();
    const render_s = scheduler.getOrCreate("note-render");

    //// State
    const text = Observable(options.initial_text ?? "");
    const shape = Observable<NodeShape>("circle");
    // Large by default, but never wider than a phone screen allows
    const size = Observable(clamp(Math.min(560, window.innerWidth - 48), MIN_SIZE, MAX_SIZE));
    const auto_resize = Observable(false);
    const resizing = Observable(false);
    const flow_on = Observable(true);
    const locked = Observable(false);
    const bordered = Observable(true);
    const text_color = Observable(COLOR_SWATCHES[0]);
    const font = Observable(FONT_OPTIONS[0]);
    const font_size = Observable(14);
    const line_height = Observable(1.45);
    const align = Observable<Align>("left");
    const editing = Observable(false);
    const scroll = Observable(0);
    const max_scroll = Observable(0);
    const active_dropdown = Observable<string | null>(null);
    const context_menu = Observable<Point | null>(null);

    // Last laid-out geometry, read by the scroll and pointer code
    let geometry = { size: size.value, region: regionFor("circle", size.value, true), track: trackFor("circle", size.value) };

    //// Node DOM
    const root = el("div", "cmd-root");
    const stage = el("div", "cmd-stage");
    const node = el("div", "cmd-node");

    const outline = svgEl("svg", "cmd-outline");
    const fill = svgEl("path", "cmd-fill");
    const guides = svgEl("path", "cmd-guide");
    const guide_clip = svgEl("clipPath");
    guide_clip.id = `cmd-guide-clip-${++note_counter}`;
    const guide_clip_circle = svgEl("circle");
    guide_clip.append(guide_clip_circle);
    guides.setAttribute("clip-path", `url(#${guide_clip.id})`);
    outline.append(guide_clip, fill, guides);

    const clip = el("div", "cmd-clip");
    const flow = el("div", "cmd-flow");
    const spacer_left = el("div", "cmd-spacer cmd-spacer-left");
    const spacer_right = el("div", "cmd-spacer cmd-spacer-right");
    const float_left = el("div", "cmd-float cmd-float-left");
    const float_right = el("div", "cmd-float cmd-float-right");
    const view = el("div", "cmd-view");
    const editor = el("div", "cmd-editor");
    editor.spellcheck = false;
    editor.dataset.placeholder = "Write some markdown…";
    editor.contentEditable = "plaintext-only";
    if (editor.contentEditable !== "plaintext-only") editor.contentEditable = "true";
    // Spacers must come before the carving floats (float placement rules)
    flow.append(spacer_left, spacer_right, float_left, float_right, view, editor);
    clip.append(flow);

    const scroller = svgEl("svg", "cmd-scroller");
    const track_path = svgEl("path", "cmd-track");
    const thumb = svgEl("path", "cmd-thumb");
    scroller.append(track_path, thumb);

    const HANDLE_ANGLES = { nw: 225, ne: 315, se: 45, sw: 135 } as const;
    const handles = (Object.keys(HANDLE_ANGLES) as (keyof typeof HANDLE_ANGLES)[]).map((pos) => {
        const h = el("div", `cmd-handle cmd-handle-${pos}`);
        h.dataset.pos = pos;
        return h;
    });

    node.append(outline, clip, scroller, ...handles);

    //// Toolbar (text options menu)
    const toolbar = el("div", "cmd-toolbar");

    function button(label: string, title: string, class_name = ""): HTMLButtonElement {
        const b = el("button", `cmd-btn ${class_name}`.trim());
        b.type = "button";
        b.title = title;
        b.textContent = label;
        return b;
    }

    const dropdown_menus: HTMLDivElement[] = [];
    function dropdown(key: string, label: string, title: string, items: { label: string; run: () => void }[]) {
        const wrap = el("div", "cmd-dropdown");
        const trigger = button(`${label} ▾`, title, "cmd-dropdown-trigger");
        trigger.addEventListener("click", () => {
            active_dropdown.value = active_dropdown.value === key ? null : key;
        });
        const menu = el("div", "cmd-dropdown-menu");
        menu.dataset.key = key;
        for (const item of items) {
            const b = button(item.label, item.label, "cmd-dropdown-item");
            b.addEventListener("click", () => {
                item.run();
                active_dropdown.value = null;
            });
            menu.append(b);
        }
        dropdown_menus.push(menu);
        wrap.append(trigger, menu);
        return { wrap, trigger };
    }

    const bold_btn = button("B", "Bold (Ctrl+B)", "cmd-bold");
    const italic_btn = button("I", "Italic (Ctrl+I)", "cmd-italic");
    const underline_btn = button("U", "Underline (Ctrl+U)", "cmd-underline");
    const color_btn = button("A", "Text color", "cmd-color-btn");
    const color_bar = el("span", "cmd-color-bar");
    color_btn.append(color_bar);
    const highlight_btn = button("✎", "Highlight", "cmd-highlight");
    const insert_menu = dropdown("insert", "+", "Insert link, image or footnote", [
        { label: "Link", run: insertLink },
        { label: "Image", run: insertImage },
        { label: "Footnote / ref", run: insertFootnote },
    ]);
    insert_menu.trigger.classList.add("cmd-insert");
    const color_panel = el("div", "cmd-color-panel");
    for (const swatch of COLOR_SWATCHES) {
        const b = button("", swatch, "cmd-swatch");
        b.style.background = swatch;
        b.addEventListener("click", () => applyColor(swatch));
        color_panel.append(b);
    }
    const row1 = el("div", "cmd-row");
    row1.append(bold_btn, italic_btn, underline_btn, color_btn, highlight_btn, insert_menu.wrap, color_panel);

    const align_menu = dropdown("align", "≡", "Alignment",
        (["left", "center", "right", "justify"] as Align[]).map((a) => ({
            label: a[0].toUpperCase() + a.slice(1),
            run: () => (align.value = a),
        }))
    );
    const spacing_menu = dropdown("spacing", "↕", "Line spacing",
        LINE_HEIGHTS.map((h) => ({ label: h.toFixed(2), run: () => (line_height.value = h) }))
    );
    const check_menu = dropdown("check", "☑", "Checklist", [
        { label: "Checklist on / off", run: () => toggleLinePrefix(() => "- [ ] ", CHECK_PREFIX) },
    ]);
    const bullet_menu = dropdown("bullets", "•", "Bulleted list", [
        { label: "Bullets on / off", run: () => toggleLinePrefix(() => "- ", BULLET_PREFIX) },
    ]);
    const number_menu = dropdown("numbers", "1.", "Numbered list", [
        { label: "1, 2, 3", run: () => toggleLinePrefix((i) => `${i + 1}. `, NUMBER_PREFIX) },
        { label: "a, b, c", run: () => toggleLinePrefix((i) => `${String.fromCharCode(97 + (i % 26))}. `, LETTER_PREFIX) },
    ]);
    const row2 = el("div", "cmd-row");
    row2.append(align_menu.wrap, spacing_menu.wrap, check_menu.wrap, bullet_menu.wrap, number_menu.wrap);

    const font_menu = dropdown("font", FONT_OPTIONS[0], "Font", FONT_OPTIONS.map((f) => ({ label: f, run: () => (font.value = f) })));
    font_menu.trigger.classList.add("cmd-font-trigger");
    const size_minus = button("−", "Smaller text", "cmd-size-btn");
    const size_value = el("span", "cmd-size-value");
    const size_plus = button("+", "Larger text", "cmd-size-btn");
    size_minus.addEventListener("click", () => (font_size.value = clamp(font_size.value - 1, 8, 32)));
    size_plus.addEventListener("click", () => (font_size.value = clamp(font_size.value + 1, 8, 32)));
    const size_group = el("div", "cmd-size-group");
    size_group.append(size_minus, size_value, size_plus);
    const row3 = el("div", "cmd-row");
    row3.append(font_menu.wrap, size_group);

    toolbar.append(row1, row2, row3);

    //// Context menu
    const menu = el("div", "cmd-menu");
    const resize_btn = button("Resize", "Show resize handles", "cmd-menu-item");
    const auto_btn = button("[ ]", "Resize automatically as the content changes", "cmd-menu-item cmd-menu-auto");
    const reshape_btn = button("Reshape", "Cycle node shape: circle, square, star, free form", "cmd-menu-item");
    const copy_btn = button("Copy", "Copy markdown", "cmd-menu-item");
    const paste_btn = button("Paste", "Paste text", "cmd-menu-item");
    const lock_btn = button("Lock", "Lock / unlock", "cmd-menu-item");
    const flow_btn = button("Flow", "Wrap text to the node's shape", "cmd-menu-item");
    const color_menu_btn = button("Color", "Text color", "cmd-menu-item");
    const border_btn = button("Border", "Show / hide the border", "cmd-menu-item");
    const suggest_btn = button("✨ Suggest", "Suggest", "cmd-menu-item cmd-menu-wide");
    const resize_row = el("div", "cmd-menu-row cmd-menu-wide");
    resize_row.append(resize_btn, auto_btn);
    reshape_btn.classList.add("cmd-menu-wide");
    menu.append(resize_row, reshape_btn, copy_btn, paste_btn, lock_btn, flow_btn, color_menu_btn, border_btn, suggest_btn);

    const closeMenu = () => (context_menu.value = null);
    resize_btn.addEventListener("click", () => {
        resizing.value = !resizing.value;
        closeMenu();
    });
    auto_btn.addEventListener("click", () => (auto_resize.value = !auto_resize.value)); // menu stays open
    reshape_btn.addEventListener("click", () => {
        shape.value = SHAPE_ORDER[(SHAPE_ORDER.indexOf(shape.value) + 1) % SHAPE_ORDER.length];
    });
    copy_btn.addEventListener("click", () => {
        navigator.clipboard?.writeText(text.value).catch(() => { });
        closeMenu();
    });
    paste_btn.addEventListener("click", async () => {
        closeMenu();
        try {
            const pasted = await navigator.clipboard.readText();
            if (editing.value) {
                const [start, end] = selectionOffsets() ?? [textOf(editor).length, textOf(editor).length];
                replaceRange(start, end, pasted);
            } else if (!locked.value) {
                text.value = text.value + pasted;
            }
        } catch {
            /* clipboard read unavailable or denied */
        }
    });
    lock_btn.addEventListener("click", () => {
        locked.value = !locked.value;
        if (locked.value) {
            resizing.value = false;
            if (editing.value) editor.blur();
        }
        closeMenu();
    });
    flow_btn.addEventListener("click", () => (flow_on.value = !flow_on.value));
    color_menu_btn.addEventListener("click", () => {
        closeMenu();
        active_dropdown.value = "color";
    });
    border_btn.addEventListener("click", () => (bordered.value = !bordered.value));
    suggest_btn.addEventListener("click", () => {
        closeMenu();
        if (options.onSuggest) options.onSuggest(text.value);
        else console.info("[circular-note] Suggest: pass options.onSuggest to wire up a suggestion handler.");
    });

    stage.append(node, toolbar, menu);
    root.append(stage);

    // Toolbar and menu clicks must not steal focus from the editor, or close themselves
    for (const panel of [toolbar, menu]) {
        panel.addEventListener("mousedown", (e) => e.preventDefault());
        panel.addEventListener("click", (e) => e.stopPropagation());
    }

    //// Editor text & selection helpers
    function offsetAt(container: Node, offset: number): number {
        const range = document.createRange();
        range.setStart(editor, 0);
        range.setEnd(container, offset);
        return textOf(range.cloneContents()).length;
    }

    function selectionOffsets(): [number, number] | null {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const range = sel.getRangeAt(0);
        if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null;
        return [offsetAt(range.startContainer, range.startOffset), offsetAt(range.endContainer, range.endOffset)];
    }

    function locate(offset: number): { node: Node; offset: number } {
        let remaining = offset;
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let current: Node | null;
        while ((current = walker.nextNode())) {
            if (current.nodeType === Node.TEXT_NODE) {
                const length = (current as Text).data.length;
                if (remaining <= length) return { node: current, offset: remaining };
                remaining -= length;
            } else if (current.nodeName === "BR") {
                const parent = current.parentNode!;
                const index = Array.prototype.indexOf.call(parent.childNodes, current);
                if (remaining === 0) return { node: parent, offset: index };
                remaining -= 1;
            }
        }
        return { node: editor, offset: editor.childNodes.length };
    }

    function setSelection(start: number, end = start) {
        const a = locate(start);
        const b = locate(end);
        const range = document.createRange();
        range.setStart(a.node, a.offset);
        range.setEnd(b.node, b.offset);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
    }

    // Replace [start, end) with `insert`, keeping native undo where possible
    function replaceRange(start: number, end: number, insert: string, sel_start = start + insert.length, sel_end = sel_start) {
        if (!editing.value) enterEdit();
        editor.focus({ preventScroll: true });
        setSelection(start, end);
        if (!document.execCommand("insertText", false, insert)) {
            const source = textOf(editor);
            editor.textContent = source.slice(0, start) + insert + source.slice(end);
        }
        setSelection(sel_start, sel_end);
        syncFromEditor();
    }

    function currentSelection(): [number, number] {
        const length = textOf(editor).length;
        return selectionOffsets() ?? [length, length];
    }

    function wrapSelection(before: string, after = before) {
        if (locked.value) return;
        if (!editing.value) enterEdit();
        const source = textOf(editor);
        const [start, end] = currentSelection();
        const selected = source.slice(start, end);
        const is_wrapped = source.slice(start - before.length, start) === before && source.slice(end, end + after.length) === after;
        if (is_wrapped) {
            replaceRange(start - before.length, end + after.length, selected, start - before.length, end - before.length);
        } else {
            replaceRange(start, end, before + selected + after, start + before.length, end + before.length);
        }
    }

    function toggleLinePrefix(make: (i: number) => string, matcher: RegExp) {
        if (locked.value) return;
        if (!editing.value) enterEdit();
        const source = textOf(editor);
        const [start, end] = currentSelection();
        const line_start = source.lastIndexOf("\n", start - 1) + 1;
        let line_end = source.indexOf("\n", end);
        if (line_end === -1) line_end = source.length;
        const lines = source.slice(line_start, line_end).split("\n");
        const all_have = lines.every((l) => matcher.test(l));
        const next = lines
            .map((l, i) => (all_have ? l.replace(matcher, "") : make(i) + l.replace(LIST_PREFIX, "")))
            .join("\n");
        replaceRange(line_start, line_end, next, line_start, line_start + next.length);
    }

    function applyColor(color: string) {
        active_dropdown.value = null;
        const sel = editing.value ? selectionOffsets() : null;
        if (sel && sel[0] !== sel[1]) wrapSelection(`<span style="color:${color}">`, "</span>");
        else text_color.value = color;
    }

    // window.prompt blurs the editor; remember the selection and come back to it
    function promptAt(message: string, fallback: string): { value: string; at: [number, number] } | null {
        const at = editing.value ? currentSelection() : ([text.value.length, text.value.length] as [number, number]);
        const value = window.prompt(message, fallback);
        if (!value || locked.value) return null;
        enterEdit();
        setSelection(at[0], at[1]);
        return { value, at };
    }

    function insertLink() {
        const label_source = editing.value ? textOf(editor) : text.value;
        const result = promptAt("Link URL:", "https://");
        if (!result) return;
        const [start, end] = result.at;
        const label = label_source.slice(start, end) || "link";
        replaceRange(start, end, `[${label}](${result.value})`);
    }

    function insertImage() {
        const result = promptAt("Image URL:", "https://");
        if (!result) return;
        const alt = window.prompt("Alt text:", "image") ?? "image";
        enterEdit();
        replaceRange(result.at[0], result.at[1], `![${alt}](${result.value})`);
    }

    function insertFootnote() {
        if (locked.value) return;
        if (!editing.value) enterEdit();
        const source = textOf(editor);
        const used = [...source.matchAll(/\[\^(\d+)\]/g)].map((m) => Number(m[1]));
        const id = (used.length ? Math.max(...used) : 0) + 1;
        const [start, end] = currentSelection();
        replaceRange(start, end, `[^${id}]`);
        const after = textOf(editor);
        const definition = `${after.endsWith("\n") ? "" : "\n"}\n[^${id}]: `;
        replaceRange(after.length, after.length, definition);
    }

    bold_btn.addEventListener("click", () => wrapSelection("**"));
    italic_btn.addEventListener("click", () => wrapSelection("_"));
    underline_btn.addEventListener("click", () => wrapSelection("<u>", "</u>"));
    highlight_btn.addEventListener("click", () => wrapSelection("=="));
    color_btn.addEventListener("click", () => {
        active_dropdown.value = active_dropdown.value === "color" ? null : "color";
    });

    //// Edit mode
    function syncFromEditor() {
        text.value = textOf(editor);
        scheduler.flush(render_s); // lay out now, so caret tracking sees the new geometry
        ensureCaretVisible();
    }

    function caretOffsetFromPoint(x: number, y: number): number | null {
        const doc = document as Document & {
            caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
            caretRangeFromPoint?: (x: number, y: number) => Range | null;
        };
        let hit: { node: Node; offset: number } | null = null;
        if (doc.caretPositionFromPoint) {
            const pos = doc.caretPositionFromPoint(x, y);
            if (pos) hit = { node: pos.offsetNode, offset: pos.offset };
        } else if (doc.caretRangeFromPoint) {
            const range = doc.caretRangeFromPoint(x, y);
            if (range) hit = { node: range.startContainer, offset: range.startOffset };
        }
        if (!hit || !editor.contains(hit.node)) return null;
        return offsetAt(hit.node, hit.offset);
    }

    function enterEdit(at?: Point) {
        if (locked.value || editing.value) return;
        editor.textContent = text.value;
        editing.value = true;
        scheduler.flush(render_s); // show the editor now so it can take focus
        editor.focus({ preventScroll: true });
        const offset = at ? caretOffsetFromPoint(at.x, at.y) : null;
        setSelection(offset ?? text.value.length);
        ensureCaretVisible();
    }

    editor.addEventListener("input", syncFromEditor);
    editor.addEventListener("blur", () => {
        if (!document.hasFocus()) return; // switching windows: stay in edit mode
        text.value = textOf(editor);
        editing.value = false;
    });
    editor.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            editor.blur();
            return;
        }
        if (!(e.ctrlKey || e.metaKey)) return;
        const key = e.key.toLowerCase();
        if (key === "b" || key === "i" || key === "u") {
            e.preventDefault();
            if (key === "b") wrapSelection("**");
            if (key === "i") wrapSelection("_");
            if (key === "u") wrapSelection("<u>", "</u>");
        }
    });
    let caret_frame = 0;
    document.addEventListener("selectionchange", () => {
        if (!editing.value || document.activeElement !== editor || caret_frame) return;
        caret_frame = requestAnimationFrame(() => {
            caret_frame = 0;
            ensureCaretVisible();
        });
    });

    //// Scrolling
    let scroll_goal = 0;
    let scroll_frame = 0;
    let thumb_fraction = 1;

    function scrollTo(target: number, smooth = true) {
        scroll_goal = clamp(target, 0, max_scroll.value);
        if (!smooth) {
            cancelAnimationFrame(scroll_frame);
            scroll_frame = 0;
            scroll.value = scroll_goal;
            return;
        }
        if (!scroll_frame) scroll_frame = requestAnimationFrame(stepScroll);
    }

    function stepScroll() {
        const diff = scroll_goal - scroll.value;
        if (Math.abs(diff) < 0.5) {
            scroll.value = scroll_goal;
            scroll_frame = 0;
            return;
        }
        scroll.value += diff * SCROLL_EASE;
        scroll_frame = requestAnimationFrame(stepScroll);
    }

    function setSpacers(s: number) {
        spacer_left.style.height = `${s}px`;
        spacer_right.style.height = `${s}px`;
    }

    function applyScroll() {
        const max = max_scroll.value;
        const s = clamp(scroll.value, 0, max);
        setSpacers(s);
        flow.style.transform = `translateY(${-s}px)`;

        scroller.classList.toggle("scrollable", max > 0);
        if (max > 0) {
            const visible = geometry.region.bottom - geometry.region.top;
            thumb_fraction = clamp(visible / (visible + max), 0.14, 0.9);
            const t0 = (s / max) * (1 - thumb_fraction);
            track_path.setAttribute("d", geometry.track.d(0, 1));
            thumb.setAttribute("d", geometry.track.d(t0, t0 + thumb_fraction));
        }
    }

    function contentEnd(s: number): number {
        setSpacers(s);
        const content = editing.value ? editor : view;
        return content.offsetTop + content.offsetHeight;
    }

    // All content sits inside the carved window when scrolled by `s`
    function fits(s: number): boolean {
        return contentEnd(s) <= s + geometry.region.bottom - 2;
    }

    // Smallest scroll offset at which the content fits. More scroll moves
    // content into the full-width area above the window, so `fits` is monotone.
    function measureMaxScroll(): number {
        if (fits(0)) return 0;
        let lo = 0;
        let hi = Math.max(contentEnd(0), 1);
        for (let i = 0; i < 16 && hi - lo > 1; i++) {
            const mid = (lo + hi) / 2;
            if (fits(mid)) hi = mid;
            else lo = mid;
        }
        return Math.ceil(hi);
    }

    function fitSize(): number {
        let lo = MIN_SIZE;
        let hi = MAX_SIZE;
        applyGeometry(hi);
        if (!fits(0)) return hi;
        for (let i = 0; i < 10 && hi - lo > 4; i++) {
            const mid = (lo + hi) / 2;
            applyGeometry(mid);
            if (fits(0)) hi = mid;
            else lo = mid;
        }
        return Math.ceil(hi);
    }

    function caretRect(): DOMRect | null {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(false);
        const rects = range.getClientRects();
        if (rects.length) return rects[rects.length - 1];
        const container = range.startContainer;
        const element = container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement;
        const child = element?.childNodes[range.startOffset];
        return child instanceof Element ? child.getBoundingClientRect() : null;
    }

    // Keep the caret inside the carved window while typing / moving it
    function ensureCaretVisible() {
        if (!editing.value) return;
        for (let pass = 0; pass < 3; pass++) {
            const rect = caretRect();
            if (!rect || (rect.height === 0 && rect.top === 0)) return;
            const node_top = node.getBoundingClientRect().top;
            const top = rect.top - node_top;
            const bottom = rect.bottom - node_top;
            const band_top = geometry.region.top + 4;
            const band_bottom = geometry.region.bottom - 10;
            let delta = 0;
            if (bottom > band_bottom) delta = bottom - band_bottom;
            else if (top < band_top && scroll.value > 0) delta = top - band_top;
            if (Math.abs(delta) < 1) return;
            scrollTo(scroll.value + delta, false);
            applyScroll(); // apply synchronously so the next pass measures the new layout
        }
    }

    // Wheel scrolls the note; at either end the page scrolls instead
    node.addEventListener("wheel", (e) => {
        const max = max_scroll.value;
        if (max <= 0) return;
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? geometry.size : 1;
        const next = clamp(scroll_goal + e.deltaY * unit * WHEEL_SPEED, 0, max);
        if (next === scroll_goal && next === scroll.value) return;
        e.preventDefault();
        scrollTo(next);
    }, { passive: false });

    // The clip layer must never scroll natively (e.g. focus trying to reveal the caret)
    clip.addEventListener("scroll", () => {
        clip.scrollTop = 0;
        clip.scrollLeft = 0;
    });

    // Scroll wheel: drag the thumb, or press the track to jump
    let thumb_drag: { grab: number } | null = null;

    function trackParam(e: PointerEvent): number {
        const rect = node.getBoundingClientRect();
        return geometry.track.paramAt(e.clientX - rect.left, e.clientY - rect.top);
    }

    function scrollFromParam(t: number) {
        const p = clamp(t / (1 - thumb_fraction), 0, 1);
        scrollTo(p * max_scroll.value, false);
    }

    for (const target of [track_path, thumb]) {
        target.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            const t = trackParam(e);
            const t0 = (scroll.value / (max_scroll.value || 1)) * (1 - thumb_fraction);
            thumb_drag = { grab: target === thumb ? t - t0 : thumb_fraction / 2 };
            target.setPointerCapture(e.pointerId);
            thumb.classList.add("dragging");
            if (target === track_path) scrollFromParam(t - thumb_drag.grab);
        });
        target.addEventListener("pointermove", (e) => {
            if (thumb_drag) scrollFromParam(trackParam(e) - thumb_drag.grab);
        });
        const end = () => {
            thumb_drag = null;
            thumb.classList.remove("dragging");
        };
        target.addEventListener("pointerup", end);
        target.addEventListener("pointercancel", end);
    }
    scroller.addEventListener("mousedown", (e) => e.preventDefault());

    //// Resize handles
    let pending_size = 0;
    let size_frame = 0;
    for (const h of handles) {
        h.addEventListener("mousedown", (e) => e.preventDefault());
        h.addEventListener("pointerdown", (e) => {
            if (e.button !== 0 || locked.value) return;
            e.preventDefault();
            e.stopPropagation();
            auto_resize.value = false;
            h.setPointerCapture(e.pointerId);
        });
        h.addEventListener("pointermove", (e) => {
            if (!h.hasPointerCapture(e.pointerId)) return;
            const rect = node.getBoundingClientRect();
            const dx = e.clientX - (rect.left + rect.width / 2);
            const dy = e.clientY - (rect.top + rect.height / 2);
            const round = shape.value === "circle" || shape.value === "star";
            pending_size = clamp(2 * (round ? Math.hypot(dx, dy) : Math.max(Math.abs(dx), Math.abs(dy))), MIN_SIZE, MAX_SIZE);
            if (!size_frame) {
                size_frame = requestAnimationFrame(() => {
                    size_frame = 0;
                    size.value = pending_size;
                });
            }
        });
    }

    //// Clicks, context menu, dismissal
    function scrollToFootnote(id: string) {
        const definition = view.querySelector<HTMLElement>(`[data-footnote="${CSS.escape(id)}"]`);
        if (!definition) return;
        let target = scroll.value;
        for (let i = 0; i < 3; i++) {
            target = clamp(definition.offsetTop - geometry.size / 2 + 20, 0, max_scroll.value);
            setSpacers(target); // re-measure with the layout at that offset
        }
        applyScroll();
        scrollTo(target);
    }

    node.addEventListener("click", (e) => {
        if (editing.value || context_menu.value || resizing.value) return;
        const target = e.target as HTMLElement;
        if (target.closest("a, .cmd-handle, .cmd-scroller")) return;
        if (target instanceof HTMLInputElement && target.type === "checkbox") {
            if (locked.value) e.preventDefault();
            else text.value = toggleChecklistLine(text.value, Number(target.dataset.line));
            return;
        }
        const ref = target.closest<HTMLElement>(".md-ref");
        if (ref) return scrollToFootnote(ref.dataset.ref ?? "");
        enterEdit({ x: e.clientX, y: e.clientY });
    });

    node.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const rect = stage.getBoundingClientRect();
        context_menu.value = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    });

    window.addEventListener("click", (e) => {
        if (context_menu.value) context_menu.value = null;
        if (active_dropdown.value) active_dropdown.value = null;
        if (resizing.value && !node.contains(e.target as Node)) resizing.value = false;
    });
    window.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        context_menu.value = null;
        active_dropdown.value = null;
        resizing.value = false;
    });

    //// Layout
    function applyGeometry(s: number) {
        const region = regionFor(shape.value, s, flow_on.value);
        const half = s / 2;
        node.style.width = `${s}px`;
        node.style.height = `${s}px`;
        flow.style.width = `${s}px`;
        for (const f of [float_left, float_right]) {
            f.style.width = `${half}px`;
            f.style.height = `${s}px`;
        }
        float_left.style.shapeOutside = leftFloatShape(region, half, s);
        float_right.style.shapeOutside = rightFloatShape(region, half, s, s);
        clip.style.clipPath = cssPolygon(expandPolygon(regionPolygon(region), half, 8));

        for (const svg of [outline, scroller]) svg.setAttribute("viewBox", `0 0 ${s} ${s}`);
        const c = half;
        const shape_d = {
            circle: circlePath(c, c - 1),
            square: roundedRectPath(1, 1, s - 1, s - 1, 22),
            star: pathOf(regionPolygon(starOutline(c, c - 1.5))),
            free: roundedRectPath(1, 1, s - 1, s - 1, 22),
        }[shape.value];
        fill.setAttribute("d", shape_d);
        // Guides: the two semi-inscribed squares whose AND is the text region,
        // clipped to the circle (their corners reach past it)
        const g = (c - RIM_GAP) * COS_22_5;
        const g2 = g * Math.SQRT2;
        guides.setAttribute("d", shape.value === "circle"
            ? `M${c - g} ${c - g}H${c + g}V${c + g}H${c - g}ZM${c} ${c - g2}L${c + g2} ${c}L${c} ${c + g2}L${c - g2} ${c}Z`
            : "");
        guide_clip_circle.setAttribute("cx", String(c));
        guide_clip_circle.setAttribute("cy", String(c));
        guide_clip_circle.setAttribute("r", String(c - 1));

        const round = shape.value === "circle" || shape.value === "star";
        for (const h of handles) {
            const deg = HANDLE_ANGLES[h.dataset.pos as keyof typeof HANDLE_ANGLES];
            const rad = (deg * Math.PI) / 180;
            const x = round ? c + (c - 3) * Math.cos(rad) : Math.cos(rad) > 0 ? s - 3 : 3;
            const y = round ? c + (c - 3) * Math.sin(rad) : Math.sin(rad) > 0 ? s - 3 : 3;
            h.style.left = `${x}px`;
            h.style.top = `${y}px`;
        }

        geometry = { size: s, region, track: trackFor(shape.value, s) };
    }

    Reactor(
        () => {
            flow.style.fontFamily = `"${font.value}", sans-serif`;
            flow.style.fontSize = `${font_size.value}px`;
            flow.style.lineHeight = String(line_height.value);
            flow.style.textAlign = align.value;
            flow.style.color = text_color.value;

            view.style.display = editing.value ? "none" : "";
            editor.style.display = editing.value ? "" : "none";
            if (!editing.value) {
                view.innerHTML = renderMarkdown(text.value) || '<p class="md-placeholder">Click to write…</p>';
            }

            applyGeometry(auto_resize.value ? fitSize() : size.value);
            max_scroll.value = measureMaxScroll();
            scroll_goal = clamp(scroll_goal, 0, max_scroll.value);
            if (scroll.value > max_scroll.value) scroll.value = max_scroll.value;
            applyScroll();
        },
        {
            deps: [text, shape, size, auto_resize, flow_on, font, font_size, line_height, align, text_color, editing],
            auto_deps: false,
            initFn: true,
            reaction_schedule: render_s,
        }
    );

    Reactor(applyScroll, { deps: [scroll, max_scroll], auto_deps: false, reaction_schedule: render_s });

    //// Chrome: classes, menus, labels
    Reactor(
        () => {
            node.dataset.shape = shape.value;
            node.classList.toggle("bordered", bordered.value);
            node.classList.toggle("locked", locked.value);
            node.classList.toggle("editing", editing.value);
            node.classList.toggle("resizing", resizing.value && !locked.value);

            toolbar.classList.toggle("visible", editing.value || active_dropdown.value !== null);
            for (const m of dropdown_menus) m.classList.toggle("visible", active_dropdown.value === m.dataset.key);
            color_panel.classList.toggle("visible", active_dropdown.value === "color");
            color_bar.style.background = text_color.value;
            size_value.textContent = String(font_size.value);
            font_menu.trigger.textContent = `${font.value} ▾`;

            const at = context_menu.value;
            menu.classList.toggle("visible", at !== null);
            if (at) {
                menu.style.left = `${at.x}px`;
                menu.style.top = `${at.y}px`;
            }
            resize_btn.classList.toggle("active", resizing.value);
            auto_btn.textContent = auto_resize.value ? "[✓]" : "[ ]";
            reshape_btn.textContent = `Reshape ${SHAPE_GLYPH[shape.value]}`;
            lock_btn.textContent = locked.value ? "🔒 Unlock" : "🔓 Lock";
            flow_btn.textContent = flow_on.value ? "Flow ✓" : "Flow";
            border_btn.textContent = bordered.value ? "Border ✓" : "Border";
        },
        {
            deps: [shape, bordered, locked, editing, resizing, active_dropdown, context_menu, auto_resize, flow_on, text_color, font_size, font],
            auto_deps: false,
            initFn: true,
            reaction_schedule: render_s,
        }
    );

    // The first layout ran before the node was in the document; redo it once
    // mounted, and again once web fonts have loaded.
    requestAnimationFrame(() => text.trigger());
    document.fonts?.ready.then(() => text.trigger());

    return root;
}
