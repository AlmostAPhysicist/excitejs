import { Observable } from "./core/Observable";
import { Reactor } from "./core/Reactor";

const a = Observable(0);
let b = 0;

const r = Reactor([a], () => {
    b += a();
    console.log(b);
});

console.log("Testing reactive system:");
console.log("Initial value of a:", a()); // should log 0
a(1); // logs "1"
a(2); // logs "3"

let alias = a; // aliasing test
alias(3); // logs "6"

r.stop();
a(4); // does not log anything
console.log("Final value of a:", a()); // should log 4
console.log("Test completed.");


function f<T>(x: Observable<T>): number {
    return x.reactors.size;
}

const reactor_count = Reactor([a], () => {
    console.log("number of reactors for a:", f(a));
});

a(5); // logs "number of reactors for a: 1"

const r2 = Reactor([a], () => {
    b += a();
});

a(6); // logs "number of reactors for a: 2"

r2.stop();
a(7); // logs "number of reactors for a: 1"

reactor_count.stop();
console.log("Stopped reactor_count reactor.");
a(8); // does not log anything about number of reactors


console.log("Testing derived observables:");

let c = Observable(a());
const c_updater = Reactor([a], () => {
    c(a());
});

const r3 = Reactor([c], () => {
    console.log("c updated to:", c());
});

a(a() + 1); // updates a to 9, which updates c to 9, which triggers r3 to log "c updated to: 9"
a(a() - 1); // updates a to 8, which updates c to 8, which triggers r3 to log "c updated to: 8"
a(0); // updates a to 0, which updates c to 0, which triggers r3 to log "c updated to: 0"
a(a()) // still triggers c to update to 0, which triggers r3 to log "c updated to: 0"

console.log("Stopping r3 reactor.");

r3.stop();
a(1); // updates a to 1, which updates c to 1, but does not trigger r3

c_updater.stop();
