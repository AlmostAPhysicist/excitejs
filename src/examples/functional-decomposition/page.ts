// page.ts
//
// Functional decomposition: sample a function on a range, then recover it
// from the samples alone as a sum of k basis functions: powers of x
// (taylor.ts), Legendre polynomials, or Fourier / sine / cosine series
// (bases.ts).
//
// The samples come either from a chosen function (npoints evenly spaced over
// the range) or from a curve painted onto the left plot ("draw" mode).
//
// Reactive pipeline, one schedule per stage so each flush runs them in order:
//
//   target, range, npoints | drawn ──► [sample] ──► samples, view
//                                                     │
//   basis, k ────────────────────────────────────► [fit] ──► fit
//                                                     │         │
//   fit_mode ─────────────────────────────────────► [frame] ──► fit_view
//                                                     │         │
//   weighting ────────────────────────────────────► [render] ◄──┘
//
// The fit plot shows either the combined sum or each term c_i phi_i on its
// own ("decomposed"), coloured red (first term) through violet (last). Term
// opacities sum to 1, weighted either by |c_i| or by each term's largest
// absolute value over the range. Decomposed terms can be far larger than the
// data (they cancel), so that mode widens the fit plot's vertical scale.
//
// In combined mode, changing k re-runs only the fit and the fitted curve; the
// data layers of both plots are left alone.

import { Observable, Reactor, Scheduler } from "../../core/index";
import { BASES, fitBasis, type Basis, type Fit } from "./bases.ts";
import "./page.css";

// ----------------------------------------------------------------------------
// Targets and control limits
// ----------------------------------------------------------------------------

interface Target {
    id: string;
    label: string;
    fn: ((x: number) => number) | null; // null: samples are drawn by hand
}

const TARGETS: Target[] = [
    { id: "exp", label: "eˣ", fn: Math.exp },
    { id: "sin", label: "sin x", fn: Math.sin },
    { id: "cos", label: "cos x", fn: Math.cos },
    { id: "tan", label: "tan x", fn: Math.tan },
    { id: "ln", label: "ln x", fn: Math.log },
    { id: "x", label: "x", fn: x => x },
    { id: "x2", label: "x²", fn: x => x ** 2 },
    { id: "x3", label: "x³", fn: x => x ** 3 },
    { id: "x5", label: "x⁵", fn: x => x ** 5 },
    { id: "sqrt", label: "√x", fn: Math.sqrt },
    { id: "cbrt", label: "∛x", fn: Math.cbrt },
    { id: "gauss", label: "e^(−x²)", fn: x => Math.exp(-x * x) },
    { id: "draw", label: "✎ draw", fn: null },
];

const RANGE_LIMITS = { min: -5, max: 5, step: 0.05, min_gap: 0.1 };
const NPOINTS_LIMITS = { min: 2, max: 5000 };
const K_LIMITS = { min: 1, max: 12 };

const CURVE_SEGMENTS = 400;
const TERM_HUE = { first: 0, last: 270 }; // red .. violet
const DRAW_DT_MS = 16; // while painting, the pointer is sampled every DRAW_DT_MS

// ----------------------------------------------------------------------------
// Types & helpers
// ----------------------------------------------------------------------------

interface Samples {
    xs: number[];
    ys: number[];
}

type FitMode = "combined" | "decomposed";
type Weighting = "coefficient" | "range"; // term opacity from |c_i|, or from max |c_i phi_i| over the range

interface TermCurve {
    f: (x: number) => number;
    color: string;
    opacity: number;
}

interface View {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";

// SVG canvas, in viewBox units
const W = 520;
const H = 360;
const PAD = { left: 52, right: 16, top: 16, bottom: 34 };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, class_name?: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (class_name) node.className = class_name;
    if (text) node.textContent = text;
    return node;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
    return node;
}

function linspace(lo: number, hi: number, n: number): number[] {
    if (n === 1) return [lo];
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = lo + ((hi - lo) * i) / (n - 1);
    return out;
}

// Vertical extent of the data, ignoring runaway outliers (e.g. tan near a pole)
function yBounds(ys: number[]): [number, number] | null {
    if (ys.length === 0) return null;
    const sorted = [...ys].sort((a, b) => a - b);
    const quantile = (q: number) => sorted[Math.round(q * (sorted.length - 1))];
    const lo = quantile(0.02);
    const hi = quantile(0.98);
    const spread = hi - lo;
    return [Math.max(sorted[0], lo - spread), Math.min(sorted[sorted.length - 1], hi + spread)];
}

