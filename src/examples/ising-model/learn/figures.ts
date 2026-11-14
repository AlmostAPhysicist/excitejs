// figures.ts
//
// The explainer's live figures. Each is a small lattice drawn by the same
// LatticeLayer as the simulation, through a FixedCamera (pan and zoom off).
// A figure runs only while it is on screen and the explainer is showing:
//
//   on_screen (IntersectionObserver) ─┐
//   page_active ──────────────────────┼─► running ─► [frame loop] ─► tick ─► repaint
//
//   SingleSpin       one spin in a field: the Boltzmann odds, live
//   Neighbourhood    a spin and its four neighbours: ΔE and the Markov step
//   ThreeTemperatures  cold, critical and hot lattices side by side
//   CriticalCurve    Onsager's exact magnetization, a live measurement, and annealing
//   IsingChain       the 1D chain over time: it never settles

import { Observable, Reactor } from "../../../core/index";
import { FixedCamera } from "../../pan-zoom/camera.ts";
import { Lattice, T_CRITICAL, acceptance, acceptanceTable, exactMagnetization, magnetization, neighbourSum, recount, step, type Rule } from "../ising.ts";
import { Annealer } from "../anneal.ts";
import { AnnealControls } from "../anneal_controls.ts";
import { LatticeLayer, cellAt, latticeRect } from "../canvas/lattice_layer.ts";
import { FLIP_MS } from "../canvas/sprites.ts";
import { colors } from "../theme.ts";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html) node.innerHTML = html;
    return node;
}

// True while `node` is on screen and the page is showing
function running(node: HTMLElement, page_active: Observable<boolean>): Observable<boolean> {
    const on_screen = Observable(false);
    const run = Observable(false);
    new IntersectionObserver(entries => { on_screen.value = entries[entries.length - 1].isIntersecting; }, { rootMargin: "80px" }).observe(node);
    Reactor(() => { run.value = on_screen.value && page_active.value; });
    return run;
}

// A frame loop that runs while `run` is true. The Reactor starts it and
// returns its cleanup, which stops it when `run` turns false.
function loopWhile(run: Observable<boolean>, frame: (now: number, dt: number) => void): void {
    Reactor(() => {
        if (!run.value) return;
        let id = 0, last = performance.now();
        const tick = (now: number) => {
            frame(now, Math.min(64, now - last));
            last = now;
            id = requestAnimationFrame(tick);
        };
        id = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(id);
    }, { deps: [run] });
}

// A lattice in a fixed frame, drawn by a LatticeLayer
function LatticeFigure(lattice: Observable<Lattice>, tick: Observable<number>, options: { tile?: boolean; dim?: (idx: number) => boolean; padding?: number; label: string }) {
    const box = el("div", "is-fig-canvas");
    const canvas = el("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", options.label);
    box.append(canvas);
    const camera = FixedCamera(box, latticeRect(lattice._value), options.padding ?? 0);
    Reactor(() => { camera.frame.value = latticeRect(lattice.value); }, { deps: [lattice] });
    LatticeLayer(camera, canvas, { lattice, tick, tile: options.tile ?? false, dim: options.dim });
    return { box, camera };
}

// Keep repainting for a moment after a flip, so the arrow's half-turn plays
function playFlip(tick: Observable<number>): void {
    const until = performance.now() + FLIP_MS + 40;
    const go = () => { tick.value++; if (performance.now() < until) requestAnimationFrame(go); };
    requestAnimationFrame(go);
}

function slider(label: string, min: number, max: number, stepv: number, value: Observable<number>, format: (v: number) => string): HTMLElement {
    const wrap = el("label", "is-fig-slider", `<span>${label}</span><output></output><input type="range" min="${min}" max="${max}" step="${stepv}">`);
    const input = wrap.querySelector("input")!, output = wrap.querySelector("output")!;
    input.addEventListener("input", () => value.value = +input.value);
    Reactor(() => { input.value = String(value.value); output.textContent = format(value.value); });
    return wrap;
}

//// 1. One spin in a field

