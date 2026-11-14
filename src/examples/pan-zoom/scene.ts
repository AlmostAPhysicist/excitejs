// scene.ts
//
// The world the demo camera looks at: shapes, SVGs, photos and text, laid out
// in world units (1 unit = 1 CSS px at 100% zoom). Nothing here knows about
// input; each item can draw itself for a camera and say whether a world point
// hits it. Every color comes from the Hubble palette, and text is in Libron.
//
// Level of detail, so every zoom level looks right and stays smooth:
//   - items outside the painted region are skipped (bounding-box culling)
//   - text is positioned in screen space, so it is crisp at any size. Below
//     4 px it is greeked (a faint bar); above 256 px it is drawn at 256 px
//     under a scale transform, which canvases render as vector outlines, so
//     it stays sharp however close you get without a giant font raster
//   - SVGs are rasterized at the power-of-two size nearest their on-screen
//     size and cached. A missing size is made in idle time; meanwhile the
//     nearest cached size is drawn, so a zoom never waits on a rasterization
//   - the Koch snowflake picks its recursion depth from its on-screen size

import { Observable, Reactor } from "../../core/index";
import type { Rect } from "./camera.ts";
import type { Brush } from "./layer.ts";
import { colors, type Accent, type Colors } from "./palette.ts";

// What items draw with: the layer's painter plus the palette
// (region: the world rect being painted, for items that cull their own parts)
export type SceneBrush = Brush & { colors: Colors; region: Rect };

export interface Item {
    name: string;
    kind: "shape" | "svg" | "photo" | "text" | "fractal";
    rect: Rect;
    draw(p: SceneBrush): void;
    hit(x: number, y: number): boolean;
}

export const FONT = `"Libron", Georgia, serif`;

// Bumped whenever an asset (image, font, raster) becomes ready, so views can redraw
export const asset_revision = Observable(0);

if (document.fonts) {
    Promise.all(["400 16px Libron", "italic 400 16px Libron", "700 16px Libron"].map(f => document.fonts.load(f)))
        .then(() => asset_revision.value++, () => { });
}

const inRect = (r: Rect, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
const rectAt = (cx: number, cy: number, w: number, h: number): Rect => ({ x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 });
const union = (a: Rect, b: Rect): Rect => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });

// A generous world box for a line of text (anchored at its vertical middle).
// drawText culls with it, and items include it in their own box, so an item
// is never culled while its caption is still on screen.
export function textBounds(text: string, x: number, y: number, size: number, align: CanvasTextAlign = "left"): Rect {
    const w = text.length * size * 0.62;
    const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    return { x0, y0: y - size * 0.75, x1: x0 + w, y1: y + size * 0.75 };
}

//// Text

const BIG_TEXT_PX = 256; // above this, scale a 256 px font instead of rasterizing a larger one

export function drawText(p: SceneBrush, text: string, x: number, y: number, size: number, options: {
    color?: string; weight?: number; italic?: boolean; align?: CanvasTextAlign; baseline?: CanvasTextBaseline;
} = {}): void {
    const px = size * p.scale;
    if (px < 1.2) return;

    const b = textBounds(text, x, y, size, options.align), r = p.region;
    if (b.x0 > r.x1 || b.x1 < r.x0 || b.y0 > r.y1 || b.y1 < r.y0) return;

    const s = p.toScreen(x, y);
    const { ctx, dpr } = p;
    ctx.fillStyle = options.color ?? p.colors.tx;
    if (px < 4) {
        // greeked: a bar where the text would be
        p.useScreen();
        const w = text.length * px * 0.5;
        const x0 = options.align === "center" ? s.x - w / 2 : options.align === "right" ? s.x - w : s.x;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x0, s.y - px * 0.35, w, Math.max(0.6, px * 0.45));
        ctx.globalAlpha = 1;
        return;
    }
    const font_px = Math.min(px, BIG_TEXT_PX);
    const k = px / font_px;
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * s.x, dpr * s.y);
    ctx.font = `${options.italic ? "italic " : ""}${options.weight ?? 400} ${font_px}px ${FONT}`;
    ctx.textAlign = options.align ?? "left";
    ctx.textBaseline = options.baseline ?? "middle";
    ctx.fillText(text, 0, 0);
    p.useScreen();
}

//// SVG sprites with a resolution cache

const idle = (fn: () => void) => ("requestIdleCallback" in window ? (window as any).requestIdleCallback(fn, { timeout: 300 }) : setTimeout(fn, 30));

