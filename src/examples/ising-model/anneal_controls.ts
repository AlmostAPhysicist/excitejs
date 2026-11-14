// anneal_controls.ts
//
// The annealing panel, used by the simulation and the critical-curve figure:
//
//   [ Anneal slowly ]  cooling ↓
//   direction  Cool ↓ · Heat ↑ · Auto ↕
//   speed      Slow · Slower · Slowest
//
// Every part is bound to the Annealer's Observables, so the panel, the
// keyboard and the annealer itself always agree.

import { Reactor } from "../../core/index";
import { ANNEAL_SPEEDS, type AnnealDirection, type AnnealSpeed, type Annealer } from "./anneal.ts";

// sweeps_per_second, if given, turns the pass length into seconds; read with
// .value inside it, it also keeps that estimate current
export function AnnealControls(anneal: Annealer, sweeps_per_second?: () => number): HTMLElement {
    const root = document.createElement("div");
    root.className = "is-anneal";
    root.innerHTML = `
      <div class="is-anneal-head">
        <button data-anneal="toggle" title="Move the temperature slowly (A)">Anneal slowly</button>
        <span class="is-anneal-status" aria-live="polite"></span>
      </div>
      <div class="is-anneal-opt" role="group" aria-label="Annealing direction">
        <span>direction</span>
        <button data-dir="cool" title="Cool down to ${anneal.schedule.cold}, then stop">Cool ↓</button>
        <button data-dir="heat" title="Heat up to ${anneal.schedule.hot}, then stop">Heat ↑</button>
        <button data-dir="auto" title="Back and forth between ${anneal.schedule.cold} and ${anneal.schedule.hot}">Auto ↕</button>
      </div>
      <div class="is-anneal-opt" role="group" aria-label="Annealing speed">
        <span>speed</span>
        <button data-speed="slow">Slow</button><button data-speed="slower">Slower</button><button data-speed="slowest">Slowest</button>
      </div>`;

    const toggle = root.querySelector<HTMLButtonElement>('[data-anneal="toggle"]')!;
    const status = root.querySelector<HTMLElement>(".is-anneal-status")!;

    root.addEventListener("click", e => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
        if (!b) return;
        if (b.dataset.anneal) anneal.on.value = !anneal.on._value;
        else if (b.dataset.dir) anneal.direction.value = b.dataset.dir as AnnealDirection;
        else if (b.dataset.speed) anneal.speed.value = b.dataset.speed as AnnealSpeed;
    });

    Reactor(() => {
        const on = anneal.on.value, heading = anneal.heading.value;
        toggle.setAttribute("aria-pressed", String(on));
        root.classList.toggle("is-on", on);
        if (on) { status.textContent = heading < 0 ? "cooling ↓" : "heating ↑"; return; }
        const { hot, cold, per_sweep } = anneal.schedule;
        const factor = ANNEAL_SPEEDS[anneal.speed.value];
        const sweeps = (hot - cold) / (per_sweep * factor);
        const rate = sweeps_per_second?.();
        status.textContent = rate ? `${cold} ↔ ${hot}, ≈ ${Math.round(sweeps / rate)} s a pass` : `${cold} ↔ ${hot}, ${Math.round(sweeps)} sweeps a pass`;
    });
    Reactor(() => {
        const d = anneal.direction.value;
        root.querySelectorAll<HTMLButtonElement>("[data-dir]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.dir === d)));
    });
    Reactor(() => {
        const s = anneal.speed.value;
        root.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.speed === s)));
    });
    return root;
}
