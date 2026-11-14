// thermometer.ts
//
// The temperature scale, overlaid on the lattice, and also the temperature
// control: drag anywhere on the tube, or focus it and use the arrow keys
// (shift for big steps), Home / End, or C to jump to the critical point.
//
// The mercury follows `temperature`. Its color is the phase: Hubble blue
// below T_c (ordered), Hubble orange above (disordered). T_c is marked.

import { Observable, Reactor } from "../../../core/index";
import { T_CRITICAL } from "../ising.ts";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

export function Thermometer(temperature: Observable<number>, t_max: number): HTMLElement {
    const root = document.createElement("div");
    root.className = "is-thermo";
    root.innerHTML = `
      <div class="is-thermo-scale" aria-hidden="true">
        ${Array.from({ length: t_max + 1 }, (_, t) => `<span style="bottom:${(t / t_max) * 100}%">${t}</span>`).join("")}
      </div>
      <div class="is-thermo-glass" role="slider" tabindex="0" aria-label="Temperature" aria-valuemin="0" aria-valuemax="${t_max}">
        <div class="is-thermo-tube">
          <div class="is-thermo-mercury"></div>
          <button class="is-thermo-tc" style="bottom:${(T_CRITICAL / t_max) * 100}%" tabindex="-1" title="Jump to the critical temperature (C)">
            <i></i><span>T<sub>c</sub> ${T_CRITICAL.toFixed(3)}</span>
          </button>
          <output class="is-thermo-reading"></output>
        </div>
        <div class="is-thermo-bulb"></div>
      </div>
      <div class="is-thermo-phase" aria-hidden="true"><span class="hot">disordered</span><span class="cold">ordered</span></div>`;

    const glass = root.querySelector<HTMLElement>(".is-thermo-glass")!;
    const tube = root.querySelector<HTMLElement>(".is-thermo-tube")!;
    const reading = root.querySelector<HTMLElement>(".is-thermo-reading")!;

    Reactor(() => {
        const T = temperature.value, f = clamp(T / t_max, 0, 1);
        root.style.setProperty("--level", `${f * 100}%`);
        reading.textContent = T.toFixed(2);
        root.classList.toggle("is-ordered", T < T_CRITICAL);
        glass.setAttribute("aria-valuenow", T.toFixed(2));
        glass.setAttribute("aria-valuetext", `${T.toFixed(2)}, ${T < T_CRITICAL ? "below" : "above"} the critical temperature`);
    });

    // drag: the tube's height maps to 0 … t_max
    const setFromY = (clientY: number) => {
        const r = tube.getBoundingClientRect();
        temperature.value = round2(clamp((r.bottom - clientY) / r.height, 0, 1) * t_max);
    };
    glass.addEventListener("pointerdown", e => {
        if ((e.target as HTMLElement).closest(".is-thermo-tc")) return;
        glass.setPointerCapture(e.pointerId);
        root.classList.add("is-dragging");
        setFromY(e.clientY);
    });
    glass.addEventListener("pointermove", e => { if (glass.hasPointerCapture(e.pointerId)) setFromY(e.clientY); });
    const end = () => root.classList.remove("is-dragging");
    glass.addEventListener("pointerup", end);
    glass.addEventListener("pointercancel", end);
    glass.style.touchAction = "none";

    root.querySelector(".is-thermo-tc")!.addEventListener("click", () => temperature.value = round2(T_CRITICAL));

    glass.addEventListener("keydown", e => {
        const step = e.shiftKey ? 0.5 : 0.05;
        const moves: Record<string, () => number> = {
            ArrowUp: () => temperature._value + step, ArrowRight: () => temperature._value + step,
            ArrowDown: () => temperature._value - step, ArrowLeft: () => temperature._value - step,
            PageUp: () => temperature._value + 0.5, PageDown: () => temperature._value - 0.5,
            Home: () => 0, End: () => t_max, c: () => T_CRITICAL, C: () => T_CRITICAL,
        };
        const move = moves[e.key];
        if (!move) return;
        e.preventDefault();
        e.stopPropagation();
        temperature.value = round2(clamp(move(), 0, t_max));
    });

    return root;
}