export interface SvgSprite {
    markup: (c: Colors) => string;
    image: HTMLImageElement;
    loaded: boolean;
    cache: Map<number, HTMLCanvasElement>; // width in device px → raster
    pending: Set<number>;
    aspect: number;                        // height / width
    load(c: Colors): void;
    draw(p: SceneBrush, x: number, y: number, w: number, h: number): void;
    clear(): void;
}

const MAX_RASTER = 2048; // device px; above this a sprite draws its vector directly

export const sprites: SvgSprite[] = [];

export function SvgSprite(markup: (c: Colors) => string, aspect: number): SvgSprite {
    const self: SvgSprite = {
        markup, aspect,
        image: new Image(),
        loaded: false,
        cache: new Map(),
        pending: new Set(),

        load(c) {
            const image = new Image();
            image.onload = () => {
                self.image = image;
                self.loaded = true;
                self.cache.clear();
                self.pending.clear();
                asset_revision.value++;
            };
            image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(self.markup(c));
        },

        // Draws into world rect (x, y, w, h); the world transform is active
        draw(p, x, y, w, h) {
            if (!self.loaded) return;
            const device = w * p.scale * p.dpr;
            if (device > MAX_RASTER) {
                // past the largest cached raster: draw the vector itself, which the
                // browser replays at the current transform, so it is sharp at any zoom
                p.ctx.drawImage(self.image, x, y, w, h);
                return;
            }
            const want = Math.max(32, 2 ** Math.ceil(Math.log2(device)));
            let bitmap: CanvasImageSource | undefined = self.cache.get(want);
            if (!bitmap) {
                if (!self.pending.has(want)) {
                    self.pending.add(want);
                    idle(() => {
                        if (!self.pending.delete(want)) return; // cleared meanwhile
                        const c = document.createElement("canvas");
                        c.width = want;
                        c.height = Math.max(1, Math.round(want * self.aspect));
                        c.getContext("2d")!.drawImage(self.image, 0, 0, c.width, c.height);
                        self.cache.set(want, c);
                        asset_revision.value++;
                    });
                }
                // meanwhile: the nearest cached size, or the vector itself
                let best = 0;
                for (const k of self.cache.keys()) if (!best || Math.abs(Math.log2(k / want)) < Math.abs(Math.log2(best / want))) best = k;
                bitmap = best ? self.cache.get(best) : self.image;
            }
            p.ctx.imageSmoothingQuality = "high";
            p.ctx.drawImage(bitmap!, x, y, w, h);
        },

        clear() {
            self.cache.clear();
            self.pending.clear();
            self.load(colors._value);
        },
    };
    self.load(colors._value);
    sprites.push(self);
    return self;
}

// New palette (light / dark): rebuild every SVG in the new colors
Reactor(() => sprites.forEach(s => s.load(colors._value)), { deps: [colors] });

