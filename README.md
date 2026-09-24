<p align="center">
  <img src="public/logo.svg" alt="Logo" width="200">
</p>

<h1 align="center">ExciteJS</h1>

<p align="center">
  This is a lightweight reactive framework based on the concept of `Observables` and `Reactors`
</p>

<p align="center">
  <a href="https://almostaphysicist.github.io/excitejs/">Live examples</a> ·
  <a href="https://www.npmjs.com/package/excitejs">npm</a>
</p>

## Getting Started

```sh
npm install excitejs
```

```ts
import { Observable, Reactor, Scheduler } from "excitejs"

const count = Observable(0)
Reactor(() => console.log(`count is ${count.value}`)) // logs "count is 0"
count.value++                                          // logs "count is 1"
```

Works with any bundler (Vite, etc.) and in Node (`import`, or `require` on Node 22+). TypeScript types are included, and there are no dependencies.

**No build step?** Import it straight from a CDN in a module script:

```html
<script type="module">
  import { Observable, Reactor } from "https://cdn.jsdelivr.net/npm/excitejs/dist/index.js"

  const count = Observable(0)
  const button = document.createElement("button")
  button.onclick = () => count.value++
  Reactor(() => { button.textContent = `Clicks: ${count.value}` })
  document.body.append(button)
</script>
```

