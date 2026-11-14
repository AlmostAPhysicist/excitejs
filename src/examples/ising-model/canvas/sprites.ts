// sprites.ts
//
// What one spin looks like on screen, and how that changes with zoom.
//
//   detail 0 (far)   a flat square, ink for up, paper for down
//   detail 0 → 1     the square shrinks a little and rounds into a circle,
//                    its color fades to a faint bubble, and the arrow fades in
//   detail 1 (near)  a faint bubble in the spin's color, with its arrow
//
// detail is a smoothstep of the cell's size in screen pixels, so the change
// is gradual and the same on every screen. A spin that has just flipped
// turns its arrow through half a turn over FLIP_MS.
//
// Sprites are batched: every cell adds to a few shared Path2Ds, and a batch
// is painted with one fill or stroke per layer, so thousands of cells cost a
// handful of draw calls.

import type { Colors } from "../theme.ts";

export const DETAIL_START = 16; // px per cell where the bubbles and arrows begin
export const DETAIL_FULL = 46;  // px per cell where they are fully formed
export const FLIP_MS = 220;

const BUBBLE_ALPHA = 0.5;  // bubble opacity at full detail
const ARROW_ALPHA = 0.92;  // arrow opacity at full detail
const GAP = 0.09;          // inset of the bubble, as a fraction of the cell, at full detail

export function detailAt(px_per_cell: number): number {
    const t = Math.min(1, Math.max(0, (px_per_cell - DETAIL_START) / (DETAIL_FULL - DETAIL_START)));
    return t * t * (3 - 2 * t);
}

// Arrow angle in radians, 0 pointing up the screen. `age` is the time since
// the spin last flipped: within FLIP_MS it is still turning from the old side.
export function arrowAngle(spin: number, age: number): number {
    const rest = spin > 0 ? 0 : Math.PI;
    if (age >= FLIP_MS || age < 0) return rest;
    const p = age / FLIP_MS;
    return rest + Math.PI * Math.pow(1 - p, 3); // ease-out
}

export interface SpriteBatch {
    detail: number;
    up: Path2D;     // bubbles of up spins
    down: Path2D;   // bubbles of down spins
    shafts: Path2D; // arrow shafts (stroked)
    heads: Path2D;  // arrow heads (filled)
    line_width: number;
}

export function SpriteBatch(detail: number): SpriteBatch {
    return { detail, up: new Path2D(), down: new Path2D(), shafts: new Path2D(), heads: new Path2D(), line_width: 1 };
}

// Adds the spin in the cell whose top-left corner is (x, y) and side is s
export function addSpin(batch: SpriteBatch, x: number, y: number, s: number, spin: number, angle: number): void {
    const t = batch.detail;
    const gap = t * GAP * s;
    const size = s - 2 * gap;
    const radius = t * size / 2;
    const path = spin > 0 ? batch.up : batch.down;
    if (radius < 0.5) path.rect(x + gap, y + gap, size, size);
    else path.roundRect(x + gap, y + gap, size, size, radius);

    if (t === 0) return;
    const cx = x + s / 2, cy = y + s / 2, L = size;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const px = (lx: number, ly: number) => cx + lx * cos - ly * sin;
    const py = (lx: number, ly: number) => cy + lx * sin + ly * cos;
    batch.shafts.moveTo(px(0, 0.3 * L), py(0, 0.3 * L));
    batch.shafts.lineTo(px(0, -0.1 * L), py(0, -0.1 * L));
    batch.heads.moveTo(px(0, -0.34 * L), py(0, -0.34 * L));
    batch.heads.lineTo(px(-0.17 * L, -0.06 * L), py(-0.17 * L, -0.06 * L));
    batch.heads.lineTo(px(0.17 * L, -0.06 * L), py(0.17 * L, -0.06 * L));
    batch.heads.closePath();
    batch.line_width = Math.max(1, 0.075 * L);
}

// Paints a batch. `alpha` dims the whole batch (used for context cells).
export function paintBatch(ctx: CanvasRenderingContext2D, batch: SpriteBatch, c: Colors, alpha = 1): void {
    const t = batch.detail;
    ctx.globalAlpha = alpha * (1 - (1 - BUBBLE_ALPHA) * t);
    ctx.fillStyle = c.up; ctx.fill(batch.up);
    ctx.fillStyle = c.down; ctx.fill(batch.down);
    if (t > 0) {
        ctx.globalAlpha = alpha * t * ARROW_ALPHA;
        ctx.strokeStyle = ctx.fillStyle = c.tx;
        ctx.lineWidth = batch.line_width;
        ctx.lineCap = "round";
        ctx.stroke(batch.shafts);
        ctx.fill(batch.heads);
    }
    ctx.globalAlpha = 1;
}

// The color the empty space between bubbles shows through
export const planeColor = (c: Colors) => c.ui2;