export function SingleSpin(page_active: Observable<boolean>): HTMLElement {
    const T = Observable(1.5), h = 1;
    const lattice = Observable(Lattice(1, "up"));
    const tick = Observable(0);
    const seen = { up: 0, total: 0 };
    const root = el("figure", "is-fig is-fig-single");
    const fig = LatticeFigure(lattice, tick, { padding: 8, label: "A single spin, flipping at random" });
    const bars = el("div", "is-odds", `
      <div class="is-odds-row"><span>up ↑</span><div class="is-bar"><i data-b="up"></i></div><output data-p="up"></output></div>
      <div class="is-odds-row"><span>down ↓</span><div class="is-bar"><i data-b="down"></i></div><output data-p="down"></output></div>
      <p class="is-seen" data-k="seen"></p>`);
    const side = el("div", "is-fig-side");
    side.append(bars, slider("temperature <i>T</i>", 0.1, 5, 0.05, T, v => v.toFixed(2)));
    root.append(fig.box, side, el("figcaption", "", "A field <i>h</i> = 1 favours up. The bars are Boltzmann's odds at this temperature; the spin above re-decides a few times a second (a heat-bath step), and the tally shows how often it has been up."));

    Reactor(() => {
        const p_up = 1 / (1 + Math.exp(-2 * h / T.value));
        (bars.querySelector('[data-b="up"]') as HTMLElement).style.width = `${p_up * 100}%`;
        (bars.querySelector('[data-b="down"]') as HTMLElement).style.width = `${(1 - p_up) * 100}%`;
        bars.querySelector('[data-p="up"]')!.textContent = `${(p_up * 100).toFixed(0)}%`;
        bars.querySelector('[data-p="down"]')!.textContent = `${((1 - p_up) * 100).toFixed(0)}%`;
        seen.up = seen.total = 0;
    });

    let since = 0;
    loopWhile(running(root, page_active), (now, dt) => {
        since += dt;
        if (since < 260) return;
        since = 0;
        const lat = lattice._value, was = lat.spins[0];
        const p_up = 1 / (1 + Math.exp(-2 * h / T._value));
        const next = Math.random() < p_up ? 1 : -1;
        seen.total++; if (next > 0) seen.up++;
        bars.querySelector('[data-k="seen"]')!.textContent = `up ${seen.up} of the last ${seen.total} decisions (${(seen.up / seen.total * 100).toFixed(0)}%)`;
        if (next !== was) {
            lat.spins[0] = next;
            lat.flipped_at[0] = now;
            playFlip(tick);
        }
    });
    return root;
}

//// 2. A spin and its neighbours: the energy cost, and one Markov step