// Round tick positions (1, 2 or 5 times a power of ten) covering [lo, hi]
function niceTicks(lo: number, hi: number, target_count = 6): number[] {
    const raw_step = (hi - lo) / target_count;
    const magnitude = 10 ** Math.floor(Math.log10(raw_step));
    const step = [1, 2, 5, 10].map(f => f * magnitude).find(s => s >= raw_step) ?? 10 * magnitude;
    const ticks: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
        ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    }
    return ticks;
}

function sameView(a: View, b: View): boolean {
    return a.x0 === b.x0 && a.x1 === b.x1 && a.y0 === b.y0 && a.y1 === b.y1;
}

// Colour of term i of k, along the rainbow from red (first) to violet (last)
function termColor(i: number, k: number): string {
    const f = k > 1 ? i / (k - 1) : 0;
    return `hsl(${TERM_HUE.first + f * (TERM_HUE.last - TERM_HUE.first)}, 85%, 62%)`;
}

// Largest |g(x)| over [x0, x1], on a grid
function maxAbs(g: (x: number) => number, x0: number, x1: number, steps = 200): number {
    let max = 0;
    for (let i = 0; i <= steps; i++) max = Math.max(max, Math.abs(g(x0 + ((x1 - x0) * i) / steps)));
    return max;
}

// Per-term sizes normalized to sum to 1 (all zero stays all zero)
function termWeights(fit: Fit, weighting: Weighting, x0: number, x1: number): number[] {
    const sizes = fit.coeffs.map((c, i) =>
        weighting === "coefficient" ? Math.abs(c) : maxAbs(x => c * fit.terms[i].f(x), x0, x1));
    const total = sizes.reduce((sum, size) => sum + size, 0);
    return sizes.map(size => (total > 0 ? size / total : 0));
}

function termCurves(fit: Fit, weights: number[]): TermCurve[] {
    return fit.coeffs.map((c, i) => ({
        f: (x: number) => c * fit.terms[i].f(x),
        color: termColor(i, fit.coeffs.length),
        opacity: weights[i],
    }));
}

function formatTick(v: number): string {
    return Number(v.toPrecision(6)).toString();
}

function formatCoeff(c: number): string {
    if (c === 0) return "0";
    const a = Math.abs(c);
    return a >= 1e4 || a < 1e-3 ? c.toExponential(3) : c.toPrecision(5);
}


// ----------------------------------------------------------------------------
// Plot: an SVG with axes, a data layer and one curve layer
// ----------------------------------------------------------------------------

interface Plot {
    frame: HTMLDivElement; // wrapper, so HTML overlays (legend) can sit on top
    drawAxes(view: View): void;
    drawData(samples: Samples, view: View): void;
    drawCurve(f: ((x: number) => number) | null, view: View): void;
    drawTerms(terms: TermCurve[], view: View): void;
    toData(client_x: number, client_y: number, view: View): { x: number; y: number } | null;
}

