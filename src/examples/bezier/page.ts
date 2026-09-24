// page.ts
//
// A Bezier curve editor built on the Observable + Reactor + Scheduler engine,
// composed with a shaped markdown note (see circular_note.ts). The two widgets
// are independent: separate state, separate Schedulers.
//
// Bezier editor layers, from core to top:
//
//   L0  Rendering    - N-point De Casteljau curve as an SVG path
//   L1  Caching      - memoized path strings + localStorage-cached SVG defs
//                      (css-tricks inline-svg caching technique)
//   L2  Editing      - double-click or right-click a curve to edit it. Drag
//                      points (they keep their grab offset) or the curve body,
//                      click a point for +/-, Delete removes it. One curve is
//                      edited at a time (`active_curve`).
//   L3  Camera       - drag the background (or middle-drag anywhere) to pan,
//                      with momentum; wheel / two-finger scroll pans;
//                      ctrl+wheel / pinch zooms around the cursor. The grid
//                      moves with the camera.
//   L4  Multi-curve  - any number of curves on one canvas
//
// Smoothness: pointer and wheel input is coalesced to one state write per
// animation frame. Point sizes and stroke widths stay constant in screen
// pixels (the CSS variable --u holds SVG units per screen pixel), so points
// are equally easy to grab at any zoom. Camera changes only re-measure the
// overlay UI of the curve being edited.

import { Observable, Reactor, Scheduler, type Schedule } from "../../core/index";
import { CircularNote } from "./circular_note.ts";
import "./page.css";

// ----------------------------------------------------------------------------
// Types & small helpers
// ----------------------------------------------------------------------------

interface Point {
    x: number;
    y: number;
}

interface Camera {
    x: number; // viewBox min-x, in global (SVG) space
    y: number; // viewBox min-y, in global (SVG) space
    w: number; // viewBox width  -> controls zoom
    h: number; // viewBox height (kept in sync with the canvas aspect ratio)
}

function midpoint(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clamp(v: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, v));
}

function deCasteljau(pts: Point[], t: number): Point {
    let work = pts;
    while (work.length > 1) {
        const next: Point[] = [];
        for (let i = 0; i < work.length - 1; i++) {
            next.push({
                x: work[i].x + (work[i + 1].x - work[i].x) * t,
                y: work[i].y + (work[i + 1].y - work[i].y) * t,
            });
        }
        work = next;
    }
    return work[0];
}

// Calls `fn` at most once per animation frame, with the latest arguments.
function perFrame<A extends unknown[]>(fn: (...args: A) => void) {
    let frame = 0;
    let latest: A | null = null;
    const run = (...args: A) => {
        latest = args;
        if (!frame) {
            frame = requestAnimationFrame(() => {
                frame = 0;
                if (latest) fn(...latest);
            });
        }
    };
    run.flush = () => {
        if (!frame) return;
        cancelAnimationFrame(frame);
        frame = 0;
        if (latest) fn(...latest);
    };
    return run;
}

function isTypingTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA");
}

const SVG_NS = "http://www.w3.org/2000/svg";
const CURVE_SEGMENTS = 72;

// ----------------------------------------------------------------------------
// L1: Caching
//
// (a) In-memory memoization of the sampled path string, keyed by a rounded
//     signature of the control points. A render pass triggered by unrelated
//     state (e.g. hover) reuses the last computed geometry.
// (b) localStorage caching of the *static* inline SVG chrome (defs/filters),
//     per https://css-tricks.com/inline-svg-cached/.
// ----------------------------------------------------------------------------

const path_cache = new Map<string, string>();
const PATH_CACHE_LIMIT = 200;

function computeBezierPath(pts: Point[]): string {
    if (pts.length < 2) return "";
    let d = "";
    for (let i = 0; i <= CURVE_SEGMENTS; i++) {
        const p = deCasteljau(pts, i / CURVE_SEGMENTS);
        d += `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)} `;
    }
    return d.trim();
}

