// sections/core.ts
//
// Sections 1 and 2 of the guide: Observables and Reactors, then Schedulers.
//
// Each lab is as small as it can be, and what it shows on the page is the
// library's behaviour itself: a run count, a line added per run, a stamp
// left behind. Where a feature fixes something, the first step shows the
// problem on the page and the next step adds the feature.

import observable_src from "../../../core/observable.ts?raw";
import reactor_src from "../../../core/reactor.ts?raw";
import scheduler_src from "../../../core/scheduler.ts?raw";
import { Fold, Note, Section, Source } from "../kit.ts";
import { Lab } from "../lab/lab.ts";

export const reactiveSection = () => Section("reactive", "Observables and Reactors",
    "An Observable holds a value that can be observed for changes. A Reactor runs a function, and runs it again when an Observable it depends on changes. They are introduced together because each needs the other.", [

    "## counter | An Observable and a Reactor",
    Lab("counter", {
        observers: "open",
        text: `<p>A button and a line of text that shows how often it was pressed. The code is running, and the button under it is its result. Edit the code and the result updates when you stop typing.</p>
               <p>The rectangle marks the lines described below. <em>Next</em> moves it.</p>`,
        tour: [
            ["elements", "Two elements", `<p>A button and an output, created with the DOM API. ExciteJS does not create elements; it decides when code that updates them runs.</p>`],
            ["state", "The Observable", `<p><code>Observable(0)</code> creates an Observable whose value is 0. The value is read and written as <code>count.value</code>.</p>`],
            ["react", "The Reactor", `<p><code>Reactor(fn)</code> runs <code>fn</code> immediately. <code>fn</code> reads <code>count.value</code>, and reading <code>.value</code> while a Reactor is running subscribes that Reactor to the Observable.</p><p>From then on, every assignment to <code>count.value</code> runs <code>fn</code> again.</p>`],
            ["write", "The assignment", `<p><code>count.value++</code> assigns a new value. The assignment runs the subscribed Reactor before it returns, so the text is already updated on the next line of code.</p>`],
        ],
    }),
    `<p>The table under the result lists each Observable in the code, its value, and the Reactors subscribed to it, with how often each has run.</p>
     <p>Remove the <code>Reactor(() =&gt; { … })</code> wrapper so that only the <code>output.textContent = …</code> line remains. The text is then set once and stays at “count is 0”, and the table shows no Reactor next to <code>count</code>.</p>`,
    Fold("The source of Observable",
        Source("src/core/observable.ts", observable_src, "export function Observable<T>", "return self;", [
            ["_value: init_value", "The value is stored in an ordinary field, `_value`."],
            ["reactors: new Set", "The Reactors subscribed to this Observable."],
            ["trigger() {", "Runs each subscribed Reactor (or queues it, if it has a stage)."],
            ["// Define `value`", "Reading `.value` returns `_value`. If a Reactor is running at that moment, it is added to `reactors` first. This is the subscription."],
            ["// The 'set' keyword", "Writing `.value` stores the new value and calls `trigger()`. The new value is not compared with the old one."],
        ], 2)),

    "## double | Exercise: a second Reactor",
    Lab("double", {
        observers: "open",
        exercise: {
            task: `<p>The second output, <code>twice</code>, is empty. Make it show “twice is …” with double the count.</p><p>The check presses the button three times and expects “twice is 6”.</p>`,
            hint: `<p>Add another <code>Reactor</code> whose function sets <code>twice.textContent</code> from <code>count.value * 2</code>.</p>`,
            check: p => { p.click("button", 3); return p.text().includes("twice is 6"); },
        },
    }),
    `<p>When it is solved the table shows two Reactors subscribed to <code>count</code>. The click handler is unchanged: it assigns the Observable and has no reference to either Reactor.</p>`,

    "## deps | Dependencies: detected automatically, or given as a list",
    `<p>A Reactor reacts to a change observed in the Observables in its dependency list, <code>deps</code>. This list can be set manually, or detected automatically.</p>`,
    Lab("greeting", {
        observers: "open", open: "main.js",
        text: `<p><code>greet</code> prints a greeting to the console, and the Reactor <code>greeter</code> runs it. One button logs in and out, the other changes the name. The two buttons are in <code>index.html</code>.</p><p>Across the four steps only the line that creates the Reactor changes. The table under the console shows which Observables <code>greeter</code> depends on.</p>`,
        steps: [
            { title: "Automatic: the dependencies are what the last run read", focus: "greeter", code: `const greeter = Reactor(greet);`, text: `<p>No list is given, so the Reactor detects its dependencies. On every run, the Observables whose <code>.value</code> the reaction reads become the list.</p><p>The first run printed “Please log in”. It read <code>logged_in</code> and never reached the line that reads <code>user_name</code>, so <code>user_name</code> is not a dependency: press <em>change the name</em> and nothing is printed.</p><p>Log in. That run reads both, so both are dependencies, and changing the name prints a new greeting. Log out and <code>user_name</code> is off the list again.</p><p>Two things can be changed about an automatic Reactor, and the next steps show them: it can be given an <code>initFn</code> other than the default (step 3), and a Reactor can be switched between automatic and manual after it was created (step 4).</p>` },
            { title: "Manual: a deps list", focus: "greeter", code: `const greeter = Reactor(greet, { deps: [logged_in] });`, text: `<p><code>deps: [logged_in]</code> sets the list by hand. The Reactor depends on <code>logged_in</code> and on nothing else, whatever <code>greet</code> reads.</p><p>Log in, then change the name: nothing is printed, although <code>greet</code> reads <code>user_name</code>. The new name appears the next time <code>logged_in</code> changes.</p><p>The console also starts empty. A Reactor with a <code>deps</code> list does not run when it is created.</p>` },
            { title: "initFn: what runs at creation", focus: "greeter", code: `const greeter = Reactor(greet, { deps: [logged_in], initFn: true });`, text: `<p><code>initFn</code> sets what runs inside the <code>Reactor()</code> call. <code>true</code> runs the reaction once at creation, so “Please log in” is printed at the start.</p><p><code>false</code> runs nothing. A function runs that function once in place of the reaction; try <code>initFn: () =&gt; console.log("hello")</code>.</p><p>The default is <code>true</code> without <code>deps</code>, because an automatic Reactor has to run once to detect anything, and <code>false</code> with <code>deps</code>. Either kind of Reactor accepts any of the three.</p>` },
            { title: "auto_deps: switching between automatic and manual", focus: "greeter", code: `greeter.auto_deps = !greeter.auto_deps;`, text: `<p>The dependency list is the Reactor's <code>observables</code> field. Automatic detection means the Reactor refills that field on every run; a <code>deps</code> option fills it once, at creation.</p><p>Which of the two a Reactor does is its field <code>auto_deps</code>, and it can be set at any time. This step is the automatic Reactor from step 1, with a third button that toggles the field.</p><p>While logged out, switch <code>auto_deps</code> off and log in. The greeting is printed, but the list is no longer refilled, so <code>user_name</code> is not added and changing the name prints nothing. Switch it on again, and the next run detects both. The same field turns a Reactor created with <code>deps</code> into an automatic one.</p>` },
        ],
    }),
    Fold("The source of a Reactor's run",
        Source("src/core/reactor.ts", reactor_src, "react() {", "dispose() {", [
            ["self.detachObservables();", "Unsubscribes from every Observable of the previous run."],
            ["setActiveReactor(self);", "Marks this Reactor as the running one, calls the function, then clears the mark. While the mark is set, any read of `.value` subscribes this Reactor."],
            ["if (self.auto_preaction && typeof result", "If the function returned a function, it is stored as the preaction (described below)."],
            ["} else {", "A Reactor created with `deps` skips the tracking and only calls the function."],
        ])),
    Note("Only reads made during the run are tracked", `<p>The mark is set only while the Reactor's function executes. A read inside a <code>setTimeout</code> callback, after an <code>await</code>, or in an event handler happens later and subscribes nothing. If a reaction needs a value later, read it into a variable during the run.</p>`),

    Note("A Reactor that reads and writes the same Observable", `<p>In a Reactor that tracks its reads, <code>count.value++</code> reads <code>count</code> (which subscribes the Reactor) and then writes it (which runs the Reactor again), without end. In the first lab of this section, put <code>count.value++</code> inside the Reactor to see the error the lab reports.</p><p>To write an Observable from a Reactor that should not depend on it, read it through <code>_value</code>, which does not subscribe: <code>count.value = count._value + 1</code>. Or give the Reactor <code>deps</code>.</p>`),

    "## preaction | Preactions: undoing the previous run",
    Lab("stamp", {
        observers: "open",
        text: `<p>A button cycles through two stamps on a canvas: a square and a circle. The current one is held in the Observable <code>shape</code>, and a Reactor stamps it.</p>`,
        steps: [
            { title: "Each run leaves its stamp behind", text: `<p>The Reactor <code>stamper</code> reads <code>shape.value</code>, creates an element for that shape and adds it to the board. Every change of <code>shape</code> runs it again and adds another element.</p><p>Press the button a few times. The circle is stamped over the square and the count goes up.</p>` },
            { title: "A preaction removes the previous stamp", focus: "stamper", code: `
const stamper = Reactor(() => {
    …
    return () => stamp.remove();
});`, text: `<p>When a Reactor's function returns a function, the Reactor stores it and calls it immediately before its next run. ExciteJS calls this stored function the <em>preaction</em>.</p><p>The returned function removes the stamp its own run added. On a change of <code>shape</code>, the preaction removes the old stamp and then the reaction adds the new one. The count stays at 1.</p>` },
            { title: "dispose() and react()", text: `<p><code>dispose()</code> calls the stored preaction and unsubscribes the Reactor. The stamp is removed and the button has no effect.</p><p><code>react()</code> runs the function again, which stamps the current shape and subscribes the Reactor to <code>shape</code> as before.</p>` },
        ],
    }),
    `<p>The same applies to anything a run starts and the next run should not inherit: an element, a timer, an event listener.</p>`,

    "## mutation | Exercise: a change inside an array",
    Lab("todo", {
        observers: "open",
        exercise: {
            task: `<p>The button should add an item to the list, and nothing appears. In the table, <code>items</code> grows with each press while the Reactor's run count stays the same.</p><p>Fix the marked line. The check presses the button once and expects one list entry.</p>`,
            hint: `<p>Reactors run on an assignment to <code>.value</code>. <code>items.value.push(…)</code> changes the array that is already there and assigns nothing. Assign a new array: <code>items.value = [...items.value, …]</code>. Or keep the push and call <code>items.trigger()</code> after it.</p>`,
            check: p => { p.click("button"); return p.all("li").length === 1; },
        },
    }),
    `<p>An Observable does not watch the inside of the value it holds. The four operations on an Observable:</p>
     <ul>
       <li><code>obs.value = x</code> stores <code>x</code> and runs the subscribed Reactors.</li>
       <li><code>obs.trigger()</code> runs the subscribed Reactors and leaves the value as it is.</li>
       <li><code>obs._value = x</code> stores <code>x</code> and runs nothing.</li>
       <li>Reading <code>obs._value</code> returns the value without subscribing the running Reactor.</li>
     </ul>`,

    "## control | Pausing a Reactor",
    Lab("remote", {
        observers: "open",
        text: `<p><code>ticks</code> goes up every 0.8 seconds and the Reactor <code>display</code> shows it. The buttons set fields and call methods on the Reactor object that <code>Reactor()</code> returned.</p>
               <p>With <code>paused</code> set, the heading stops while <code>ticks</code> keeps counting in the table. A change that arrives during a pause is dropped: after unpausing, the heading updates at the next tick. Call <code>react()</code> to update it at once.</p>`,
    }),

    "## sync | Two assignments run a Reactor twice",
    Lab("person", {
        observers: "open",
        text: `<p>The button assigns two Observables, <code>first</code> and <code>last</code>. The Reactor adds a line with the full name to the list each time it runs.</p>
               <p>Press the button once. Two lines are added, and the first is “Grace Lovelace”: a first name from one person and a last name from the other.</p>`,
        tour: [
            ["write", "Two assignments", `<p>Each assignment runs the subscribed Reactor before the next line executes. After the first one, <code>first</code> is already “Grace” and <code>last</code> is still “Lovelace”.</p>`],
            ["react", "A Reactor that reads both", `<p>It runs once per assignment. The first run sees a state that exists only between the two lines of the click handler.</p>`],
        ],
    }),
    `<p>The second run shows the correct name, so the final state is right. The extra run with mixed values is what the next section removes.</p>`,
]);

