// sim_page.ts
//
// The live simulation: the whole viewport is the lattice, seen through a
// Camera (from the Pan & Zoom example). The lattice is periodic, so it tiles
// the plane: pan forever, zoom out to see the repeats, zoom in to the spins.
//
//   one animation frame ──► camera.advance(now)   (input → view)
//                       └─► state.advance(now)    (physics → tick)
//                                │
//   [render stage]  ◄────────────┘  one flush, one paint
//     lattice layer · readouts · sparkline
//
// Both advance in the same frame callback, so a frame where the camera moves
// and the spins change still paints once.

import { Observable, Reactor } from "../../../core/index";
import { Camera } from "../../pan-zoom/camera.ts";
import { T_CRITICAL, energy, exactMagnetization, magnetization } from "../ising.ts";
import { LatticeLayer } from "../canvas/lattice_layer.ts";
import { DETAIL_FULL, DETAIL_START } from "../canvas/sprites.ts";
import { colors, phaseColor } from "../theme.ts";
import { HISTORY, SIZES, SimState, T_MAX, sweepsPerFrame } from "./state.ts";
import { AnnealControls } from "../anneal_controls.ts";
import { Thermometer } from "./thermometer.ts";

const MAX_SCALE = 160; // px per spin

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html) node.innerHTML = html;
    return node;
}

const signed = (v: number, d = 3) => (v < 0 ? "−" : v > 0 ? "+" : "±") + Math.abs(v).toFixed(d);