function getCachedBezierPath(pts: Point[]): string {
    const key = pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join("|");
    const cached = path_cache.get(key);
    if (cached) return cached;

    const d = computeBezierPath(pts);
    if (path_cache.size >= PATH_CACHE_LIMIT) {
        const oldest = path_cache.keys().next().value;
        if (oldest !== undefined) path_cache.delete(oldest);
    }
    path_cache.set(key, d);
    return d;
}

const SVG_DEFS_CACHE_KEY = "bezier-editor:defs:v1";

function buildDefsMarkup(): string {
    return `
        <filter id="bezier-point-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    `.trim();
}

function getOrBuildDefs(): SVGDefsElement {
    const defs = document.createElementNS(SVG_NS, "defs") as SVGDefsElement;
    let markup: string | null = null;
    try {
        markup = localStorage.getItem(SVG_DEFS_CACHE_KEY);
    } catch {
        // storage may be unavailable (private mode, disabled, etc.)
    }
    if (!markup) {
        markup = buildDefsMarkup();
        try {
            localStorage.setItem(SVG_DEFS_CACHE_KEY, markup);
        } catch {
            // best-effort cache only
        }
    }
    defs.innerHTML = markup;
    return defs;
}

// ----------------------------------------------------------------------------
// Coordinate transforms: global (SVG user space) <-> local (screen space),
// through the SVG's own CTM so they stay correct under any pan/zoom.
// ----------------------------------------------------------------------------

function screenToSvg(svg: SVGSVGElement, clientX: number, clientY: number): Point {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const loc = pt.matrixTransform(ctm.inverse());
    return { x: loc.x, y: loc.y };
}

function svgToScreen(svg: SVGSVGElement, x: number, y: number): Point {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const screen = pt.matrixTransform(ctm);
    return { x: screen.x, y: screen.y };
}

// ----------------------------------------------------------------------------
// Multi-curve model
// ----------------------------------------------------------------------------

const DEFAULT_POINTS: Point[] = [
    { x: -150, y: 40 },
    { x: 150, y: -40 },
];

const MIN_VIEW_W = 60;
const MAX_VIEW_W = 4000;
const GRID_UNITS = 28; // grid cell size in SVG units
const CLICK_SLOP = 4; // px of movement before a press counts as a drag

// Older engines can't size circles from CSS; they get attribute radii instead
const CSS_RADIUS = typeof CSS !== "undefined" && CSS.supports("r", "calc(2 * 1px)");

const CURVE_PALETTE = ["#d98f4e", "#5ea8c9", "#8fb96a", "#c96ac2", "#c9a15c", "#7d95e0"];

let curve_counter = 0;

interface CurveDeps {
    svg: SVGSVGElement;
    overlay: HTMLDivElement;
    camera: Observable<Camera>;
    active_curve: Observable<string | null>;
    context_menu: Observable<{ point: Point; curve_id: string } | null>;
    render_s: Schedule;
    onRequestRemove: (id: string) => void;
    curveCount: () => number;
}

interface CurveRecord {
    id: string;
    points: Observable<Point[]>;
    destroy: () => void;
}

type Drag =
    | { kind: "point"; index: number; offset: Point; start: Point; moved: boolean }
    | { kind: "curve"; grab: Point; origin: Point[]; start: Point; moved: boolean };