export const schedulerSection = () => Section("scheduler", "Schedulers",
    "A Scheduler holds named stages. A Reactor that has been given a stage is queued on it when triggered. After the code that caused the triggers has finished, each stage runs what is queued on it, once.", [

    "## stages | One run for several assignments",
    Lab("stages", {
        observers: "open",
        text: `<p>The two names from the previous lab.</p>`,
        steps: [
            { title: "Without a Scheduler", text: `<p>Two lines per click, the first with mixed names.</p>` },
            { title: "A stage", focus: "render", code: `
const scheduler = Scheduler();
const render = scheduler.getOrCreate("render");
…
Reactor(() => {
    …
}, { reaction_schedule: render });`, text: `<p>The Reactor is given a stage with <code>reaction_schedule</code>. An assignment now adds the Reactor to that stage's queue. The queue is a Set, so two assignments add it once.</p><p>When the click handler has returned, the Scheduler runs the queue. One line per click, with matching names.</p>` },
            { title: "Two stages run in the order they were created", focus: "compute", code: `
const compute = scheduler.getOrCreate("compute");
const render = scheduler.getOrCreate("render");
…
Reactor(() => {
    full.value = \`\${first.value} \${last.value}\`;
}, { reaction_schedule: compute });`, text: `<p>A second Reactor, on a stage named <code>compute</code>, writes the full name into another Observable, <code>full</code>, and the list Reactor now reads <code>full</code>.</p><p><code>compute</code> was created before <code>render</code>, so everything queued on it runs first. The list Reactor runs after <code>full</code> is up to date, and still once per click.</p>` },
        ],
    }),
    `<p>The queue runs in a microtask: after the current code has returned, and before the browser paints or handles another event. The first run of a Reactor, at creation, is not queued.</p>`,
    Fold("The source of a stage and of flush()",
        Source("src/core/scheduler.ts", scheduler_src, "getOrCreate(name: string", "flush(schedule?: Schedule) {", [
            ["for (const s of self.schedules)", "A stage is found by name, so separate parts of a program can share one."],
            ["const tasks = new Set<Task>();", "The queue is a Set, which holds each Reactor once."],
            ["// Intercept add()", "Adding a task also requests a flush on the next microtask, unless the stage is manual."],
        ]),
        Source("src/core/scheduler.ts", scheduler_src, "flush(schedule?: Schedule) {", "return self;", [
            ["// Case 1", "`flush(stage)` runs one stage now."],
            ["// Case 2", "`flush()` runs every stage in order. A stage's queue is copied and cleared before its tasks run, so a task that queues work on a later stage sees it run in the same flush."],
        ])),

    "## batch | Exercise: one run for three assignments",
    Lab("batch", {
        exercise: {
            task: `<p>The button assigns three Observables (red, green, blue). The Reactor that colors the swatch runs after each assignment and writes “painted” to the console three times. Make it run once per click.</p><p>The check clicks the button and expects one new “painted” line.</p>`,
            hint: `<p>Import <code>Scheduler</code>, create a stage with <code>Scheduler().getOrCreate("render")</code>, and pass <code>{ reaction_schedule: render }</code> as the Reactor's second argument.</p>`,
            check: async p => {
                await p.wait(20);
                const before = p.logs().length;
                p.click("button");
                await p.wait(30);
                return p.logs().length - before === 1;
            },
        },
    }),

    "## manual | A manual stage, run once per frame",
    Lab("trail", {
        observers: "open",
        text: `<p>Move the pointer over the grey area and the dot follows. The line under it counts the pointer events received and the times the dot was moved.</p>
               <p>A pointer can send several events between two screen updates. Only the last position can be seen, so the dot is moved once per animation frame.</p>`,
        tour: [
            ["stage", "A manual stage", `<p><code>getOrCreate(name, false)</code> creates a stage that the Scheduler does not run by itself. Its queue waits for <code>flush(stage)</code>.</p><p>It has its own Scheduler because <code>flush()</code> without an argument runs every stage of a Scheduler, manual ones included.</p>`],
            ["note", "The event handler", `<p>It assigns <code>pointer</code>. The Reactor <code>follow</code> is subscribed to it and has the manual stage, so each assignment queues it, once however many events arrive.</p>`],
            ["apply", "The Reactor", `<p>Runs when the stage is flushed and uses the latest position.</p>`],
            ["frame", "The flush", `<p>A <code>requestAnimationFrame</code> loop flushes the stage. Press the button: 500 events are received and the dot is moved once.</p>`],
        ],
    }),
    `<p>Observable, Reactor and Scheduler are the whole library. The <a href="./docs.html">docs page</a> lists every option and field. The following sections build things with them.</p>`,
]);