function Plot(curve_class: string): Plot {
    const frame = el("div", "plot-frame");
    const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "plot-svg" });

    const clip_id = `plot-clip-${Math.random().toString(36).slice(2)}`;
    const clip = svg("clipPath", { id: clip_id });
    clip.appendChild(svg("rect", {
        x: PAD.left, y: PAD.top,
        width: W - PAD.left - PAD.right, height: H - PAD.top - PAD.bottom,
    }));
    const defs = svg("defs");
    defs.appendChild(clip);

    const grid = svg("g", { class: "plot-grid" });
    const axes = svg("g", { class: "plot-axes" });
    const plot_area = svg("g", { "clip-path": `url(#${clip_id})` });
    const data_path = svg("path", { class: "plot-data" });
    const curve_path = svg("path", { class: `plot-curve ${curve_class}` });
    const terms_group = svg("g", { class: "plot-terms" });
    plot_area.append(data_path, terms_group, curve_path);

    root.append(defs, grid, plot_area, axes);
    frame.appendChild(root);

    const sx = (x: number, v: View) => PAD.left + ((x - v.x0) / (v.x1 - v.x0)) * (W - PAD.left - PAD.right);
    const sy = (y: number, v: View) => H - PAD.bottom - ((y - v.y0) / (v.y1 - v.y0)) * (H - PAD.top - PAD.bottom);

    function curvePath(f: (x: number) => number, view: View): string {
        const h = view.y1 - view.y0;
        let d = "";
        let pen_down = false;
        let prev_side = 0; // -1 below the view, 1 above, 0 inside
        for (let i = 0; i <= CURVE_SEGMENTS; i++) {
            const x = view.x0 + ((view.x1 - view.x0) * i) / CURVE_SEGMENTS;
            const fx = f(x);
            if (!Number.isFinite(fx)) { // outside the domain (ln, √ of negatives)
                pen_down = false;
                continue;
            }
            const side = fx > view.y1 ? 1 : fx < view.y0 ? -1 : 0;
            // Jumping from far above to far below (tan across a pole) is a break, not a line
            if (side * prev_side === -1) pen_down = false;
            prev_side = side;

            // Clamp far outliers so the path stays finite; the clip hides the rest
            const y = Math.max(view.y0 - 10 * h, Math.min(view.y1 + 10 * h, fx));
            d += `${pen_down ? "L" : "M"}${sx(x, view).toFixed(2)},${sy(y, view).toFixed(2)}`;
            pen_down = true;
        }
        return d;
    }

    return {
        frame,

        drawAxes(view) {
            grid.replaceChildren();
            axes.replaceChildren();

            const left = PAD.left, right = W - PAD.right, top = PAD.top, bottom = H - PAD.bottom;

            for (const t of niceTicks(view.x0, view.x1)) {
                const x = sx(t, view);
                grid.appendChild(svg("line", { x1: x, x2: x, y1: top, y2: bottom }));
                const label = svg("text", { x, y: bottom + 18, "text-anchor": "middle" });
                label.textContent = formatTick(t);
                axes.appendChild(label);
            }
            for (const t of niceTicks(view.y0, view.y1, 5)) {
                const y = sy(t, view);
                grid.appendChild(svg("line", { x1: left, x2: right, y1: y, y2: y }));
                const label = svg("text", { x: left - 8, y: y + 4, "text-anchor": "end" });
                label.textContent = formatTick(t);
                axes.appendChild(label);
            }
            axes.appendChild(svg("rect", { class: "plot-border", x: left, y: top, width: right - left, height: bottom - top }));
        },

        drawData(samples, view) {
            // One path of zero-length round-capped segments: a dot per sample, one DOM node
            let d = "";
            for (let i = 0; i < samples.xs.length; i++) {
                d += `M${sx(samples.xs[i], view).toFixed(2)},${sy(samples.ys[i], view).toFixed(2)}h0`;
            }
            data_path.setAttribute("d", d);
        },

        drawCurve(f, view) {
            curve_path.setAttribute("d", f ? curvePath(f, view) : "");
        },

        drawTerms(terms, view) {
            terms_group.replaceChildren(...terms.map(term => svg("path", {
                class: "plot-curve",
                d: curvePath(term.f, view),
                stroke: term.color,
                "stroke-opacity": term.opacity,
            })));
        },

        toData(client_x, client_y, view) {
            const rect = root.getBoundingClientRect();
            const px = ((client_x - rect.left) / rect.width) * W;
            const py = ((client_y - rect.top) / rect.height) * H;
            if (px < PAD.left || px > W - PAD.right || py < PAD.top || py > H - PAD.bottom) return null;
            return {
                x: view.x0 + ((px - PAD.left) / (W - PAD.left - PAD.right)) * (view.x1 - view.x0),
                y: view.y0 + ((H - PAD.bottom - py) / (H - PAD.top - PAD.bottom)) * (view.y1 - view.y0),
            };
        },
    };
}

// ----------------------------------------------------------------------------
// Controls
// ----------------------------------------------------------------------------

function sliderRow(label: string): { row: HTMLDivElement; value: HTMLSpanElement } {
    const row = el("div", "control");
    const head = el("div", "control-head");
    const value = el("span", "control-value");
    head.append(el("span", "control-label", label), value);
    row.appendChild(head);
    return { row, value };
}

