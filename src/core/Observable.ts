// Observables.ts

import type { Reactor } from "./Reactor";
import { activeReactor } from "./context";

/**
 * A mutable observable value that triggers a set of reactors upon change.
 * ```typescript
 * let a = Observable(1);
 * a.value;      // returns 1
 * a.value = 2;  // sets value to 2 and triggers reactors
 * a.trigger();  // manually triggers reactors without changing value
 * ```
 */
export interface Observable<T> {
    value: T;
    reactors: Set<Reactor>;
    trigger(): void;
}

export function Observable<T>(init_value: T): Observable<T> {// initialization
    let _value = init_value;
    const reactors = new Set<Reactor>();
    const trigger = () => {
        for (const reactor of [...reactors]) {
            reactor.react();
        }
    };
    const self: Observable<T> = {

        reactors,
        trigger,
        // The 'get' keyword intercepts read attempts (e.g., a.value)
        get value() {
            // AUTOMATIC DEPENDENCY TRACKING:
            if (activeReactor) {
                reactors.add(activeReactor);
                activeReactor.observables.add(self);
            }
            return _value;
        },
        // The 'set' keyword intercepts write attempts (e.g., a.value = 2)
        set value(new_value: T) {
            _value = new_value;
            trigger();
        },

    };

    return self;
}

// Also export some functions to change reactor priorities up and down & to top and to bottom

