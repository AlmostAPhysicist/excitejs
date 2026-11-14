// demo.ts
//
// A full-screen canvas looking at the scene through a Camera camera.
//
//   Camera ──► view, screen, hover, tap, last_input
//                  │
//   [compute]      ├─► hovered item (hit test under the cursor)
//                  └─► selected item (on tap)
//                  │
//   [render]       ├─► scene layer: grid and items (blits on pure pans)
//                  ├─► overlay layer: hover and selection outlines
//                  ├─► the minimap
//                  └─► the readouts
//
// The camera is written at most once per animation frame (Camera drains its
// input once a frame), and everything that draws runs on the "render" stage,
// so a frame with a pan, a hover change and an image load draws once.
//
// Two canvases, so a hover only repaints the cheap overlay. The scene layer
// repaints fully only when its content changes (palette, grid toggle, an
// image arriving) or the zoom changes; a pure pan copies the last frame
// and paints the exposed strips (see layer.ts).

import { Observable, Reactor, Scheduler, type Schedule } from "../../core/index";
import { Camera, type View, type Rect, type Screen, type WheelMode } from "./camera.ts";
import { WORLD, asset_revision, buildScene, rebuildAssets, type Item, type SceneBrush } from "./scene.ts";
import { Layer, type Brush } from "./layer.ts";
import { SpatialGrid } from "./spatial_grid.ts";
import { colors, type Colors } from "./palette.ts";
import { ThemeToggle } from "./theme_toggle.ts";
import { Segmented, Toggle, el } from "./ui.ts";
import "./demo.css";

const MIN_SCALE = 0.05;
const MAX_SCALE = 1500;

function formatZoom(scale: number): string {
    const pct = scale * 100;
    return pct >= 1000 ? `${(pct / 100).toFixed(pct >= 10000 ? 0 : 1)}×` : pct >= 10 ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
}