function Segmented<T extends string>(label: string, options: { value: T; text: string }[], on_pick: (value: T) => void) {
    const group = el("div", "segmented");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", label);
    const buttons = options.map(option => {
        const button = el("button", undefined, option.text);
        button.type = "button";
        button.onclick = () => on_pick(option.value);
        group.appendChild(button);
        return { value: option.value, button };
    });
    return {
        group,
        show(active: T) {
            for (const { value, button } of buttons) {
                button.classList.toggle("active", value === active);
                button.setAttribute("aria-pressed", String(value === active));
            }
        },
    };
}

function rangeInput(min: number, max: number, step: number, value: number): HTMLInputElement {
    const input = el("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    return input;
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export function Page(): HTMLElement {
    //// Scheduler: stages run in creation order within a flush
    const scheduler = Scheduler();
    const sample_s = scheduler.getOrCreate("sample");
    const fit_s = scheduler.getOrCreate("fit");
    const frame_s = scheduler.getOrCreate("frame");
    const render_s = scheduler.getOrCreate("render");

    //// Inputs
    const target = Observable<Target>(TARGETS[0]);
    const range = Observable<[number, number]>([0, 1]);
    const npoints = Observable(1000);
    const k = Observable(5);
    const basis = Observable<Basis>(BASES[0]);
    const fit_mode = Observable<FitMode>("combined");
    const weighting = Observable<Weighting>("range");
    const drawn = Observable<Samples>({ xs: [], ys: [] }); // painted points, mutated in place + trigger()
    const draw_y = Observable<[number, number]>([0, 1]); // vertical extent frozen while drawing

    //// Derived state
    const samples = Observable<Samples>({ xs: [], ys: [] });
    const view = Observable<View>({ x0: 0, x1: 1, y0: 0, y1: 1 });
    const fit = Observable<Fit>(fitBasis(BASES[0], [], [], 1, 0, 1));
    const fit_view = Observable<View>(view.value); // the fit plot's frame

    //// Layout
    const page = el("main", "fd-page");

    const header = el("header", "fd-header");
    const eyebrow = el("div", "eyebrow-row");
    eyebrow.append(el("span", "eyebrow-dot"), el("span", "eyebrow-text", "Functional decomposition"));
    const title = el("h1");
    header.append(
        eyebrow,
        title,
        el("p", "fd-lede", "The fit never sees the function, only the sampled points. It finds the coefficients of k basis functions (powers of x, Legendre polynomials, sines and cosines, splines, exponentials) that best match them in the least-squares sense."),
    );

    const panels = el("div", "fd-panels");

    // Left: data + true curve, function picker, range and npoints
    const left = el("section", "panel");
    const left_title = el("div", "panel-title panel-title-split");

    const target_select = el("select", "target-select");
    target_select.setAttribute("aria-label", "Function to fit");
    for (const t of TARGETS) {
        const option = el("option", undefined, t.label);
        option.value = t.id;
        target_select.appendChild(option);
    }

    const left_keys = el("div", "panel-keys");
    const true_key = legendKey("swatch-true", "");
    const true_label = true_key.lastElementChild as HTMLSpanElement;
    const data_key = legendKey("swatch-data", "");
    const data_label = data_key.lastElementChild as HTMLSpanElement;
    left_keys.append(data_key, true_key);
    left_title.append(el("span", "panel-name", "Samples"), target_select, left_keys);

    const left_plot = Plot("curve-true");
    const draw_hint = el("div", "draw-hint", "Hold the left mouse button and paint over the plot");
    const clear_button = el("button", "clear-button", "Clear");
    clear_button.type = "button";
    left_plot.frame.append(draw_hint, clear_button);

    const range_ctl = sliderRow("range");
    const range_track = el("div", "dual-range");
    const lo_input = rangeInput(RANGE_LIMITS.min, RANGE_LIMITS.max, RANGE_LIMITS.step, range.value[0]);
    const hi_input = rangeInput(RANGE_LIMITS.min, RANGE_LIMITS.max, RANGE_LIMITS.step, range.value[1]);
    const range_fill = el("div", "dual-range-fill");
    lo_input.setAttribute("aria-label", "Range start");
    hi_input.setAttribute("aria-label", "Range end");
    range_track.append(range_fill, lo_input, hi_input);
    range_ctl.row.appendChild(range_track);

    const npoints_ctl = sliderRow("npoints");
    const npoints_input = rangeInput(NPOINTS_LIMITS.min, NPOINTS_LIMITS.max, 1, npoints.value);
    npoints_input.setAttribute("aria-label", "Number of points");
    npoints_ctl.row.appendChild(npoints_input);

    const left_controls = el("div", "controls");
    left_controls.append(range_ctl.row, npoints_ctl.row);
    left.append(left_title, left_plot.frame, left_controls);

    // Right: data + fitted curve with legend, k
    const right = el("section", "panel");
    const right_title = el("div", "panel-title panel-title-split");

    const basis_select = el("select", "target-select");
    basis_select.setAttribute("aria-label", "Basis to decompose onto");
    for (const b of BASES) {
        const option = el("option", undefined, b.label);
        option.value = b.id;
        basis_select.appendChild(option);
    }

    const mode_toggle = Segmented<FitMode>("Fit view", [
        { value: "combined", text: "combined" },
        { value: "decomposed", text: "decomposed" },
    ], mode => { fit_mode.value = mode; });
    right_title.append(el("span", "panel-name", "Fit"), basis_select, mode_toggle.group);
    const right_plot = Plot("curve-fit");

    const legend = el("div", "legend");
    const legend_keys = el("div", "legend-keys");
    const legend_data_key = legendKey("swatch-data", "");
    const legend_data_label = legend_data_key.lastElementChild as HTMLSpanElement;
    const legend_fit_key = legendKey("swatch-fit", "");
    const legend_fit_label = legend_fit_key.lastElementChild as HTMLSpanElement;
    const legend_fit_swatch = legend_fit_key.firstElementChild as HTMLSpanElement;
    legend_keys.append(legend_data_key, legend_fit_key);
    const legend_formula = el("div", "legend-formula");
    const legend_note = el("div", "legend-note");
    const legend_coeffs = el("div", "legend-coeffs");
    const legend_error = el("div", "legend-error");
    legend.append(legend_keys, legend_formula, legend_note, legend_coeffs, legend_error);
    right_plot.frame.appendChild(legend);

    const k_ctl = sliderRow("k (terms)");
    const k_input = rangeInput(K_LIMITS.min, K_LIMITS.max, 1, k.value);
    k_input.setAttribute("aria-label", "Number of terms");
    k_ctl.row.appendChild(k_input);

    const weighting_ctl = sliderRow("term opacity");
    const weighting_toggle = Segmented<Weighting>("Term opacity", [
        { value: "range", text: "max |cᵢφᵢ| over range" },
        { value: "coefficient", text: "|cᵢ|" },
    ], w => { weighting.value = w; });
    weighting_ctl.row.appendChild(weighting_toggle.group);

    const right_controls = el("div", "controls");
    right_controls.append(k_ctl.row, weighting_ctl.row);
    right.append(right_title, right_plot.frame, right_controls);

    panels.append(left, right);
    page.append(header, panels);

    //// Pipeline

    // Stage 1: gather the samples and frame both plots around them. Auto deps
    // follow the mode: a function tracks npoints, draw mode tracks the painting.
    Reactor(() => {
        const [lo, hi] = range.value;
        const fn = target.value.fn;

        if (!fn) {
            // Draw mode: the painted points inside the range, on a frozen vertical scale
            const { xs: all_xs, ys: all_ys } = drawn.value;
            const xs: number[] = [];
            const ys: number[] = [];
            for (let i = 0; i < all_xs.length; i++) {
                if (all_xs[i] >= lo && all_xs[i] <= hi) {
                    xs.push(all_xs[i]);
                    ys.push(all_ys[i]);
                }
            }
            const [y0, y1] = draw_y.value;
            samples.value = { xs, ys };
            view.value = { x0: lo, x1: hi, y0, y1 };
            return;
        }

        // Function mode: evenly spaced samples, dropping points outside its domain
        const xs: number[] = [];
        const ys: number[] = [];
        for (const x of linspace(lo, hi, npoints.value)) {
            const y = fn(x);
            if (Number.isFinite(y)) {
                xs.push(x);
                ys.push(y);
            }
        }

        const [y_min, y_max] = yBounds(ys) ?? [-1, 1];
        const y_pad = (y_max - y_min) * 0.08 || Math.abs(y_max) * 0.1 || 1;

        samples.value = { xs, ys };
        view.value = { x0: lo, x1: hi, y0: y_min - y_pad, y1: y_max + y_pad };
    }, { reaction_schedule: sample_s });

    // Stage 2: decompose the samples onto the first k functions of the basis
    Reactor(() => {
        const { xs, ys } = samples.value;
        const [a, b] = range.value;
        fit.value = fitBasis(basis.value, xs, ys, k.value, a, b);
    }, { reaction_schedule: fit_s });

    // Stage 3: frame the fit plot. Combined shares the samples' frame; decomposed
    // widens it vertically to take in every term over the range
    Reactor(() => {
        const v = view.value;
        let next = v;
        if (fit_mode.value === "decomposed") {
            let y0 = v.y0;
            let y1 = v.y1;
            const f = fit.value;
            for (const term of termCurves(f, f.coeffs.map(() => 1))) {
                for (let i = 0; i <= 100; i++) {
                    const y = term.f(v.x0 + ((v.x1 - v.x0) * i) / 100);
                    y0 = Math.min(y0, y);
                    y1 = Math.max(y1, y);
                }
            }
            const pad = (y1 - y0) * 0.05;
            next = { ...v, y0: Math.min(v.y0, y0 - pad), y1: Math.max(v.y1, y1 + pad) };
        }
        // Only a real change re-frames, so a k change in combined mode leaves the data alone
        if (!sameView(next, fit_view.value)) fit_view.value = next;
    }, { reaction_schedule: frame_s });

    // Stage 4: render. Data layers track samples and frames; the fit layer also tracks coeffs
    Reactor(() => {
        const v = view.value;
        left_plot.drawAxes(v);
        left_plot.drawData(samples.value, v);
        left_plot.drawCurve(target.value.fn, v);
    }, { reaction_schedule: render_s });

    Reactor(() => {
        const v = fit_view.value;
        right_plot.drawAxes(v);
        right_plot.drawData(samples.value, v);
    }, { reaction_schedule: render_s });

    Reactor(() => {
        const f = fit.value;
        const c = f.coeffs;
        const v = fit_view.value;
        const decomposed = fit_mode.value === "decomposed";
        const { xs, ys } = samples.value;

        // Only decomposed mode reads `weighting`, so auto deps ignore it otherwise
        const weights = decomposed ? termWeights(f, weighting.value, v.x0, v.x1) : [];
        right_plot.drawCurve(decomposed ? null : f.evaluate, v);
        right_plot.drawTerms(decomposed ? termCurves(f, weights) : [], v);

        legend_data_label.textContent = `data (${xs.length} points)`;
        legend_fit_label.textContent = decomposed ? `terms cᵢφᵢ(x), k = ${c.length}` : `fit, k = ${c.length}`;
        legend_fit_swatch.classList.toggle("swatch-rainbow", decomposed);
        legend_formula.textContent = f.basis.formula(f.terms);
        const [a, b] = range.value;
        legend_note.hidden = !f.basis.uses_range;
        legend_note.textContent = `ξ = x − a,  L = b − a,  [a, b] = [${formatTick(a)}, ${formatTick(b)}]`;

        legend_coeffs.replaceChildren(...c.map((value, i) => {
            const row = el("div", "coeff");
            const name = el("span", "coeff-name");
            name.title = f.terms[i].label;
            if (decomposed) {
                const dot = el("span", "coeff-dot");
                dot.style.background = termColor(i, c.length);
                name.title += `, opacity ${(weights[i] * 100).toFixed(1)}%`;
                name.appendChild(dot);
            }
            name.append(f.terms[i].name);
            row.append(name, el("span", "coeff-value", formatCoeff(value)));
            return row;
        }));

        let sum_sq = 0;
        for (let j = 0; j < xs.length; j++) sum_sq += (f.evaluate(xs[j]) - ys[j]) ** 2;
        legend_error.textContent = xs.length === 0
            ? "RMS residual —"
            : `RMS residual ${formatCoeff(Math.sqrt(sum_sq / xs.length))}`;
    }, { reaction_schedule: render_s });

    // Mode-dependent chrome: title, legend keys, draw overlays, npoints availability
    Reactor(() => {
        const t = target.value;
        const drawing = t.fn === null;
        title.textContent = drawing ? "Recovering a hand-drawn curve from its points" : `Recovering ${t.label} from its samples`;
        target_select.value = t.id;
        true_key.hidden = drawing;
        true_label.textContent = `true ${t.label}`;
        data_label.textContent = drawing ? "drawn" : "data";
        left_plot.frame.classList.toggle("drawing", drawing);
        clear_button.hidden = !drawing;
        npoints_input.disabled = drawing;
    }, { reaction_schedule: render_s });

    Reactor(() => {
        draw_hint.hidden = target.value.fn !== null || drawn.value.xs.length > 0;
    }, { reaction_schedule: render_s });

    // Controls reflect the inputs (also keeps both range thumbs in sync after clamping)
    Reactor(() => {
        const [lo, hi] = range.value;
        lo_input.value = String(lo);
        hi_input.value = String(hi);
        const span = RANGE_LIMITS.max - RANGE_LIMITS.min;
        range_fill.style.left = `${((lo - RANGE_LIMITS.min) / span) * 100}%`;
        range_fill.style.right = `${((RANGE_LIMITS.max - hi) / span) * 100}%`;
        range_ctl.value.textContent = `[${lo.toFixed(2)}, ${hi.toFixed(2)}]`;
    }, { reaction_schedule: render_s });

    Reactor(() => {
        npoints_ctl.value.textContent = target.value.fn
            ? String(npoints.value)
            : `${samples.value.xs.length} drawn`;
    }, { reaction_schedule: render_s });
    Reactor(() => { k_ctl.value.textContent = String(k.value); }, { reaction_schedule: render_s });
    Reactor(() => {
        mode_toggle.show(fit_mode.value);
        weighting_ctl.row.hidden = fit_mode.value !== "decomposed";
    }, { reaction_schedule: render_s });
    Reactor(() => { weighting_toggle.show(weighting.value); }, { reaction_schedule: render_s });
    Reactor(() => { basis_select.value = basis.value.id; }, { reaction_schedule: render_s });

    //// Event handlers: pure state writes
    target_select.onchange = () => {
        const next = TARGETS.find(t => t.id === target_select.value) ?? TARGETS[0];
        // Entering draw mode keeps the current vertical scale as the canvas
        if (next.fn === null) draw_y.value = [view.value.y0, view.value.y1];
        target.value = next;
    };
    lo_input.oninput = () => {
        const hi = range.value[1];
        range.value = [Math.min(Number(lo_input.value), hi - RANGE_LIMITS.min_gap), hi];
    };
    hi_input.oninput = () => {
        const lo = range.value[0];
        range.value = [lo, Math.max(Number(hi_input.value), lo + RANGE_LIMITS.min_gap)];
    };
    basis_select.onchange = () => {
        basis.value = BASES.find(b => b.id === basis_select.value) ?? BASES[0];
    };
    npoints_input.oninput = () => { npoints.value = Number(npoints_input.value); };
    k_input.oninput = () => { k.value = Number(k_input.value); };

    clear_button.onclick = () => { drawn.value = { xs: [], ys: [] }; };

    //// Painting: while the left button is held, sample the pointer every DRAW_DT_MS
    let pointer: { x: number; y: number } | null = null; // latest client position
    let last_sampled: { x: number; y: number } | null = null;
    let timer = 0;

    function samplePointer() {
        if (!pointer || (last_sampled && last_sampled.x === pointer.x && last_sampled.y === pointer.y)) return;
        last_sampled = pointer;
        const p = left_plot.toData(pointer.x, pointer.y, view.value);
        if (!p) return;
        drawn.value.xs.push(p.x);
        drawn.value.ys.push(p.y);
        drawn.trigger();
    }

    function stopPainting() {
        clearInterval(timer);
        timer = 0;
        pointer = last_sampled = null;
    }

    left_plot.frame.addEventListener("pointerdown", event => {
        if (target.value.fn !== null || event.button !== 0 || event.target === clear_button) return;
        event.preventDefault();
        left_plot.frame.setPointerCapture(event.pointerId);
        pointer = { x: event.clientX, y: event.clientY };
        samplePointer();
        timer = window.setInterval(samplePointer, DRAW_DT_MS);
    });
    left_plot.frame.addEventListener("pointermove", event => {
        if (timer) pointer = { x: event.clientX, y: event.clientY };
    });
    left_plot.frame.addEventListener("pointerup", stopPainting);
    left_plot.frame.addEventListener("pointercancel", stopPainting);

    return page;
}

function legendKey(swatch_class: string, label: string): HTMLSpanElement {
    const key = el("span", "legend-key");
    key.append(el("span", `swatch ${swatch_class}`), el("span", undefined, label));
    return key;
}
