// state.ts
//
// The simulation's state as Observables, and the actions that change it.
// No DOM here: the page, the overlay controls and the thermometer all read
// and write this one object.
//
//   temperature, field, rule ──► [physics] acceptance table
//   size_index ──► new lattice (lattice.value)
//   advance(now) ──► step ──► tick (+ history)
//   anneal (see anneal.ts) ──► advance moves temperature a little each frame

import { Observable, Reactor, Scheduler } from "../../../core/index";
import { Lattice, acceptanceTable, fillLattice, magnetization, step, type Rule } from "../ising.ts";
import { Annealer, type AnnealSchedule } from "../anneal.ts";

export const T_MAX = 5;
export const SIZES = [32, 64, 96, 128, 192, 256, 384, 512];
export const HISTORY = 240;
// Between hot (above T_c) and cold: one pass is 1500 sweeps at "slow",
// about a minute and a half at the default simulation speed
export const ANNEAL: AnnealSchedule = { hot: 3.5, cold: 0.5, per_sweep: 0.002 };

// Speed slider position 0…1 → sweeps per frame, 0.001…10 on a log scale
export const sweepsPerFrame = (speed: number) => Math.pow(10, -3 + 4 * speed);

export type SimState = ReturnType<typeof SimState>;

export function SimState() {
    const temperature = Observable(1.9);
    const field = Observable(0);
    const speed = Observable(0.62);
    const size_index = Observable(3); // 128²
    const rule = Observable<Rule>("metropolis");
    const running = Observable(true);
    const lattice = Observable(Lattice(SIZES[size_index._value]));
    const tick = Observable(0);     // the spins changed
    const history: number[] = [];   // recent magnetization, for the sparkline
    let now = performance.now();    // the clock flips are stamped with
    let animate_until = 0;

    const scheduler = Scheduler();
    const physics_s = scheduler.getOrCreate("physics");
    const render_s = scheduler.getOrCreate("render");

    let table = acceptanceTable(temperature._value, field._value, rule._value);
    Reactor(() => {
        table = acceptanceTable(temperature.value, field.value, rule.value);
    }, { reaction_schedule: physics_s });

    Reactor(() => {
        lattice.value = Lattice(SIZES[size_index.value]);
        history.length = 0;
    }, { deps: [size_index] });

    const anneal = Annealer(temperature, ANNEAL);
    // annealing needs the simulation running
    Reactor(() => { if (anneal.on.value) running.value = true; }, { deps: [anneal.on] });

    function record(): void {
        history.push(magnetization(lattice._value));
        if (history.length > HISTORY) history.shift();
    }

    return {
        temperature, field, speed, size_index, rule, running, anneal, lattice, tick, history,
        scheduler, render_s,
        clock: () => now,

        // One animation frame: step if running, keep ticking while arrows turn
        advance(time: number): void {
            now = time;
            if (running._value) {
                const sweeps = sweepsPerFrame(speed._value);
                step(lattice._value, sweeps, table, now);
                anneal.advance(sweeps);
                record();
                tick.value++;
            } else if (now < animate_until) {
                tick.value++;
            }
        },

        // Exactly one sweep (n² attempts), then pause to look at it
        singleStep(): void {
            running.value = false;
            now = performance.now();
            step(lattice._value, 1, table, now);
            record();
            animate_until = now + 400;
            tick.value++;
        },

        fill(mode: "random" | "up" | "down"): void {
            fillLattice(lattice._value, mode);
            history.length = 0;
            tick.value++;
        },
    };
}
