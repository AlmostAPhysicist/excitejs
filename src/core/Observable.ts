// observable.ts

import type { Reactor } from "./reactor";
import { active_reactor } from "./context";

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
    _value: T; // Fully exposed backing field for total hackability
    value: T;
    reactors: Set<Reactor>;
    trigger(): void;
}

export function Observable<T>(init_value: T): Observable<T> {// initialization
    const self: Observable<T> = {
        _value: init_value,
        reactors: new Set<Reactor>(),
        trigger() {
            // task: add scheduling logic
            for (const reactor of [...self.reactors]) {
                reactor.preact();
                reactor.react();
            }
        },

        // Define `value` as an accessor property with custom getter and setter

        // The 'get' keyword intercepts read attempts (e.g., a.value)
        get value() {
            // AUTOMATIC DEPENDENCY TRACKING:
            if (active_reactor) {
                self.reactors.add(active_reactor);
                active_reactor.observables.add(self);
            }
            return self._value;
        },
        // The 'set' keyword intercepts write attempts (e.g., a.value = 2)
        set value(new_value: T) {
            self._value = new_value;
            self.trigger();
        },

    };

    return self;
}



// PRIORITY UTILITIES (Leveraging JavaScript Set insertion order rules)

export function moveToTop(observable: Observable<any>, reactor: Reactor): void {
    if (observable.reactors.delete(reactor)) {
        const remaining = [...observable.reactors];
        observable.reactors.clear();
        observable.reactors.add(reactor); // Insert target first
        for (const r of remaining) observable.reactors.add(r);
    }
}

export function moveToBottom(observable: Observable<any>, reactor: Reactor): void {
    // Because Sets append new items to the tail end, deleting and 
    // immediately re-adding naturally drops it to the absolute bottom.
    if (observable.reactors.delete(reactor)) {
        observable.reactors.add(reactor);
    }
}

export function moveUp(observable: Observable<any>, reactor: Reactor): void {
    const list = [...observable.reactors];
    const index = list.indexOf(reactor);
    if (index > 0) {
        // Swap positions with the item ahead of it
        list[index] = list[index - 1];
        list[index - 1] = reactor;
        observable.reactors.clear();
        for (const r of list) observable.reactors.add(r);
    }
}

export function moveDown(observable: Observable<any>, reactor: Reactor): void {
    const list = [...observable.reactors];
    const index = list.indexOf(reactor);
    if (index !== -1 && index < list.length - 1) {
        // Swap positions with the item behind it
        list[index] = list[index + 1];
        list[index + 1] = reactor;
        observable.reactors.clear();
        for (const r of list) observable.reactors.add(r);
    }
}