export function SimPage(active: Observable<boolean>): HTMLElement {
    const state = SimState();

    //// Stage

    const root = el("div", "is-sim");
    const stage = el("div", "is-stage");
    stage.setAttribute("role", "application");
    stage.setAttribute("aria-label", "The Ising lattice. Drag to pan, scroll or pinch to zoom. Space plays or pauses.");
    const canvas = el("canvas", "is-canvas");
    stage.append(canvas);
    root.append(stage);
    document.body.append(root); // the camera measures it

    const camera = Camera(stage, { auto_advance: false, max_scale: MAX_SCALE });
    (window as any).ising = { state, camera }; // open for poking at in the console

    // zoom limits follow the lattice and the screen: zoomed out, a few repeats
    Reactor(() => {
        const n = state.lattice.value.n, { w, h } = camera.screen.value;
        camera.zoom_limits.value = { min: Math.max(0.35, Math.min(w, h) / (n * 3)), max: MAX_SCALE };
    });
    const fitView = () => {
        const n = state.lattice._value.n, { w, h } = camera.screen._value;
        return { x: n / 2, y: n / 2, scale: Math.max(w, h) / n };
    };
    camera.home_view = fitView;
    // a new lattice (size change) is framed afresh
    Reactor(() => { state.lattice.value; camera.lookAt(fitView(), false); }, { deps: [state.lattice], initFn: true });

    LatticeLayer(camera, canvas, {
        lattice: state.lattice,
        tick: state.tick,
        clock: state.clock,
        schedule: state.render_s,
    });

    //// The frame loop: camera, then physics, in one callback

    const frame = (now: number) => {
        requestAnimationFrame(frame);
        if (!active._value) return;
        camera.advance(now);
        state.advance(now);
    };
    requestAnimationFrame(frame);

    //// Title card and readouts

    const title = el("section", "is-card is-title", `
      <h1>Ising model</h1>
      <p class="is-sub" data-k="sub"></p>
      <dl class="is-stats">
        <div><dt>temperature</dt><dd data-k="T"></dd></div>
        <div><dt>magnetization</dt><dd data-k="m"></dd></div>
        <div><dt>energy per spin</dt><dd data-k="e"></dd></div>
        <div><dt>sweeps</dt><dd data-k="sweeps"></dd></div>
      </dl>
      <figure class="is-spark">
        <canvas aria-label="Magnetization over the last few seconds"></canvas>
        <figcaption>magnetization, last ${HISTORY} frames · dashed: Onsager's exact value</figcaption>
      </figure>
      <a class="is-learn" href="#learn">What am I looking at? <span aria-hidden="true">→</span></a>`);
    const out = (k: string) => title.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
    const spark = title.querySelector<HTMLCanvasElement>(".is-spark canvas")!;
    root.append(title);

    Reactor(() => {
        const n = SIZES[state.size_index.value];
        out("sub").textContent = `${n} × ${n} spins, edges joined · ${state.rule.value === "metropolis" ? "Metropolis" : "heat-bath"} steps`;
    });

    Reactor(() => {
        state.tick.value;
        const T = state.temperature.value, c = colors.value, lat = state.lattice.value;
        out("T").textContent = T.toFixed(2);
        out("T").style.color = phaseColor(c, T, T_CRITICAL);
        out("m").textContent = signed(magnetization(lat));
        out("e").textContent = signed(energy(lat, state.field.value));
        out("sweeps").textContent = Math.floor(lat.sweeps).toLocaleString();
        drawSpark();
    }, { reaction_schedule: state.render_s });

    function drawSpark(): void {
        const dpr = devicePixelRatio || 1, w = spark.clientWidth, h = spark.clientHeight;
        if (!w || !h) return;
        if (spark.width !== Math.round(w * dpr)) { spark.width = Math.round(w * dpr); spark.height = Math.round(h * dpr); }
        const ctx = spark.getContext("2d")!, c = colors._value;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const Y = (m: number) => h / 2 - m * (h / 2 - 3);
        ctx.lineWidth = 1;
        ctx.strokeStyle = c.ui3;
        ctx.beginPath(); ctx.moveTo(0, h / 2 + .5); ctx.lineTo(w, h / 2 + .5); ctx.stroke();
        // Onsager's exact spontaneous magnetization at this temperature (h = 0): ±m*
        const m_exact = exactMagnetization(state.temperature._value);
        if (m_exact > 0) {
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = c.blue;
            ctx.beginPath();
            ctx.moveTo(0, Y(m_exact)); ctx.lineTo(w, Y(m_exact));
            ctx.moveTo(0, Y(-m_exact)); ctx.lineTo(w, Y(-m_exact));
            ctx.stroke();
            ctx.setLineDash([]);
        }
        const hist = state.history;
        if (hist.length < 2) return;
        ctx.strokeStyle = c.tx;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        hist.forEach((m, k) => {
            const x = (k / (HISTORY - 1)) * w;
            k ? ctx.lineTo(x, Y(m)) : ctx.moveTo(x, Y(m));
        });
        ctx.stroke();
    }

    //// Thermometer

    root.append(Thermometer(state.temperature, T_MAX));

    //// Controls

    const controls = el("section", "is-card is-controls", `
      <button class="is-fold" aria-expanded="true" aria-controls="is-controls-body">Controls</button>
      <div id="is-controls-body" class="is-controls-body">
        <div class="is-row is-run">
          <button data-act="play" class="is-primary"></button>
          <button data-act="step" title="One sweep: n² attempted flips (S)">Step</button>
          <button data-act="random" title="Every spin a coin toss: infinite temperature (R)">Shuffle</button>
          <button data-act="up" title="Every spin up: zero temperature (U)">All up</button>
        </div>
        <div data-slot="anneal"></div>
        <label class="is-slider"><span>field <i>h</i></span><output data-v="field"></output>
          <input type="range" data-in="field" min="-1" max="1" step="0.01"></label>
        <label class="is-slider"><span>speed</span><output data-v="speed"></output>
          <input type="range" data-in="speed" min="0" max="1" step="0.005"></label>
        <label class="is-slider"><span>lattice</span><output data-v="size"></output>
          <input type="range" data-in="size" min="0" max="${SIZES.length - 1}" step="1"></label>
        <div class="is-row is-rule" role="group" aria-label="Update rule">
          <span>rule</span>
          <button data-rule="metropolis">Metropolis</button>
          <button data-rule="heat_bath">Heat bath</button>
        </div>
      </div>`);
    root.append(controls);
    controls.querySelector('[data-slot="anneal"]')!.replaceWith(AnnealControls(state.anneal, () => sweepsPerFrame(state.speed.value) * 60));
    const fold = controls.querySelector<HTMLButtonElement>(".is-fold")!;
    const input = (k: string) => controls.querySelector<HTMLInputElement>(`[data-in="${k}"]`)!;
    const value = (k: string) => controls.querySelector<HTMLElement>(`[data-v="${k}"]`)!;

    const controls_open = Observable(innerWidth > 720);
    fold.addEventListener("click", () => controls_open.value = !controls_open._value);
    Reactor(() => {
        controls.classList.toggle("is-folded", !controls_open.value);
        fold.setAttribute("aria-expanded", String(controls_open.value));
    });

    controls.addEventListener("click", e => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
        if (!b) return;
        if (b.dataset.rule) { state.rule.value = b.dataset.rule as "metropolis" | "heat_bath"; return; }
        const act = b.dataset.act;
        if (act === "play") state.running.value = !state.running._value;
        else if (act === "step") state.singleStep();
        else if (act === "random") state.fill("random");
        else if (act === "up") state.fill("up");
    });
    input("field").addEventListener("input", () => state.field.value = +input("field").value);
    input("field").addEventListener("dblclick", () => state.field.value = 0);
    input("speed").addEventListener("input", () => state.speed.value = +input("speed").value);
    input("size").addEventListener("input", () => state.size_index.value = +input("size").value);

    Reactor(() => {
        const playing = state.running.value, b = controls.querySelector<HTMLButtonElement>('[data-act="play"]')!;
        b.textContent = playing ? "Pause" : "Play";
        b.setAttribute("aria-pressed", String(playing));
    });
    Reactor(() => { input("field").value = String(state.field.value); value("field").textContent = signed(state.field.value, 2); });
    Reactor(() => {
        input("speed").value = String(state.speed.value);
        const per_second = sweepsPerFrame(state.speed.value) * 60, n = SIZES[state.size_index.value];
        value("speed").textContent = per_second >= 1 ? `${per_second.toFixed(per_second < 10 ? 1 : 0)} sweeps/s` : `${Math.round(per_second * n * n)} flips tried/s`;
    });
    Reactor(() => { input("size").value = String(state.size_index.value); value("size").textContent = `${SIZES[state.size_index.value]}²`; });
    Reactor(() => {
        const r = state.rule.value;
        controls.querySelectorAll<HTMLButtonElement>("[data-rule]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.rule === r)));
    });

    //// Zoom cluster

    const zoom = el("nav", "is-card is-zoom", `
      <button data-z="out" aria-label="Zoom out">−</button>
      <button data-z="in" aria-label="Zoom in">+</button>
      <button data-z="fit" title="Fill the screen with the lattice (0)">Fit</button>
      <button data-z="spins" title="Zoom in until every spin shows its arrow">Spins</button>`);
    root.append(zoom);
    zoom.addEventListener("click", e => {
        const z = (e.target as HTMLElement).closest<HTMLButtonElement>("button")?.dataset.z;
        if (z === "in") camera.zoomAt(1.8);
        else if (z === "out") camera.zoomAt(1 / 1.8);
        else if (z === "fit") camera.goHome();
        else if (z === "spins") {
            const { w, h } = camera.screen._value;
            camera.zoomTo(Math.max(DETAIL_FULL * 1.3, Math.min(w, h) / 12));
        }
    });

    //// Hint: shown until the first zoom far enough to see the arrows

    const hint = el("p", "is-hint", "Scroll or pinch to zoom in: up close, every square is a spin with its arrow.");
    root.append(hint);
    Reactor(() => { if (camera.view.value.scale > DETAIL_START) hint.classList.add("is-gone"); });
    setTimeout(() => hint.classList.add("is-gone"), 10000);

    //// Keys (the stage's own keys pan and zoom; these run the simulation)

    window.addEventListener("keydown", e => {
        if (!active._value || e.ctrlKey || e.metaKey || e.altKey) return;
        if ((e.target as HTMLElement).closest("input, textarea, select, button, [role=slider]")) return;
        const nudge = (d: number) => state.temperature.value = Math.round(Math.min(T_MAX, Math.max(0, state.temperature._value + d)) * 100) / 100;
        const keys: Record<string, () => void> = {
            " ": () => state.running.value = !state.running._value,
            s: () => state.singleStep(), r: () => state.fill("random"), u: () => state.fill("up"),
            a: () => state.anneal.on.value = !state.anneal.on._value,
            "[": () => nudge(e.shiftKey ? -0.5 : -0.05), "]": () => nudge(e.shiftKey ? 0.5 : 0.05),
            c: () => state.temperature.value = Math.round(T_CRITICAL * 100) / 100,
        };
        const run = keys[e.key.length === 1 ? e.key.toLowerCase() : e.key];
        if (!run) return;
        e.preventDefault();
        run();
    });

    // coming back to this page: catch up at once (the theme may have changed)
    Reactor(() => { if (active.value) state.tick.value++; }, { deps: [active] });

    stage.focus({ preventScroll: true });
    return root;
}
