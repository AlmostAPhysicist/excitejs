// Reactor.ts

import type { Observable } from "./Observable";

/**
 * A reactive listener that runs an action upon change in its dependency observables.
 * ```typescript
 * const a = Observable(0);
 * let b = 0;
 * let r = Reactor([a], () => { b += a(); console.log(b); });
 * a(1); // logs "1"
 * const alias = a;
 * alias(3); // logs "6"
 * r.stop();
 * a(4); // does not log anything
 * ```
 */
export interface Reactor {
    observables: Set<Observable<any>>;
    react(): void;
    stop(): void;
}

export function Reactor(observables: Observable<any>[], action: () => void): Reactor {
    const deps = new Set<Observable<any>>();

    const reactor: Reactor = {
        observables: deps,
        react: action,
        stop() {
            for (const dep of deps) dep.reactors.delete(reactor);
            deps.clear();
        }
    };

    for (const dep of observables) {
        dep.reactors.add(reactor);
        deps.add(dep);
    }

    return reactor;
}