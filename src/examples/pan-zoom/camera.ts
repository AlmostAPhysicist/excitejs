// camera.ts
//
// A pan and zoom camera for any element (usually a stack of canvases), built
// on Observables and a Scheduler. It knows nothing about what is drawn: it
// publishes a `view` (where it looks in the world) and a `screen` (what it
// looks through), and whatever draws reads them, usually a Layer (layer.ts).
//
//   Camera ──► view, screen ──► Layer ──► paint(brush, ...) ──► pixels
//
// Camera() returns a plain object, in the core's style. Its API is the
// Observables, the settings (plain mutable fields) and the methods. The
// working state (the view in progress, the target, the fling, the
// pointers, the input stage, the listeners) lives in one `_` object: still
// reachable, like an Observable's `_value`, for debugging or bending, but it
// is the implementation, not the API, and may change.
//
//   pointer / wheel / gesture / key events
//        │  record positions, queue a task; nothing moves yet
//        ▼
//   [input stage: manual, its own Scheduler]  drained once per frame
//        │
//        ▼
//   advance(now), once per animation frame:
//     1. drain the input stage: drags, pinches, hover
//     2. momentum after a fling
//     3. ease the current view toward the target (zoom about an anchor)
//     4. keep the world on screen (`world_bounds`)
//     5. publish: write `view` at most once
//
// View: (x, y) is the world point at the center of the screen, and
// `scale` is screen pixels per world unit. Screen coordinates are relative to
// the element's top-left corner, in CSS pixels.
//
// Inputs:
//   mouse      drag (left or middle) pans; wheel zooms about the cursor;
//              shift+wheel pans sideways; double-click zooms in (shift: out)
//   trackpad   two-finger scroll pans; pinch zooms (ctrl+wheel in Chromium
//              and Firefox, gesture events in Safari)
//   touch      one finger pans, with a fling; two fingers pinch and pan;
//              double-tap zooms in
//   pen        like a mouse
//   keyboard   (element focused) arrows pan, + and − zoom, 0 goes home
//
// A mouse wheel and a trackpad both send `wheel` events. In "auto" wheel mode
// each burst is classified once, from its first event: whole-line deltas, or
// large whole-pixel vertical steps, are a mouse wheel (zoom); anything else
// is a trackpad (pan). Set `wheel_mode` to "zoom" or "pan" to override.
//
// Why a manual stage: a pointer can fire several moves per frame. Each move
// only records the position and adds the same task to the stage. Tasks are a
// Set, so however many moves arrive, the gesture is applied once per frame
// with the latest positions. The stage has a Scheduler of its own, so no
// other flush can drain it early (see "Manual stages" in the README).
//
// Smoothing unaligned input: pointer events (mouse drags, touch) arrive once
// per frame, so applying them directly moves the view evenly. Wheel events
// (touchpad scrolls and pinches) and Safari's gesture events arrive whenever
// the device sends them: two in one frame, none in the next. Applied
// directly, the view would move in uneven stop-go steps. So they steer the
// target instead, and the view eases toward it every frame with a short time
// constant (`smooth_ms`): even motion for about a frame of lag.
//
// Easing a zoom about an anchor: interpolating x, y and scale separately
// makes the point under the cursor drift. Instead the scale is interpolated
// on a log scale, the world point under the anchor linearly, and the camera
// is rebuilt around that point. For a pure zoom both cameras have the same
// world point under the anchor, so it stays exactly still.

import { Observable, Reactor, Scheduler, type Schedule } from "../../core/index";

export interface View { x: number; y: number; scale: number }
export interface Screen { w: number; h: number; dpr: number }
export interface Rect { x0: number; y0: number; x1: number; y1: number }
export interface Point { x: number; y: number }
export interface Target extends View { ax: number; ay: number } // ax, ay: the screen point a zoom is anchored to
export type WheelMode = "auto" | "zoom" | "pan";
export type InputKind = "none" | "mouse" | "pen" | "touch" | "wheel" | "trackpad" | "keyboard";
export interface Tap { sx: number; sy: number; x: number; y: number; kind: InputKind; count: number; shift: boolean }
export interface Hover { sx: number; sy: number }
export interface PointerState { x: number; y: number; start_x: number; start_y: number; t0: number; kind: InputKind; moved: boolean }
type Listener = [EventTarget, string, EventListener, AddEventListenerOptions?];

