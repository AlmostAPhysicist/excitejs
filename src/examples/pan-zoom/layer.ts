// layer.ts
//
// One canvas that draws a world through a Camera, repainting as
// little as it can. Returns a plain object: the API is the paint function,
// the flags, `last_render` and the methods; the buffers and the record of what is
// on screen live in `_` (reachable for debugging, not part of the API).
//
//   camera.view ───┐
//   camera.screen ─┼──► [render] render() ──► only translated?  blit + paint the exposed strips
//   version ───────┘                          anything else?    full repaint
//      ▲
//   deps / invalidate()   (the content changed: always a full repaint)
//
// Scroll blit: when the camera only moved (same scale, size and pixel ratio),
// the previous frame is still right, just shifted. It is copied through a
// back buffer by the shift, and only the newly exposed strips are painted,
// each clipped to its strip. Panning across a busy scene then costs a couple
// of thin strips per frame instead of the whole screen.
//
// For blitted and freshly painted pixels to line up, a pan frame snaps the
// world origin to whole device pixels, so every shift is a whole number of
// device pixels (an offset of under one device pixel from the camera). A
// zoom frame repaints everything anyway, so it uses the exact origin:
// snapping there would make the scene shiver by up to half a pixel per frame.
//
// The `paint` callback receives the region to fill, in world units and in
// screen px, with a clip already set. It should draw what intersects that
// region (anything more is clipped away), and it must draw the same pixels
// for the same camera, so a strip matches the pixels beside it.

import { Observable, Reactor, type Schedule } from "../../core/index";
import type { View, Rect, Screen, ViewSource } from "./camera.ts";

export interface Brush {
    ctx: CanvasRenderingContext2D;
    scale: number;   // screen px per world unit
    dpr: number;
    ox: number;      // screen position of the world origin (device-pixel snapped on pan frames)
    oy: number;
    toScreen(x: number, y: number): { x: number; y: number };
    useWorld(): void;    // draw in world units from here on
    useScreen(): void;   // draw in CSS px from here on
}

export interface RenderReport {
    mode: "full" | "blit" | "idle";
    ms: number;    // time spent in the last render
    area: number;  // fraction of the screen painted
}

export interface Frame { ox: number; oy: number; scale: number; w: number; h: number; dpr: number; snapped: boolean } // origin in device px

export interface Layer {
    camera: ViewSource;            // a Camera, a FixedCamera, or anything with view and screen
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    paint: (p: Brush, world: Rect, screen: Rect) => void; // swappable
    blit: boolean;                 // allow scroll blits
    transparent: boolean;          // clear to transparent before paint()

    version: Observable<number>;   // a change repaints
    last_render: Observable<RenderReport>; // what the last render did: a full repaint, a blit, or nothing

    render(): void;                // render now (normally the Reactor does it)
    invalidate(): void;            // full repaint on the next render
    dispose(): void;

    _: {
        back: HTMLCanvasElement;   // scratch buffer for the blit
        back_ctx: CanvasRenderingContext2D;
        needs_full: boolean;
        last: Frame | null;        // what is on the canvas now
        reactors: Reactor[];
    };
}

export interface LayerOptions {
    paint: (p: Brush, world: Rect, screen: Rect) => void;
    deps?: Observable<any>[];   // a change in any of these repaints everything
    schedule?: Schedule | null; // stage the render runs on
    blit?: boolean;             // default true
    transparent?: boolean;      // default false: paint() fills its region
}