export function Neighbourhood(page_active: Observable<boolean>): HTMLElement {
    void page_active;
    const T = Observable(2);
    const rule = Observable<Rule>("metropolis");
    const lattice = Observable(Lattice(3, "up"));
    const tick = Observable(0);
    const verdict = Observable("");
    const CENTER = 4, NEIGHBOURS = [1, 3, 5, 7];
    const corner = (idx: number) => ![CENTER, ...NEIGHBOURS].includes(idx);
    // start with a mixed neighbourhood
    lattice._value.spins.set([1, -1, 1, 1, 1, -1, -1, 1, 1]);

    const root = el("figure", "is-fig is-fig-hood");
    const fig = LatticeFigure(lattice, tick, { padding: 6, dim: corner, label: "A spin and its four neighbours. Click any of them to flip it." });
    const info = el("div", "is-fig-side", `
      <dl class="is-fig-dl">
        <div><dt>neighbours agreeing</dt><dd data-k="agree"></dd></div>
        <div><dt>cost to flip the middle, Δ<i>E</i></dt><dd data-k="dE"></dd></div>
        <div><dt>chance the flip is accepted</dt><dd data-k="p"></dd></div>
      </dl>
      <div class="is-fig-row" role="group" aria-label="Update rule">
        <button data-rule="metropolis">Metropolis</button><button data-rule="heat_bath">Heat bath</button>
      </div>
      <button class="is-propose">Propose flipping the middle spin</button>
      <p class="is-verdict" aria-live="polite"></p>`);
    info.querySelector(".is-fig-dl")!.after(slider("temperature <i>T</i>", 0.1, 5, 0.05, T, v => v.toFixed(2)));
    const table = el("table", "is-cases");
    root.append(fig.box, info, table, el("figcaption", "", "Click any spin to flip it. The middle spin is the one being considered; the faint corners don't touch it, so they don't count. The table lists every case, for the temperature on the slider."));

    const lat = () => lattice._value;
    const cost = () => 2 * lat().spins[CENTER] * neighbourSum(lat(), CENTER); // J = 1, h = 0

    Reactor(() => {
        tick.value; const t = T.value, r = rule.value;
        const s = lat().spins[CENTER], S = neighbourSum(lat(), CENTER);
        const agree = NEIGHBOURS.filter(i => lat().spins[i] === s).length;
        const dE = cost(), p = acceptance(dE, t, r);
        info.querySelector('[data-k="agree"]')!.textContent = `${agree} of 4`;
        info.querySelector('[data-k="dE"]')!.textContent = `${dE > 0 ? "+" : dE < 0 ? "−" : ""}${Math.abs(dE)} J`;
        info.querySelector('[data-k="p"]')!.textContent = `${(p * 100).toFixed(1)}%`;
        info.querySelectorAll<HTMLButtonElement>("[data-rule]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.rule === r)));
        // every case: k neighbours agree → S·s = 2k − 4 → ΔE = 2(2k − 4)
        table.innerHTML = `<thead><tr><th>neighbours agreeing</th><th>Δ<i>E</i></th><th>Metropolis</th><th>heat bath</th></tr></thead><tbody>${[4, 3, 2, 1, 0].map(k => {
            const e = 2 * (2 * k - 4);
            return `<tr${k === agree ? ' class="is-now"' : ""}><td>${k}</td><td>${e > 0 ? "+" : e < 0 ? "−" : ""}${Math.abs(e)}</td><td>${(acceptance(e, t, "metropolis") * 100).toFixed(1)}%</td><td>${(acceptance(e, t, "heat_bath") * 100).toFixed(1)}%</td></tr>`;
        }).join("")}</tbody>`;
        void S;
    });
    Reactor(() => { info.querySelector(".is-verdict")!.textContent = verdict.value; });

    const flip = (idx: number) => {
        lat().spins[idx] *= -1;
        lat().flipped_at[idx] = performance.now();
        recount(lat());
        tick.value++;
        playFlip(tick);
    };

    fig.box.addEventListener("click", e => {
        const r = fig.box.getBoundingClientRect();
        const idx = cellAt(fig.camera, lat(), e.clientX - r.left, e.clientY - r.top, false);
        if (idx < 0 || corner(idx)) return;
        flip(idx);
        verdict.value = "";
    });
    fig.box.style.cursor = "pointer";
    info.addEventListener("click", e => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
        if (!b) return;
        if (b.dataset.rule) { rule.value = b.dataset.rule as Rule; return; }
        if (b.classList.contains("is-propose")) {
            const dE = cost(), p = acceptance(dE, T._value, rule._value), roll = Math.random();
            const ok = roll < p;
            verdict.value = `Rolled ${roll.toFixed(3)} against ${p.toFixed(3)}: ${ok ? "accepted, the spin flips." : "rejected, nothing changes (and that still counts as a step)."}`;
            if (ok) flip(CENTER);
        }
    });
    return root;
}

//// 3. Cold, critical, hot

export function ThreeTemperatures(page_active: Observable<boolean>): HTMLElement {
    const N = 72;
    const temps = [{ T: 1.6, name: "cold", note: "domains grow until one wins" }, { T: Math.round(T_CRITICAL * 1000) / 1000, name: "critical", note: "clusters of every size" }, { T: 3.4, name: "hot", note: "noise; no lasting order" }];
    const root = el("figure", "is-fig is-fig-three");
    const row = el("div", "is-three");
    const sims = temps.map(({ T, name, note }) => {
        const lattice = Observable(Lattice(N)), tick = Observable(0);
        const table = acceptanceTable(T, 0, "metropolis");
        const fig = LatticeFigure(lattice, tick, { label: `A ${name} lattice at T = ${T}` });
        const cell = el("div", "is-three-cell");
        cell.append(fig.box, el("p", "", `<b>T = ${T}</b> · ${name}<br><span>${note}</span>`));
        row.append(cell);
        return { lattice, tick, table };
    });
    const restart = el("button", "is-restart", "Start again from noise");
    restart.addEventListener("click", () => sims.forEach(s => { s.lattice.value = Lattice(N); s.tick.value++; }));
    root.append(row, restart, el("figcaption", "", "Three lattices started from the same kind of noise, each held at its own temperature. Below the critical temperature they order; at it, they hover between; above it, they stay disordered."));

    loopWhile(running(root, page_active), now => {
        for (const s of sims) { step(s.lattice._value, 0.6, s.table, now); s.tick.value++; }
    });
    return root;
}