const SVGS: { name: string; aspect: number; markup: (c: Colors) => string }[] = [
    {
        name: "Sun (SVG)", aspect: 1,
        markup: c => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <g fill="${c.orange}">${Array.from({ length: 16 }, (_, i) => `<path d="M100 8 L108 40 L92 40 Z" transform="rotate(${i * 22.5} 100 100)"/>`).join("")}</g>
          <circle cx="100" cy="100" r="50" fill="${c.yellow}"/><circle cx="100" cy="100" r="50" fill="none" stroke="${c.red}" stroke-width="3"/>
          <circle cx="84" cy="92" r="5" fill="${c.tx}"/><circle cx="116" cy="92" r="5" fill="${c.tx}"/>
          <path d="M80 114 Q100 132 120 114" fill="none" stroke="${c.tx}" stroke-width="4" stroke-linecap="round"/>
          <text x="100" y="196" font-size="4" text-anchor="middle" fill="${c.tx2}" font-family="Georgia, serif" font-style="italic">vector all the way down: this caption is 4 units tall</text></svg>`,
    },
    {
        name: "Mountains (SVG)", aspect: 200 / 320,
        markup: c => `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
          <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.blue}"/><stop offset="1" stop-color="${c.bg2}"/></linearGradient></defs>
          <rect width="320" height="200" rx="14" fill="url(#sky)"/>
          <circle cx="250" cy="52" r="20" fill="${c.yellow}"/>
          <path d="M0 200 L90 70 L140 130 L190 60 L320 200 Z" fill="${c.tx2}"/>
          <path d="M90 70 L108 96 L98 92 L90 102 L80 90 Z M190 60 L212 92 L200 86 L190 98 L176 84 Z" fill="${c.bg}"/>
          <path d="M0 200 L60 150 L120 185 L200 140 L320 200 Z" fill="${c.green}"/></svg>`,
    },
    {
        name: "Atom (SVG)", aspect: 1,
        markup: c => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <g fill="none" stroke="${c.purple}" stroke-width="4">
          <ellipse cx="100" cy="100" rx="86" ry="30"/><ellipse cx="100" cy="100" rx="86" ry="30" transform="rotate(60 100 100)"/><ellipse cx="100" cy="100" rx="86" ry="30" transform="rotate(120 100 100)"/></g>
          <circle cx="100" cy="100" r="14" fill="${c.magenta}"/><circle cx="186" cy="100" r="6" fill="${c.cyan}"/><circle cx="57" cy="25.5" r="6" fill="${c.cyan}"/><circle cx="57" cy="174.5" r="6" fill="${c.cyan}"/></svg>`,
    },
    {
        name: "Gear (SVG)", aspect: 1,
        markup: c => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <g fill="${c.blue}">${Array.from({ length: 12 }, (_, i) => `<rect x="90" y="12" width="20" height="34" rx="4" transform="rotate(${i * 30} 100 100)"/>`).join("")}</g>
          <circle cx="100" cy="100" r="62" fill="${c.blue}"/><circle cx="100" cy="100" r="26" fill="${c.bg}"/>
          <circle cx="100" cy="100" r="44" fill="none" stroke="${c.bg}" stroke-width="3" stroke-dasharray="6 6"/></svg>`,
    },
];

// Rebuilds every raster cache (and reloads the SVGs in the current palette)
export function rebuildAssets(): void {
    sprites.forEach(s => s.clear());
    asset_revision.value++;
}

//// Photos (the other examples' thumbnails)

const THUMBNAILS = import.meta.glob<string>("../*/thumbnail.webp", { eager: true, query: "?url", import: "default" });

function loadImage(url: string) {
    const image = new Image();
    const state = { image, loaded: false };
    image.onload = () => { state.loaded = true; asset_revision.value++; };
    image.src = url;
    return state;
}

//// Shapes

let probe_ctx: CanvasRenderingContext2D | null = null;
const probe = () => probe_ctx ??= document.createElement("canvas").getContext("2d")!;

type ShapeDraw = (ctx: CanvasRenderingContext2D, r: number) => void;

const polygon = (sides: number, rot = -Math.PI / 2): ShapeDraw => (ctx, r) => {
    for (let k = 0; k < sides; k++) {
        const a = rot + k * 2 * Math.PI / sides;
        k ? ctx.lineTo(r * Math.cos(a), r * Math.sin(a)) : ctx.moveTo(r * Math.cos(a), r * Math.sin(a));
    }
    ctx.closePath();
};

const SHAPES: { name: string; color: Accent; path: ShapeDraw; outline?: boolean }[] = [
    { name: "Circle", color: "red", path: (ctx, r) => ctx.arc(0, 0, r, 0, Math.PI * 2) },
    { name: "Rounded square", color: "orange", path: (ctx, r) => ctx.roundRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.3) },
    { name: "Triangle", color: "yellow", path: polygon(3) },
    { name: "Hexagon", color: "green", path: polygon(6, 0) },
    {
        name: "Star", color: "cyan", path: (ctx, r) => {
            for (let k = 0; k < 10; k++) {
                const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r;
                k ? ctx.lineTo(rr * Math.cos(a), rr * Math.sin(a)) : ctx.moveTo(rr * Math.cos(a), rr * Math.sin(a));
            }
            ctx.closePath();
        },
    },
    { name: "Ring", color: "blue", path: (ctx, r) => { ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.moveTo(r * 0.55, 0); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2, true); } },
    {
        name: "Blob", color: "purple", path: (ctx, r) => {
            ctx.moveTo(0, -r);
            ctx.bezierCurveTo(r * 0.9, -r * 1.1, r * 1.2, r * 0.2, r * 0.5, r * 0.8);
            ctx.bezierCurveTo(0, r * 1.2, -r * 1.1, r * 0.9, -r * 0.9, r * 0.1);
            ctx.bezierCurveTo(-r * 0.8, -r * 0.6, -r * 0.6, -r * 0.9, 0, -r);
        },
    },
    { name: "Diamond", color: "magenta", path: polygon(4) },
];

//// Koch snowflake: subdivided only where it is on screen
//
// The curve between two points never strays further than half their distance
// from their midpoint (it stays inside its bump's triangle). So a segment
// whose circle misses the painted region can be drawn as one straight line:
// the difference is entirely off screen. Visible segments keep subdividing
// until they are ~8 px long, so detail never runs out however far you zoom,
// and the work stays proportional to what is on screen.

const KOCH_MAX_DEPTH = 40;  // a safety net; culling and the segment floor stop far sooner

// What costs is rasterizing the path, not building it (building is ~1 ms):
//   - the line: every segment and corner. 8 px segments keep the bumps
//     visible with ~3x fewer segments than 3 px; bevel joins are cheapest.
//   - the translucent fill: as costly as the line, but its finest bumps are
//     invisible, so it uses 4x longer segments. Each Koch generation only
//     adds bumps outward, so the coarse outline lies wholly inside the fine
//     one. Up close its culled parts are long lines far off screen, so it is
//     also clipped to the painted region first: the rasterizer then fills a
//     small polygon instead of one thousands of pixels across.
const KOCH_SEGMENT_PX = 8;
const KOCH_FILL_PX = 32;

// Appends the curve from (ax, ay) to (bx, by), excluding its start, to `out` as x, y pairs
function koch(out: number[], ax: number, ay: number, bx: number, by: number,
    min_len: number, region: Rect, level: number, reached: { depth: number }): void {
    const len = Math.hypot(bx - ax, by - ay);
    const mx = (ax + bx) / 2, my = (ay + by) / 2, reach = len * 0.55;
    const off_screen = mx + reach < region.x0 || mx - reach > region.x1 || my + reach < region.y0 || my - reach > region.y1;
    if (len < min_len || off_screen || level >= KOCH_MAX_DEPTH) { out.push(bx, by); return; }
    if (level + 1 > reached.depth) reached.depth = level + 1;
    const dx = (bx - ax) / 3, dy = (by - ay) / 3;
    const px = ax + dx, py = ay + dy, qx = ax + 2 * dx, qy = ay + 2 * dy;
    const tx = px + dx * 0.5 + dy * Math.sqrt(3) / 2, ty = py + dy * 0.5 - dx * Math.sqrt(3) / 2;
    koch(out, ax, ay, px, py, min_len, region, level + 1, reached);
    koch(out, px, py, tx, ty, min_len, region, level + 1, reached);
    koch(out, tx, ty, qx, qy, min_len, region, level + 1, reached);
    koch(out, qx, qy, bx, by, min_len, region, level + 1, reached);
}

// Sutherland-Hodgman: clips a closed polygon (x, y pairs) to a rect
function clipToRect(pts: number[], r: Rect): number[] {
    const edges: [(x: number, y: number) => boolean, (ax: number, ay: number, bx: number, by: number) => [number, number]][] = [
        [(x) => x >= r.x0, (ax, ay, bx, by) => [r.x0, ay + (by - ay) * (r.x0 - ax) / (bx - ax)]],
        [(x) => x <= r.x1, (ax, ay, bx, by) => [r.x1, ay + (by - ay) * (r.x1 - ax) / (bx - ax)]],
        [(_, y) => y >= r.y0, (ax, ay, bx, by) => [ax + (bx - ax) * (r.y0 - ay) / (by - ay), r.y0]],
        [(_, y) => y <= r.y1, (ax, ay, bx, by) => [ax + (bx - ax) * (r.y1 - ay) / (by - ay), r.y1]],
    ];
    let poly = pts;
    for (const [inside, cross] of edges) {
        if (poly.length < 6) return [];
        const next: number[] = [];
        for (let i = 0; i < poly.length; i += 2) {
            const ax = poly[(i - 2 + poly.length) % poly.length], ay = poly[(i - 1 + poly.length) % poly.length];
            const bx = poly[i], by = poly[i + 1];
            const a_in = inside(ax, ay), b_in = inside(bx, by);
            if (b_in) {
                if (!a_in) next.push(...cross(ax, ay, bx, by));
                next.push(bx, by);
            } else if (a_in) {
                next.push(...cross(ax, ay, bx, by));
            }
        }
        poly = next;
    }
    return poly;
}

function tracePolygon(ctx: CanvasRenderingContext2D, pts: number[]): void {
    ctx.beginPath();
    if (pts.length < 6) return;
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
}

//// The world

export const WORLD: Rect = { x0: -2300, y0: -1400, x1: 2300, y1: 1400 };

const TITLE = "Pan & Zoom";
const SUBTITLE = "A canvas camera built from Observables and Schedulers";
const SIGNPOSTS = "shapes ↖   svgs ↗   photos ↓   fractal ↙   small print ↘";

export function buildScene(): Item[] {
    const items: Item[] = [];

    // title
    items.push({
        name: "Title", kind: "text",
        rect: [textBounds(TITLE, 0, -90, 120, "center"), textBounds(SUBTITLE, 0, 10, 30, "center"), textBounds(SIGNPOSTS, 0, 60, 20, "center")].reduce(union),
        hit: () => false,
        draw(p) {
            drawText(p, TITLE, 0, -90, 120, { align: "center", weight: 700 });
            drawText(p, SUBTITLE, 0, 10, 30, { align: "center", color: p.colors.tx2 });
            drawText(p, SIGNPOSTS, 0, 60, 20, { align: "center", color: p.colors.tx3 });
        },
    });

    // section captions
    const caption = (text: string, x: number, y: number) => items.push({
        name: text, kind: "text", rect: textBounds(text, x, y, 40, "center"), hit: () => false,
        draw: p => drawText(p, text, x, y, 40, { align: "center", weight: 700, color: p.colors.tx2 }),
    });
    caption("Shapes", -1250, -1000);
    caption("SVGs", 1250, -1000);
    caption("Photos", 0, 330);

    // shapes, 4 × 2
    SHAPES.forEach((shape, k) => {
        const cx = -1250 + ((k % 4) - 1.5) * 260, cy = -720 + Math.floor(k / 4) * 300, r = 100;
        const rect = union(rectAt(cx, cy, 2 * r, 2 * r), textBounds(shape.name, cx, cy + r + 30, 18, "center"));
        let cached: Path2D | null = null;
        const path = () => {
            if (!cached) {
                // build once in local coordinates by recording into a Path2D
                const p2 = new Path2D();
                shape.path(p2 as unknown as CanvasRenderingContext2D, r);
                cached = p2;
            }
            return cached;
        };
        items.push({
            name: shape.name, kind: "shape", rect,
            hit(x, y) {
                if (!inRect(rect, x, y)) return false;
                return probe().isPointInPath(path(), x - cx, y - cy, "evenodd");
            },
            draw(p) {
                const { ctx } = p;
                p.useWorld();
                ctx.translate(cx, cy);
                ctx.fillStyle = p.colors[shape.color];
                ctx.fill(path(), "evenodd");
                ctx.lineWidth = 2 / p.scale;
                ctx.strokeStyle = p.colors.tx;
                ctx.globalAlpha = 0.25;
                ctx.stroke(path());
                ctx.globalAlpha = 1;
                drawText(p, shape.name, cx, cy + r + 30, 18, { align: "center", color: p.colors.tx2 });
            },
        });
    });

    // svgs, 2 × 2
    SVGS.forEach((svg, k) => {
        const sprite = SvgSprite(svg.markup, svg.aspect);
        const w = svg.name.startsWith("Mountains") ? 380 : 260, h = svg.name.startsWith("Mountains") ? 238 : 260;
        const cx = 1250 + ((k % 2) - 0.5) * 460, cy = -700 + Math.floor(k / 2) * 380;
        const rect = rectAt(cx, cy, w, h);
        items.push({
            name: svg.name, kind: "svg", rect,
            hit: (x, y) => inRect(rect, x, y),
            draw(p) {
                p.useWorld();
                sprite.draw(p, rect.x0, rect.y0, w, h);
            },
        });
    });

    // photos, 6 × 2
    Object.entries(THUMBNAILS).forEach(([path, url], k) => {
        const slug = path.split("/")[1];
        const photo = loadImage(url);
        const w = 300, h = 188;
        const cx = (k % 6 - 2.5) * 340, cy = 520 + Math.floor(k / 6) * 270;
        const box = rectAt(cx, cy, w, h);
        const title = slug.replace(/[-_]/g, " ");
        items.push({
            name: `${slug} (photo)`, kind: "photo",
            rect: union(box, textBounds(title, cx, box.y1 + 22, 16, "center")),
            hit: (x, y) => inRect(box, x, y),
            draw(p) {
                const { ctx } = p;
                p.useWorld();
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(box.x0, box.y0, w, h, 10);
                ctx.fillStyle = p.colors.ui;
                ctx.fill();
                ctx.clip();
                if (photo.loaded) {
                    ctx.imageSmoothingQuality = "high";
                    ctx.drawImage(photo.image, box.x0, box.y0, w, h);
                }
                ctx.restore();
                drawText(p, title, cx, box.y1 + 22, 16, { align: "center", color: p.colors.tx2 });
            },
        });
    });

    // Koch snowflake
    {
        const cx = -1650, cy = 850, r = 380;
        const caption = (depth: number) => `Koch snowflake · ${depth} levels deep here`;
        const rect = union(rectAt(cx, cy, 2 * r, 2 * r), textBounds(caption(99), cx, cy + r + 20, 22, "center"));
        items.push({
            name: "Koch snowflake", kind: "fractal", rect,
            hit: (x, y) => Math.hypot(x - cx, y - cy) < r * 0.9,
            draw(p) {
                const { ctx } = p;
                p.useWorld();
                const reached = { depth: 0 }, unused = { depth: 0 };
                const corners = [0, 1, 2].map(k => [cx + r * Math.cos(-Math.PI / 2 + k * 2 * Math.PI / 3), cy + r * Math.sin(-Math.PI / 2 + k * 2 * Math.PI / 3)]);
                const outline = (segment_px: number, depth: { depth: number }): number[] => {
                    const pts = [corners[0][0], corners[0][1]];
                    for (let k = 0; k < 3; k++) {
                        const [ax, ay] = corners[k], [bx, by] = corners[(k + 1) % 3];
                        koch(pts, ax, ay, bx, by, segment_px / p.scale, p.region, 0, depth);
                    }
                    pts.length -= 2; // the last point repeats the first
                    return pts;
                };
                // the faint tint: coarse, and clipped to what is being painted (plus a margin)
                const m = 4 / p.scale, reg = p.region;
                tracePolygon(ctx, clipToRect(outline(KOCH_FILL_PX, unused), { x0: reg.x0 - m, y0: reg.y0 - m, x1: reg.x1 + m, y1: reg.y1 + m }));
                ctx.fillStyle = p.colors.cyan;
                ctx.globalAlpha = 0.18;
                ctx.fill();
                ctx.globalAlpha = 1;
                // the line: full detail
                tracePolygon(ctx, outline(KOCH_SEGMENT_PX, reached));
                ctx.strokeStyle = p.colors.blue;
                ctx.lineJoin = "bevel";
                ctx.lineWidth = 1.5 / p.scale;
                ctx.stroke();
                drawText(p, caption(reached.depth), cx, cy + r + 20, 22, { align: "center", color: p.colors.tx2 });
            },
        });
    }

    // the small print: rings that shrink tenfold, with text inside each
    {
        const cx = 1650, cy = 850;
        const notes = [
            "Zoom in on the dot.",
            "Closer.",
            "Text here is drawn in screen space, so it stays sharp.",
            "When it is too small to read, it is drawn as a faint bar.",
            "You found the small print. Press 0 to go home.",
        ];
        const rect = rectAt(cx, cy, 760, 760);
        items.push({
            name: "Small print", kind: "text", rect,
            hit: (x, y) => Math.hypot(x - cx, y - cy) < 360,
            draw(p) {
                const { ctx } = p;
                p.useWorld();
                // only rings that cross the painted region: at deep zoom the outer
                // ones are hundreds of thousands of px across and almost all off screen
                const { x0, y0, x1, y1 } = p.region;
                const near = Math.hypot(Math.max(x0 - cx, 0, cx - x1), Math.max(y0 - cy, 0, cy - y1));
                const far = Math.hypot(Math.max(Math.abs(x0 - cx), Math.abs(x1 - cx)), Math.max(Math.abs(y0 - cy), Math.abs(y1 - cy)));
                notes.forEach((note, k) => {
                    const r = 360 / Math.pow(6, k);
                    if (r * p.scale < 0.5) return;
                    drawText(p, note, cx, cy - r * 0.55, r * 0.09, { align: "center", color: p.colors.tx2 });
                    p.useWorld();
                    if (r < near || r > far) return;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.lineWidth = 1.5 / p.scale;
                    ctx.strokeStyle = p.colors[(["orange", "red", "magenta", "purple", "blue"] as Accent[])[k]];
                    ctx.stroke();
                });
                ctx.beginPath();
                ctx.arc(cx, cy, 0.03, 0, Math.PI * 2);
                ctx.fillStyle = p.colors.red;
                ctx.fill();
            },
        });
    }

    return items;
}