export function Layer(camera: ViewSource, canvas: HTMLCanvasElement, options: LayerOptions): Layer {
    const transparent = options.transparent ?? false;
    const back = document.createElement("canvas");

    const self: Layer = {
        camera, canvas,
        ctx: canvas.getContext("2d", { alpha: transparent })!,

        paint: options.paint,
        blit: options.blit ?? true,
        transparent,

        version: Observable(0),
        last_render: Observable<RenderReport>({ mode: "idle", ms: 0, area: 0 }),
        _: {
            back,
            back_ctx: back.getContext("2d", { alpha: transparent })!,
            needs_full: true,
            last: null,
            reactors: [],
        },

        render() {
            const cam = camera.view._value, vp = camera.screen._value;
            const t0 = performance.now();
            const { w, h, dpr } = vp;
            const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
            if (self.canvas.width !== bw || self.canvas.height !== bh) {
                self.canvas.width = self._.back.width = bw;
                self.canvas.height = self._.back.height = bh;
                self._.needs_full = true;
            }
            const last = self._.last;
            const same_zoom = !!last && last.scale === cam.scale && last.w === w && last.h === h && last.dpr === dpr;
            // snap only when this frame can be (or seed) a blit: a pure translation
            const snapped = self.blit && same_zoom;
            const exact_x = (w / 2 - cam.x * cam.scale) * dpr, exact_y = (h / 2 - cam.y * cam.scale) * dpr;
            const ox_d = snapped ? Math.round(exact_x) : exact_x;
            const oy_d = snapped ? Math.round(exact_y) : exact_y;
            const p = brushFor(cam, vp, ox_d, oy_d);
            const now: Frame = { ox: ox_d, oy: oy_d, scale: cam.scale, w, h, dpr, snapped };

            if (snapped && !self._.needs_full && last!.snapped) {
                const dx = ox_d - last!.ox, dy = oy_d - last!.oy; // device px
                if (dx === 0 && dy === 0) { self.last_render.value = { mode: "idle", ms: 0, area: 0 }; return; }
                if (Math.abs(dx) < bw && Math.abs(dy) < bh) {
                    // shift the old frame through the back buffer
                    const { ctx } = self, { back_ctx } = self._;
                    back_ctx.globalCompositeOperation = "copy";
                    back_ctx.drawImage(self.canvas, 0, 0);
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.globalCompositeOperation = "copy";
                    ctx.drawImage(self._.back, dx, dy);
                    ctx.globalCompositeOperation = "source-over";

                    // the exposed strips: a full-height column, and a row beside it
                    const ddx = dx / dpr, ddy = dy / dpr;
                    let area = 0;
                    if (dx > 0) { paintRegion(p, 0, 0, ddx, h); area += ddx * h; }
                    if (dx < 0) { paintRegion(p, w + ddx, 0, w, h); area -= ddx * h; }
                    const cx0 = Math.max(0, ddx), cx1 = Math.min(w, w + ddx);
                    if (dy > 0) { paintRegion(p, cx0, 0, cx1, ddy); area += (cx1 - cx0) * ddy; }
                    if (dy < 0) { paintRegion(p, cx0, h + ddy, cx1, h); area -= (cx1 - cx0) * ddy; }

                    self._.last = now;
                    self.last_render.value = { mode: "blit", ms: performance.now() - t0, area: area / (w * h) };
                    return;
                }
            }

            self._.needs_full = false;
            paintRegion(p, 0, 0, w, h);
            self._.last = now;
            self.last_render.value = { mode: "full", ms: performance.now() - t0, area: 1 };
        },

        invalidate() {
            self._.needs_full = true;
            self.version.value++;
        },

        dispose() {
            self._.reactors.forEach(r => r.dispose());
        },
    };

    function brushFor(cam: View, vp: Screen, ox_d: number, oy_d: number): Brush {
        const { dpr } = vp, s = cam.scale, ctx = self.ctx;
        const ox = ox_d / dpr, oy = oy_d / dpr;
        return {
            ctx, scale: s, dpr, ox, oy,
            toScreen: (x, y) => ({ x: ox + x * s, y: oy + y * s }),
            useWorld: () => ctx.setTransform(dpr * s, 0, 0, dpr * s, ox_d, oy_d),
            useScreen: () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0),
        };
    }

    // Paints one screen rect (CSS px), clipped to it
    function paintRegion(p: Brush, sx0: number, sy0: number, sx1: number, sy1: number): void {
        const { ctx } = self, { dpr, ox, oy, scale } = p;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const x = Math.floor(sx0 * dpr), y = Math.floor(sy0 * dpr);
        ctx.beginPath();
        ctx.rect(x, y, Math.ceil(sx1 * dpr) - x, Math.ceil(sy1 * dpr) - y);
        ctx.clip();
        if (self.transparent) ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
        p.useScreen();
        self.paint(p,
            { x0: (sx0 - ox) / scale, y0: (sy0 - oy) / scale, x1: (sx1 - ox) / scale, y1: (sy1 - oy) / scale },
            { x0: sx0, y0: sy0, x1: sx1, y1: sy1 });
        ctx.restore();
    }

    // content changes force a full repaint
    if (options.deps?.length) {
        self._.reactors.push(Reactor(() => self.invalidate(), { deps: options.deps }));
    }
    // camera, size and version changes render; within one flush, once
    self._.reactors.push(Reactor(() => self.render(), {
        deps: [camera.view, camera.screen, self.version],
        initFn: true,
        reaction_schedule: options.schedule ?? null,
    }));

    return self;
}
