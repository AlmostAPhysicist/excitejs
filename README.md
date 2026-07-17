<p align="center">
  <img src="public/logo.svg" alt="Logo" width="200">
</p>

<h1 align="center">ExciteJS</h1>

<p align="center">
  This is a lightweight reactive framework based on the concept of `Observables` and `Reactors`
</p>

## tasks

- add jsxFactory and jsx/tsx support
- deep reactivity
    - element diffing?
    - array reactivity?
    - multidimensional array reactivity?
    - map reactivity?
    - object reactivity?
- add a way to create custom elements
- add a way to create custom attributes
- template literals

## progress so far

### Obervables and Reactors CORE

#### 1. Observables

- store values
- read (`obs.value` using `get`) and write (`obs.value = <val>` using `set`)
- intercept writes and trigger reactions
- automatic reactor update handling through the read

#### 2. Reactors

- reaction system functioning well with observables
- constructors:
  - explicit dependencies
  - automatic dependencies
  - initialization fucntion customization
  - graph lockdown and unlock with `reactor.auto` to enable automatic dependency updates
  - added pause feature
  - added `preaction` and `preact`
  - added priority control

#### 3. Schedulers
- added Schedulers, Schedules and autoFlush functionality to queue and order tasks properly with manual or automatic event flushing

### Usage

- Created Observable and Reactor tests
- Some Basic usage to update DOM for a simple clicker

## Examples

### The Basics

```ts
const a = Observable(true)
let swap_counter = 0

const reactor = Reactor(
    () => swap_counter++, // reaction on trigger
    [a] // dependency array
    )

a.value = false //swap_counter=1
a.value = true //swap_counter=2
reactor.dispose()
a.value = false // NO update to swap_counter
```

### Some more Complex functionality

Dependency Domino:

```ts
const a = Observable(0)
const b = Observable(0)

function selective_increment(val: number) {
    if (val % 2 == 0) {
        b.value += val / 2;
    }
}

const r1 = Reactor(() => selective_increment(a.value), {[a]})
const r2 = Reactor(
    () => console.log(`b's value updated to ${b.value}`), // action 
    {
    initFn: () => console.log(`initial value of b: ${b.value}`) // initial run
    }
    ) 
  

a.value++; //triggers r1, a=1, but b=0 still
a.value++; //triggers r1, a=2, b=1, triggers r2 and prints log
a.value++; //triggers r1, a=3 but b=1 still
```

Clicker Component:

```ts
export function Clicker() {
    const count = Observable(0);

    const button = document.createElement("button");
    button.onclick = () => {count.value++};

    Reactor(() => {
        button.innerText = `Clicks: ${count.value}`;
    });

    return button;
}
```

Scheduler Demo:
```ts
// a, b, f, g, heavyRenderTask are all assumed to be defined elsewhere
export function SchedulerDemo() {
    // Defining Schedulers
    const s = Scheduler(); 
    const compute_s = s.getOrCreate("compute"); 
    const render_s = s.getOrCreate("render");
    // compute_s defined earlier, hence tasks there would run before tasks scheduled during render_s

    const o1 = Observable(a);
    const o2 = Observable(b);


    const r1 = Reactor(() => f(), {deps: [o1, o2], scheduler: compute_s}); // computation that alters render
    const r2 = Reactor(() => g(), {deps: [o1, o2], scheduler: compute_s}); // also alters render
    const r3 = Reactor(() => {
        heavyRenderTask(o1.value, o2.value);
    }, {scheduler: render_s}); // would run only once after all compute_s tasks are done
    
    return s;
}
```


Some Deeper Examples can be found in `test.ts` for now

## Nomeclature

For consistency in development and debugging and usage, we will try to adhere to the following convensions:


| **Category**                       | **Token Types**                                                                  | **Casing Style** | **Examples**                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------ |
| **Data & State** *(Non-Callables)* | Variables, parameters, object properties, primitive values, configuration flags. | `snake_case`     | `init_value`, `paused_reaction`, `auto_deps`               |
| **Execution** *(Callables)*        | Functions, object methods, utility routines, inline handlers.                    | `camelCase`      | `trigger()`, `preact()`, `initFn()`, `registerScheduler()` |
| **Architectural** *(Entities)*     | Components, UI Elements, Classes, Factories that instantiate objects.            | `PascalCase`     | `Observable()`, `Reactor()`, `Clicker()`                   |
| **File System** *(Modules)*        | Module filenames, directory names.                                               | `snake_case`     | `main.ts`, `observable.ts`, `reactor.ts`                   |