// Anything that says where to look: a Camera (moved by input), or a
// FixedCamera (framed on a rect). A Layer paints whatever its source sees.
export interface ViewSource {
    view: Observable<View>;
    screen: Observable<Screen>;
}

export interface Camera {
    element: HTMLElement;

    // Published state
    view: Observable<View>;           // what the camera looks at
    screen: Observable<Screen>;       // what it looks through: the element's size and pixel ratio
    zoom_limits: Observable<{ min: number; max: number }>;
    world_bounds: Observable<Rect | null>; // the world rect the view is kept on (see `overscroll`)
    wheel_mode: Observable<WheelMode>;
    pointer_down: Observable<boolean>;
    last_input: Observable<InputKind>;  // what moved the camera last
    hover: Observable<Hover | null>;    // mouse / pen position while not dragging
    tap: Observable<Tap | null>;        // the latest press-and-release without a drag

    // Settings (mutable)
    zoom_ms: number;          // easing time constant of mouse-wheel zooms, buttons and keyboard moves
    smooth_ms: number;        // easing time constant that evens out touchpad and gesture input
    friction_ms: number;      // decay time constant of a fling
    wheel_speed: number;      // zoom per pixel of mouse wheel
    pinch_speed: number;      // zoom per pixel of trackpad pinch
    keyboard: boolean;
    double_tap: boolean;
    momentum: boolean;
    auto_advance: boolean;    // true: advances itself while moving; false: the host calls advance(now) every frame
    tap_slop: Record<string, number>; // px a press may wander and still be a tap
    overscroll: number;       // how far past `world_bounds` the view may go, as a fraction of the screen
    home_view: () => View;    // where goHome() and the 0 key go

    // Internals: reachable for debugging, not part of the API
    _: CameraInternals;

    // Geometry (on the published camera)
    toWorld(sx: number, sy: number): Point;
    toScreen(wx: number, wy: number): Point;
    visibleWorld(): Rect;

    // Moves (animate defaults to true)
    zoomAt(factor: number, sx?: number, sy?: number, animate?: boolean): void;
    zoomTo(scale: number, animate?: boolean): void;
    panBy(dx: number, dy: number, animate?: boolean): void;
    lookAt(cam: View, animate?: boolean): void;
    fit(rect: Rect, padding?: number, animate?: boolean): void;
    goHome(animate?: boolean): void;
    stop(): void; // halt easing and momentum where they are

    // Frame
    advance(now: number): boolean; // one frame; true while anything still moves
    isMoving(): boolean;
    requestAdvance(): void;        // make sure an advance is coming (like Scheduler.requestFlush)
    measure(): void;               // re-read the element's size and pixel ratio
    dispose(): void;
}

export interface CameraInternals {
    current: View;            // the view being built this frame
    target: Target;           // where easing is heading
    ease_ms: number;          // time constant of the current easing (zoom_ms or smooth_ms)
    velocity: Point;          // fling, px per ms
    pointers: Map<number, PointerState>;
    gesture: { cx: number; cy: number; dist: number; count: number } | null;
    samples: { t: number; x: number; y: number }[]; // recent gesture centroids, for the fling
    hover_at: Hover | null;
    last_tap: { t: number; x: number; y: number } | null;
    wheel_kind: "mouse" | "trackpad";
    last_wheel: number;
    last_move: number;        // time of the last pointer move while pressed
    last_time: number;
    frame_id: number;
    dirty: boolean;           // `current` differs from the published view
    input: Scheduler;         // its own Scheduler, so nothing else drains the input stage
    input_stage: Schedule;
    listeners: Listener[];
    reactors: Reactor[];
}

