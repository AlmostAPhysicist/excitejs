// Reactor.ts
import { setActiveReactor } from "./context";
import type { Observable } from "./Observable";

/**
 * A reactive listener that runs an action upon change in its dependency observables.
 * ```typescript
 * const a = Observable(0);
 * let b = 0;
 * let r = Reactor(() => { b += a.value; console.log(b); }, [a]);
 * a.value = 1; // logs "1"
 * r.dispose();
 * a.value = 2; // does not log anything
 * ```
 */
export interface Reactor {
    // Structural Data
    observables: Set<Observable<any>>;
    action: () => void;

    // Configuration Flags
    auto: boolean;
    paused: boolean;

    // Execution Controls
    react(): void;
    dispose(): void;
}

export function Reactor(
    action: () => void,
    deps?: Observable<any>[] | null,
    init?: boolean | (() => void) | null,
    auto?: boolean,
    paused?: boolean
): Reactor {

    // Define parameters and their defaults:
    const observables = new Set<Observable<any>>();
    const initialAuto = auto ?? !deps;
    let _paused = paused ?? false;


    // Normalize initFn
    let initFn: (() => void) | null = null;
    if (typeof init === "function") {
        initFn = init;
    } else if (init === true) {
        initFn = action;
    } else if (initialAuto && init !== false) {
        initFn = action;
    } // else initFn remains null, meaning no initial method will be run

    // CORE REACTOR LITERAL LOGIC:
    const reactor: Reactor = {
        // Structural Data
        observables,
        action,

        // Configuration Flags
        // Define `paused` as an accessor property with custom getter and setter
        get paused() { return _paused; },
        set paused(value: boolean) {
            if (_paused === value) return;
            _paused = value;
        },
        auto: initialAuto,

        // Execution Controls
        react() {
            if (_paused) return; // Do not run if paused

            if (reactor.auto) {
                reactor.dispose(); // Unlink old dependencies before re-evaluating
                setActiveReactor(reactor);
                action();
                setActiveReactor(null);
            } else {
                action();
            }
        },

        dispose() {
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
    if (initFn && !_paused) {
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