Pin a version for production, e.g. `excitejs@0.2.1`. See [Examples](#examples) and [Design Choices](#design-choices) below for how it all works.

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
  - graph lockdown and unlock with `reactor.auto_deps` to enable automatic dependency updates
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

Explicit dependencies: the reactor runs whenever `a` is assigned.

```ts
const a = Observable(true)
let swap_counter = 0

const reactor = Reactor(
    () => swap_counter++,  // reaction on trigger
    { deps: [a] }          // subscribed to `a` right away, but nothing runs until `a` is assigned
)

a.value = false // swap_counter = 1
a.value = true  // swap_counter = 2
reactor.dispose()
a.value = false // NO update to swap_counter
```

### Automatic Dependencies

Leave out `deps` and the reactor runs once immediately, subscribing to whatever it reads. It re-tracks on every run, so dependencies follow the branches taken.

```ts
const logged_in = Observable(false)
const user_name = Observable("Ada")

Reactor(() => {
    console.log(logged_in.value ? `Welcome, ${user_name.value}` : "Please log in")
}) // logs "Please log in"; depends on logged_in only

user_name.value = "Grace" // nothing: user_name wasn't read last run since logged_in was still false
logged_in.value = true    // logs "Welcome, Grace"; now depends on both
```

Add `initFn: false` and it starts **lazy**: it doesn't run at creation, so it has read nothing, has no dependencies, and nothing can trigger it. The first manual `react()` picks them up.

```ts
const greeter = Reactor(() => console.log(`Hi ${user_name.value}`), { initFn: false })

user_name.value = "Linus" // nothing: not subscribed to anything yet
greeter.react()           // logs "Hi Linus"; this first run subscribes it to user_name
user_name.value = "Ada"   // logs "Hi Ada"
```

### Cleanup with Preactions

Return a function from a reaction and it becomes the **preaction**: it runs before the next reaction, and on `dispose()`.

```ts
const interval_ms = Observable(1000)
const ticks = Observable(0)

const ticker = Reactor(() => {
    const id = setInterval(() => ticks.value++, interval_ms.value)
    return () => clearInterval(id) // preaction: tear down the old interval
})

interval_ms.value = 500 // old interval cleared, new one started
ticker.dispose()        // interval cleared for good
```

### Dependency Domino

Reactors can write to observables, chaining updates synchronously.

```ts
const a = Observable(0)
const b = Observable(0)

Reactor(() => {
    if (a.value % 2 == 0) b.value += a.value / 2
}, { deps: [a] })

Reactor(
    () => console.log(`b updated to ${b.value}`), // reaction
    // initFn runs once now, instead of the reaction. Its reads (b) are the
    // dependencies until the first reaction re-tracks, so it reads b too.
    { initFn: () => console.log(`initial b: ${b.value}`) }
)

a.value++ // a=1, b stays 0
a.value++ // a=2, b=1 → logs "b updated to 1"
a.value++ // a=3, b stays 1
```

### Clicker Component

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

### Scheduler Demo

Route reactions into named stages to batch them and control their order. Stages flush in the order they were created, on the next microtask.

```ts
const scheduler = Scheduler()
const compute_s = scheduler.getOrCreate("compute") // created first → flushes first
const render_s = scheduler.getOrCreate("render")

const price = Observable(10)
const quantity = Observable(2)
const total = Observable(0)
const label = document.createElement("p")

Reactor(() => { total.value = price.value * quantity.value },
    { reaction_schedule: compute_s }) // derive state

Reactor(() => { label.textContent = `Total: ${total.value}` },
    { reaction_schedule: render_s })  // touch the DOM

price.value = 12
quantity.value = 3
// nothing has run yet: both changes are queued, and de-duplicated
// next microtask: compute runs once (total = 36), then render runs once
```

More: `src/test.ts` covers every feature, and `src/examples/` has full pages (run `npm run dev`).

## Design Choices

These are deliberate, interlinked, and not always obvious.

### Everything is a plain, open object

`Observable()`, `Reactor()` and `Scheduler()` are factories returning plain objects. All state is public and mutable (`obs._value`, `obs.reactors`, `reactor.observables`, every flag), for total hackability. There are no classes and no hidden internals.

### Observables

- **No equality check.** Every assignment triggers, even `a.value = a.value`. Guard it yourself if you need to.
- **Only assignment is observed.** In-place mutation (`list.value.push(1)`, `obj.value.x = 2`) goes unnoticed; follow it with `obs.trigger()`.
- **`_value` is the escape hatch.** Reading `_value` doesn't subscribe (peek). Writing `_value` doesn't trigger (silent set).
- **Reactors run in subscription order.** `obs.reactors` is an ordered `Set`. `trigger()` iterates a snapshot, so reactors added mid-trigger wait for the next one. Reorder with the helpers in `src/core/priority.ts` (`moveToTop`, `moveUp`, …) or use `Schedulers`.

### Reactors

- **`deps` decides how dependencies are found; `initFn` decides what runs at creation.**
  - *With `deps`* (static): subscribed immediately to exactly those observables. By default nothing runs at creation, and the first reaction happens on the first change.
  - *Without `deps`* (`auto_deps`): subscribed to whatever each run reads. By default the reaction runs at creation, because that first run is how it finds its dependencies.
- **`initFn` is what runs at creation**: once, synchronously, inside `Reactor()`. It is *not* "the first reaction, whenever it happens"; every later run calls the reaction.
  - `true`: run the reaction now (the default without `deps`).
  - `() => …`: run this function now instead. Without `deps`, its reads are the dependencies until the first reaction re-tracks, so have it read what the reaction reads.
  - `false`: run nothing now (the default with `deps`). Without `deps`, this makes the reactor **lazy**: it has read nothing, so it has no dependencies and no change can trigger it. The first manual `react()` picks them up.
  - Only `false` switches the initial run off. `null`, or leaving it out, still runs it for an auto-tracking reactor.
  - Like a reaction, a function returned from `initFn` becomes the preaction.
- **Pausing at creation skips the initial run for good.** A reactor created with `paused` or `reaction_paused` set behaves as if `initFn: false`. Without `deps`, that means it stays lazy even after you unpause it.
- **Auto dependencies are re-tracked on every run.** They are exactly what the last run read, so they follow branches. Setting `reactor.auto_deps = false` freezes the current graph.
- **Tracking is synchronous.** Only reads during the reaction's own call count. Reads inside callbacks, timers or after an `await` are not tracked.
- **Reactions are synchronous by default.** An assignment runs its dependents immediately, depth-first, inside the setter. So a reactor that depends on two observables derived from the same source runs once *per* upstream change, and the first run sees one of them stale. Put the reactions on a schedule to batch them.
- **Pausing drops, it doesn't defer.** Changes that arrive while paused are not replayed on unpause. `paused` blocks everything (reaction, preaction, initial run). `reaction_paused` and `preaction_paused` block one side each.
- **`dispose()` is reversible.** It runs the pending preaction and detaches from every observable, but the object stays intact. Calling `react()` on an auto-tracking reactor re-subscribes it.

### Preactions

- **A returned function becomes the preaction** (`auto_preaction`, on by default). It runs before the next reaction, or on `dispose()`, and is then cleared. Non-function return values are ignored.
- **A `preaction` passed as an option runs only once** under that default, since it's cleared after running. Set `auto_preaction: false` to keep it, and it will run before *every* reaction. Returned functions are then ignored.
- **Preactions and reactions are routed independently** (`preaction_schedule` / `reaction_schedule`). Keep the preaction on the same or an earlier stage. On a later stage, the new reaction runs first, and the preaction that then runs is the *new* reaction's cleanup.

### Schedulers

- **A Schedule is a named stage, a Scheduler is the pipeline.** Stages flush in creation order. `getOrCreate(name)` returns the existing stage if the name is taken.
- **Tasks are a `Set`.** A reactor queued many times before a flush runs once.
- **Auto flush means one microtask.** Every change in the same synchronous block lands in a single flush after your code finishes.
- **Cascades flow forward within a flush.** Work queued onto a *later* stage runs in the same flush. Work queued onto the same or an *earlier* stage waits for the next flush, so a loop can't spin inside one flush.
- **The first run ignores schedules.** A reactor's initial run happens synchronously in `Reactor()`. Only later changes are routed.
- **Manual stages (`getOrCreate(name, false)`)** don't request a flush when tasks arrive. They run on `flush(stage)` or `flush()`. Note that a global flush, including one triggered by an auto stage in the same Scheduler, drains them too. Give a manual stage its own Scheduler if it must wait for you.
- **Schedulers are independent.** Each has its own stages and its own microtask.

### Known caveat: nested reactors

Tracking uses a single global slot (`active_reactor`), not a stack. A tracked run puts its reactor in the slot, then sets it back to `null`, not to whatever was there before. So creating a `Reactor` *inside* a reaction interferes with the outer one:

- **An auto-tracking inner reactor** leaves the slot `null` when its initial run ends. The outer reaction stops tracking for the rest of that run: reads after the `Reactor(…)` line don't subscribe it.
- **An explicit-deps inner reactor with an `initFn`** runs that init without touching the slot. Its reads subscribe the *outer* reactor.
- **Each outer re-run creates another inner reactor**, and the old ones stay subscribed. Return `() => inner.dispose()` from the outer reaction to clean them up.

Workaround: read everything the outer reaction needs *before* creating inner reactors, or create them outside reactions.

## Nomeclature

For consistency in development and debugging and usage, we will try to adhere to the following convensions:


| **Category**                       | **Token Types**                                                                  | **Casing Style** | **Examples**                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------ |
| **Data & State** *(Non-Callables)* | Variables, parameters, object properties, primitive values, configuration flags. | `snake_case`     | `init_value`, `paused_reaction`, `auto_deps`               |
| **Execution** *(Callables)*        | Functions, object methods, utility routines, inline handlers.                    | `camelCase`      | `trigger()`, `preact()`, `initFn()`, `registerScheduler()` |
| **Architectural** *(Entities)*     | Components, UI Elements, Classes, Factories that instantiate objects.            | `PascalCase`     | `Observable()`, `Reactor()`, `Clicker()`                   |
| **File System** *(Modules)*        | Module filenames, directory names.                                               | `snake_case`     | `main.ts`, `observable.ts`, `reactor.ts`                   |

## Development Workflow

There are three independent builds. Each has its own config and output folder:

| Command              | What it builds                                                                 | Config                 | Output       |
| -------------------- | ------------------------------------------------------------------------------ | ---------------------- | ------------ |
| `npm run build:lib`  | The **npm package**: `src/index.ts` bundled to `dist/index.js`, then `.d.ts` types via `tsc` | `vite.lib.config.ts`, `tsconfig.build.json` | `dist/`      |
| `npm run build:test` | `src/test.ts` with the library bundled in, runnable in plain Node              | `vite.test.config.ts`  | `dist-test/` |
| `npm run build:site` | The demo site (root page + examples) for GitHub Pages                          | `vite.site.config.ts`  | `dist-site/` |
| `npm run build`      | All three, in the order above                                                  |                        |              |

All output folders are gitignored.

### Day to day

```sh
npm install       # once
npm run dev       # dev server for the root page and examples (src/examples/<name>/index.html)
npm test          # builds and runs src/test.ts in Node
```

### Site

```sh
npm run build:site     # build into dist-site/
npm run preview        # serve the built site locally
npm run deploy         # push dist-site/ to the gh-pages branch
```

The home page (`index.html` → `src/main.ts` → `src/gallery.ts`) is a searchable gallery of the examples, itself built with Observables and Reactors. To add an example to the site:

1. add its `index.html` to `rollupOptions.input` in `vite.site.config.ts`
2. add an entry to `EXAMPLES` in `src/gallery.ts`

### Publishing to npm

`npm publish` runs `build:lib` automatically (via `prepack`). What gets published is controlled by `files` in `package.json`:

- `dist/`: the bundled library and its type definitions (what `import ... from "excitejs"` resolves to)
- `src/core/`, `src/index.ts`: the library source, for reference and declaration maps
- `src/test.ts`: the test suite, as usage reference
- `src/examples/directory/`, `src/examples/click_counter/`: two self-contained examples
- `README.md`, `LICENSE`

`public/`, the other examples, and the dev files (`main.ts`, `devtools.ts`, etc.) stay on GitHub only.

```sh
npm pack --dry-run     # list exactly what would be published
npm version patch      # bump version (or minor / major)
npm publish
```

### Devtools

`src/devtools.ts` exposes `window.Excite` for poking at things in the browser console. It is a dev-only side-effect module, and is not part of the package. Import it where you need it (`src/main.ts` already does).
