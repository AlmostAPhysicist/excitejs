// lattice_layer.ts
//
// A Layer (from the Pan & Zoom example) that paints a Lattice. Give it a
// Camera for the free, pannable view, or a FixedCamera for a still figure.
//
//   lattice, tick, colors ──► Layer.invalidate ──► paint(brush, world, screen)
//   camera.view, screen   ──► Layer render (a blit when only panning)
//
// Two ways to paint, chosen by sprite detail (see sprites.ts):
//   detail 0   one pixel per spin in an offscreen image, scaled up unsmoothed
//              and tiled across the region: cost is independent of zoom
//   detail > 0 a sprite per visible cell, batched into a few paths
//
// The lattice is periodic, so by default it repeats to fill the view.

import { Observable, type Schedule } from "../../../core/index";
import { Layer } from "../../pan-zoom/layer.ts";
import type { Rect, ViewSource } from "../../pan-zoom/camera.ts";
import type { Lattice } from "../ising.ts";
import { colors, hexToU32 } from "../theme.ts";
import { SpriteBatch, addSpin, arrowAngle, detailAt, paintBatch, planeColor } from "./sprites.ts";

export interface LatticeLayerOptions {
    lattice: Observable<Lattice>;
    tick: Observable<number>;        // bump when the spins change
    clock?: () => number;            // timestamps comparable with lattice.flipped_at
    schedule?: Schedule | null;
    tile?: boolean;                  // repeat the periodic lattice (default true)
    dim?: (idx: number) => boolean;  // cells drawn faintly, as context
    deps?: Observable<any>[];        // anything else that should repaint it
}

export function LatticeLayer(camera: ViewSource, canvas: HTMLCanvasElement, options: LatticeLayerOptions): Layer {
    const tile = options.tile ?? true;
    const clock = options.clock ?? (() => performance.now());

    // one pixel per spin, rebuilt at most once per change (not once per strip)
    const off = document.createElement("canvas");
    const off_ctx = off.getContext("2d")!;
    let image: ImageData | null = null;
    let image_for = "";

    function pixels(lat: Lattice): HTMLCanvasElement {
        const c = colors._value;
        const key = `${options.tick._value}|${lat.n}|${c.up}|${c.down}`;
        if (key !== image_for || !image || image.width !== lat.n) {
            if (!image || image.width !== lat.n) {
                off.width = off.height = lat.n;
                image = off_ctx.createImageData(lat.n, lat.n);
            }
            const px = new Uint32Array(image.data.buffer), up = hexToU32(c.up), down = hexToU32(c.down);
            const spins = lat.spins;
            for (let k = 0; k < spins.length; k++) px[k] = spins[k] > 0 ? up : down;
            off_ctx.putImageData(image, 0, 0);
            image_for = key;
        }
        return off;
    }

    return Layer(camera, canvas, {
        deps: [options.lattice, options.tick, colors, ...(options.deps ?? [])],
        schedule: options.schedule ?? null,
        paint(brush, world, screen) {
            const { ctx, scale: s, ox, oy, dpr } = brush;
            const lat = options.lattice._value, n = lat.n, c = colors._value;
            const detail = detailAt(s);

            // the plane: between bubbles, and around an untiled lattice
            if (detail > 0 || !tile) {
                ctx.fillStyle = tile ? planeColor(c) : c.bg2;
                ctx.fillRect(screen.x0, screen.y0, screen.x1 - screen.x0, screen.y1 - screen.y0);
                if (!tile && detail > 0) {
                    ctx.fillStyle = planeColor(c);
                    ctx.fillRect(ox, oy, n * s, n * s);
                }
            }

            if (detail === 0) {
                const img = pixels(lat), size = n * s;
                ctx.imageSmoothingEnabled = false;
                // snap tile edges to device pixels so neighbouring tiles meet without seams
                const snap = (v: number) => Math.round(v * dpr) / dpr;
                const span = (lo: number, hi: number, o: number) => tile
                    ? [Math.floor((lo - o) / size), Math.ceil((hi - o) / size)] : [0, 1];
                const [kx0, kx1] = span(screen.x0, screen.x1, ox), [ky0, ky1] = span(screen.y0, screen.y1, oy);
                for (let ky = ky0; ky < ky1; ky++) {
                    const top = snap(oy + ky * size), bottom = snap(oy + (ky + 1) * size);
                    for (let kx = kx0; kx < kx1; kx++) {
                        const left = snap(ox + kx * size), right = snap(ox + (kx + 1) * size);
                        ctx.drawImage(img, left, top, right - left, bottom - top);
                    }
                }
                return;
            }

            // sprites: only the cells in the region being painted
            const { spins, flipped_at } = lat;
            const now = clock();
            const wrap = (v: number) => ((v % n) + n) % n;
            let j0 = Math.floor(world.x0), j1 = Math.ceil(world.x1);
            let i0 = Math.floor(world.y0), i1 = Math.ceil(world.y1);
            if (!tile) { j0 = Math.max(0, j0); i0 = Math.max(0, i0); j1 = Math.min(n, j1); i1 = Math.min(n, i1); }
            const main = SpriteBatch(detail);
            const faint = options.dim ? SpriteBatch(detail) : main;
            for (let i = i0; i < i1; i++) {
                const row = wrap(i) * n, y = oy + i * s;
                for (let j = j0; j < j1; j++) {
                    const idx = row + wrap(j);
                    const batch = options.dim && options.dim(idx) ? faint : main;
                    addSpin(batch, ox + j * s, y, s, spins[idx], arrowAngle(spins[idx], now - flipped_at[idx]));
                }
            }
            if (faint !== main) paintBatch(ctx, faint, c, 0.22);
            paintBatch(ctx, main, c);
        },
    });
}

// The spin under a point on screen (CSS px within the camera's element), or -1
export function cellAt(camera: ViewSource, lattice: Lattice, sx: number, sy: number, tile = true): number {
    const v = camera.view._value, { w, h } = camera.screen._value, n = lattice.n;
    const j = Math.floor(v.x + (sx - w / 2) / v.scale), i = Math.floor(v.y + (sy - h / 2) / v.scale);
    if (!tile && (i < 0 || j < 0 || i >= n || j >= n)) return -1;
    return (((i % n) + n) % n) * n + (((j % n) + n) % n);
}

// The world rect a whole lattice occupies (cells are 1 unit)
export const latticeRect = (lattice: Lattice): Rect => ({ x0: 0, y0: 0, x1: lattice.n, y1: lattice.n });