export function PanZoomDemo(): HTMLElement {
    const root = el("div", "pz-demo");
    const stage = el("div", "pz-stage");
    stage.setAttribute("role", "application");
    stage.setAttribute("aria-label", "A pannable, zoomable canvas. Arrow keys pan, plus and minus zoom, 0 fits everything.");
    const scene_canvas = el("canvas", "pz-canvas");
    const overlay_canvas = el("canvas", "pz-canvas");
    stage.append(scene_canvas, overlay_canvas);
    root.append(stage);
    document.body.append(root); // measured by Camera, so it must be in the document

    //// View

    const fitWorld = (vp: Screen): View => {
        const pad = 24;
        const scale = Math.min((vp.w - 2 * pad) / (WORLD.x1 - WORLD.x0), (vp.h - 2 * pad) / (WORLD.y1 - WORLD.y0));
        return { x: 0, y: 0, scale };
    };
    const camera: Camera = Camera(stage, {
        min_scale: MIN_SCALE,
        max_scale: MAX_SCALE,
        world_bounds: WORLD,
        home_view: () => fitWorld(camera.screen._value),
    });
    camera.goHome(false);
    (window as any).camera = camera; // open for poking at in the console

    //// State

    const items = buildScene();
    const index = SpatialGrid(items);
    const selected = Observable<Item | null>(null);
    const hovered = Observable<Item | null>(null);
    const show_grid = Observable(true);
    const help_open = Observable(false);

    const scheduler = Scheduler();
    const compute_s = scheduler.getOrCreate("compute");
    const render_s = scheduler.getOrCreate("render");

    // Overlay animation state. Each is an Observable driven by a short frame
    // loop that a Reactor starts and, by returning its cleanup, cancels: a new
    // selection or hover runs the old loop's cleanup (the preaction) first.
    const reduce_motion = matchMedia("(prefers-reduced-motion: reduce)");
    const selection_t = Observable(1); // 0 → 1: the selection brackets close in
    const ants = Observable(0);        // dash offset of the hover outline, marching

    const itemAt = (x: number, y: number): Item | null => {
        const near = index.at(x, y);
        for (let k = near.length - 1; k >= 0; k--) if (near[k].hit(x, y)) return near[k];
        return null;
    };

    //// Compute

    // the item under the cursor follows both the cursor and the camera
    Reactor(() => {
        const h = camera.hover.value, cam = camera.view.value, { w, h: vh } = camera.screen.value;
        let item: Item | null = null;
        if (h && !camera.pointer_down.value) item = itemAt(cam.x + (h.sx - w / 2) / cam.scale, cam.y + (h.sy - vh / 2) / cam.scale);
        if (item !== hovered._value) hovered.value = item;
    }, { reaction_schedule: compute_s });

    // a tap selects what it lands on, or clears the selection
    Reactor(() => {
        const t = camera.tap.value;
        if (!t || t.count > 1) return;
        const item = itemAt(t.x, t.y);
        selected.value = item === selected._value ? null : item;
    }, { deps: [camera.tap] });

    Reactor(() => {
        stage.style.cursor = camera.pointer_down.value ? "grabbing" : hovered.value ? "pointer" : "grab";
    });

    // a new selection: the brackets close in over 420 ms
    Reactor(() => {
        if (!selected.value || reduce_motion.matches) { selection_t.value = 1; return; }
        const start = performance.now();
        let frame = 0;
        const step = (now: number) => {
            selection_t.value = Math.min(1, (now - start) / 420);
            if (selection_t._value < 1) frame = requestAnimationFrame(step);
        };
        selection_t.value = 0;
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, { deps: [selected] });

    // while something is hovered (and not selected), its outline's dashes march
    Reactor(() => {
        const h = hovered.value;
        if (!h || h === selected.value || reduce_motion.matches) return;
        let frame = 0;
        const step = (now: number) => {
            ants.value = (now / 40) % 18;
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, { deps: [hovered, selected] });

    //// Render: the scene layer

    const scene = Layer(camera, scene_canvas, {
        deps: [colors, show_grid, asset_revision],
        schedule: render_s,
        paint(p, world, screen) {
            const c = colors._value;
            const sp: SceneBrush = { ...p, colors: c, region: world };
            const { ctx } = p;
            const a = p.toScreen(WORLD.x0, WORLD.y0), b = p.toScreen(WORLD.x1, WORLD.y1);
            // outside the world, then the world's paper
            ctx.fillStyle = c.bg2;
            ctx.fillRect(screen.x0, screen.y0, screen.x1 - screen.x0, screen.y1 - screen.y0);
            ctx.fillStyle = c.bg;
            ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
            if (show_grid._value) drawGrid(p, screen, c, a, b);
            for (const item of index.within(world)) {
                item.draw(sp);
                p.useScreen();
            }
        },
    });

    //// Render: the overlay layer (outlines, in screen space so they stay 2 px)

    // Hover: an orange outline with marching dashes. Selection: four blue
    // viewfinder brackets that spring in from further out, over a faint wash.
    const overlay = Layer(camera, overlay_canvas, {
        deps: [hovered, selected, colors, selection_t, ants],
        schedule: render_s,
        transparent: true,
        blit: false,
        paint(p) {
            const { ctx } = p, c = colors._value, hover = hovered._value, sel = selected._value;
            const box = (item: Item, pad: number) => {
                const a = p.toScreen(item.rect.x0, item.rect.y0), b = p.toScreen(item.rect.x1, item.rect.y1);
                return { x: a.x - pad, y: a.y - pad, w: b.x - a.x + 2 * pad, h: b.y - a.y + 2 * pad };
            };
            if (hover && hover !== sel) {
                const r = box(hover, 6);
                ctx.setLineDash([10, 8]);
                ctx.lineDashOffset = -ants._value;
                ctx.strokeStyle = c.orange;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(r.x, r.y, r.w, r.h, 8);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            if (sel) {
                const t = selection_t._value;
                // an overshooting ease: brackets travel in, pass, and settle
                const e = 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 1.15);
                const r = box(sel, 8 + 26 * (1 - e));
                ctx.globalAlpha = Math.min(1, t * 3) * 0.08;
                ctx.fillStyle = c.blue;
                ctx.beginPath();
                ctx.roundRect(r.x, r.y, r.w, r.h, 10);
                ctx.fill();
                ctx.globalAlpha = Math.min(1, t * 2.5);
                const arm = Math.min(22, r.w / 3, r.h / 3);
                ctx.strokeStyle = c.blue;
                ctx.lineWidth = 2.5;
                ctx.lineCap = "round";
                ctx.beginPath();
                for (const [x, y, dx, dy] of [[r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1], [r.x, r.y + r.h, 1, -1], [r.x + r.w, r.y + r.h, -1, -1]]) {
                    ctx.moveTo(x + dx * arm, y);
                    ctx.lineTo(x, y);
                    ctx.lineTo(x, y + dy * arm);
                }
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        },
    });

    // Grid lines at every power of ten. Each level's opacity is a smooth
    // function of its on-screen spacing, so as you zoom one level fades in
    // while the next darkens: no popping between spacings. Lines land on
    // device pixels, so they stay 1 px sharp.
    function drawGrid(p: Brush, region: Rect, c: Colors, a: { x: number; y: number }, b: { x: number; y: number }): void {
        const scale = p.scale;
        const smooth = (lo: number, hi: number, v: number) => { const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
        const alphaAt = (px: number) => smooth(6, 40, px) * (0.3 + 0.6 * smooth(40, 400, px));
        const { ctx } = p;
        const x0 = Math.max(region.x0, a.x), x1 = Math.min(region.x1, b.x), y0 = Math.max(region.y0, a.y), y1 = Math.min(region.y1, b.y);
        if (x1 <= x0 || y1 <= y0) return;
        const wx0 = (x0 - p.ox) / scale, wx1 = (x1 - p.ox) / scale;
        const wy0 = (y0 - p.oy) / scale, wy1 = (y1 - p.oy) / scale;
        const crisp = (v: number) => (Math.round(v * p.dpr) + 0.5) / p.dpr;
        const k0 = Math.ceil(Math.log10(6 / scale)); // finest level that is at all visible
        ctx.strokeStyle = c.ui3;
        ctx.lineWidth = 1 / p.dpr * Math.max(1, Math.round(p.dpr));

        for (let k = k0; k <= k0 + 3; k++) {
            const every = Math.pow(10, k), coarser = every * 10;
            const alpha = alphaAt(every * scale);
            if (alpha <= 0.01) continue;
            const onCoarser = (v: number) => k < k0 + 3 && Math.abs(v / coarser - Math.round(v / coarser)) < 1e-6;
            ctx.beginPath();
            for (let i = Math.ceil(wx0 / every); i * every <= wx1; i++) {
                const x = i * every;
                if (onCoarser(x)) continue; // drawn by the coarser level
                const sx = crisp(p.ox + x * scale);
                ctx.moveTo(sx, y0); ctx.lineTo(sx, y1);
            }
            for (let i = Math.ceil(wy0 / every); i * every <= wy1; i++) {
                const y = i * every;
                if (onCoarser(y)) continue;
                const sy = crisp(p.oy + y * scale);
                ctx.moveTo(x0, sy); ctx.lineTo(x1, sy);
            }
            ctx.globalAlpha = alpha;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    //// Readouts

    const hud = el("section", "pz-card pz-hud", `
      <header><h1>Pan &amp; Zoom</h1></header>
      <dl>
        <div><dt>zoom</dt><dd data-k="zoom"></dd></div>
        <div><dt>center</dt><dd data-k="center"></dd></div>
        <div><dt>cursor</dt><dd data-k="cursor"></dd></div>
        <div><dt>input</dt><dd data-k="input"></dd></div>
        <div><dt>last paint</dt><dd data-k="paint"></dd></div>
        <div><dt>fps</dt><dd data-k="fps"></dd></div>
        <div class="wide"><dt>selected</dt><dd data-k="selected"></dd></div>
      </dl>`);
    const out = (k: string) => hud.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
    hud.querySelector("header")!.append(ThemeToggle());
    root.append(hud);

    Reactor(() => {
        const cam = camera.view.value;
        out("zoom").textContent = formatZoom(cam.scale);
        out("center").textContent = `${cam.x.toFixed(cam.scale > 50 ? 2 : 0)}, ${cam.y.toFixed(cam.scale > 50 ? 2 : 0)}`;
    }, { reaction_schedule: render_s });

    Reactor(() => {
        const h = camera.hover.value, cam = camera.view.value, { w, h: vh } = camera.screen.value;
        if (!h) { out("cursor").textContent = "–"; return; }
        const d = cam.scale > 50 ? 2 : 0;
        out("cursor").textContent = `${(cam.x + (h.sx - w / 2) / cam.scale).toFixed(d)}, ${(cam.y + (h.sy - vh / 2) / cam.scale).toFixed(d)}`;
    }, { reaction_schedule: render_s });

    Reactor(() => { out("input").textContent = camera.last_input.value; });

    // what the scene layer did last: a full repaint, or a blit plus strips
    Reactor(() => {
        const st = scene.last_render.value;
        if (st.mode === "idle") return;
        out("paint").textContent = st.mode === "full" ? `full · ${st.ms.toFixed(1)} ms` : `blit ${(st.area * 100).toFixed(0)}% · ${st.ms.toFixed(1)} ms`;
    }, { reaction_schedule: render_s });

    // frames actually drawn in the last second
    const frame_times: number[] = [];
    Reactor(() => {
        if (scene.last_render.value.mode === "idle") return;
        const now = performance.now();
        frame_times.push(now);
        while (frame_times[0] < now - 1000) frame_times.shift();
        out("fps").textContent = String(frame_times.length);
    }, { deps: [scene.last_render] });
    // the selected readout ticks in afresh on every change
    Reactor(() => {
        const d = out("selected"), sel = selected.value;
        d.textContent = sel ? sel.name : "tap something";
        d.classList.toggle("is-set", !!sel);
        d.classList.remove("ticked");
        void d.offsetWidth; // restart the animation
        d.classList.add("ticked");
    }, { deps: [selected], initFn: true });

    //// Toolbar

    const bar = el("nav", "pz-card pz-bar", `
      <div class="pz-group">
        <button data-act="out" aria-label="Zoom out">−</button>
        <button data-act="in" aria-label="Zoom in">+</button>
        <button data-act="home" title="Fit the whole world (0)">Fit</button>
        <button data-act="selection" title="Zoom to the selected item">Focus</button>
      </div>
      <div class="pz-group" data-group="wheel" role="group" aria-label="Wheel does">
        <span>Wheel</span>
        <button data-value="auto">Auto</button><button data-value="zoom">Zoom</button><button data-value="pan">Pan</button>
      </div>
      <div class="pz-group">
        <button data-act="grid" aria-pressed="true">Grid</button>
        <button data-act="refresh" title="Rebuild the raster caches and repaint every layer from scratch">Refresh</button>
        <button data-act="help" aria-expanded="false">Help</button>
      </div>`);
    // the toolbar and the minimap share one bottom dock, so they can never overlap
    const dock = el("div", "pz-dock");
    dock.append(bar);
    root.append(dock);

    bar.addEventListener("click", e => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
        if (!b) return;
        const act = b.dataset.act;
        if (act === "in") camera.zoomAt(1.6);
        else if (act === "out") camera.zoomAt(1 / 1.6);
        else if (act === "home") camera.goHome();
        else if (act === "selection" && selected._value) camera.fit(selected._value.rect, 48);
        else if (act === "refresh") { rebuildAssets(); scene.invalidate(); overlay.invalidate(); }
    });

    Segmented<WheelMode>(bar.querySelector('[data-group="wheel"]')!, camera.wheel_mode);
    Toggle(bar.querySelector('[data-act="grid"]')!, show_grid);
    Toggle(bar.querySelector('[data-act="help"]')!, help_open, "aria-expanded");
    Reactor(() => { (bar.querySelector('[data-act="selection"]') as HTMLButtonElement).disabled = !selected.value; });
    Reactor(() => {
        const cam = camera.view.value, { min, max } = camera.zoom_limits.value;
        (bar.querySelector('[data-act="in"]') as HTMLButtonElement).disabled = cam.scale >= max * 0.999;
        (bar.querySelector('[data-act="out"]') as HTMLButtonElement).disabled = cam.scale <= min * 1.001;
    }, { reaction_schedule: render_s });

    //// Help

    const help = el("aside", "pz-card pz-help", `
      <h2>Getting around</h2>
      <table>
        <tr><th>Mouse</th><td>drag to pan · wheel zooms at the cursor · shift+wheel pans sideways · double-click zooms in (shift: out) · middle-drag pans too</td></tr>
        <tr><th>Trackpad</th><td>two fingers pan · pinch zooms</td></tr>
        <tr><th>Touch</th><td>drag to pan, flick to glide · pinch to zoom · double-tap zooms in</td></tr>
        <tr><th>Keys</th><td><kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd> pan (shift: further) · <kbd>+</kbd> <kbd>−</kbd> zoom · <kbd>0</kbd> fit</td></tr>
        <tr><th>Minimap</th><td>tap to jump · drag to steer</td></tr>
      </table>
      <p>If a mouse wheel pans or a trackpad zooms, set <b>Wheel</b> in the toolbar.</p>
      <p class="credit">Theme toggle: <a href="https://uiverse.io/mamyapro123/cuddly-warthog-66" target="_blank" rel="noopener">“cuddly-warthog-66” by Hari Bro</a> on Uiverse (MIT). Text set in Libron.</p>`);
    root.append(help);
    Reactor(() => { help.hidden = !help_open.value; });

    //// Minimap

    dock.append(Minimap(camera, items, selected, render_s));

    // keyboard focus starts on the canvas, so the keys work straight away
    stage.focus({ preventScroll: true });
    return root;
}

// An overview of the whole world with the visible area outlined.
// Tap to jump there; drag to steer the camera directly.
function Minimap(camera: Camera, items: Item[], selected: Observable<Item | null>, render_s: Schedule): HTMLElement {
    const wrap = el("div", "pz-card pz-mini");
    const mini = el("canvas");
    mini.setAttribute("aria-label", "Minimap: tap to move the view");
    wrap.append(mini);
    const ctx = mini.getContext("2d")!;
    const ww = WORLD.x1 - WORLD.x0, wh = WORLD.y1 - WORLD.y0;
    const size = Observable({ w: 200, h: 200 * wh / ww });

    new ResizeObserver(() => {
        const w = mini.clientWidth;
        if (w) size.value = { w, h: w * wh / ww };
    }).observe(mini);

    Reactor(() => {
        const { w, h } = size.value, dpr = camera.screen.value.dpr, c = colors.value, cam = camera.view.value, vp = camera.screen.value;
        if (mini.width !== Math.round(w * dpr)) { mini.width = Math.round(w * dpr); mini.height = Math.round(h * dpr); }
        const k = w / ww;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = c.bg;
        ctx.fillRect(0, 0, w, h);
        const sel = selected.value;
        for (const item of items) {
            ctx.fillStyle = item === sel ? c.blue : c.tx3;
            ctx.globalAlpha = item === sel ? 1 : item.kind === "text" ? 0.25 : 0.45;
            ctx.fillRect((item.rect.x0 - WORLD.x0) * k, (item.rect.y0 - WORLD.y0) * k, Math.max(1, (item.rect.x1 - item.rect.x0) * k), Math.max(1, (item.rect.y1 - item.rect.y0) * k));
        }
        ctx.globalAlpha = 1;
        // the visible area; at deep zoom it is a dot with a crosshair
        const x0 = (cam.x - vp.w / 2 / cam.scale - WORLD.x0) * k, y0 = (cam.y - vp.h / 2 / cam.scale - WORLD.y0) * k;
        const rw = vp.w / cam.scale * k, rh = vp.h / cam.scale * k;
        ctx.strokeStyle = c.orange;
        ctx.lineWidth = 1.5;
        if (rw < 4) {
            const cx = (cam.x - WORLD.x0) * k, cy = (cam.y - WORLD.y0) * k;
            ctx.beginPath();
            ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7);
            ctx.stroke();
        } else {
            ctx.strokeRect(x0, y0, rw, rh);
        }
    }, { reaction_schedule: render_s });

    // minimap point → world point
    const toWorld = (e: PointerEvent) => {
        const r = mini.getBoundingClientRect();
        return { x: WORLD.x0 + (e.clientX - r.left) / r.width * ww, y: WORLD.y0 + (e.clientY - r.top) / r.height * wh };
    };
    let dragging = false, moved = false;
    mini.addEventListener("pointerdown", e => {
        mini.setPointerCapture(e.pointerId);
        dragging = true; moved = false;
        e.preventDefault();
    });
    mini.addEventListener("pointermove", e => {
        if (!dragging) return;
        moved = true;
        const p = toWorld(e);
        camera.lookAt({ ...p, scale: camera.view._value.scale }, false);
    });
    const end = (e: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        if (!moved && e.type === "pointerup") camera.lookAt({ ...toWorld(e), scale: camera.view._value.scale });
    };
    mini.addEventListener("pointerup", end);
    mini.addEventListener("pointercancel", end);
    mini.style.touchAction = "none";

    return wrap;
}
