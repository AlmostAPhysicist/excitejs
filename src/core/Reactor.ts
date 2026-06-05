// self.ts
import { setActiveReactor } from "./context";
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
    paused_reaction: boolean; // pause flag for the reaction function
    paused_preaction: boolean; // pause flag for the preaction function

    // Governance Schedulers
    schedule_reaction: string | null;
    schedule_preaction: string | null;

    // Execution Controls
    detachObservables(): void;
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
        paused_reaction?: boolean;
        paused_preaction?: boolean;
        schedule_reaction?: string | null;
        schedule_preaction?: string | null;
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
        paused_reaction: options.paused_reaction ?? false,
        paused_preaction: options.paused_preaction ?? false,

        // Governance Schedulers
        schedule_reaction: options.schedule_reaction ?? null,
        schedule_preaction: options.schedule_preaction ?? null,


        // Methods
        detachObservables() {
            for (const dep of self.observables) {
                dep.reactors.delete(self);
            }
            self.observables.clear();
        },
        preact() {
            if (self.paused || self.paused_preaction || !self.preaction) return;

            self.preaction();
            // Dynamic cleanups clear themselves; manual custom preactions persist
            if (self.auto_preaction) {
                self.preaction = undefined;
            }
        },

        react() {
            if (self.paused || self.paused_reaction) return;

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
    if (self.initFn && !self.paused && !self.paused_reaction) {
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