export interface CameraOptions {
    view?: View;
    min_scale?: number;
    max_scale?: number;
    world_bounds?: Rect | null;
    wheel_mode?: WheelMode;
    home_view?: () => View;
    zoom_ms?: number;
    smooth_ms?: number;
    friction_ms?: number;
    wheel_speed?: number;
    keyboard?: boolean;
    double_tap?: boolean;
    momentum?: boolean;
    auto_advance?: boolean;
    overscroll?: number;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const TAP_MS = 350;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_PX = 30;
const WHEEL_GAP_MS = 220;   // silence that ends a wheel burst
const FLING_WINDOW_MS = 90; // movement this recent sets the fling velocity
const MAX_FLING = 5;        // px per ms
const reduced_motion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;

export function Camera(element: HTMLElement, options: CameraOptions = {}): Camera {
    const start: View = { ...(options.view ?? { x: 0, y: 0, scale: 1 }) };

    const self: Camera = {
        element,

        view: Observable<View>({ ...start }),
        screen: Observable<Screen>(readScreen()),
        zoom_limits: Observable({ min: options.min_scale ?? 0.05, max: options.max_scale ?? 50 }),
        world_bounds: Observable<Rect | null>(options.world_bounds ?? null),
        wheel_mode: Observable<WheelMode>(options.wheel_mode ?? "auto"),
        pointer_down: Observable(false),
        last_input: Observable<InputKind>("none"),
        hover: Observable<Hover | null>(null),
        tap: Observable<Tap | null>(null),

        zoom_ms: options.zoom_ms ?? 90,
        smooth_ms: options.smooth_ms ?? 40,
        friction_ms: options.friction_ms ?? 320,
        wheel_speed: options.wheel_speed ?? 0.0022,
        pinch_speed: 0.01,
        keyboard: options.keyboard ?? true,
        double_tap: options.double_tap ?? true,
        momentum: options.momentum ?? true,
        auto_advance: options.auto_advance ?? true,
        tap_slop: { mouse: 4, pen: 6, touch: 10 },
        overscroll: options.overscroll ?? 0.2,
        home_view: options.home_view ?? (() => ({ ...start })),

        _: {
            current: { ...start },
            target: { ...start, ax: 0, ay: 0 },
            ease_ms: options.zoom_ms ?? 90,
            velocity: { x: 0, y: 0 },
            pointers: new Map(),
            gesture: null,
            samples: [],
            hover_at: null,
            last_tap: null,
            wheel_kind: "mouse",
            last_wheel: 0,
            last_move: 0,
            last_time: 0,
            frame_id: 0,
            dirty: false,
            input: Scheduler(),
            input_stage: null as unknown as Schedule, // set below
            listeners: [],
            reactors: [],
        },

        //// Geometry

        toWorld: (sx, sy) => worldAt(self.view._value, sx, sy),
        toScreen(wx, wy) {
            const { w, h } = self.screen._value, c = self.view._value;
            return { x: w / 2 + (wx - c.x) * c.scale, y: h / 2 + (wy - c.y) * c.scale };
        },
        visibleWorld() {
            const { w, h } = self.screen._value, c = self.view._value;
            return { x0: c.x - w / 2 / c.scale, y0: c.y - h / 2 / c.scale, x1: c.x + w / 2 / c.scale, y1: c.y + h / 2 / c.scale };
        },

        //// Moves

        zoomAt(factor, sx = self.screen._value.w / 2, sy = self.screen._value.h / 2, animate = true) {
            self._.velocity = { x: 0, y: 0 };
            steer(0, 0, factor, sx, sy, self.zoom_ms);
            if (!animate) snapToTarget();
        },

        zoomTo: (scale, animate = true) => self.zoomAt(scale / self._.target.scale, undefined, undefined, animate),

        panBy(dx, dy, animate = true) {
            self._.velocity = { x: 0, y: 0 };
            if (!animate) { shiftBoth(dx, dy); self.requestAdvance(); return; }
            steer(dx, dy, 1, self.screen._value.w / 2, self.screen._value.h / 2, self.zoom_ms);
        },

        lookAt(c, animate = true) {
            const { min, max } = self.zoom_limits._value, { w, h } = self.screen._value;
            self._.velocity = { x: 0, y: 0 };
            self._.target = { x: c.x, y: c.y, scale: clamp(c.scale, min, max), ax: w / 2, ay: h / 2 };
            self._.ease_ms = self.zoom_ms;
            constrain(self._.target);
            if (!animate) snapToTarget();
            self.requestAdvance();
        },

        fit(r, padding = 24, animate = true) {
            const { w, h } = self.screen._value;
            const scale = Math.min((w - 2 * padding) / Math.max(1e-9, r.x1 - r.x0), (h - 2 * padding) / Math.max(1e-9, r.y1 - r.y0));
            self.lookAt({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, scale }, animate);
        },

        goHome: (animate = true) => self.lookAt(self.home_view(), animate),

        stop() {
            self._.velocity = { x: 0, y: 0 };
            self._.target = { ...self._.current, ax: self._.target.ax, ay: self._.target.ay };
        },

        //// Frame

        advance(now) {
            const dt = clamp(now - (self._.last_time || now - 16), 1, 64);
            self._.last_time = now;
            const reduce = reduced_motion?.matches ?? false;
            const w = self._.current, t = self._.target;

            // 1. input
            self._.input.flush(self._.input_stage);

            // 2. momentum
            if (!self._.pointers.size && (self._.velocity.x || self._.velocity.y)) {
                shiftBoth(self._.velocity.x * dt, self._.velocity.y * dt);
                const decay = Math.exp(-dt / self.friction_ms);
                self._.velocity = { x: self._.velocity.x * decay, y: self._.velocity.y * decay };
                if (Math.hypot(self._.velocity.x, self._.velocity.y) < 0.01) self._.velocity = { x: 0, y: 0 };
            }

            // 3. ease toward the target, 4. keep the world on screen
            if (w.scale !== t.scale || w.x !== t.x || w.y !== t.y) {
                if (reduce) snapToTarget();
                else {
                    const k = 1 - Math.exp(-dt / self._.ease_ms);
                    const from = worldAt(w, t.ax, t.ay), to = worldAt(t, t.ax, t.ay);
                    const s = w.scale * Math.pow(t.scale / w.scale, k);
                    placeAt(w, from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, t.ax, t.ay, s);
                    constrain(w);
                    const close = Math.abs(Math.log(t.scale / s)) < 1e-4 && Math.hypot(w.x - t.x, w.y - t.y) * s < 0.05;
                    if (close) snapToTarget();
                    self._.dirty = true;
                }
            }

            // 5. publish
            if (self._.dirty) {
                self._.dirty = false;
                self.view.value = { ...self._.current };
            }
            return self.isMoving();
        },

        isMoving() {
            const w = self._.current, t = self._.target;
            return self._.pointers.size > 0 || self._.input_stage.tasks.size > 0 || self._.dirty
                || self._.velocity.x !== 0 || self._.velocity.y !== 0
                || w.scale !== t.scale || w.x !== t.x || w.y !== t.y;
        },

        requestAdvance() {
            if (!self.auto_advance || self._.frame_id) return;
            const loop = (now: number) => {
                self._.frame_id = 0;
                if (self.advance(now)) self._.frame_id = requestAnimationFrame(loop);
                else self._.last_time = 0;
            };
            self._.frame_id = requestAnimationFrame(loop);
        },

        measure() {
            const prev = self.screen._value, next = readScreen();
            if (prev.w === next.w && prev.h === next.h && prev.dpr === next.dpr) return;
            self.screen.value = next;
            self._.target.ax = next.w / 2; self._.target.ay = next.h / 2;
            self._.dirty = true;
            self.requestAdvance();
        },

        dispose() {
            cancelAnimationFrame(self._.frame_id);
            self._.frame_id = 0;
            resize_observer.disconnect();
            dpr_query?.removeEventListener("change", onDprChange);
            for (const [t, type, fn, opts] of self._.listeners) t.removeEventListener(type, fn, opts);
            self._.reactors.forEach(r => r.dispose());
        },
    };

    self._.input_stage = self._.input.getOrCreate("input", false);
    self._.target.ax = self.screen._value.w / 2;
    self._.target.ay = self.screen._value.h / 2;

    //// Geometry helpers (work on any camera object)

    function readScreen(): Screen {
        const r = element.getBoundingClientRect();
        return { w: r.width || 1, h: r.height || 1, dpr: window.devicePixelRatio || 1 };
    }

    function local(e: { clientX: number; clientY: number }): Point {
        const r = element.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function worldAt(c: View, sx: number, sy: number): Point {
        const { w, h } = self.screen._value;
        return { x: c.x + (sx - w / 2) / c.scale, y: c.y + (sy - h / 2) / c.scale };
    }

    // Puts world point (wx, wy) under screen point (sx, sy) at scale s
    function placeAt(c: View, wx: number, wy: number, sx: number, sy: number, s: number): void {
        const { w, h } = self.screen._value;
        c.scale = s;
        c.x = wx - (sx - w / 2) / s;
        c.y = wy - (sy - h / 2) / s;
    }

    function zoomAround(c: View, factor: number, sx: number, sy: number): void {
        const { min, max } = self.zoom_limits._value;
        const p = worldAt(c, sx, sy);
        placeAt(c, p.x, p.y, sx, sy, clamp(c.scale * factor, min, max));
    }

    // A world edge may come at most `overscroll` of the screen into view;
    // along an axis where the world is smaller than that allows, it is centered.
    function constrain(c: View): void {
        const b = self.world_bounds._value;
        if (!b) return;
        const { w, h } = self.screen._value;
        const keep = 1 - 2 * self.overscroll; // fraction of the half-view the world must cover
        const hx = w / 2 / c.scale * keep, hy = h / 2 / c.scale * keep;
        c.x = b.x0 + hx <= b.x1 - hx ? clamp(c.x, b.x0 + hx, b.x1 - hx) : (b.x0 + b.x1) / 2;
        c.y = b.y0 + hy <= b.y1 - hy ? clamp(c.y, b.y0 + hy, b.y1 - hy) : (b.y0 + b.y1) / 2;
    }

    function snapToTarget(): void {
        const t = self._.target;
        self._.current = { x: t.x, y: t.y, scale: t.scale };
        self._.dirty = true;
    }

    // Direct manipulation moves `current` and `target` together, so a drag
    // during an eased zoom keeps both the drag and the zoom.
    function shiftBoth(dx: number, dy: number): void {
        const w = self._.current, t = self._.target;
        w.x -= dx / w.scale; w.y -= dy / w.scale;
        t.x -= dx / t.scale; t.y -= dy / t.scale;
        constrain(w); constrain(t);
        self._.dirty = true;
    }

    // Moves only the target (pan by dx, dy screen px, then zoom by `factor`
    // about sx, sy); the view eases there with time constant `ease_ms`
    function steer(dx: number, dy: number, factor: number, sx: number, sy: number, ease_ms: number): void {
        const t = self._.target;
        if (dx || dy) { t.x -= dx / t.scale; t.y -= dy / t.scale; }
        if (factor !== 1) zoomAround(t, factor, sx, sy);
        constrain(t);
        t.ax = sx; t.ay = sy;
        self._.ease_ms = ease_ms;
        self.requestAdvance();
    }

    function zoomBoth(factor: number, sx: number, sy: number): void {
        zoomAround(self._.current, factor, sx, sy);
        zoomAround(self._.target, factor, sx, sy);
        constrain(self._.current); constrain(self._.target);
        self._.target.ax = sx; self._.target.ay = sy;
        self._.dirty = true;
    }

    function setKind(kind: InputKind): void {
        if (self.last_input._value !== kind) self.last_input.value = kind;
    }

    //// Input tasks (run once per frame from the input stage)

    function applyGesture(): void {
        if (!self._.pointers.size) { self._.gesture = null; return; }
        const pts = [...self._.pointers.values()];
        const g = {
            cx: pts.reduce((s, p) => s + p.x, 0) / pts.length,
            cy: pts.reduce((s, p) => s + p.y, 0) / pts.length,
            dist: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
            count: pts.length,
        };
        const prev = self._.gesture;
        // a finger added or lifted re-bases the gesture instead of jumping
        if (prev && prev.count === g.count) {
            const dx = g.cx - prev.cx, dy = g.cy - prev.cy;
            if (dx || dy) shiftBoth(dx, dy);
            if (g.count > 1 && prev.dist > 0 && g.dist > 0) zoomBoth(g.dist / prev.dist, g.cx, g.cy);
        }
        self._.gesture = g;
        const t = performance.now();
        self._.samples.push({ t, x: g.cx, y: g.cy });
        while (self._.samples.length > 2 && t - self._.samples[0].t > FLING_WINDOW_MS) self._.samples.shift();
    }

    function applyHover(): void {
        const h = self._.hover_at, prev = self.hover._value;
        if (h === prev || (h && prev && h.sx === prev.sx && h.sy === prev.sy)) return;
        self.hover.value = h;
    }

    //// Pointer events

    function onPointerDown(e: PointerEvent): void {
        const kind = e.pointerType as InputKind;
        // left or middle; right stays free for context menus
        if (kind === "mouse" && e.button !== 0 && e.button !== 1) return;
        if (e.button === 1) e.preventDefault();
        if (self.keyboard) element.focus({ preventScroll: true });
        element.setPointerCapture(e.pointerId);
        const p = local(e);
        self._.pointers.set(e.pointerId, { x: p.x, y: p.y, start_x: p.x, start_y: p.y, t0: performance.now(), kind, moved: false });
        if (self._.pointers.size > 1) self._.pointers.forEach(d => d.moved = true); // two fingers: not a tap
        // catch the view: stop a fling or an eased pan, but let an eased zoom finish
        const zooming_to = self._.target.scale;
        self.stop();
        if (zooming_to !== self._.current.scale) zoomAround(self._.target, zooming_to / self._.current.scale, self._.target.ax, self._.target.ay);
        self._.gesture = null;
        self._.samples = [];
        self._.hover_at = null;
        self._.input_stage.tasks.add(applyGesture);
        self._.input_stage.tasks.add(applyHover);
        self.pointer_down.value = true;
        setKind(kind);
        self.requestAdvance();
    }

    function onPointerMove(e: PointerEvent): void {
        const p = local(e);
        const d = self._.pointers.get(e.pointerId);
        if (!d) {
            if (e.pointerType === "touch") return; // touch has no hover
            self._.hover_at = { sx: p.x, sy: p.y };
            self._.input_stage.tasks.add(applyHover);
            self.requestAdvance();
            return;
        }
        d.x = p.x; d.y = p.y;
        self._.last_move = performance.now();
        if (!d.moved && Math.hypot(p.x - d.start_x, p.y - d.start_y) > (self.tap_slop[d.kind] ?? 6)) d.moved = true;
        self._.input_stage.tasks.add(applyGesture);
        self.requestAdvance();
    }

    function onPointerUp(e: PointerEvent): void {
        const d = self._.pointers.get(e.pointerId);
        if (!d) return;
        // apply the last movement, and sample the release point, before the gesture re-bases
        self._.input_stage.tasks.add(applyGesture);
        self._.input.flush(self._.input_stage);
        self._.pointers.delete(e.pointerId);
        self._.gesture = null;
        const now = performance.now();

        if (self._.pointers.size) {
            self._.input_stage.tasks.add(applyGesture);
            self.requestAdvance();
            return;
        }

        // fling, if it was still moving when released
        const first = self._.samples[0], last = self._.samples[self._.samples.length - 1];
        const can_fling = self.momentum && !(reduced_motion?.matches) && e.type === "pointerup";
        if (can_fling && first && last && last.t - first.t > 8 && now - self._.last_move < 60) {
            const vx = (last.x - first.x) / (last.t - first.t), vy = (last.y - first.y) / (last.t - first.t);
            const speed = Math.hypot(vx, vy);
            const cap = Math.min(1, MAX_FLING / speed);
            self._.velocity = speed > 0.15 ? { x: vx * cap, y: vy * cap } : { x: 0, y: 0 };
        }
        self.pointer_down.value = false;
        if (e.pointerType !== "touch") { self._.hover_at = { sx: d.x, sy: d.y }; self._.input_stage.tasks.add(applyHover); }

        // a tap: pressed and released in place
        if (e.type === "pointerup" && !d.moved && now - d.t0 < TAP_MS) {
            const lt = self._.last_tap;
            const double = self.double_tap && !!lt && now - lt.t < DOUBLE_TAP_MS && Math.hypot(d.x - lt.x, d.y - lt.y) < DOUBLE_TAP_PX;
            const wp = worldAt(self._.current, d.x, d.y);
            self.tap.value = { sx: d.x, sy: d.y, x: wp.x, y: wp.y, kind: d.kind, count: double ? 2 : 1, shift: e.shiftKey };
            if (double) { self.zoomAt(e.shiftKey ? 0.5 : 2, d.x, d.y); self._.last_tap = null; }
            else self._.last_tap = { t: now, x: d.x, y: d.y };
        }
        self.requestAdvance();
    }

    function onPointerLeave(e: PointerEvent): void {
        if (self._.pointers.has(e.pointerId)) return;
        self._.hover_at = null;
        self._.input_stage.tasks.add(applyHover);
        self.requestAdvance();
    }

    // The window lost focus mid-drag: drop everything rather than stick
    function onBlur(): void {
        if (!self._.pointers.size) return;
        self._.pointers.clear();
        self._.gesture = null;
        self._.velocity = { x: 0, y: 0 };
        self.pointer_down.value = false;
        self.requestAdvance();
    }

    //// Wheel

    function onWheel(e: WheelEvent): void {
        e.preventDefault();
        const p = local(e);
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? self.screen._value.h : 1;
        let dx = e.deltaX * unit, dy = e.deltaY * unit;
        const now = performance.now();

        if (now - self._.last_wheel > WHEEL_GAP_MS) {
            const mouse_like = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
            self._.wheel_kind = mouse_like ? "mouse" : "trackpad";
        }
        self._.last_wheel = now;
        self._.velocity = { x: 0, y: 0 };
        self._.hover_at = { sx: p.x, sy: p.y };
        self._.input_stage.tasks.add(applyHover);
        const mouse = self._.wheel_kind === "mouse";
        setKind(mouse ? "wheel" : "trackpad");

        // a mouse wheel steps (eased over zoom_ms); a touchpad streams (eased over smooth_ms)
        const ease = mouse ? self.zoom_ms : self.smooth_ms;
        if (e.ctrlKey || e.metaKey) {
            // touchpad pinch, or ctrl + mouse wheel
            const f = mouse ? Math.exp(-dy * self.wheel_speed) : Math.exp(clamp(-dy * self.pinch_speed, -0.5, 0.5));
            steer(0, 0, f, p.x, p.y, ease);
        } else {
            if (e.shiftKey && !dx) { dx = dy; dy = 0; } // shift + wheel scrolls sideways
            const mode = self.wheel_mode._value === "auto" ? (mouse && !e.shiftKey ? "zoom" : "pan") : self.wheel_mode._value;
            if (mode === "pan") steer(-dx, -dy, 1, p.x, p.y, ease);
            else {
                const f = mouse ? Math.exp(-dy * self.wheel_speed) : Math.exp(clamp(-dy * self.pinch_speed / 2, -0.5, 0.5));
                steer(0, 0, f, p.x, p.y, ease);
            }
        }
    }

    //// Safari trackpad pinch (touch pinches arrive as pointers, so skip those)

    let gesture_scale = 1;
    let gesture_at: Point = { x: 0, y: 0 };
    function onGestureStart(e: any): void {
        e.preventDefault();
        if (self._.pointers.size) return;
        gesture_scale = 1;
        gesture_at = local(e);
    }
    function onGestureChange(e: any): void {
        e.preventDefault();
        if (self._.pointers.size) return;
        steer(0, 0, e.scale / gesture_scale, gesture_at.x, gesture_at.y, self.smooth_ms);
        gesture_scale = e.scale;
        setKind("trackpad");
    }

    //// Keyboard

    function onKey(e: KeyboardEvent): void {
        if (!self.keyboard || e.altKey || e.ctrlKey || e.metaKey) return;
        const { w, h } = self.screen._value;
        const step = e.shiftKey ? 0.5 : 0.15;
        const moves: Record<string, () => void> = {
            ArrowLeft: () => self.panBy(w * step, 0),
            ArrowRight: () => self.panBy(-w * step, 0),
            ArrowUp: () => self.panBy(0, h * step),
            ArrowDown: () => self.panBy(0, -h * step),
            "+": () => self.zoomAt(1.5), "=": () => self.zoomAt(1.5),
            "-": () => self.zoomAt(1 / 1.5), "_": () => self.zoomAt(1 / 1.5),
            "0": () => self.goHome(),
        };
        const move = moves[e.key];
        if (!move) return;
        e.preventDefault();
        setKind("keyboard");
        move();
    }

    //// Size and pixel ratio

    const resize_observer = new ResizeObserver(() => self.measure());
    resize_observer.observe(element);

    // a pixel-ratio change (browser zoom, another monitor) doesn't resize the
    // element; a resolution query fires once, so it is re-armed each time
    let dpr_query: MediaQueryList | null = null;
    function watchDpr(): void {
        dpr_query?.removeEventListener("change", onDprChange);
        dpr_query = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
        dpr_query.addEventListener("change", onDprChange);
    }
    function onDprChange(): void { self.measure(); watchDpr(); }
    watchDpr();

    //// Reactions

    // new zoom limits or world bounds apply at once
    self._.reactors.push(Reactor(() => {
        const { min, max } = self.zoom_limits.value;
        self.world_bounds.value;
        self._.target.scale = clamp(self._.target.scale, min, max);
        self._.current.scale = clamp(self._.current.scale, min, max);
        constrain(self._.target); constrain(self._.current);
        self._.dirty = true;
        self.requestAdvance();
    }, { deps: [self.zoom_limits, self.world_bounds] }));

    self._.reactors.push(Reactor(() => {
        element.dataset.pointerDown = String(self.pointer_down.value);
    }));

    //// Wiring

    element.style.touchAction = "none";
    element.style.userSelect = "none";
    element.style.setProperty("-webkit-user-select", "none");
    element.style.setProperty("-webkit-touch-callout", "none");
    if (self.keyboard && !element.hasAttribute("tabindex")) element.tabIndex = 0;

    const noTouchMenu = (e: Event) => { if ([...self._.pointers.values()].some(p => p.kind === "touch")) e.preventDefault(); };
    const noAutoscroll = (e: MouseEvent) => { if (e.button === 1) e.preventDefault(); };
    const preventDefault = (e: Event) => e.preventDefault();

    self._.listeners = [
        [element, "pointerdown", onPointerDown as EventListener],
        [element, "pointermove", onPointerMove as EventListener],
        [element, "pointerup", onPointerUp as EventListener],
        [element, "pointercancel", onPointerUp as EventListener],
        [element, "lostpointercapture", onPointerUp as EventListener],
        [element, "pointerleave", onPointerLeave as EventListener],
        [element, "wheel", onWheel as EventListener, { passive: false }],
        [element, "gesturestart", onGestureStart, { passive: false }],
        [element, "gesturechange", onGestureChange, { passive: false }],
        [element, "gestureend", preventDefault, { passive: false }],
        [element, "keydown", onKey as EventListener],
        [element, "contextmenu", noTouchMenu],
        [element, "mousedown", noAutoscroll as EventListener],
        [window, "blur", onBlur],
    ];
    for (const [t, type, fn, opts] of self._.listeners) t.addEventListener(type, fn, opts);

    // first publish, with the constraints applied
    constrain(self._.current); constrain(self._.target);
    self.view.value = { ...self._.current };

    return self;
}

//// FixedCamera: a camera on a tripod
//
// It frames a world rect inside an element and never moves on its own: no
// input, no easing. When the element resizes or `frame` changes, the view is
// refitted. Use it where a picture should hold still, such as a figure.

export interface FixedCamera extends ViewSource {
    frame: Observable<Rect>; // the world rect kept in view
    padding: number;         // px kept clear around it
    dispose(): void;
}

export function FixedCamera(element: HTMLElement, frame: Rect, padding = 0): FixedCamera {
    const measure = (): Screen => ({ w: element.clientWidth || 1, h: element.clientHeight || 1, dpr: window.devicePixelRatio || 1 });
    const self: FixedCamera = {
        view: Observable<View>({ x: 0, y: 0, scale: 1 }),
        screen: Observable<Screen>(measure()),
        frame: Observable<Rect>(frame),
        padding,
        dispose() { resize_observer.disconnect(); fit.dispose(); },
    };
    const fit = Reactor(() => {
        const r = self.frame.value, { w, h } = self.screen.value;
        const scale = Math.max(1e-6, Math.min((w - 2 * self.padding) / (r.x1 - r.x0), (h - 2 * self.padding) / (r.y1 - r.y0)));
        self.view.value = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, scale };
    });
    const resize_observer = new ResizeObserver(() => {
        const next = measure(), prev = self.screen._value;
        if (next.w !== prev.w || next.h !== prev.h || next.dpr !== prev.dpr) self.screen.value = next;
    });
    resize_observer.observe(element);
    return self;
}
