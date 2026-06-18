// reactor.ts
import { setActiveReactor } from "./context";
import type { Schedule } from "./scheduler";
import type { Observable } from "./observable";

/**
 * A reactive listener that runs an reaction upon change in its dependency observables.
 * ```typescript
 * const a = Observable(0);
 * let b = 0;
 * let r = Reactor(
 *     () => { b += a.value; console.log(b); }, 
 *     {[a]}
 * );
 * a.value = 1; // logs "1"
 * r.dispose();
 * a.value = 2; // does not log anything
 * ```
 */
export interface Reactor {
    // Structural Data
    observables: Set<Observable<any>>;
    reaction: () => any;
    preaction?: () => any;
    initFn?: () => any;

    // Configuration Flags
    auto_deps: boolean; // tracks dependencies automatically if true
    auto_preaction: boolean; // sets the preaction function to the output of the reaction function if true
    paused: boolean; // global pause flag for the self
    reaction_paused: boolean; // pause flag for the reaction function
    preaction_paused: boolean; // pause flag for the preaction function

    // Governance Schedulers
    reaction_schedule: Schedule | null;
    preaction_schedule: Schedule | null;

    // Execution Controls
    detachObservables(): void;
    schedule(): void;
    react(): void;
    preact(): void;
    dispose(): void;
}

export function Reactor(
    reaction: () => any,
    options: {
        deps?: Observable<any>[] | null;
        initFn?: boolean | (() => any) | null;
        preaction?: () => any;
        auto_deps?: boolean;
        auto_preaction?: boolean;
        paused?: boolean;
        reaction_paused?: boolean;
        preaction_paused?: boolean;
        reaction_schedule?: Schedule | null;
        preaction_schedule?: Schedule | null;
    } = {}
): Reactor {


    const auto_deps = options.auto_deps ?? !options.deps;

    let initFn: (() => any) | undefined = undefined;
    if (typeof options.initFn === "function") {
        initFn = options.initFn;
    } else if (options.initFn === true || (auto_deps && options.initFn !== false)) {
        initFn = reaction;
    }

    // CORE REACTOR LITERAL LOGIC:
    const self: Reactor = {
        // Structural Data
        observables: new Set<Observable<any>>(),
        reaction: reaction,
        preaction: options.preaction,
        initFn: initFn,

        // Configuration Flags & State
        auto_deps: auto_deps,
        auto_preaction: options.auto_preaction ?? true,
        paused: options.paused ?? false,
        reaction_paused: options.reaction_paused ?? false,
        preaction_paused: options.preaction_paused ?? false,

        // Governance Schedulers
        reaction_schedule: options.reaction_schedule ?? null,
        preaction_schedule: options.preaction_schedule ?? null,


        // Methods
        detachObservables() {
            for (const dep of self.observables) {
                dep.reactors.delete(self);
            }
            self.observables.clear();
        },

        schedule() {
            if (self.paused) return;

            // Route Preaction
            if (self.preaction_schedule) {
                self.preaction_schedule.tasks.add(self.preact);
            } else {
                self.preact();
            }

            // Route Reaction
            if (self.reaction_schedule) {
                self.reaction_schedule.tasks.add(self.react);
            } else {
                self.react();
            }
        },

        preact() {
            if (self.paused || self.preaction_paused || !self.preaction) return;

            self.preaction();
            // Dynamic cleanups clear themselves; manual custom preactions persist
            if (self.auto_preaction) {
                self.preaction = undefined;
            }
        },

        react() {
            if (self.paused || self.reaction_paused) return;

            if (self.auto_deps) {
                self.detachObservables(); // Unlink old dependencies before re-evaluating

                setActiveReactor(self);
                const result = self.reaction();
                setActiveReactor(null);

                if (self.auto_preaction && typeof result === "function") {
                    self.preaction = result;
                }
            } else {
                const result = self.reaction();
                if (self.auto_preaction && typeof result === "function") {
                    self.preaction = result;
                }
            }
        },

        dispose() {
            self.preact();
            self.detachObservables();
        }
    };

    // Attach explicit static dependencies if they exist
    if (options.deps) {
        for (const dep of options.deps) {
            dep.reactors.add(self);
            self.observables.add(dep);
        }
    }

    // INITIALIZATION
    if (self.initFn && !self.paused && !self.reaction_paused) {
        if (self.auto_deps) {
            setActiveReactor(self);
            const result = self.initFn();
            setActiveReactor(null);

            if (self.auto_preaction && typeof result === "function") {
                self.preaction = result;
            }
        } else {
            const result = self.initFn();
            if (self.auto_preaction && typeof result === "function") {
                self.preaction = result;
            }
        }
    }

    return self;
}