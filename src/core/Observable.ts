// Observables.ts

import type { Reactor } from "./Reactor";

/**
 * A mutable observable value that triggers a set of reactors upon change.
 * ```typescript
 * let a = Observable(1);
 * a();    // returns 1
 * a(2);   // sets value to 2 and triggers reactors
 * ```
 */
export interface Observable<T> {
    (): T;
    (value: T): T;
    reactors: Set<Reactor>;
}

export function Observable<T>(init_value: T): Observable<T> {// initialization
    let value = init_value;
    const reactors = new Set<Reactor>();

    const observable = function (new_value?: T) {//access or update
        // access
        if (arguments.length === 0) return value;

        //update
        value = new_value as T;
        for (const reactor of reactors) reactor.react(); // trigger reactors
        return value;
    } as Observable<T>;

    observable.reactors = reactors;
    return observable;
}