function createCurveRecord(initial_points: Point[], deps: CurveDeps): CurveRecord {
    const { svg, overlay, camera, active_curve, context_menu, render_s, onRequestRemove, curveCount } = deps;

    curve_counter += 1;
    const id = `curve-${curve_counter}`;
    const color = CURVE_PALETTE[(curve_counter - 1) % CURVE_PALETTE.length];

    //// Per-curve state
    const points = Observable<Point[]>(initial_points.map((p) => ({ ...p })));
    const hover_curve = Observable(false);
    const hover_point = Observable<number | null>(null);
    const drag_point = Observable<number | null>(null);
    const dragging_curve = Observable(false);
    const selected_point = Observable<number | null>(null);

    //// SVG group
    const group = document.createElementNS(SVG_NS, "g") as SVGGElement;
    group.setAttribute("class", "curve-group");
    group.dataset.curveId = id;
    group.style.setProperty("--curve-accent", color);

    const control_line = document.createElementNS(SVG_NS, "polyline") as SVGPolylineElement;
    control_line.setAttribute("class", "control-line");
    control_line.setAttribute("vector-effect", "non-scaling-stroke");

    const hit_path = document.createElementNS(SVG_NS, "path") as SVGPathElement;
    hit_path.setAttribute("class", "curve-hit");
    hit_path.setAttribute("vector-effect", "non-scaling-stroke");

    const curve_path = document.createElementNS(SVG_NS, "path") as SVGPathElement;
    curve_path.setAttribute("class", "curve-line");
    curve_path.setAttribute("vector-effect", "non-scaling-stroke");

    const points_group = document.createElementNS(SVG_NS, "g");
    points_group.setAttribute("class", "points-group");

    group.append(control_line, hit_path, curve_path, points_group);
    svg.appendChild(group);

    //// Overlay UI: edit actions + point toolbar
    const edit_actions = document.createElement("div");
    edit_actions.className = "edit-actions";
    const done_button = document.createElement("button");
    done_button.type = "button";
    done_button.className = "overlay-btn";
    done_button.textContent = "Done editing";
    const delete_button = document.createElement("button");
    delete_button.type = "button";
    delete_button.className = "overlay-btn danger";
    delete_button.textContent = "Delete curve";
    edit_actions.append(done_button, delete_button);

    const point_toolbar = document.createElement("div");
    point_toolbar.className = "point-toolbar";
    const add_button = document.createElement("button");
    add_button.type = "button";
    add_button.className = "toolbar-btn";
    add_button.title = "Add point";
    add_button.textContent = "+";
    const remove_button = document.createElement("button");
    remove_button.type = "button";
    remove_button.className = "toolbar-btn remove-btn";
    remove_button.title = "Remove point (Delete)";
    remove_button.textContent = "−";
    point_toolbar.append(add_button, remove_button);

    overlay.append(edit_actions, point_toolbar);

    //// Edit mode
    function isEditing(): boolean {
        return active_curve.value === id;
    }

    function enterEditMode() {
        context_menu.value = null;
        hover_curve.value = false;
        active_curve.value = id;
    }

    function exitEditMode() {
        if (active_curve.value === id) active_curve.value = null;
        selected_point.value = null;
        hover_point.value = null;
    }

    done_button.addEventListener("click", exitEditMode);
    delete_button.addEventListener("click", (e) => {
        e.stopPropagation();
        onRequestRemove(id);
    });

    hit_path.addEventListener("dblclick", () => {
        if (!isEditing()) enterEditMode();
    });
    hit_path.addEventListener("contextmenu", (e: MouseEvent) => {
        if (isEditing()) return;
        e.preventDefault();
        const rect = overlay.getBoundingClientRect();
        context_menu.value = { point: { x: e.clientX - rect.left, y: e.clientY - rect.top }, curve_id: id };
    });
    hit_path.addEventListener("pointerenter", () => {
        if (!isEditing()) hover_curve.value = true;
    });
    hit_path.addEventListener("pointerleave", () => (hover_curve.value = false));

    // A click on empty canvas clears the selected point
    svg.addEventListener("pointerdown", (e: PointerEvent) => {
        if (isEditing() && e.button === 0 && e.target === svg) selected_point.value = null;
    });

    //// Add / remove points
    function addPoint() {
        const idx = selected_point.value;
        if (idx === null) return;
        const pts = points.value.slice();
        const is_last = idx === pts.length - 1;
        // the last point pairs with the one before it
        const new_point = is_last ? midpoint(pts[idx], pts[idx - 1]) : midpoint(pts[idx], pts[idx + 1]);
        const insert_at = is_last ? idx : idx + 1;
        pts.splice(insert_at, 0, new_point);
        points.value = pts;
        selected_point.value = insert_at;
    }

    function removePoint() {
        const idx = selected_point.value;
        if (idx === null || points.value.length <= 2) return;
        const pts = points.value.slice();
        pts.splice(idx, 1);
        points.value = pts;
        selected_point.value = null;
    }

    add_button.addEventListener("click", (e) => {
        e.stopPropagation();
        addPoint();
    });
    remove_button.addEventListener("click", (e) => {
        e.stopPropagation();
        removePoint();
    });

    function handleKeydown(e: KeyboardEvent) {
        if (!isEditing() || isTypingTarget(e.target)) return;
        if (e.key === "Delete" || e.key === "Backspace") removePoint();
    }
    window.addEventListener("keydown", handleKeydown);

    //// Dragging points and the whole curve
    // Moves are written at most once per frame; the latest pointer position wins.
    let drag: Drag | null = null;
    const commitPoints = perFrame((next: Point[]) => {
        points.value = next;
    });

    function beginDrag(e: PointerEvent, target: Element, next: Drag) {
        e.stopPropagation();
        drag = next;
        target.setPointerCapture(e.pointerId);
    }

    hit_path.addEventListener("pointerdown", (e: PointerEvent) => {
        if (!isEditing() || e.button !== 0 || drag) return;
        const grab = screenToSvg(svg, e.clientX, e.clientY);
        beginDrag(e, hit_path, {
            kind: "curve",
            grab,
            origin: points.value.map((p) => ({ ...p })),
            start: { x: e.clientX, y: e.clientY },
            moved: false,
        });
        dragging_curve.value = true;
    });

    group.addEventListener("pointermove", (e: PointerEvent) => {
        if (!drag) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.start.x, e.clientY - drag.start.y) > CLICK_SLOP) drag.moved = true;
        const pointer = screenToSvg(svg, e.clientX, e.clientY);
        if (drag.kind === "point") {
            const next = points.value.slice();
            next[drag.index] = { x: pointer.x + drag.offset.x, y: pointer.y + drag.offset.y };
            commitPoints(next);
        } else if (drag.moved) {
            const dx = pointer.x - drag.grab.x;
            const dy = pointer.y - drag.grab.y;
            commitPoints(drag.origin.map((p) => ({ x: p.x + dx, y: p.y + dy })));
        }
    });

    const endDrag = (e: PointerEvent) => {
        if (!drag) return;
        commitPoints.flush();
        try {
            (e.target as Element).releasePointerCapture(e.pointerId);
        } catch {
            /* already released */
        }
        drag = null;
        drag_point.value = null;
        dragging_curve.value = false;
    };
    group.addEventListener("pointerup", endDrag);
    group.addEventListener("pointercancel", endDrag);

    //// Point handles: a large invisible hit circle around a small dot
    let handles: SVGGElement[] = [];

    function createHandle(): SVGGElement {
        const handle = document.createElementNS(SVG_NS, "g") as SVGGElement;
        handle.setAttribute("class", "point-handle");
        const hit = document.createElementNS(SVG_NS, "circle");
        hit.setAttribute("class", "point-hit");
        hit.setAttribute("r", "14");
        const dot = document.createElementNS(SVG_NS, "circle");
        dot.setAttribute("class", "point-dot");
        dot.setAttribute("r", "6");
        handle.append(hit, dot);

        const indexOf = () => Number(handle.dataset.index);
        handle.addEventListener("pointerenter", () => {
            if (isEditing()) hover_point.value = indexOf();
        });
        handle.addEventListener("pointerleave", () => {
            if (hover_point.value === indexOf()) hover_point.value = null;
        });
        handle.addEventListener("pointerdown", (e: PointerEvent) => {
            if (!isEditing() || e.button !== 0 || drag) return;
            const index = indexOf();
            const p = points.value[index];
            const pointer = screenToSvg(svg, e.clientX, e.clientY);
            beginDrag(e, handle, {
                kind: "point",
                index,
                offset: { x: p.x - pointer.x, y: p.y - pointer.y }, // no jump to the cursor
                start: { x: e.clientX, y: e.clientY },
                moved: false,
            });
            selected_point.value = index;
            drag_point.value = index;
        });
        return handle;
    }

    function syncHandles(count: number) {
        while (handles.length < count) {
            const handle = createHandle();
            handles.push(handle);
            points_group.appendChild(handle);
        }
        while (handles.length > count) handles.pop()!.remove();
    }

    //// Render: geometry and styling
    Reactor(
        () => {
            const pts = points.value;
            const editing = isEditing();
            const hover_pt = hover_point.value;
            const drag_pt = drag_point.value;
            const selected_pt = selected_point.value;

            const d = getCachedBezierPath(pts);
            curve_path.setAttribute("d", d);
            hit_path.setAttribute("d", d);

            const show_control = editing && pts.length > 2;
            control_line.style.display = show_control ? "" : "none";
            if (show_control) control_line.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));

            group.setAttribute("data-mode", editing ? "edit" : "view");
            group.classList.toggle("moving", dragging_curve.value);
            curve_path.classList.toggle("hovered", hover_curve.value && !editing);

            syncHandles(pts.length);
            handles.forEach((handle, i) => {
                handle.dataset.index = String(i);
                handle.setAttribute("transform", `translate(${pts[i].x} ${pts[i].y})`);
                handle.classList.toggle("interactive", editing);
                handle.classList.toggle("hovered", editing && hover_pt === i);
                handle.classList.toggle("dragging", editing && drag_pt === i);
                handle.classList.toggle("selected", editing && selected_pt === i);
            });
        },
        {
            deps: [points, active_curve, hover_curve, hover_point, drag_point, selected_point, dragging_curve],
            auto_deps: false,
            initFn: true,
            reaction_schedule: render_s,
        }
    );

    //// Render: overlay UI positions (only the edited curve does any work)
    Reactor(
        () => {
            const editing = isEditing();
            edit_actions.classList.toggle("visible", editing);
            const selected_pt = selected_point.value;
            const show_toolbar = editing && selected_pt !== null && drag_point.value === null && !!points.value[selected_pt];
            point_toolbar.classList.toggle("visible", show_toolbar);
            if (!editing) return;

            // Edit actions: under the bottom-left of the curve's bbox, or at the
            // viewport's bottom-left, whichever is closer to the viewport center.
            // Positions are relative to the overlay, which covers the canvas.
            const frame = overlay.getBoundingClientRect();
            const center: Point = { x: frame.width / 2, y: frame.height / 2 };
            const viewport_corner: Point = { x: 12, y: frame.height - 12 };
            let curve_corner = viewport_corner;
            try {
                const bbox = curve_path.getBBox();
                const screen = svgToScreen(svg, bbox.x, bbox.y + bbox.height);
                curve_corner = {
                    x: clamp(screen.x - frame.left, 12, frame.width - 220),
                    y: clamp(screen.y - frame.top + 44, 52, frame.height - 12),
                };
            } catch {
                // getBBox throws on a path that isn't laid out yet
            }
            const dist = (p: Point) => Math.hypot(p.x - center.x, p.y - center.y);
            const target = dist(curve_corner) < dist(viewport_corner) ? curve_corner : viewport_corner;
            edit_actions.style.left = `${target.x}px`;
            edit_actions.style.top = `${target.y}px`;
            delete_button.style.display = curveCount() > 1 ? "" : "none";

            if (show_toolbar) {
                const p = points.value[selected_pt!];
                const screen = svgToScreen(svg, p.x, p.y);
                point_toolbar.style.left = `${screen.x - frame.left}px`;
                point_toolbar.style.top = `${screen.y - frame.top - 18}px`;
                remove_button.disabled = points.value.length <= 2;
            }
        },
        {
            deps: [points, camera, active_curve, selected_point, drag_point],
            auto_deps: false,
            initFn: true,
            reaction_schedule: render_s,
        }
    );

    return {
        id,
        points,
        destroy() {
            window.removeEventListener("keydown", handleKeydown);
            group.remove();
            edit_actions.remove();
            point_toolbar.remove();
        },
    };
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function Page(): HTMLDivElement {
    //// 1. Engine
    const scheduler = Scheduler();
    const render_s = scheduler.getOrCreate("render");

    //// 2. Shared canvas state
    const camera = Observable<Camera>({ x: -260, y: -195, w: 520, h: 390 });
    const active_curve = Observable<string | null>(null);
    const context_menu = Observable<{ point: Point; curve_id: string } | null>(null);

    const curves = new Map<string, CurveRecord>();

    //// 3. Static DOM shell
    const wrapper = document.createElement("div");
    wrapper.className = "bezier-page";

    const eyebrow_row = document.createElement("div");
    eyebrow_row.className = "eyebrow-row";
    eyebrow_row.innerHTML = `<span class="eyebrow-dot"></span><span class="eyebrow-text">Bezier Curve Editor</span>`;

    const canvas_frame = document.createElement("div");
    canvas_frame.className = "canvas-frame";

    const svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
    svg.setAttribute("class", "bezier-svg");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.append(getOrBuildDefs());

    // HTML overlay (absolute-positioned UI on top of the SVG canvas)
    const overlay = document.createElement("div");
    overlay.className = "canvas-overlay";

    const hint = document.createElement("div");
    hint.className = "canvas-hint";

    const add_curve_button = document.createElement("button");
    add_curve_button.type = "button";
    add_curve_button.className = "overlay-btn add-curve-btn";
    add_curve_button.title = "Add a new curve";
    add_curve_button.textContent = "+ Add curve";

    const context_menu_el = document.createElement("div");
    context_menu_el.className = "curve-context-menu";
    const edit_points_option = document.createElement("button");
    edit_points_option.type = "button";
    edit_points_option.className = "context-menu-option";
    edit_points_option.textContent = "Edit points";
    context_menu_el.append(edit_points_option);

    overlay.append(hint, add_curve_button, context_menu_el);
    canvas_frame.append(svg, overlay);

    const note_eyebrow = document.createElement("div");
    note_eyebrow.className = "eyebrow-row";
    note_eyebrow.innerHTML = `<span class="eyebrow-dot md-dot"></span><span class="eyebrow-text">Circular Markdown Note</span>`;

    wrapper.append(eyebrow_row, canvas_frame, note_eyebrow);

    //// 4. Curve add/remove
    function addCurve(initial_points?: Point[]) {
        const cam = camera.value;
        const center = { x: cam.x + cam.w / 2, y: cam.y + cam.h / 2 };
        const offset = (curves.size % 5) * 30;
        const pts = initial_points ?? DEFAULT_POINTS.map((p) => ({ x: center.x + p.x + offset, y: center.y + p.y - offset }));
        const record = createCurveRecord(pts, {
            svg,
            overlay,
            camera,
            active_curve,
            context_menu,
            render_s,
            onRequestRemove: removeCurve,
            curveCount: () => curves.size,
        });
        curves.set(record.id, record);
    }

    function removeCurve(id: string) {
        const record = curves.get(id);
        if (!record) return;
        record.destroy();
        curves.delete(id);
        if (active_curve.value === id) active_curve.value = null;
    }

    add_curve_button.addEventListener("click", () => addCurve());

    // Seed with two curves so multi-curve support is visible immediately
    addCurve(DEFAULT_POINTS);
    addCurve([
        { x: -170, y: -100 },
        { x: 0, y: 130 },
        { x: 170, y: -100 },
    ]);

    //// 5. Context menu ("Edit points") and hint
    edit_points_option.addEventListener("click", (e) => {
        e.stopPropagation();
        const menu = context_menu.value;
        if (!menu) return;
        active_curve.value = menu.curve_id;
        context_menu.value = null;
    });
    context_menu_el.addEventListener("click", (e) => e.stopPropagation());
    window.addEventListener("click", () => {
        if (context_menu.value) context_menu.value = null;
    });
    window.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key !== "Escape" || isTypingTarget(e.target)) return;
        if (context_menu.value) context_menu.value = null;
        else if (active_curve.value) active_curve.value = null;
    });

    Reactor(
        () => {
            const menu = context_menu.value;
            context_menu_el.classList.toggle("visible", menu !== null);
            if (menu) {
                context_menu_el.style.left = `${menu.point.x}px`;
                context_menu_el.style.top = `${menu.point.y}px`;
            }
        },
        { deps: [context_menu], auto_deps: false, initFn: true, reaction_schedule: render_s }
    );

    Reactor(
        () => {
            hint.textContent = active_curve.value === null
                ? "Double-click a curve to edit · drag to pan · ctrl+scroll or pinch to zoom"
                : "Drag points or the curve · click a point for + / − · Esc when done";
        },
        { deps: [active_curve], auto_deps: false, initFn: true, reaction_schedule: render_s }
    );

    //// 6. Camera
    // `camera_goal` is the latest requested camera; writes to the observable
    // are coalesced to one per frame.
    let camera_goal: Camera = camera.value;
    const commitCamera = perFrame((next: Camera) => {
        camera.value = next;
    });
    function moveCamera(next: Camera) {
        camera_goal = next;
        commitCamera(next);
    }
    const unitsPerPixel = () => camera_goal.w / (svg.clientWidth || 1);

    // Momentum after a pan gesture
    let inertia_frame = 0;
    function stopInertia() {
        cancelAnimationFrame(inertia_frame);
        inertia_frame = 0;
    }
    function startInertia(velocity: Point) {
        let prev = performance.now();
        const step = (now: number) => {
            const dt = Math.min(now - prev, 40);
            prev = now;
            const k = unitsPerPixel();
            camera_goal = { ...camera_goal, x: camera_goal.x - velocity.x * dt * k, y: camera_goal.y - velocity.y * dt * k };
            camera.value = camera_goal;
            const decay = Math.pow(0.92, dt / 16);
            velocity = { x: velocity.x * decay, y: velocity.y * decay };
            inertia_frame = Math.hypot(velocity.x, velocity.y) > 0.01 ? requestAnimationFrame(step) : 0;
        };
        inertia_frame = requestAnimationFrame(step);
    }

    // Pan: left-drag on empty canvas, or middle-drag anywhere
    let pan: { last: Point; samples: { t: number; x: number; y: number }[] } | null = null;

    svg.addEventListener("pointerdown", (e: PointerEvent) => {
        stopInertia();
        const on_background = e.target === svg;
        if (!(e.button === 1 || (e.button === 0 && on_background))) return;
        e.preventDefault();
        pan = { last: { x: e.clientX, y: e.clientY }, samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }] };
        svg.setPointerCapture(e.pointerId);
        canvas_frame.classList.add("panning");
    });
    svg.addEventListener("pointermove", (e: PointerEvent) => {
        if (!pan) return;
        const k = unitsPerPixel();
        moveCamera({
            ...camera_goal,
            x: camera_goal.x - (e.clientX - pan.last.x) * k,
            y: camera_goal.y - (e.clientY - pan.last.y) * k,
        });
        pan.last = { x: e.clientX, y: e.clientY };
        pan.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
        while (pan.samples.length > 2 && e.timeStamp - pan.samples[0].t > 100) pan.samples.shift();
    });
    const endPan = (e: PointerEvent) => {
        if (!pan) return;
        const samples = pan.samples.filter((s) => e.timeStamp - s.t <= 80);
        pan = null;
        canvas_frame.classList.remove("panning");
        try {
            svg.releasePointerCapture(e.pointerId);
        } catch {
            /* already released */
        }
        if (samples.length >= 2) {
            const first = samples[0];
            const last = samples[samples.length - 1];
            const dt = last.t - first.t;
            const velocity = dt > 0 ? { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt } : { x: 0, y: 0 };
            if (Math.hypot(velocity.x, velocity.y) > 0.15) startInertia(velocity);
        }
    };
    svg.addEventListener("pointerup", endPan);
    svg.addEventListener("pointercancel", endPan);

    // Wheel / two-finger scroll pans; ctrl+wheel / pinch zooms around the cursor
    svg.addEventListener(
        "wheel",
        (e: WheelEvent) => {
            e.preventDefault();
            stopInertia();
            const rect = svg.getBoundingClientRect();
            const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1;
            const cam = camera_goal;
            if (e.ctrlKey || e.metaKey) {
                const factor = Math.exp(clamp(e.deltaY * unit, -60, 60) * 0.004);
                const w = clamp(cam.w * factor, MIN_VIEW_W, MAX_VIEW_W);
                const ratio = w / cam.w;
                const anchor = {
                    x: cam.x + (e.clientX - rect.left) * (cam.w / rect.width),
                    y: cam.y + (e.clientY - rect.top) * (cam.h / rect.height),
                };
                moveCamera({
                    w,
                    h: cam.h * ratio,
                    x: anchor.x - (anchor.x - cam.x) * ratio,
                    y: anchor.y - (anchor.y - cam.y) * ratio,
                });
            } else {
                const k = cam.w / rect.width;
                const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
                const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
                moveCamera({ ...cam, x: cam.x + dx * unit * k, y: cam.y + dy * unit * k });
            }
        },
        { passive: false }
    );

    // Keep the viewBox aspect ratio matched to the canvas so curves never stretch
    const resize_observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;
        const target_h = camera_goal.w * (height / width);
        if (Math.abs(target_h - camera_goal.h) > 0.5) moveCamera({ ...camera_goal, h: target_h });
        camera.trigger(); // screen size changed: re-derive --u and the grid
    });
    resize_observer.observe(canvas_frame);

    // viewBox, the screen-pixel unit, and the grid all follow the camera
    Reactor(
        () => {
            const cam = camera.value;
            svg.setAttribute("viewBox", `${cam.x} ${cam.y} ${cam.w} ${cam.h}`);
            const u = cam.w / (svg.clientWidth || cam.w);
            svg.style.setProperty("--u", String(u));
            if (!CSS_RADIUS) {
                svg.querySelectorAll(".point-hit").forEach((c) => c.setAttribute("r", String(14 * u)));
                svg.querySelectorAll(".point-dot").forEach((c) => c.setAttribute("r", String(6 * u)));
            }
            const cell = GRID_UNITS / u;
            canvas_frame.style.backgroundSize = `${cell}px ${cell}px`;
            canvas_frame.style.backgroundPosition = `${-cam.x / u}px ${-cam.y / u}px`;
        },
        { deps: [camera], auto_deps: false, initFn: true, reaction_schedule: render_s }
    );

    //// 7. Circular markdown note (fully independent widget)
    wrapper.append(
        CircularNote({
            initial_text: [
                "# Heading (optional)",
                "",
                "“Some key question goes here”",
                "",
                "Nuances in the question:",
                "- [link](https://github.com/AlmostAPhysicist/excitejs) says …",
                "- what if …",
                "- have you thought of …",
                "",
                '<span style="color:#e0a458">From what I understand — works</span>[^1] <span style="color:#e0a458">because</span> …',
                "",
                "But then why … ?",
                "",
                "## What works here",
                "**Bold**, _italic_, <u>underline</u>, ==highlight==, ~~strike~~ and `code`.",
                "",
                "- [x] text wraps into the shape",
                "- [ ] try the scroll wheel on the rim",
                "- [ ] right-click for Reshape, Flow, Resize",
                "",
                "1. click anywhere to edit the markdown",
                "2. Esc or click away to render it",
                "",
                "> Two semi-inscribed squares; their intersection is the text region.",
                "",
                "[^1]: Footnote refs jump down here when clicked.",
            ].join("\n"),
        })
    );

    return wrapper;
}