//// 4. The critical temperature: exact curve and a live measurement

export function CriticalCurve(page_active: Observable<boolean>): HTMLElement {
    const N = 64, T_TOP = 4, SWEEPS_PER_FRAME = 2;
    const T = Observable(2);
    // one pass between hot and cold in ~25 s at "slow" (2 sweeps a frame, 60 fps)
    const anneal = Annealer(T, { hot: 3.5, cold: 0.6, per_sweep: 0.001 });
    const lattice = Observable(Lattice(N, "up")), tick = Observable(0);
    const measured = Observable(0);
    let table = acceptanceTable(T._value, 0, "metropolis");
    let avg = 1, n_avg = 0;
    let trail: string[] = []; // the measurement's path while annealing

    const root = el("figure", "is-fig is-fig-curve");
    const W = 420, H = 240, X = (t: number) => 40 + (t / T_TOP) * (W - 56), Y = (m: number) => H - 30 - m * (H - 56);
    const pts: string[] = [];
    for (let t = 0.02; t <= T_TOP; t += 0.01) pts.push(`${X(t).toFixed(1)},${Y(exactMagnetization(t)).toFixed(1)}`);
    const svg = `<svg class="is-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Exact magnetization against temperature, with the live measurement as a dot">
      ${[0, 0.5, 1].map(m => `<line x1="40" x2="${W - 16}" y1="${Y(m)}" y2="${Y(m)}" class="grid"/><text x="34" y="${Y(m) + 4}" class="tick" text-anchor="end">${m}</text>`).join("")}
      ${[0, 1, 2, 3, 4].map(t => `<text x="${X(t)}" y="${H - 12}" class="tick" text-anchor="middle">${t}</text>`).join("")}
      <text x="${W - 16}" y="${H - 36}" class="axis" text-anchor="end">T →</text>
      <text x="44" y="18" class="axis">|m|</text>
      <line x1="${X(T_CRITICAL)}" x2="${X(T_CRITICAL)}" y1="20" y2="${H - 30}" class="tc"/>
      <text x="${X(T_CRITICAL) + 5}" y="30" class="tc-label">T<tspan baseline-shift="sub" font-size="9">c</tspan> = 2.269</text>
      <polyline points="${pts.join(" ")}" class="exact"/>
      <polyline class="trail" points=""/>
      <line class="now" y1="20" y2="${H - 30}"/>
      <circle class="dot" r="6"/>
    </svg>`;
    const plot = el("div", "is-curve-plot", svg);
    const fig = LatticeFigure(lattice, tick, { label: "The lattice being measured" });
    const side = el("div", "is-fig-side");
    side.append(fig.box, slider("temperature <i>T</i>", 0.5, T_TOP, 0.01, T, v => v.toFixed(2)), el("p", "is-measure", ""), AnnealControls(anneal, () => SWEEPS_PER_FRAME * 60));
    root.append(plot, side, el("figcaption", "", "The line is the exact answer for an infinite lattice (Onsager, Yang). The dot is |m| measured on the 64 × 64 lattice beside it, averaged as it runs. Near T<sub>c</sub> a small lattice can't follow the curve's sudden drop: that's a finite-size effect. <b>Anneal slowly</b> moves the temperature a little every sweep (Auto goes back and forth). The orange trail is the path the measurement takes: it hugs the curve away from T<sub>c</sub> and lags behind it near T<sub>c</sub>, where the lattice is slowest to settle, so cooling and heating trace different paths."));

    // a fresh trail each time annealing starts
    Reactor(() => { if (anneal.on.value) { trail = []; plot.querySelector(".trail")!.setAttribute("points", ""); } }, { deps: [anneal.on] });

    Reactor(() => {
        table = acceptanceTable(T.value, 0, "metropolis");
        // a slider move starts a fresh average; annealing keeps a short running one
        if (!anneal.on._value) { avg = Math.abs(magnetization(lattice._value)); n_avg = 0; }
        const now = plot.querySelector<SVGLineElement>(".now")!;
        now.setAttribute("x1", String(X(T.value))); now.setAttribute("x2", String(X(T.value)));
    });
    Reactor(() => {
        const m = measured.value, dot = plot.querySelector<SVGCircleElement>(".dot")!;
        dot.setAttribute("cx", String(X(T._value)));
        dot.setAttribute("cy", String(Y(m)));
        side.querySelector(".is-measure")!.innerHTML = `measured |<i>m</i>| ≈ ${m.toFixed(3)} · exact ${exactMagnetization(T._value).toFixed(3)}`;
    });

    loopWhile(running(root, page_active), now => {
        const lat = lattice._value;
        step(lat, SWEEPS_PER_FRAME, table, now);
        n_avg = Math.min(n_avg + 1, anneal.on._value ? 12 : 120);
        avg += (Math.abs(magnetization(lat)) - avg) / n_avg;
        if (anneal.on._value) {
            anneal.advance(SWEEPS_PER_FRAME);
            trail.push(`${X(T._value).toFixed(1)},${Y(avg).toFixed(1)}`);
            if (trail.length > 3000) trail.shift(); // Auto runs forever: keep the last few loops
            plot.querySelector(".trail")!.setAttribute("points", trail.join(" "));
        }
        measured.value = avg;
        tick.value++;
    });
    return root;
}

