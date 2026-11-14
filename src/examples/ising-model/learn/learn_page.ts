// learn_page.ts
//
// "How it works": a short history of the Ising model and the ideas behind
// the simulation, each with a live figure (see figures.ts). Built the first
// time it is opened; its figures run only while it is showing.

import type { Observable } from "../../../core/index";
import { CriticalCurve, IsingChain, Neighbourhood, SingleSpin, ThreeTemperatures } from "./figures.ts";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html) node.innerHTML = html;
    return node;
}

export function LearnPage(active: Observable<boolean>): HTMLElement {
    const page = el("main", "is-learn-page");
    page.innerHTML = `
      <nav class="is-back"><a href="#">← Back to the simulation</a></nav>

      <header class="is-hero">
        <p class="is-kicker">How it works</p>
        <h1>The Ising model</h1>
        <p class="is-lede">A grid of tiny magnets, each pointing up or down, each wanting to agree with its neighbours, and a temperature that keeps shaking them. That is the whole model. It is about as simple as physics gets, and it still reproduces one of nature's most striking events: a material suddenly becoming a magnet as it cools.</p>
      </header>

      <section>
        <h2>A brief history</h2>
        <ol class="is-timeline">
          <li><b>1920</b> Wilhelm Lenz proposes the model as a crude picture of a ferromagnet, such as iron, and gives it to his student.</li>
          <li><b>1924</b> Ernst Ising solves the one-dimensional chain for his thesis. It never magnetizes on its own at any temperature, and he guesses, wrongly, that no version of the model would.</li>
          <li><b>1936</b> Rudolf Peierls argues that in two dimensions it must order when cold: the energy cost of a domain's border grows with its length.</li>
          <li><b>1941</b> Hendrik Kramers and Gregory Wannier find the exact critical temperature of the square lattice, using a symmetry between its hot and cold sides.</li>
          <li><b>1944</b> Lars Onsager solves the two-dimensional model exactly, a landmark of mathematical physics. Chen-Ning Yang derives its magnetization in 1952.</li>
          <li><b>1953</b> Nicholas Metropolis and colleagues publish the sampling method this page runs, invented to simulate matter on one of the first computers.</li>
          <li><b>Since</b> the same model describes alloys, gases near their critical point, neural networks (Hopfield, Boltzmann machines), and even opinions spreading through a crowd.</li>
        </ol>
      </section>

      <section>
        <h2>1 · Spins that like to agree</h2>
        <p>Each site <i>i</i> of the lattice holds a spin \\(s_i\\) that is either \\(+1\\) (up) or \\(-1\\) (down). The energy of an arrangement counts disagreements between neighbours, and an outside field <i>h</i> can favour one direction:</p>
        <div class="is-math">\\[ E = -J \\sum_{\\langle i j \\rangle} s_i\\, s_j \\;-\\; h \\sum_i s_i \\]</div>
        <p>The first sum runs over neighbouring pairs. A pair that agrees lowers the energy by <i>J</i>; one that disagrees raises it. Left alone, the lowest energy is every spin pointing the same way. Flipping one spin changes the energy only through its four neighbours:</p>
        <div class="is-math">\\[ \\Delta E = 2\\, s_i \\Big( J \\sum_{j \\,\\text{next to}\\, i} s_j + h \\Big) \\]</div>
        <p>Everything on this page uses \\(J = 1\\) and measures temperature in the same units (Boltzmann's constant set to 1).</p>
      </section>

      <section>
        <h2>2 · Temperature sets the odds</h2>
        <p>If energy were all that mattered, every spin would agree and nothing would happen. Heat is constant jostling, and it makes higher-energy arrangements possible, just less likely. Boltzmann's rule gives the odds: a state with energy <i>E</i> turns up with probability proportional to</p>
        <div class="is-math">\\[ P \\propto e^{-E / T} \\]</div>
        <p>A single spin in a field is the simplest case: up has energy \\(-h\\), down \\(+h\\). Cold, it nearly always points up; hot, it is close to a coin toss.</p>
        <div data-fig="single"></div>
      </section>

      <section>
        <h2>3 · The Markov step</h2>
        <p>A grid of 128 × 128 spins has \\(2^{16384}\\) arrangements, far too many to weigh one by one. The simulation never tries. It takes small random steps, each depending only on the current state (a Markov chain), designed so that, run long enough, it visits arrangements with exactly Boltzmann's odds:</p>
        <ol class="is-steps">
          <li>Pick a spin at random.</li>
          <li>Work out \\(\\Delta E\\), the energy cost of flipping it.</li>
          <li>Flip it with probability \\(p\\); otherwise leave it.</li>
        </ol>
        <p>Two rules for \\(p\\) are common, and both give the right odds in the long run:</p>
        <div class="is-math">\\[ p_{\\text{Metropolis}} = \\min\\!\\big(1,\\ e^{-\\Delta E / T}\\big) \\qquad p_{\\text{heat bath}} = \\frac{1}{1 + e^{\\Delta E / T}} \\]</div>
        <p>Metropolis always accepts a flip that lowers the energy; heat bath sometimes refuses even those, which makes it a little slower but smoother. Why it works: each rule makes the flow from any state <i>A</i> to <i>B</i> balance the flow back (<i>detailed balance</i>), and the only distribution that stays put under that is Boltzmann's. One <b>sweep</b> is as many attempts as there are spins.</p>
        <div data-fig="hood"></div>
      </section>

      <section>
        <h2>4 · What it does</h2>
        <p>Start from noise and let it run. Cold, neighbours win: patches of agreement (domains) form, and their borders straighten and shrink until one direction takes over. Hot, the jostling wins and the lattice stays speckled. In between there is a single temperature where neither wins, and the lattice fills with clusters inside clusters, at every size.</p>
        <div data-fig="three"></div>
      </section>

      <section>
        <h2>5 · The critical temperature</h2>
        <p>The order is measured by the <b>magnetization</b>, the average spin \\(m = \\tfrac{1}{N}\\sum_i s_i\\): \\(\\pm1\\) when all agree, near 0 for noise. Onsager's solution pins down exactly where order is lost on the square lattice:</p>
        <div class="is-math">\\[ T_c = \\frac{2J}{\\ln\\!\\big(1 + \\sqrt{2}\\big)} \\approx 2.269 \\]</div>
        <p>and Yang's result gives the magnetization below it, which falls to zero with a vertical slope at \\(T_c\\):</p>
        <div class="is-math">\\[ |m| = \\Big(1 - \\sinh^{-4}\\!\\big(2J/T\\big)\\Big)^{1/8} \\quad (T < T_c), \\qquad m = 0 \\quad (T > T_c) \\]</div>
        <div data-fig="curve"></div>
        <p>None of this happens in one dimension. That was Ising's own result, and the chain below shows why. A single break, where up meets down, costs a fixed amount of energy, yet it can sit anywhere. Above zero temperature breaks keep forming and drifting, so the chain never stays ordered. In two dimensions a border costs energy for every unit of its length, so cold lattices squeeze borders out.</p>
        <div data-fig="chain"></div>
      </section>

      <section>
        <h2>6 · Why it matters</h2>
        <p>Near \\(T_c\\) the details stop mattering. The way the magnetization vanishes, how far disturbances spread, how fluctuations grow: these follow power laws whose exponents (here \\(m \\propto (T_c - T)^{1/8}\\)) are the same for every system with the same dimension and symmetry. This is <b>universality</b>. A liquid and its vapour at their critical point, a mixing alloy, and this grid of arrows share the same numbers. That is why a toy model of magnets became one of the most studied objects in physics.</p>
        <p class="is-more">Further reading: <a href="https://en.wikipedia.org/wiki/Ising_model" target="_blank" rel="noopener">Ising model</a> · <a href="https://en.wikipedia.org/wiki/Metropolis%E2%80%93Hastings_algorithm" target="_blank" rel="noopener">Metropolis–Hastings</a> · <a href="https://en.wikipedia.org/wiki/Square_lattice_Ising_model" target="_blank" rel="noopener">Onsager's solution</a> · <a href="https://en.wikipedia.org/wiki/Universality_(dynamical_systems)" target="_blank" rel="noopener">Universality</a></p>
      </section>

      <nav class="is-back is-back-end"><a href="#">← Back to the simulation</a></nav>`;

    const figures: Record<string, (a: Observable<boolean>) => HTMLElement> = {
        single: SingleSpin, hood: Neighbourhood, three: ThreeTemperatures, curve: CriticalCurve, chain: IsingChain,
    };
    page.querySelectorAll<HTMLElement>("[data-fig]").forEach(slot => slot.replaceWith(figures[slot.dataset.fig!](active)));
    return page;
}

//// MathJax, loaded once, typesetting the page when ready

let mathjax_requested = false;
export function typeset(node: HTMLElement): void {
    const mj = (window as any).MathJax;
    if (mj?.typesetPromise) { mj.typesetPromise([node]).catch(() => { }); return; }
    if (mathjax_requested) return;
    mathjax_requested = true;
    (window as any).MathJax = {
        tex: { inlineMath: [["\\(", "\\)"]] },
        svg: { fontCache: "global" },
        startup: {
            typeset: false,
            ready() {
                const m = (window as any).MathJax;
                m.startup.defaultReady();
                m.startup.promise.then(() => m.typesetPromise([node]).catch(() => { }));
            },
        },
    };
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.js";
    script.async = true;
    document.head.append(script);
}
