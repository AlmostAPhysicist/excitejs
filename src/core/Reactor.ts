// Reactor.ts
import { setActiveReactor } from "./context";
import type { Observable } from "./Observable";

/**
 * A reactive listener that runs an action upon change in its dependency observables.
 * ```typescript
 * const a = Observable(0);
 * let b = 0;
 * let r = Reactor([a], () => { b += a.value; console.log(b); });
 * a.value = 1; // logs "1"
 * r.stop();
 * a.value = 2; // does not log anything
 * ```
 */
export interface Reactor {
    observables: Set<Observable<any>>;
    /** Controls whether this reactor dynamically re-tracks dependencies on every execution. */
    auto: boolean;
    react(): void;
    stop(): void;
}

export function Reactor(
    action: () => void,
    deps?: Observable<any>[] | null,
    init?: boolean | (() => void) | null,
    auto?: boolean
): Reactor {

    // Define parameters and their defaults:
    const observables = new Set<Observable<any>>();
    const initialAuto = auto !== undefined ? auto : !deps;

    // Normalize initFn
    let initFn: (() => void) | null = null;
    if (typeof init === "function") {
        initFn = init;
    } else if (init === true) {
        initFn = action;
    } else if (initialAuto && init !== false) {
        initFn = action;
    } // else initFn remains null, meaning no initial method will be run

    // CORE REACTOR LOGIC:
    const reactor: Reactor = {
        observables,
        auto: initialAuto,

        react() {
            if (reactor.auto) {
                reactor.stop(); // Unlink old dependencies before re-evaluating
                setActiveReactor(reactor);
                action();
                setActiveReactor(null);
            } else {
                action();
            }
        },

        stop() {
            for (const dep of observables) dep.reactors.delete(reactor);
            observables.clear();
        }
    };

    // Attach explicit static dependencies if they exist
    if (deps) {
        for (const dep of deps) {
            dep.reactors.add(reactor);
            observables.add(dep);
        }
    }

    // INITIALIZATION
    if (initFn) {
        if (initialAuto) {
            setActiveReactor(reactor);
            initFn();
            setActiveReactor(null);
        } else {
            initFn();
        }
    }

    return reactor;
}