// main.ts
//
// Ising Model: a live, zoomable lattice of spins, and a page explaining it.
//
//   route (the URL hash) ──► sim_active / learn_active ──► which page shows
//
// The simulation is built once and kept: leaving it pauses its frame loop,
// and coming back resumes the same lattice. The explainer is built the first
// time it is opened; its figures run only while it shows.
//
//   ising.ts            the physics: lattice, energy, Metropolis / heat bath
//   theme.ts            the Hubble palette as an Observable, for the canvases
//   canvas/sprites.ts   what a spin looks like at each zoom, and its flip
//   canvas/lattice_layer.ts  a Layer (from Pan & Zoom) that paints a lattice
//   sim/                the simulation: state, page, thermometer
//   learn/              the explainer and its live figures
//
// The pan, zoom and painting come from the Pan & Zoom example
// (../pan-zoom/camera.ts and layer.ts).

import { Observable, Reactor } from "../../core/index";
import "./ising.css";
import { SimPage } from "./sim/sim_page.ts";
import { LearnPage, typeset } from "./learn/learn_page.ts";

const routeFromHash = () => (location.hash.slice(1) === "learn" ? "learn" : "sim");
const route = Observable<"sim" | "learn">(routeFromHash());
window.addEventListener("hashchange", () => route.value = routeFromHash());

const sim_active = Observable(route._value === "sim");
const learn_active = Observable(route._value === "learn");

const sim = SimPage(sim_active);
let learn: HTMLElement | null = null;

Reactor(() => {
    const r = route.value;
    sim_active.value = r === "sim";
    learn_active.value = r === "learn";
    document.body.dataset.page = r;
    sim.hidden = r !== "sim";
    if (r === "learn") {
        if (!learn) {
            learn = LearnPage(learn_active);
            document.body.append(learn);
            typeset(learn);
        }
        learn.hidden = false;
        window.scrollTo(0, 0);
    } else if (learn) {
        learn.hidden = true;
    }
}, { deps: [route], initFn: true });
