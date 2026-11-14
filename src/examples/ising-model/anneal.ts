// anneal.ts
//
// Annealing: move the temperature slowly, so the lattice can keep up.
// Cooled slowly, a lattice orders into a few large domains; quenched at once,
// it freezes into many. Used by the simulation and by the critical-curve
// figure, each with its own schedule.
//
//   on, direction, speed ──► advance(sweeps) ──► temperature
//                                 │
//                                 └──► heading (↓ cooling / ↑ heating)
//
// The rate is per sweep, not per second, so it stays slow relative to the
// physics at any simulation speed.
//
//   cool   from the current temperature down to `cold`, then stop
//   heat   from the current temperature up to `hot`, then stop
//   auto   back and forth between the two, until switched off (the default)
//
// Switching on never jumps, unless there is nowhere to go: cooling from
// `cold` restarts at `hot`, heating from `hot` restarts at `cold`.

import { Observable, Reactor } from "../../core/index";

export type AnnealDirection = "cool" | "heat" | "auto";
export type AnnealSpeed = "slow" | "slower" | "slowest";

export const ANNEAL_SPEEDS: Record<AnnealSpeed, number> = { slow: 1, slower: 0.5, slowest: 0.25 };

export interface AnnealSchedule {
    hot: number;       // the top of the range
    cold: number;      // the bottom of the range
    per_sweep: number; // temperature change per sweep, at speed "slow"
}

export interface Annealer {
    on: Observable<boolean>;
    direction: Observable<AnnealDirection>;
    speed: Observable<AnnealSpeed>;
    heading: Observable<-1 | 1>; // which way the temperature is moving now
    schedule: AnnealSchedule;
    advance(sweeps: number): void; // call once per frame with the sweeps just run
}

export function Annealer(temperature: Observable<number>, schedule: AnnealSchedule): Annealer {
    const self: Annealer = {
        on: Observable(false),
        direction: Observable<AnnealDirection>("auto"),
        speed: Observable<AnnealSpeed>("slow"),
        heading: Observable<-1 | 1>(-1),
        schedule,

        advance(sweeps) {
            if (!self.on._value) return;
            const { hot, cold, per_sweep } = self.schedule;
            let T = temperature._value + self.heading._value * per_sweep * ANNEAL_SPEEDS[self.speed._value] * sweeps;
            const auto = self.direction._value === "auto";
            if (T <= cold) { T = cold; if (auto) self.heading.value = 1; else self.on.value = false; }
            else if (T >= hot) { T = hot; if (auto) self.heading.value = -1; else self.on.value = false; }
            temperature.value = T;
        },
    };

    // choose the heading for a direction, from where the temperature is now
    function aim(): void {
        const T = temperature._value, { hot, cold } = self.schedule, d = self.direction._value;
        if (d === "cool") {
            self.heading.value = -1;
            if (self.on._value && T <= cold + 1e-9) temperature.value = hot;
        } else if (d === "heat") {
            self.heading.value = 1;
            if (self.on._value && T >= hot - 1e-9) temperature.value = cold;
        } else {
            self.heading.value = T > (hot + cold) / 2 ? -1 : 1;
        }
    }

    Reactor(() => { if (self.on.value) aim(); }, { deps: [self.on] });
    Reactor(aim, { deps: [self.direction] });
    return self;
}