//// 5. Ising's chain: one dimension, drawn over time

export function IsingChain(page_active: Observable<boolean>): HTMLElement {
    const L = 160, ROWS = 120;
    const T = Observable(0.8);
    const spins = Int8Array.from({ length: L }, () => (Math.random() < 0.5 ? 1 : -1));
    const history: Int8Array[] = [];
    const sweep = (t: number) => {
        for (let k = 0; k < L; k++) {
            const i = (Math.random() * L) | 0, s = spins[i];
            const dE = 2 * s * (spins[(i + L - 1) % L] + spins[(i + 1) % L]);
            if (dE <= 0 || Math.random() < Math.exp(-dE / t)) spins[i] = -s;
        }
        history.push(spins.slice());
        if (history.length > ROWS) history.shift();
    };
    const root = el("figure", "is-fig is-fig-chain");
    const canvas = el("canvas", "is-chain");
    canvas.width = L; canvas.height = ROWS;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "A one-dimensional chain of spins, one row per sweep, time running downward");
    const side = el("div", "is-fig-side");
    side.append(slider("temperature <i>T</i>", 0.2, 3, 0.05, T, v => v.toFixed(2)), el("p", "is-measure", "Every row is the whole chain after one more sweep; time runs downward."));
    root.append(canvas, side, el("figcaption", "", "Ising's own case: a chain, each spin with two neighbours. Even when cold, a break in the chain costs a fixed energy, while there are ever more places for it to happen, so breaks keep appearing and wandering. The chain never settles into one direction for good: in one dimension there is no phase transition above zero temperature."));

    // start from noise, with a canvas-full of history already run
    for (let r = 0; r < ROWS; r++) sweep(T._value);
    const ctx = canvas.getContext("2d")!;
    let image = ctx.createImageData(L, ROWS);
    let since = 0;
    loopWhile(running(root, page_active), (_now, dt) => {
        since += dt;
        if (since < 50) return;
        since = 0;
        sweep(T._value);
        const c = colors._value;
        const up = [parseInt(c.up.slice(1, 3), 16), parseInt(c.up.slice(3, 5), 16), parseInt(c.up.slice(5, 7), 16)];
        const down = [parseInt(c.down.slice(1, 3), 16), parseInt(c.down.slice(3, 5), 16), parseInt(c.down.slice(5, 7), 16)];
        if (image.width !== L) image = ctx.createImageData(L, ROWS);
        const d = image.data;
        for (let r = 0; r < ROWS; r++) {
            const row = history[r];
            for (let k = 0; k < L; k++) {
                const o = (r * L + k) * 4, col = !row ? down : row[k] > 0 ? up : down;
                d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = row ? 255 : 0;
            }
        }
        ctx.putImageData(image, 0, 0);
    });
    return root;
}
