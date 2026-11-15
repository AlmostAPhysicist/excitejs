import{n as e,t}from"./reactor-BbvqANad.js";import"./layer-CAjCvTwN.js";import{a as n,c as r,i,n as a,o,r as s,s as c,t as l}from"./lab-L9TAkFlo.js";var u=`// observable.ts\r
\r
import type { Reactor } from "./reactor";\r
import { active_reactor } from "./context";\r
\r
/**\r
 * A mutable observable value that triggers a set of reactors upon change.\r
 * \`\`\`typescript\r
 * let a = Observable(1);\r
 * a.value;      // returns 1\r
 * a.value = 2;  // sets value to 2 and triggers reactors\r
 * a.trigger();  // manually triggers reactors without changing value\r
 * \`\`\`\r
 */\r
export interface Observable<T> {\r
    _value: T; // Fully exposed backing field for total hackability\r
    value: T;\r
    reactors: Set<Reactor>;\r
    trigger(): void;\r
}\r
\r
export function Observable<T>(init_value: T): Observable<T> {// initialization\r
    const self: Observable<T> = {\r
        _value: init_value,\r
        reactors: new Set<Reactor>(),\r
        trigger() {\r
            // task: add scheduling logic\r
            for (const reactor of [...self.reactors]) {\r
                reactor.schedule();\r
            }\r
        },\r
\r
        // Define \`value\` as an accessor property with custom getter and setter\r
\r
        // The 'get' keyword intercepts read attempts (e.g., a.value)\r
        get value() {\r
            // AUTOMATIC DEPENDENCY TRACKING:\r
            if (active_reactor) {\r
                self.reactors.add(active_reactor);\r
                active_reactor.observables.add(self);\r
            }\r
            return self._value;\r
        },\r
        // The 'set' keyword intercepts write attempts (e.g., a.value = 2)\r
        set value(new_value: T) {\r
            self._value = new_value;\r
            self.trigger();\r
        },\r
\r
    };\r
\r
    return self;\r
}`,d=`// reactor.ts\r
import { setActiveReactor } from "./context";\r
import type { Schedule } from "./scheduler";\r
import type { Observable } from "./observable";\r
\r
/**\r
 * A reactive listener that runs an reaction upon change in its dependency observables.\r
 * \`\`\`typescript\r
 * const a = Observable(0);\r
 * let b = 0;\r
 * let r = Reactor(\r
 *     () => { b += a.value; console.log(b); }, \r
 *     {[a]}\r
 * );\r
 * a.value = 1; // logs "1"\r
 * r.dispose();\r
 * a.value = 2; // does not log anything\r
 * \`\`\`\r
 */\r
export interface Reactor {\r
    // Structural Data\r
    observables: Set<Observable<any>>;\r
    reaction: () => any;\r
    preaction?: () => any;\r
    initFn?: () => any;\r
\r
    // Configuration Flags\r
    auto_deps: boolean; // tracks dependencies automatically if true\r
    auto_preaction: boolean; // sets the preaction function to the output of the reaction function if true\r
    paused: boolean; // global pause flag for the self\r
    reaction_paused: boolean; // pause flag for the reaction function\r
    preaction_paused: boolean; // pause flag for the preaction function\r
\r
    // Governance Schedulers\r
    reaction_schedule: Schedule | null;\r
    preaction_schedule: Schedule | null;\r
\r
    // Execution Controls\r
    detachObservables(): void;\r
    schedule(): void;\r
    react(): void;\r
    preact(): void;\r
    dispose(): void;\r
}\r
\r
export function Reactor(\r
    reaction: () => any,\r
    options: {\r
        deps?: Observable<any>[] | null;\r
        initFn?: boolean | (() => any) | null;\r
        preaction?: () => any;\r
        auto_deps?: boolean;\r
        auto_preaction?: boolean;\r
        paused?: boolean;\r
        reaction_paused?: boolean;\r
        preaction_paused?: boolean;\r
        reaction_schedule?: Schedule | null;\r
        preaction_schedule?: Schedule | null;\r
    } = {}\r
): Reactor {\r
\r
\r
    const auto_deps = options.auto_deps ?? !options.deps;\r
\r
    let initFn: (() => any) | undefined = undefined;\r
    if (typeof options.initFn === "function") {\r
        initFn = options.initFn;\r
    } else if (options.initFn === true || (auto_deps && options.initFn !== false)) {\r
        initFn = reaction;\r
    }\r
\r
    // CORE REACTOR LITERAL LOGIC:\r
    const self: Reactor = {\r
        // Structural Data\r
        observables: new Set<Observable<any>>(),\r
        reaction: reaction,\r
        preaction: options.preaction,\r
        initFn: initFn,\r
\r
        // Configuration Flags & State\r
        auto_deps: auto_deps,\r
        auto_preaction: options.auto_preaction ?? true,\r
        paused: options.paused ?? false,\r
        reaction_paused: options.reaction_paused ?? false,\r
        preaction_paused: options.preaction_paused ?? false,\r
\r
        // Governance Schedulers\r
        reaction_schedule: options.reaction_schedule ?? null,\r
        preaction_schedule: options.preaction_schedule ?? null,\r
\r
\r
        // Methods\r
        detachObservables() {\r
            for (const dep of self.observables) {\r
                dep.reactors.delete(self);\r
            }\r
            self.observables.clear();\r
        },\r
\r
        schedule() {\r
            if (self.paused) return;\r
\r
            // Route Preaction\r
            if (self.preaction_schedule) {\r
                self.preaction_schedule.tasks.add(self.preact);\r
            } else {\r
                self.preact();\r
            }\r
\r
            // Route Reaction\r
            if (self.reaction_schedule) {\r
                self.reaction_schedule.tasks.add(self.react);\r
            } else {\r
                self.react();\r
            }\r
        },\r
\r
        preact() {\r
            if (self.paused || self.preaction_paused || !self.preaction) return;\r
\r
            self.preaction();\r
            // Dynamic cleanups clear themselves; manual custom preactions persist\r
            if (self.auto_preaction) {\r
                self.preaction = undefined;\r
            }\r
        },\r
\r
        react() {\r
            if (self.paused || self.reaction_paused) return;\r
\r
            if (self.auto_deps) {\r
                self.detachObservables(); // Unlink old dependencies before re-evaluating\r
\r
                setActiveReactor(self);\r
                const result = self.reaction();\r
                setActiveReactor(null);\r
\r
                if (self.auto_preaction && typeof result === "function") {\r
                    self.preaction = result;\r
                }\r
            } else {\r
                const result = self.reaction();\r
                if (self.auto_preaction && typeof result === "function") {\r
                    self.preaction = result;\r
                }\r
            }\r
        },\r
\r
        dispose() {\r
            self.preact();\r
            self.detachObservables();\r
        }\r
    };\r
\r
    // Attach explicit static dependencies if they exist\r
    if (options.deps) {\r
        for (const dep of options.deps) {\r
            dep.reactors.add(self);\r
            self.observables.add(dep);\r
        }\r
    }\r
\r
    // INITIALIZATION\r
    if (self.initFn && !self.paused && !self.reaction_paused) {\r
        if (self.auto_deps) {\r
            setActiveReactor(self);\r
            const result = self.initFn();\r
            setActiveReactor(null);\r
\r
            if (self.auto_preaction && typeof result === "function") {\r
                self.preaction = result;\r
            }\r
        } else {\r
            const result = self.initFn();\r
            if (self.auto_preaction && typeof result === "function") {\r
                self.preaction = result;\r
            }\r
        }\r
    }\r
\r
    return self;\r
}`,f=`// scheduler.ts\r
\r
export type Task = () => void;\r
\r
export interface Schedule {\r
    name: string;\r
    tasks: Set<Task>;\r
    auto_flush: boolean;\r
}\r
\r
export interface Scheduler {\r
    // State\r
    schedules: Set<Schedule>;\r
    flush_scheduled: boolean;\r
\r
    // Callables\r
    requestFlush(): void;\r
    getOrCreate(name: string, auto_flush?: boolean): Schedule;\r
    flush(schedule?: Schedule): void;\r
}\r
\r
export function Scheduler(): Scheduler {\r
\r
    const self: Scheduler = {\r
        schedules: new Set<Schedule>(),\r
        flush_scheduled: false,\r
\r
        requestFlush() {\r
            if (self.flush_scheduled) return;\r
\r
            self.flush_scheduled = true;\r
            queueMicrotask(() => {\r
                self.flush_scheduled = false;\r
                self.flush();\r
            });\r
        },\r
\r
        getOrCreate(name: string, auto_flush = true): Schedule {\r
            // Check for existing schedule\r
            for (const s of self.schedules) if (s.name === name) return s;\r
\r
            const tasks = new Set<Task>();\r
            const originalAdd = tasks.add.bind(tasks);\r
\r
            const schedule: Schedule = {\r
                name,\r
                tasks,\r
                auto_flush\r
            };\r
\r
            // Intercept add() using the live flag\r
            tasks.add = (task: Task) => {\r
                originalAdd(task);\r
                if (schedule.auto_flush) {\r
                    self.requestFlush();\r
                }\r
                return tasks;\r
            };\r
\r
            self.schedules.add(schedule);\r
            return schedule;\r
        },\r
\r
        flush(schedule?: Schedule) {\r
            // Case 1: Targeted Execution\r
            if (schedule) {\r
                if (!self.schedules.has(schedule) || schedule.tasks.size === 0) return;\r
\r
                const tasks = [...schedule.tasks];\r
                schedule.tasks.clear();\r
                for (const t of tasks) t();\r
                return;\r
            }\r
\r
            // Case 2: Global Execution Pipeline\r
            for (const s of self.schedules) {\r
                if (s.tasks.size === 0) continue;\r
\r
                const tasks = [...s.tasks];\r
                s.tasks.clear();\r
                for (const t of tasks) t();\r
            }\r
        }\r
    };\r
\r
    return self;\r
}`,p=()=>n(`reactive`,`Observables and Reactors`,`An Observable holds a value that can be observed for changes. A Reactor runs a function, and runs it again when an Observable it depends on changes. They are introduced together because each needs the other.`,[`## counter | An Observable and a Reactor`,l(`counter`,{observers:`open`,text:`<p>A button and a line of text that shows how often it was pressed. The code is running, and the button under it is its result. Edit the code and the result updates when you stop typing.</p>
               <p>The rectangle marks the lines described below. <em>Next</em> moves it.</p>`,tour:[[`elements`,`Two elements`,`<p>A button and an output, created with the DOM API. ExciteJS does not create elements; it decides when code that updates them runs.</p>`],[`state`,`The Observable`,`<p><code>Observable(0)</code> creates an Observable whose value is 0. The value is read and written as <code>count.value</code>.</p>`],[`react`,`The Reactor`,`<p><code>Reactor(fn)</code> runs <code>fn</code> immediately. <code>fn</code> reads <code>count.value</code>, and reading <code>.value</code> while a Reactor is running subscribes that Reactor to the Observable.</p><p>From then on, every assignment to <code>count.value</code> runs <code>fn</code> again.</p>`],[`write`,`The assignment`,`<p><code>count.value++</code> assigns a new value. The assignment runs the subscribed Reactor before it returns, so the text is already updated on the next line of code.</p>`]]}),`<p>The table under the result lists each Observable in the code, its value, and the Reactors subscribed to it, with how often each has run.</p>
     <p>Remove the <code>Reactor(() =&gt; { … })</code> wrapper so that only the <code>output.textContent = …</code> line remains. The text is then set once and stays at “count is 0”, and the table shows no Reactor next to <code>count</code>.</p>`,s(`The source of Observable`,c(`src/core/observable.ts`,u,`export function Observable<T>`,`return self;`,[[`_value: init_value`,"The value is stored in an ordinary field, `_value`."],[`reactors: new Set`,`The Reactors subscribed to this Observable.`],[`trigger() {`,`Runs each subscribed Reactor (or queues it, if it has a stage).`],["// Define `value`","Reading `.value` returns `_value`. If a Reactor is running at that moment, it is added to `reactors` first. This is the subscription."],[`// The 'set' keyword`,"Writing `.value` stores the new value and calls `trigger()`. The new value is not compared with the old one."]],2)),`## double | Exercise: a second Reactor`,l(`double`,{observers:`open`,exercise:{task:`<p>The second output, <code>twice</code>, is empty. Make it show “twice is …” with double the count.</p><p>The check presses the button three times and expects “twice is 6”.</p>`,hint:`<p>Add another <code>Reactor</code> whose function sets <code>twice.textContent</code> from <code>count.value * 2</code>.</p>`,check:e=>(e.click(`button`,3),e.text().includes(`twice is 6`))}}),`<p>When it is solved the table shows two Reactors subscribed to <code>count</code>. The click handler is unchanged: it assigns the Observable and has no reference to either Reactor.</p>`,`## deps | Dependencies: detected automatically, or given as a list`,`<p>A Reactor reacts to a change observed in the Observables in its dependency list, <code>deps</code>. This list can be set manually, or detected automatically.</p>`,l(`greeting`,{observers:`open`,open:`main.js`,text:`<p><code>greet</code> prints a greeting to the console, and the Reactor <code>greeter</code> runs it. One button logs in and out, the other changes the name. The two buttons are in <code>index.html</code>.</p><p>Across the four steps only the line that creates the Reactor changes. The table under the console shows which Observables <code>greeter</code> depends on.</p>`,steps:[{title:`Automatic: the dependencies are what the last run read`,focus:`greeter`,code:`const greeter = Reactor(greet);`,text:`<p>No list is given, so the Reactor detects its dependencies. On every run, the Observables whose <code>.value</code> the reaction reads become the list.</p><p>The first run printed “Please log in”. It read <code>logged_in</code> and never reached the line that reads <code>user_name</code>, so <code>user_name</code> is not a dependency: press <em>change the name</em> and nothing is printed.</p><p>Log in. That run reads both, so both are dependencies, and changing the name prints a new greeting. Log out and <code>user_name</code> is off the list again.</p><p>Two things can be changed about an automatic Reactor, and the next steps show them: it can be given an <code>initFn</code> other than the default (step 3), and a Reactor can be switched between automatic and manual after it was created (step 4).</p>`},{title:`Manual: a deps list`,focus:`greeter`,code:`const greeter = Reactor(greet, { deps: [logged_in] });`,text:`<p><code>deps: [logged_in]</code> sets the list by hand. The Reactor depends on <code>logged_in</code> and on nothing else, whatever <code>greet</code> reads.</p><p>Log in, then change the name: nothing is printed, although <code>greet</code> reads <code>user_name</code>. The new name appears the next time <code>logged_in</code> changes.</p><p>The console also starts empty. A Reactor with a <code>deps</code> list does not run when it is created.</p>`},{title:`initFn: what runs at creation`,focus:`greeter`,code:`const greeter = Reactor(greet, { deps: [logged_in], initFn: true });`,text:`<p><code>initFn</code> sets what runs inside the <code>Reactor()</code> call. <code>true</code> runs the reaction once at creation, so “Please log in” is printed at the start.</p><p><code>false</code> runs nothing. A function runs that function once in place of the reaction; try <code>initFn: () =&gt; console.log("hello")</code>.</p><p>The default is <code>true</code> without <code>deps</code>, because an automatic Reactor has to run once to detect anything, and <code>false</code> with <code>deps</code>. Either kind of Reactor accepts any of the three.</p>`},{title:`auto_deps: switching between automatic and manual`,focus:`greeter`,code:`greeter.auto_deps = !greeter.auto_deps;`,text:`<p>The dependency list is the Reactor's <code>observables</code> field. Automatic detection means the Reactor refills that field on every run; a <code>deps</code> option fills it once, at creation.</p><p>Which of the two a Reactor does is its field <code>auto_deps</code>, and it can be set at any time. This step is the automatic Reactor from step 1, with a third button that toggles the field.</p><p>While logged out, switch <code>auto_deps</code> off and log in. The greeting is printed, but the list is no longer refilled, so <code>user_name</code> is not added and changing the name prints nothing. Switch it on again, and the next run detects both. The same field turns a Reactor created with <code>deps</code> into an automatic one.</p>`}]}),s(`The source of a Reactor's run`,c(`src/core/reactor.ts`,d,`react() {`,`dispose() {`,[[`self.detachObservables();`,`Unsubscribes from every Observable of the previous run.`],[`setActiveReactor(self);`,"Marks this Reactor as the running one, calls the function, then clears the mark. While the mark is set, any read of `.value` subscribes this Reactor."],[`if (self.auto_preaction && typeof result`,`If the function returned a function, it is stored as the preaction (described below).`],[`} else {`,"A Reactor created with `deps` skips the tracking and only calls the function."]])),i(`Only reads made during the run are tracked`,`<p>The mark is set only while the Reactor's function executes. A read inside a <code>setTimeout</code> callback, after an <code>await</code>, or in an event handler happens later and subscribes nothing. If a reaction needs a value later, read it into a variable during the run.</p>`),i(`A Reactor that reads and writes the same Observable`,`<p>In a Reactor that tracks its reads, <code>count.value++</code> reads <code>count</code> (which subscribes the Reactor) and then writes it (which runs the Reactor again), without end. In the first lab of this section, put <code>count.value++</code> inside the Reactor to see the error the lab reports.</p><p>To write an Observable from a Reactor that should not depend on it, read it through <code>_value</code>, which does not subscribe: <code>count.value = count._value + 1</code>. Or give the Reactor <code>deps</code>.</p>`),`## preaction | Preactions: undoing the previous run`,l(`stamp`,{observers:`open`,text:`<p>A button cycles through two stamps on a canvas: a square and a circle. The current one is held in the Observable <code>shape</code>, and a Reactor stamps it.</p>`,steps:[{title:`Each run leaves its stamp behind`,text:`<p>The Reactor <code>stamper</code> reads <code>shape.value</code>, creates an element for that shape and adds it to the board. Every change of <code>shape</code> runs it again and adds another element.</p><p>Press the button a few times. The circle is stamped over the square and the count goes up.</p>`},{title:`A preaction removes the previous stamp`,focus:`stamper`,code:`
const stamper = Reactor(() => {
    …
    return () => stamp.remove();
});`,text:`<p>When a Reactor's function returns a function, the Reactor stores it and calls it immediately before its next run. ExciteJS calls this stored function the <em>preaction</em>.</p><p>The returned function removes the stamp its own run added. On a change of <code>shape</code>, the preaction removes the old stamp and then the reaction adds the new one. The count stays at 1.</p>`},{title:`dispose() and react()`,text:`<p><code>dispose()</code> calls the stored preaction and unsubscribes the Reactor. The stamp is removed and the button has no effect.</p><p><code>react()</code> runs the function again, which stamps the current shape and subscribes the Reactor to <code>shape</code> as before.</p>`}]}),`<p>The same applies to anything a run starts and the next run should not inherit: an element, a timer, an event listener.</p>`,`## mutation | Exercise: a change inside an array`,l(`todo`,{observers:`open`,exercise:{task:`<p>The button should add an item to the list, and nothing appears. In the table, <code>items</code> grows with each press while the Reactor's run count stays the same.</p><p>Fix the marked line. The check presses the button once and expects one list entry.</p>`,hint:`<p>Reactors run on an assignment to <code>.value</code>. <code>items.value.push(…)</code> changes the array that is already there and assigns nothing. Assign a new array: <code>items.value = [...items.value, …]</code>. Or keep the push and call <code>items.trigger()</code> after it.</p>`,check:e=>(e.click(`button`),e.all(`li`).length===1)}}),`<p>An Observable does not watch the inside of the value it holds. The four operations on an Observable:</p>
     <ul>
       <li><code>obs.value = x</code> stores <code>x</code> and runs the subscribed Reactors.</li>
       <li><code>obs.trigger()</code> runs the subscribed Reactors and leaves the value as it is.</li>
       <li><code>obs._value = x</code> stores <code>x</code> and runs nothing.</li>
       <li>Reading <code>obs._value</code> returns the value without subscribing the running Reactor.</li>
     </ul>`,`## control | Pausing a Reactor`,l(`remote`,{observers:`open`,text:`<p><code>ticks</code> goes up every 0.8 seconds and the Reactor <code>display</code> shows it. The buttons set fields and call methods on the Reactor object that <code>Reactor()</code> returned.</p>
               <p>With <code>paused</code> set, the heading stops while <code>ticks</code> keeps counting in the table. A change that arrives during a pause is dropped: after unpausing, the heading updates at the next tick. Call <code>react()</code> to update it at once.</p>`}),`## sync | Two assignments run a Reactor twice`,l(`person`,{observers:`open`,text:`<p>The button assigns two Observables, <code>first</code> and <code>last</code>. The Reactor adds a line with the full name to the list each time it runs.</p>
               <p>Press the button once. Two lines are added, and the first is “Grace Lovelace”: a first name from one person and a last name from the other.</p>`,tour:[[`write`,`Two assignments`,`<p>Each assignment runs the subscribed Reactor before the next line executes. After the first one, <code>first</code> is already “Grace” and <code>last</code> is still “Lovelace”.</p>`],[`react`,`A Reactor that reads both`,`<p>It runs once per assignment. The first run sees a state that exists only between the two lines of the click handler.</p>`]]}),`<p>The second run shows the correct name, so the final state is right. The extra run with mixed values is what the next section removes.</p>`]),m=()=>n(`scheduler`,`Schedulers`,`A Scheduler holds named stages. A Reactor that has been given a stage is queued on it when triggered. After the code that caused the triggers has finished, each stage runs what is queued on it, once.`,[`## stages | One run for several assignments`,l(`stages`,{observers:`open`,text:`<p>The two names from the previous lab.</p>`,steps:[{title:`Without a Scheduler`,text:`<p>Two lines per click, the first with mixed names.</p>`},{title:`A stage`,focus:`render`,code:`
const scheduler = Scheduler();
const render = scheduler.getOrCreate("render");
…
Reactor(() => {
    …
}, { reaction_schedule: render });`,text:`<p>The Reactor is given a stage with <code>reaction_schedule</code>. An assignment now adds the Reactor to that stage's queue. The queue is a Set, so two assignments add it once.</p><p>When the click handler has returned, the Scheduler runs the queue. One line per click, with matching names.</p>`},{title:`Two stages run in the order they were created`,focus:`compute`,code:`
const compute = scheduler.getOrCreate("compute");
const render = scheduler.getOrCreate("render");
…
Reactor(() => {
    full.value = \`\${first.value} \${last.value}\`;
}, { reaction_schedule: compute });`,text:`<p>A second Reactor, on a stage named <code>compute</code>, writes the full name into another Observable, <code>full</code>, and the list Reactor now reads <code>full</code>.</p><p><code>compute</code> was created before <code>render</code>, so everything queued on it runs first. The list Reactor runs after <code>full</code> is up to date, and still once per click.</p>`}]}),`<p>The queue runs in a microtask: after the current code has returned, and before the browser paints or handles another event. The first run of a Reactor, at creation, is not queued.</p>`,s(`The source of a stage and of flush()`,c(`src/core/scheduler.ts`,f,`getOrCreate(name: string`,`flush(schedule?: Schedule) {`,[[`for (const s of self.schedules)`,`A stage is found by name, so separate parts of a program can share one.`],[`const tasks = new Set<Task>();`,`The queue is a Set, which holds each Reactor once.`],[`// Intercept add()`,`Adding a task also requests a flush on the next microtask, unless the stage is manual.`]]),c(`src/core/scheduler.ts`,f,`flush(schedule?: Schedule) {`,`return self;`,[[`// Case 1`,"`flush(stage)` runs one stage now."],[`// Case 2`,"`flush()` runs every stage in order. A stage's queue is copied and cleared before its tasks run, so a task that queues work on a later stage sees it run in the same flush."]])),`## batch | Exercise: one run for three assignments`,l(`batch`,{exercise:{task:`<p>The button assigns three Observables (red, green, blue). The Reactor that colors the swatch runs after each assignment and writes “painted” to the console three times. Make it run once per click.</p><p>The check clicks the button and expects one new “painted” line.</p>`,hint:`<p>Import <code>Scheduler</code>, create a stage with <code>Scheduler().getOrCreate("render")</code>, and pass <code>{ reaction_schedule: render }</code> as the Reactor's second argument.</p>`,check:async e=>{await e.wait(20);let t=e.logs().length;return e.click(`button`),await e.wait(30),e.logs().length-t===1}}}),`## manual | A manual stage, run once per frame`,l(`trail`,{observers:`open`,text:`<p>Move the pointer over the grey area and the dot follows. The line under it counts the pointer events received and the times the dot was moved.</p>
               <p>A pointer can send several events between two screen updates. Only the last position can be seen, so the dot is moved once per animation frame.</p>`,tour:[[`stage`,`A manual stage`,`<p><code>getOrCreate(name, false)</code> creates a stage that the Scheduler does not run by itself. Its queue waits for <code>flush(stage)</code>.</p><p>It has its own Scheduler because <code>flush()</code> without an argument runs every stage of a Scheduler, manual ones included.</p>`],[`note`,`The event handler`,`<p>It assigns <code>pointer</code>. The Reactor <code>follow</code> is subscribed to it and has the manual stage, so each assignment queues it, once however many events arrive.</p>`],[`apply`,`The Reactor`,`<p>Runs when the stage is flushed and uses the latest position.</p>`],[`frame`,`The flush`,`<p>A <code>requestAnimationFrame</code> loop flushes the stage. Press the button: 500 events are received and the dot is moved once.</p>`]]}),`<p>Observable, Reactor and Scheduler are the whole library. The <a href="./docs.html">docs page</a> lists every option and field. The following sections build things with them.</p>`]),h=()=>n(`app`,`Building a page`,`ExciteJS has no component system, template language or router. This section builds a small app to show how each of those is written with Observables, Reactors and the DOM.`,[`## goal | The finished app`,l(`brew`,{peek:!0,address:!0,observers:`none`,view_height:300,text:`<p>Brew is a tea timer. Pick a tea and press Brew: the clock counts down, the cup takes on the tea's color, and a finished cup is added to the Log page. The clock runs ten times faster than real time, so Green tea takes about twelve seconds.</p>
               <p>It contains what most small apps contain: state shared between parts, a list built from data, a timer that has to be stopped, two pages, and data kept between visits. The next part builds it from an empty page.</p>`}),`## steps | Step by step`,l(`brew`,{address:!0,view_height:300,text:`<p>Seven steps. Each adds a few lines, marked green, sometimes in a new file (a green dot on its tab). The code can be edited at any step; <em>Reset</em> restores the step.</p>`,steps:[{title:`Three files`,text:`<p><code>index.html</code> contains an empty <code>&lt;main&gt;</code> and loads <code>main.js</code>. <code>main.js</code> finds that element and adds a heading. <code>style.css</code> sets spacing.</p><p>Nothing changes on this page yet, so nothing from ExciteJS is used.</p>`},{title:`State in its own file`,text:`<p><code>state.js</code> exports the list of teas and one Observable, <code>picked</code>, holding the selected tea. The list is a constant because it never changes; <code>picked</code> is an Observable because parts of the page will need to update when it does.</p><p>A file that imports <code>picked</code> gets the same Observable as every other file, which is how state is shared here. For now <code>main.js</code> shows the picked tea with one Reactor. Change <code>TEAS[0]</code> to <code>TEAS[2]</code> in <code>state.js</code> to see it update.</p>`},{title:`A component`,text:`<p><code>components/TeaCard.js</code> exports a function that takes a tea and returns a button. Inside it does three things: it creates the element; it assigns <code>picked</code> when clicked; and it creates a Reactor that adds or removes the <code>is-picked</code> class.</p><p><code>main.js</code> calls it once per tea with <code>TEAS.map(TeaCard)</code>. Each card has its own Reactor, and all four depend on <code>picked</code>. Clicking a card runs all four; each compares <code>picked.value</code> with its own tea.</p>`},{title:`A second component, and a rule in state.js`,text:`<p><code>components/Timer.js</code> shows <code>seconds_left</code> as minutes and seconds.</p><p><code>state.js</code> gains a Reactor that sets <code>seconds_left</code> to the picked tea's time. It has <code>deps: [picked]</code>, so it runs when the tea changes and at no other time. It lives in <code>state.js</code> because it describes how two pieces of state relate, independent of any component.</p>`},{title:`The clock`,text:`<p><code>brewing</code> is a boolean Observable, toggled by a new button in the Timer.</p><p>A Reactor in <code>state.js</code> reads <code>brewing.value</code>. When it is true, the Reactor starts an interval that decrements <code>seconds_left</code>, and returns a function that clears the interval. That function is the preaction: it runs before the Reactor's next run. So pausing stops the interval, and so does picking another tea, because the rule from step 4 now also sets <code>brewing</code> to false.</p>`},{title:`The cup`,text:`<p><code>components/Cup.js</code> has one Reactor that writes two CSS variables on its element: the tea's color, and the fraction of the brewing time that has passed. The stylesheet turns those into the fill color. No elements are created or removed when the values change.</p>`},{title:`Two pages and a saved log`,text:`<p><code>state.js</code> gains <code>log</code>, an Observable holding an array read from <code>localStorage</code>. A finished brew assigns a new array with one more entry, and a one-line Reactor writes the array back to <code>localStorage</code> whenever it changes.</p><p><code>main.js</code> becomes a router. <code>route</code> is an Observable holding the address after <code>#</code>. One Reactor adds the page for the current route to the document and returns a function that removes it, so the previous page is removed before the next is added.</p><p>Brew a cup, open the Log, then press <em>Run again</em>: the app restarts and the entry is still listed.</p>`}],tour:[[`state`,`The state`,`<p>Every Observable the app has, exported from one file. Components import the ones they use.</p>`],[`reset`,`A rule between two Observables`,`<p>When <code>picked</code> changes, the clock is reset and brewing stops.</p>`],[`clock`,`The clock, with its cleanup`,`<p>Runs an interval while <code>brewing</code> is true. The returned function clears it before the next run.</p>`],[`save`,`Saving`,`<p>Reads <code>log.value</code>, so it runs whenever <code>log</code> is assigned.</p>`],[`element`,`A component creates its element once`,`<p>The element is built when the component function is called. It is not rebuilt later.</p>`],[`out`,`It writes state from event handlers`,`<p>A click assigns <code>picked</code>.</p>`],[`in`,`It updates itself with a Reactor`,`<p>The only part of the card that changes is one class, and this Reactor sets it.</p>`],[`route`,`The address as an Observable`,`<p><code>route</code> starts from <code>location.hash</code> and is assigned again on every <code>hashchange</code> event.</p>`],[`links`,`One Reactor per link`,`<p>Each marks its link when the link's address equals the route.</p>`],[`router`,`Adding and removing pages`,`<p>The brew page is created once and kept, so the clock keeps running while the log is open. The log page is created on each visit, and the cleanup removes it and disposes its Reactor.</p><p>The Reactor reads <code>route.value</code> before it creates a page. Creating a Reactor inside a running Reactor ends the outer one's dependency tracking for the rest of that run, so the outer one must read what it depends on first.</p>`]]}),`<p>When a tea is picked, no component function runs again. A few Reactors run, and each sets one class, one text or one CSS variable on an element it already holds.</p>`,`## exercises | Exercises`,`<p>These use step 7 of the lab above.</p>`,a(`<p><strong>A fifth tea.</strong> Add a white tea that brews for 90 seconds and uses the palette's cyan.</p>`,`<p>One line in the <code>TEAS</code> array in <code>state.js</code>. The cards are built from that array, and everything else depends on <code>picked</code>, so no other file changes.</p>`,o(`{ name: "White", seconds: 90, color: "var(--cyan)" },`)),a(`<p><strong>A “+30 s” button.</strong> Add a button to the Timer that adds 30 seconds to the clock.</p>`,`<p>In <code>components/Timer.js</code>, before <code>return box</code>. The button only assigns <code>seconds_left</code>; the display and the cup already depend on it.</p>`,o(`
const more = document.createElement("button");
more.className = "quiet";
more.textContent = "+30 s";
more.onclick = () => seconds_left.value += 30;
box.append(more);`)),a(`<p><strong>A count in the navigation.</strong> Make the Log link read “Log (3)” when three cups have been brewed.</p>`,`<p>In <code>main.js</code>, after the navigation is created.</p>`,o(`
import { log } from "./state.js";

Reactor(() => {
    nav.children[1].textContent = log.value.length ? \`Log (\${log.value.length})\` : "Log";
});`)),a(`<p><strong>Clear the log.</strong> Add a button to the log page that empties the log.</p>`,`<p>In <code>pages/LogPage.js</code>. Assigning an empty array is enough: the saving Reactor in <code>state.js</code> depends on <code>log</code> and writes the empty array to <code>localStorage</code>.</p>`,o(`
const clear = document.createElement("button");
clear.textContent = "Clear";
clear.onclick = () => log.value = [];
node.append(clear);`)),`## summary | What the app is made of`,`<ul>
       <li><strong>A component</strong> is a function that creates an element, assigns Observables from its event handlers, and creates Reactors for the parts of the element that change.</li>
       <li><strong>Shared state</strong> is a file that exports Observables.</li>
       <li><strong>A rule between pieces of state</strong> is a Reactor in that file.</li>
       <li><strong>Showing and removing a page</strong> is a Reactor that adds an element and returns a function that removes it.</li>
       <li><strong>A route</strong> is an Observable assigned from <code>hashchange</code>.</li>
       <li><strong>Saved data</strong> is a Reactor that writes an Observable to storage.</li>
     </ul>
     <p>Two things are done by hand that larger frameworks automate: creating elements, and disposing Reactors. A Reactor that only touches its own element can be discarded together with the element. A component that owns a timer or an event listener, or whose Reactors depend on long-lived state, should return a <code>dispose</code> function, as <code>LogPage</code> does.</p>`]),g=`// camera.ts\r
//\r
// A pan and zoom camera for any element (usually a stack of canvases), built\r
// on Observables and a Scheduler. It knows nothing about what is drawn: it\r
// publishes a \`view\` (where it looks in the world) and a \`screen\` (what it\r
// looks through), and whatever draws reads them, usually a Layer (layer.ts).\r
//\r
//   Camera ──► view, screen ──► Layer ──► paint(brush, ...) ──► pixels\r
//\r
// Camera() returns a plain object, in the core's style. Its API is the\r
// Observables, the settings (plain mutable fields) and the methods. The\r
// working state (the view in progress, the target, the fling, the\r
// pointers, the input stage, the listeners) lives in one \`_\` object: still\r
// reachable, like an Observable's \`_value\`, for debugging or bending, but it\r
// is the implementation, not the API, and may change.\r
//\r
//   pointer / wheel / gesture / key events\r
//        │  record positions, queue a task; nothing moves yet\r
//        ▼\r
//   [input stage: manual, its own Scheduler]  drained once per frame\r
//        │\r
//        ▼\r
//   advance(now), once per animation frame:\r
//     1. drain the input stage: drags, pinches, hover\r
//     2. momentum after a fling\r
//     3. ease the current view toward the target (zoom about an anchor)\r
//     4. keep the world on screen (\`world_bounds\`)\r
//     5. publish: write \`view\` at most once\r
//\r
// View: (x, y) is the world point at the center of the screen, and\r
// \`scale\` is screen pixels per world unit. Screen coordinates are relative to\r
// the element's top-left corner, in CSS pixels.\r
//\r
// Inputs:\r
//   mouse      drag (left or middle) pans; wheel zooms about the cursor;\r
//              shift+wheel pans sideways; double-click zooms in (shift: out)\r
//   trackpad   two-finger scroll pans; pinch zooms (ctrl+wheel in Chromium\r
//              and Firefox, gesture events in Safari)\r
//   touch      one finger pans, with a fling; two fingers pinch and pan;\r
//              double-tap zooms in\r
//   pen        like a mouse\r
//   keyboard   (element focused) arrows pan, + and − zoom, 0 goes home\r
//\r
// A mouse wheel and a trackpad both send \`wheel\` events. In "auto" wheel mode\r
// each burst is classified once, from its first event: whole-line deltas, or\r
// large whole-pixel vertical steps, are a mouse wheel (zoom); anything else\r
// is a trackpad (pan). Set \`wheel_mode\` to "zoom" or "pan" to override.\r
//\r
// Why a manual stage: a pointer can fire several moves per frame. Each move\r
// only records the position and adds the same task to the stage. Tasks are a\r
// Set, so however many moves arrive, the gesture is applied once per frame\r
// with the latest positions. The stage has a Scheduler of its own, so no\r
// other flush can drain it early (see "Manual stages" in the README).\r
//\r
// Smoothing unaligned input: pointer events (mouse drags, touch) arrive once\r
// per frame, so applying them directly moves the view evenly. Wheel events\r
// (touchpad scrolls and pinches) and Safari's gesture events arrive whenever\r
// the device sends them: two in one frame, none in the next. Applied\r
// directly, the view would move in uneven stop-go steps. So they steer the\r
// target instead, and the view eases toward it every frame with a short time\r
// constant (\`smooth_ms\`): even motion for about a frame of lag.\r
//\r
// Easing a zoom about an anchor: interpolating x, y and scale separately\r
// makes the point under the cursor drift. Instead the scale is interpolated\r
// on a log scale, the world point under the anchor linearly, and the camera\r
// is rebuilt around that point. For a pure zoom both cameras have the same\r
// world point under the anchor, so it stays exactly still.\r
\r
import { Observable, Reactor, Scheduler, type Schedule } from "../../core/index";\r
\r
export interface View { x: number; y: number; scale: number }\r
export interface Screen { w: number; h: number; dpr: number }\r
export interface Rect { x0: number; y0: number; x1: number; y1: number }\r
export interface Point { x: number; y: number }\r
export interface Target extends View { ax: number; ay: number } // ax, ay: the screen point a zoom is anchored to\r
export type WheelMode = "auto" | "zoom" | "pan";\r
export type InputKind = "none" | "mouse" | "pen" | "touch" | "wheel" | "trackpad" | "keyboard";\r
export interface Tap { sx: number; sy: number; x: number; y: number; kind: InputKind; count: number; shift: boolean }\r
export interface Hover { sx: number; sy: number }\r
export interface PointerState { x: number; y: number; start_x: number; start_y: number; t0: number; kind: InputKind; moved: boolean }\r
type Listener = [EventTarget, string, EventListener, AddEventListenerOptions?];\r
\r
// Anything that says where to look: a Camera (moved by input), or a\r
// FixedCamera (framed on a rect). A Layer paints whatever its source sees.\r
export interface ViewSource {\r
    view: Observable<View>;\r
    screen: Observable<Screen>;\r
}\r
\r
export interface Camera {\r
    element: HTMLElement;\r
\r
    // Published state\r
    view: Observable<View>;           // what the camera looks at\r
    screen: Observable<Screen>;       // what it looks through: the element's size and pixel ratio\r
    zoom_limits: Observable<{ min: number; max: number }>;\r
    world_bounds: Observable<Rect | null>; // the world rect the view is kept on (see \`overscroll\`)\r
    wheel_mode: Observable<WheelMode>;\r
    pointer_down: Observable<boolean>;\r
    last_input: Observable<InputKind>;  // what moved the camera last\r
    hover: Observable<Hover | null>;    // mouse / pen position while not dragging\r
    tap: Observable<Tap | null>;        // the latest press-and-release without a drag\r
\r
    // Settings (mutable)\r
    zoom_ms: number;          // easing time constant of mouse-wheel zooms, buttons and keyboard moves\r
    smooth_ms: number;        // easing time constant that evens out touchpad and gesture input\r
    friction_ms: number;      // decay time constant of a fling\r
    wheel_speed: number;      // zoom per pixel of mouse wheel\r
    pinch_speed: number;      // zoom per pixel of trackpad pinch\r
    keyboard: boolean;\r
    double_tap: boolean;\r
    momentum: boolean;\r
    auto_advance: boolean;    // true: advances itself while moving; false: the host calls advance(now) every frame\r
    tap_slop: Record<string, number>; // px a press may wander and still be a tap\r
    overscroll: number;       // how far past \`world_bounds\` the view may go, as a fraction of the screen\r
    home_view: () => View;    // where goHome() and the 0 key go\r
\r
    // Internals: reachable for debugging, not part of the API\r
    _: CameraInternals;\r
\r
    // Geometry (on the published camera)\r
    toWorld(sx: number, sy: number): Point;\r
    toScreen(wx: number, wy: number): Point;\r
    visibleWorld(): Rect;\r
\r
    // Moves (animate defaults to true)\r
    zoomAt(factor: number, sx?: number, sy?: number, animate?: boolean): void;\r
    zoomTo(scale: number, animate?: boolean): void;\r
    panBy(dx: number, dy: number, animate?: boolean): void;\r
    lookAt(cam: View, animate?: boolean): void;\r
    fit(rect: Rect, padding?: number, animate?: boolean): void;\r
    goHome(animate?: boolean): void;\r
    stop(): void; // halt easing and momentum where they are\r
\r
    // Frame\r
    advance(now: number): boolean; // one frame; true while anything still moves\r
    isMoving(): boolean;\r
    requestAdvance(): void;        // make sure an advance is coming (like Scheduler.requestFlush)\r
    measure(): void;               // re-read the element's size and pixel ratio\r
    dispose(): void;\r
}\r
\r
export interface CameraInternals {\r
    current: View;            // the view being built this frame\r
    target: Target;           // where easing is heading\r
    ease_ms: number;          // time constant of the current easing (zoom_ms or smooth_ms)\r
    velocity: Point;          // fling, px per ms\r
    pointers: Map<number, PointerState>;\r
    gesture: { cx: number; cy: number; dist: number; count: number } | null;\r
    samples: { t: number; x: number; y: number }[]; // recent gesture centroids, for the fling\r
    hover_at: Hover | null;\r
    last_tap: { t: number; x: number; y: number } | null;\r
    wheel_kind: "mouse" | "trackpad";\r
    last_wheel: number;\r
    last_move: number;        // time of the last pointer move while pressed\r
    last_time: number;\r
    frame_id: number;\r
    dirty: boolean;           // \`current\` differs from the published view\r
    input: Scheduler;         // its own Scheduler, so nothing else drains the input stage\r
    input_stage: Schedule;\r
    listeners: Listener[];\r
    reactors: Reactor[];\r
}\r
\r
export interface CameraOptions {\r
    view?: View;\r
    min_scale?: number;\r
    max_scale?: number;\r
    world_bounds?: Rect | null;\r
    wheel_mode?: WheelMode;\r
    home_view?: () => View;\r
    zoom_ms?: number;\r
    smooth_ms?: number;\r
    friction_ms?: number;\r
    wheel_speed?: number;\r
    keyboard?: boolean;\r
    double_tap?: boolean;\r
    momentum?: boolean;\r
    auto_advance?: boolean;\r
    overscroll?: number;\r
}\r
\r
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));\r
const TAP_MS = 350;\r
const DOUBLE_TAP_MS = 320;\r
const DOUBLE_TAP_PX = 30;\r
const WHEEL_GAP_MS = 220;   // silence that ends a wheel burst\r
const FLING_WINDOW_MS = 90; // movement this recent sets the fling velocity\r
const MAX_FLING = 5;        // px per ms\r
const reduced_motion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;\r
\r
export function Camera(element: HTMLElement, options: CameraOptions = {}): Camera {\r
    const start: View = { ...(options.view ?? { x: 0, y: 0, scale: 1 }) };\r
\r
    const self: Camera = {\r
        element,\r
\r
        view: Observable<View>({ ...start }),\r
        screen: Observable<Screen>(readScreen()),\r
        zoom_limits: Observable({ min: options.min_scale ?? 0.05, max: options.max_scale ?? 50 }),\r
        world_bounds: Observable<Rect | null>(options.world_bounds ?? null),\r
        wheel_mode: Observable<WheelMode>(options.wheel_mode ?? "auto"),\r
        pointer_down: Observable(false),\r
        last_input: Observable<InputKind>("none"),\r
        hover: Observable<Hover | null>(null),\r
        tap: Observable<Tap | null>(null),\r
\r
        zoom_ms: options.zoom_ms ?? 90,\r
        smooth_ms: options.smooth_ms ?? 40,\r
        friction_ms: options.friction_ms ?? 320,\r
        wheel_speed: options.wheel_speed ?? 0.0022,\r
        pinch_speed: 0.01,\r
        keyboard: options.keyboard ?? true,\r
        double_tap: options.double_tap ?? true,\r
        momentum: options.momentum ?? true,\r
        auto_advance: options.auto_advance ?? true,\r
        tap_slop: { mouse: 4, pen: 6, touch: 10 },\r
        overscroll: options.overscroll ?? 0.2,\r
        home_view: options.home_view ?? (() => ({ ...start })),\r
\r
        _: {\r
            current: { ...start },\r
            target: { ...start, ax: 0, ay: 0 },\r
            ease_ms: options.zoom_ms ?? 90,\r
            velocity: { x: 0, y: 0 },\r
            pointers: new Map(),\r
            gesture: null,\r
            samples: [],\r
            hover_at: null,\r
            last_tap: null,\r
            wheel_kind: "mouse",\r
            last_wheel: 0,\r
            last_move: 0,\r
            last_time: 0,\r
            frame_id: 0,\r
            dirty: false,\r
            input: Scheduler(),\r
            input_stage: null as unknown as Schedule, // set below\r
            listeners: [],\r
            reactors: [],\r
        },\r
\r
        //// Geometry\r
\r
        toWorld: (sx, sy) => worldAt(self.view._value, sx, sy),\r
        toScreen(wx, wy) {\r
            const { w, h } = self.screen._value, c = self.view._value;\r
            return { x: w / 2 + (wx - c.x) * c.scale, y: h / 2 + (wy - c.y) * c.scale };\r
        },\r
        visibleWorld() {\r
            const { w, h } = self.screen._value, c = self.view._value;\r
            return { x0: c.x - w / 2 / c.scale, y0: c.y - h / 2 / c.scale, x1: c.x + w / 2 / c.scale, y1: c.y + h / 2 / c.scale };\r
        },\r
\r
        //// Moves\r
\r
        zoomAt(factor, sx = self.screen._value.w / 2, sy = self.screen._value.h / 2, animate = true) {\r
            self._.velocity = { x: 0, y: 0 };\r
            steer(0, 0, factor, sx, sy, self.zoom_ms);\r
            if (!animate) snapToTarget();\r
        },\r
\r
        zoomTo: (scale, animate = true) => self.zoomAt(scale / self._.target.scale, undefined, undefined, animate),\r
\r
        panBy(dx, dy, animate = true) {\r
            self._.velocity = { x: 0, y: 0 };\r
            if (!animate) { shiftBoth(dx, dy); self.requestAdvance(); return; }\r
            steer(dx, dy, 1, self.screen._value.w / 2, self.screen._value.h / 2, self.zoom_ms);\r
        },\r
\r
        lookAt(c, animate = true) {\r
            const { min, max } = self.zoom_limits._value, { w, h } = self.screen._value;\r
            self._.velocity = { x: 0, y: 0 };\r
            self._.target = { x: c.x, y: c.y, scale: clamp(c.scale, min, max), ax: w / 2, ay: h / 2 };\r
            self._.ease_ms = self.zoom_ms;\r
            constrain(self._.target);\r
            if (!animate) snapToTarget();\r
            self.requestAdvance();\r
        },\r
\r
        fit(r, padding = 24, animate = true) {\r
            const { w, h } = self.screen._value;\r
            const scale = Math.min((w - 2 * padding) / Math.max(1e-9, r.x1 - r.x0), (h - 2 * padding) / Math.max(1e-9, r.y1 - r.y0));\r
            self.lookAt({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, scale }, animate);\r
        },\r
\r
        goHome: (animate = true) => self.lookAt(self.home_view(), animate),\r
\r
        stop() {\r
            self._.velocity = { x: 0, y: 0 };\r
            self._.target = { ...self._.current, ax: self._.target.ax, ay: self._.target.ay };\r
        },\r
\r
        //// Frame\r
\r
        advance(now) {\r
            const dt = clamp(now - (self._.last_time || now - 16), 1, 64);\r
            self._.last_time = now;\r
            const reduce = reduced_motion?.matches ?? false;\r
            const w = self._.current, t = self._.target;\r
\r
            // 1. input\r
            self._.input.flush(self._.input_stage);\r
\r
            // 2. momentum\r
            if (!self._.pointers.size && (self._.velocity.x || self._.velocity.y)) {\r
                shiftBoth(self._.velocity.x * dt, self._.velocity.y * dt);\r
                const decay = Math.exp(-dt / self.friction_ms);\r
                self._.velocity = { x: self._.velocity.x * decay, y: self._.velocity.y * decay };\r
                if (Math.hypot(self._.velocity.x, self._.velocity.y) < 0.01) self._.velocity = { x: 0, y: 0 };\r
            }\r
\r
            // 3. ease toward the target, 4. keep the world on screen\r
            if (w.scale !== t.scale || w.x !== t.x || w.y !== t.y) {\r
                if (reduce) snapToTarget();\r
                else {\r
                    const k = 1 - Math.exp(-dt / self._.ease_ms);\r
                    const from = worldAt(w, t.ax, t.ay), to = worldAt(t, t.ax, t.ay);\r
                    const s = w.scale * Math.pow(t.scale / w.scale, k);\r
                    placeAt(w, from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, t.ax, t.ay, s);\r
                    constrain(w);\r
                    const close = Math.abs(Math.log(t.scale / s)) < 1e-4 && Math.hypot(w.x - t.x, w.y - t.y) * s < 0.05;\r
                    if (close) snapToTarget();\r
                    self._.dirty = true;\r
                }\r
            }\r
\r
            // 5. publish\r
            if (self._.dirty) {\r
                self._.dirty = false;\r
                self.view.value = { ...self._.current };\r
            }\r
            return self.isMoving();\r
        },\r
\r
        isMoving() {\r
            const w = self._.current, t = self._.target;\r
            return self._.pointers.size > 0 || self._.input_stage.tasks.size > 0 || self._.dirty\r
                || self._.velocity.x !== 0 || self._.velocity.y !== 0\r
                || w.scale !== t.scale || w.x !== t.x || w.y !== t.y;\r
        },\r
\r
        requestAdvance() {\r
            if (!self.auto_advance || self._.frame_id) return;\r
            const loop = (now: number) => {\r
                self._.frame_id = 0;\r
                if (self.advance(now)) self._.frame_id = requestAnimationFrame(loop);\r
                else self._.last_time = 0;\r
            };\r
            self._.frame_id = requestAnimationFrame(loop);\r
        },\r
\r
        measure() {\r
            const prev = self.screen._value, next = readScreen();\r
            if (prev.w === next.w && prev.h === next.h && prev.dpr === next.dpr) return;\r
            self.screen.value = next;\r
            self._.target.ax = next.w / 2; self._.target.ay = next.h / 2;\r
            self._.dirty = true;\r
            self.requestAdvance();\r
        },\r
\r
        dispose() {\r
            cancelAnimationFrame(self._.frame_id);\r
            self._.frame_id = 0;\r
            resize_observer.disconnect();\r
            dpr_query?.removeEventListener("change", onDprChange);\r
            for (const [t, type, fn, opts] of self._.listeners) t.removeEventListener(type, fn, opts);\r
            self._.reactors.forEach(r => r.dispose());\r
        },\r
    };\r
\r
    self._.input_stage = self._.input.getOrCreate("input", false);\r
    self._.target.ax = self.screen._value.w / 2;\r
    self._.target.ay = self.screen._value.h / 2;\r
\r
    //// Geometry helpers (work on any camera object)\r
\r
    function readScreen(): Screen {\r
        const r = element.getBoundingClientRect();\r
        return { w: r.width || 1, h: r.height || 1, dpr: window.devicePixelRatio || 1 };\r
    }\r
\r
    function local(e: { clientX: number; clientY: number }): Point {\r
        const r = element.getBoundingClientRect();\r
        return { x: e.clientX - r.left, y: e.clientY - r.top };\r
    }\r
\r
    function worldAt(c: View, sx: number, sy: number): Point {\r
        const { w, h } = self.screen._value;\r
        return { x: c.x + (sx - w / 2) / c.scale, y: c.y + (sy - h / 2) / c.scale };\r
    }\r
\r
    // Puts world point (wx, wy) under screen point (sx, sy) at scale s\r
    function placeAt(c: View, wx: number, wy: number, sx: number, sy: number, s: number): void {\r
        const { w, h } = self.screen._value;\r
        c.scale = s;\r
        c.x = wx - (sx - w / 2) / s;\r
        c.y = wy - (sy - h / 2) / s;\r
    }\r
\r
    function zoomAround(c: View, factor: number, sx: number, sy: number): void {\r
        const { min, max } = self.zoom_limits._value;\r
        const p = worldAt(c, sx, sy);\r
        placeAt(c, p.x, p.y, sx, sy, clamp(c.scale * factor, min, max));\r
    }\r
\r
    // A world edge may come at most \`overscroll\` of the screen into view;\r
    // along an axis where the world is smaller than that allows, it is centered.\r
    function constrain(c: View): void {\r
        const b = self.world_bounds._value;\r
        if (!b) return;\r
        const { w, h } = self.screen._value;\r
        const keep = 1 - 2 * self.overscroll; // fraction of the half-view the world must cover\r
        const hx = w / 2 / c.scale * keep, hy = h / 2 / c.scale * keep;\r
        c.x = b.x0 + hx <= b.x1 - hx ? clamp(c.x, b.x0 + hx, b.x1 - hx) : (b.x0 + b.x1) / 2;\r
        c.y = b.y0 + hy <= b.y1 - hy ? clamp(c.y, b.y0 + hy, b.y1 - hy) : (b.y0 + b.y1) / 2;\r
    }\r
\r
    function snapToTarget(): void {\r
        const t = self._.target;\r
        self._.current = { x: t.x, y: t.y, scale: t.scale };\r
        self._.dirty = true;\r
    }\r
\r
    // Direct manipulation moves \`current\` and \`target\` together, so a drag\r
    // during an eased zoom keeps both the drag and the zoom.\r
    function shiftBoth(dx: number, dy: number): void {\r
        const w = self._.current, t = self._.target;\r
        w.x -= dx / w.scale; w.y -= dy / w.scale;\r
        t.x -= dx / t.scale; t.y -= dy / t.scale;\r
        constrain(w); constrain(t);\r
        self._.dirty = true;\r
    }\r
\r
    // Moves only the target (pan by dx, dy screen px, then zoom by \`factor\`\r
    // about sx, sy); the view eases there with time constant \`ease_ms\`\r
    function steer(dx: number, dy: number, factor: number, sx: number, sy: number, ease_ms: number): void {\r
        const t = self._.target;\r
        if (dx || dy) { t.x -= dx / t.scale; t.y -= dy / t.scale; }\r
        if (factor !== 1) zoomAround(t, factor, sx, sy);\r
        constrain(t);\r
        t.ax = sx; t.ay = sy;\r
        self._.ease_ms = ease_ms;\r
        self.requestAdvance();\r
    }\r
\r
    function zoomBoth(factor: number, sx: number, sy: number): void {\r
        zoomAround(self._.current, factor, sx, sy);\r
        zoomAround(self._.target, factor, sx, sy);\r
        constrain(self._.current); constrain(self._.target);\r
        self._.target.ax = sx; self._.target.ay = sy;\r
        self._.dirty = true;\r
    }\r
\r
    function setKind(kind: InputKind): void {\r
        if (self.last_input._value !== kind) self.last_input.value = kind;\r
    }\r
\r
    //// Input tasks (run once per frame from the input stage)\r
\r
    function applyGesture(): void {\r
        if (!self._.pointers.size) { self._.gesture = null; return; }\r
        const pts = [...self._.pointers.values()];\r
        const g = {\r
            cx: pts.reduce((s, p) => s + p.x, 0) / pts.length,\r
            cy: pts.reduce((s, p) => s + p.y, 0) / pts.length,\r
            dist: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,\r
            count: pts.length,\r
        };\r
        const prev = self._.gesture;\r
        // a finger added or lifted re-bases the gesture instead of jumping\r
        if (prev && prev.count === g.count) {\r
            const dx = g.cx - prev.cx, dy = g.cy - prev.cy;\r
            if (dx || dy) shiftBoth(dx, dy);\r
            if (g.count > 1 && prev.dist > 0 && g.dist > 0) zoomBoth(g.dist / prev.dist, g.cx, g.cy);\r
        }\r
        self._.gesture = g;\r
        const t = performance.now();\r
        self._.samples.push({ t, x: g.cx, y: g.cy });\r
        while (self._.samples.length > 2 && t - self._.samples[0].t > FLING_WINDOW_MS) self._.samples.shift();\r
    }\r
\r
    function applyHover(): void {\r
        const h = self._.hover_at, prev = self.hover._value;\r
        if (h === prev || (h && prev && h.sx === prev.sx && h.sy === prev.sy)) return;\r
        self.hover.value = h;\r
    }\r
\r
    //// Pointer events\r
\r
    function onPointerDown(e: PointerEvent): void {\r
        const kind = e.pointerType as InputKind;\r
        // left or middle; right stays free for context menus\r
        if (kind === "mouse" && e.button !== 0 && e.button !== 1) return;\r
        if (e.button === 1) e.preventDefault();\r
        if (self.keyboard) element.focus({ preventScroll: true });\r
        element.setPointerCapture(e.pointerId);\r
        const p = local(e);\r
        self._.pointers.set(e.pointerId, { x: p.x, y: p.y, start_x: p.x, start_y: p.y, t0: performance.now(), kind, moved: false });\r
        if (self._.pointers.size > 1) self._.pointers.forEach(d => d.moved = true); // two fingers: not a tap\r
        // catch the view: stop a fling or an eased pan, but let an eased zoom finish\r
        const zooming_to = self._.target.scale;\r
        self.stop();\r
        if (zooming_to !== self._.current.scale) zoomAround(self._.target, zooming_to / self._.current.scale, self._.target.ax, self._.target.ay);\r
        self._.gesture = null;\r
        self._.samples = [];\r
        self._.hover_at = null;\r
        self._.input_stage.tasks.add(applyGesture);\r
        self._.input_stage.tasks.add(applyHover);\r
        self.pointer_down.value = true;\r
        setKind(kind);\r
        self.requestAdvance();\r
    }\r
\r
    function onPointerMove(e: PointerEvent): void {\r
        const p = local(e);\r
        const d = self._.pointers.get(e.pointerId);\r
        if (!d) {\r
            if (e.pointerType === "touch") return; // touch has no hover\r
            self._.hover_at = { sx: p.x, sy: p.y };\r
            self._.input_stage.tasks.add(applyHover);\r
            self.requestAdvance();\r
            return;\r
        }\r
        d.x = p.x; d.y = p.y;\r
        self._.last_move = performance.now();\r
        if (!d.moved && Math.hypot(p.x - d.start_x, p.y - d.start_y) > (self.tap_slop[d.kind] ?? 6)) d.moved = true;\r
        self._.input_stage.tasks.add(applyGesture);\r
        self.requestAdvance();\r
    }\r
\r
    function onPointerUp(e: PointerEvent): void {\r
        const d = self._.pointers.get(e.pointerId);\r
        if (!d) return;\r
        // apply the last movement, and sample the release point, before the gesture re-bases\r
        self._.input_stage.tasks.add(applyGesture);\r
        self._.input.flush(self._.input_stage);\r
        self._.pointers.delete(e.pointerId);\r
        self._.gesture = null;\r
        const now = performance.now();\r
\r
        if (self._.pointers.size) {\r
            self._.input_stage.tasks.add(applyGesture);\r
            self.requestAdvance();\r
            return;\r
        }\r
\r
        // fling, if it was still moving when released\r
        const first = self._.samples[0], last = self._.samples[self._.samples.length - 1];\r
        const can_fling = self.momentum && !(reduced_motion?.matches) && e.type === "pointerup";\r
        if (can_fling && first && last && last.t - first.t > 8 && now - self._.last_move < 60) {\r
            const vx = (last.x - first.x) / (last.t - first.t), vy = (last.y - first.y) / (last.t - first.t);\r
            const speed = Math.hypot(vx, vy);\r
            const cap = Math.min(1, MAX_FLING / speed);\r
            self._.velocity = speed > 0.15 ? { x: vx * cap, y: vy * cap } : { x: 0, y: 0 };\r
        }\r
        self.pointer_down.value = false;\r
        if (e.pointerType !== "touch") { self._.hover_at = { sx: d.x, sy: d.y }; self._.input_stage.tasks.add(applyHover); }\r
\r
        // a tap: pressed and released in place\r
        if (e.type === "pointerup" && !d.moved && now - d.t0 < TAP_MS) {\r
            const lt = self._.last_tap;\r
            const double = self.double_tap && !!lt && now - lt.t < DOUBLE_TAP_MS && Math.hypot(d.x - lt.x, d.y - lt.y) < DOUBLE_TAP_PX;\r
            const wp = worldAt(self._.current, d.x, d.y);\r
            self.tap.value = { sx: d.x, sy: d.y, x: wp.x, y: wp.y, kind: d.kind, count: double ? 2 : 1, shift: e.shiftKey };\r
            if (double) { self.zoomAt(e.shiftKey ? 0.5 : 2, d.x, d.y); self._.last_tap = null; }\r
            else self._.last_tap = { t: now, x: d.x, y: d.y };\r
        }\r
        self.requestAdvance();\r
    }\r
\r
    function onPointerLeave(e: PointerEvent): void {\r
        if (self._.pointers.has(e.pointerId)) return;\r
        self._.hover_at = null;\r
        self._.input_stage.tasks.add(applyHover);\r
        self.requestAdvance();\r
    }\r
\r
    // The window lost focus mid-drag: drop everything rather than stick\r
    function onBlur(): void {\r
        if (!self._.pointers.size) return;\r
        self._.pointers.clear();\r
        self._.gesture = null;\r
        self._.velocity = { x: 0, y: 0 };\r
        self.pointer_down.value = false;\r
        self.requestAdvance();\r
    }\r
\r
    //// Wheel\r
\r
    function onWheel(e: WheelEvent): void {\r
        e.preventDefault();\r
        const p = local(e);\r
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? self.screen._value.h : 1;\r
        let dx = e.deltaX * unit, dy = e.deltaY * unit;\r
        const now = performance.now();\r
\r
        if (now - self._.last_wheel > WHEEL_GAP_MS) {\r
            const mouse_like = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));\r
            self._.wheel_kind = mouse_like ? "mouse" : "trackpad";\r
        }\r
        self._.last_wheel = now;\r
        self._.velocity = { x: 0, y: 0 };\r
        self._.hover_at = { sx: p.x, sy: p.y };\r
        self._.input_stage.tasks.add(applyHover);\r
        const mouse = self._.wheel_kind === "mouse";\r
        setKind(mouse ? "wheel" : "trackpad");\r
\r
        // a mouse wheel steps (eased over zoom_ms); a touchpad streams (eased over smooth_ms)\r
        const ease = mouse ? self.zoom_ms : self.smooth_ms;\r
        if (e.ctrlKey || e.metaKey) {\r
            // touchpad pinch, or ctrl + mouse wheel\r
            const f = mouse ? Math.exp(-dy * self.wheel_speed) : Math.exp(clamp(-dy * self.pinch_speed, -0.5, 0.5));\r
            steer(0, 0, f, p.x, p.y, ease);\r
        } else {\r
            if (e.shiftKey && !dx) { dx = dy; dy = 0; } // shift + wheel scrolls sideways\r
            const mode = self.wheel_mode._value === "auto" ? (mouse && !e.shiftKey ? "zoom" : "pan") : self.wheel_mode._value;\r
            if (mode === "pan") steer(-dx, -dy, 1, p.x, p.y, ease);\r
            else {\r
                const f = mouse ? Math.exp(-dy * self.wheel_speed) : Math.exp(clamp(-dy * self.pinch_speed / 2, -0.5, 0.5));\r
                steer(0, 0, f, p.x, p.y, ease);\r
            }\r
        }\r
    }\r
\r
    //// Safari trackpad pinch (touch pinches arrive as pointers, so skip those)\r
\r
    let gesture_scale = 1;\r
    let gesture_at: Point = { x: 0, y: 0 };\r
    function onGestureStart(e: any): void {\r
        e.preventDefault();\r
        if (self._.pointers.size) return;\r
        gesture_scale = 1;\r
        gesture_at = local(e);\r
    }\r
    function onGestureChange(e: any): void {\r
        e.preventDefault();\r
        if (self._.pointers.size) return;\r
        steer(0, 0, e.scale / gesture_scale, gesture_at.x, gesture_at.y, self.smooth_ms);\r
        gesture_scale = e.scale;\r
        setKind("trackpad");\r
    }\r
\r
    //// Keyboard\r
\r
    function onKey(e: KeyboardEvent): void {\r
        if (!self.keyboard || e.altKey || e.ctrlKey || e.metaKey) return;\r
        const { w, h } = self.screen._value;\r
        const step = e.shiftKey ? 0.5 : 0.15;\r
        const moves: Record<string, () => void> = {\r
            ArrowLeft: () => self.panBy(w * step, 0),\r
            ArrowRight: () => self.panBy(-w * step, 0),\r
            ArrowUp: () => self.panBy(0, h * step),\r
            ArrowDown: () => self.panBy(0, -h * step),\r
            "+": () => self.zoomAt(1.5), "=": () => self.zoomAt(1.5),\r
            "-": () => self.zoomAt(1 / 1.5), "_": () => self.zoomAt(1 / 1.5),\r
            "0": () => self.goHome(),\r
        };\r
        const move = moves[e.key];\r
        if (!move) return;\r
        e.preventDefault();\r
        setKind("keyboard");\r
        move();\r
    }\r
\r
    //// Size and pixel ratio\r
\r
    const resize_observer = new ResizeObserver(() => self.measure());\r
    resize_observer.observe(element);\r
\r
    // a pixel-ratio change (browser zoom, another monitor) doesn't resize the\r
    // element; a resolution query fires once, so it is re-armed each time\r
    let dpr_query: MediaQueryList | null = null;\r
    function watchDpr(): void {\r
        dpr_query?.removeEventListener("change", onDprChange);\r
        dpr_query = matchMedia(\`(resolution: \${window.devicePixelRatio || 1}dppx)\`);\r
        dpr_query.addEventListener("change", onDprChange);\r
    }\r
    function onDprChange(): void { self.measure(); watchDpr(); }\r
    watchDpr();\r
\r
    //// Reactions\r
\r
    // new zoom limits or world bounds apply at once\r
    self._.reactors.push(Reactor(() => {\r
        const { min, max } = self.zoom_limits.value;\r
        self.world_bounds.value;\r
        self._.target.scale = clamp(self._.target.scale, min, max);\r
        self._.current.scale = clamp(self._.current.scale, min, max);\r
        constrain(self._.target); constrain(self._.current);\r
        self._.dirty = true;\r
        self.requestAdvance();\r
    }, { deps: [self.zoom_limits, self.world_bounds] }));\r
\r
    self._.reactors.push(Reactor(() => {\r
        element.dataset.pointerDown = String(self.pointer_down.value);\r
    }));\r
\r
    //// Wiring\r
\r
    element.style.touchAction = "none";\r
    element.style.userSelect = "none";\r
    element.style.setProperty("-webkit-user-select", "none");\r
    element.style.setProperty("-webkit-touch-callout", "none");\r
    if (self.keyboard && !element.hasAttribute("tabindex")) element.tabIndex = 0;\r
\r
    const noTouchMenu = (e: Event) => { if ([...self._.pointers.values()].some(p => p.kind === "touch")) e.preventDefault(); };\r
    const noAutoscroll = (e: MouseEvent) => { if (e.button === 1) e.preventDefault(); };\r
    const preventDefault = (e: Event) => e.preventDefault();\r
\r
    self._.listeners = [\r
        [element, "pointerdown", onPointerDown as EventListener],\r
        [element, "pointermove", onPointerMove as EventListener],\r
        [element, "pointerup", onPointerUp as EventListener],\r
        [element, "pointercancel", onPointerUp as EventListener],\r
        [element, "lostpointercapture", onPointerUp as EventListener],\r
        [element, "pointerleave", onPointerLeave as EventListener],\r
        [element, "wheel", onWheel as EventListener, { passive: false }],\r
        [element, "gesturestart", onGestureStart, { passive: false }],\r
        [element, "gesturechange", onGestureChange, { passive: false }],\r
        [element, "gestureend", preventDefault, { passive: false }],\r
        [element, "keydown", onKey as EventListener],\r
        [element, "contextmenu", noTouchMenu],\r
        [element, "mousedown", noAutoscroll as EventListener],\r
        [window, "blur", onBlur],\r
    ];\r
    for (const [t, type, fn, opts] of self._.listeners) t.addEventListener(type, fn, opts);\r
\r
    // first publish, with the constraints applied\r
    constrain(self._.current); constrain(self._.target);\r
    self.view.value = { ...self._.current };\r
\r
    return self;\r
}\r
\r
//// FixedCamera: a camera on a tripod\r
//\r
// It frames a world rect inside an element and never moves on its own: no\r
// input, no easing. When the element resizes or \`frame\` changes, the view is\r
// refitted. Use it where a picture should hold still, such as a figure.\r
\r
export interface FixedCamera extends ViewSource {\r
    frame: Observable<Rect>; // the world rect kept in view\r
    padding: number;         // px kept clear around it\r
    dispose(): void;\r
}\r
\r
export function FixedCamera(element: HTMLElement, frame: Rect, padding = 0): FixedCamera {\r
    const measure = (): Screen => ({ w: element.clientWidth || 1, h: element.clientHeight || 1, dpr: window.devicePixelRatio || 1 });\r
    const self: FixedCamera = {\r
        view: Observable<View>({ x: 0, y: 0, scale: 1 }),\r
        screen: Observable<Screen>(measure()),\r
        frame: Observable<Rect>(frame),\r
        padding,\r
        dispose() { resize_observer.disconnect(); fit.dispose(); },\r
    };\r
    const fit = Reactor(() => {\r
        const r = self.frame.value, { w, h } = self.screen.value;\r
        const scale = Math.max(1e-6, Math.min((w - 2 * self.padding) / (r.x1 - r.x0), (h - 2 * self.padding) / (r.y1 - r.y0)));\r
        self.view.value = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, scale };\r
    });\r
    const resize_observer = new ResizeObserver(() => {\r
        const next = measure(), prev = self.screen._value;\r
        if (next.w !== prev.w || next.h !== prev.h || next.dpr !== prev.dpr) self.screen.value = next;\r
    });\r
    resize_observer.observe(element);\r
    return self;\r
}\r
`,_=`// layer.ts\r
//\r
// One canvas that draws a world through a Camera, repainting as\r
// little as it can. Returns a plain object: the API is the paint function,\r
// the flags, \`last_render\` and the methods; the buffers and the record of what is\r
// on screen live in \`_\` (reachable for debugging, not part of the API).\r
//\r
//   camera.view ───┐\r
//   camera.screen ─┼──► [render] render() ──► only translated?  blit + paint the exposed strips\r
//   version ───────┘                          anything else?    full repaint\r
//      ▲\r
//   deps / invalidate()   (the content changed: always a full repaint)\r
//\r
// Scroll blit: when the camera only moved (same scale, size and pixel ratio),\r
// the previous frame is still right, just shifted. It is copied through a\r
// back buffer by the shift, and only the newly exposed strips are painted,\r
// each clipped to its strip. Panning across a busy scene then costs a couple\r
// of thin strips per frame instead of the whole screen.\r
//\r
// For blitted and freshly painted pixels to line up, a pan frame snaps the\r
// world origin to whole device pixels, so every shift is a whole number of\r
// device pixels (an offset of under one device pixel from the camera). A\r
// zoom frame repaints everything anyway, so it uses the exact origin:\r
// snapping there would make the scene shiver by up to half a pixel per frame.\r
//\r
// The \`paint\` callback receives the region to fill, in world units and in\r
// screen px, with a clip already set. It should draw what intersects that\r
// region (anything more is clipped away), and it must draw the same pixels\r
// for the same camera, so a strip matches the pixels beside it.\r
\r
import { Observable, Reactor, type Schedule } from "../../core/index";\r
import type { View, Rect, Screen, ViewSource } from "./camera.ts";\r
\r
export interface Brush {\r
    ctx: CanvasRenderingContext2D;\r
    scale: number;   // screen px per world unit\r
    dpr: number;\r
    ox: number;      // screen position of the world origin (device-pixel snapped on pan frames)\r
    oy: number;\r
    toScreen(x: number, y: number): { x: number; y: number };\r
    useWorld(): void;    // draw in world units from here on\r
    useScreen(): void;   // draw in CSS px from here on\r
}\r
\r
export interface RenderReport {\r
    mode: "full" | "blit" | "idle";\r
    ms: number;    // time spent in the last render\r
    area: number;  // fraction of the screen painted\r
}\r
\r
export interface Frame { ox: number; oy: number; scale: number; w: number; h: number; dpr: number; snapped: boolean } // origin in device px\r
\r
export interface Layer {\r
    camera: ViewSource;            // a Camera, a FixedCamera, or anything with view and screen\r
    canvas: HTMLCanvasElement;\r
    ctx: CanvasRenderingContext2D;\r
\r
    paint: (p: Brush, world: Rect, screen: Rect) => void; // swappable\r
    blit: boolean;                 // allow scroll blits\r
    transparent: boolean;          // clear to transparent before paint()\r
\r
    version: Observable<number>;   // a change repaints\r
    last_render: Observable<RenderReport>; // what the last render did: a full repaint, a blit, or nothing\r
\r
    render(): void;                // render now (normally the Reactor does it)\r
    invalidate(): void;            // full repaint on the next render\r
    dispose(): void;\r
\r
    _: {\r
        back: HTMLCanvasElement;   // scratch buffer for the blit\r
        back_ctx: CanvasRenderingContext2D;\r
        needs_full: boolean;\r
        last: Frame | null;        // what is on the canvas now\r
        reactors: Reactor[];\r
    };\r
}\r
\r
export interface LayerOptions {\r
    paint: (p: Brush, world: Rect, screen: Rect) => void;\r
    deps?: Observable<any>[];   // a change in any of these repaints everything\r
    schedule?: Schedule | null; // stage the render runs on\r
    blit?: boolean;             // default true\r
    transparent?: boolean;      // default false: paint() fills its region\r
}\r
\r
export function Layer(camera: ViewSource, canvas: HTMLCanvasElement, options: LayerOptions): Layer {\r
    const transparent = options.transparent ?? false;\r
    const back = document.createElement("canvas");\r
\r
    const self: Layer = {\r
        camera, canvas,\r
        ctx: canvas.getContext("2d", { alpha: transparent })!,\r
\r
        paint: options.paint,\r
        blit: options.blit ?? true,\r
        transparent,\r
\r
        version: Observable(0),\r
        last_render: Observable<RenderReport>({ mode: "idle", ms: 0, area: 0 }),\r
        _: {\r
            back,\r
            back_ctx: back.getContext("2d", { alpha: transparent })!,\r
            needs_full: true,\r
            last: null,\r
            reactors: [],\r
        },\r
\r
        render() {\r
            const cam = camera.view._value, vp = camera.screen._value;\r
            const t0 = performance.now();\r
            const { w, h, dpr } = vp;\r
            const bw = Math.round(w * dpr), bh = Math.round(h * dpr);\r
            if (self.canvas.width !== bw || self.canvas.height !== bh) {\r
                self.canvas.width = self._.back.width = bw;\r
                self.canvas.height = self._.back.height = bh;\r
                self._.needs_full = true;\r
            }\r
            const last = self._.last;\r
            const same_zoom = !!last && last.scale === cam.scale && last.w === w && last.h === h && last.dpr === dpr;\r
            // snap only when this frame can be (or seed) a blit: a pure translation\r
            const snapped = self.blit && same_zoom;\r
            const exact_x = (w / 2 - cam.x * cam.scale) * dpr, exact_y = (h / 2 - cam.y * cam.scale) * dpr;\r
            const ox_d = snapped ? Math.round(exact_x) : exact_x;\r
            const oy_d = snapped ? Math.round(exact_y) : exact_y;\r
            const p = brushFor(cam, vp, ox_d, oy_d);\r
            const now: Frame = { ox: ox_d, oy: oy_d, scale: cam.scale, w, h, dpr, snapped };\r
\r
            if (snapped && !self._.needs_full && last!.snapped) {\r
                const dx = ox_d - last!.ox, dy = oy_d - last!.oy; // device px\r
                if (dx === 0 && dy === 0) { self.last_render.value = { mode: "idle", ms: 0, area: 0 }; return; }\r
                if (Math.abs(dx) < bw && Math.abs(dy) < bh) {\r
                    // shift the old frame through the back buffer\r
                    const { ctx } = self, { back_ctx } = self._;\r
                    back_ctx.globalCompositeOperation = "copy";\r
                    back_ctx.drawImage(self.canvas, 0, 0);\r
                    ctx.setTransform(1, 0, 0, 1, 0, 0);\r
                    ctx.globalCompositeOperation = "copy";\r
                    ctx.drawImage(self._.back, dx, dy);\r
                    ctx.globalCompositeOperation = "source-over";\r
\r
                    // the exposed strips: a full-height column, and a row beside it\r
                    const ddx = dx / dpr, ddy = dy / dpr;\r
                    let area = 0;\r
                    if (dx > 0) { paintRegion(p, 0, 0, ddx, h); area += ddx * h; }\r
                    if (dx < 0) { paintRegion(p, w + ddx, 0, w, h); area -= ddx * h; }\r
                    const cx0 = Math.max(0, ddx), cx1 = Math.min(w, w + ddx);\r
                    if (dy > 0) { paintRegion(p, cx0, 0, cx1, ddy); area += (cx1 - cx0) * ddy; }\r
                    if (dy < 0) { paintRegion(p, cx0, h + ddy, cx1, h); area -= (cx1 - cx0) * ddy; }\r
\r
                    self._.last = now;\r
                    self.last_render.value = { mode: "blit", ms: performance.now() - t0, area: area / (w * h) };\r
                    return;\r
                }\r
            }\r
\r
            self._.needs_full = false;\r
            paintRegion(p, 0, 0, w, h);\r
            self._.last = now;\r
            self.last_render.value = { mode: "full", ms: performance.now() - t0, area: 1 };\r
        },\r
\r
        invalidate() {\r
            self._.needs_full = true;\r
            self.version.value++;\r
        },\r
\r
        dispose() {\r
            self._.reactors.forEach(r => r.dispose());\r
        },\r
    };\r
\r
    function brushFor(cam: View, vp: Screen, ox_d: number, oy_d: number): Brush {\r
        const { dpr } = vp, s = cam.scale, ctx = self.ctx;\r
        const ox = ox_d / dpr, oy = oy_d / dpr;\r
        return {\r
            ctx, scale: s, dpr, ox, oy,\r
            toScreen: (x, y) => ({ x: ox + x * s, y: oy + y * s }),\r
            useWorld: () => ctx.setTransform(dpr * s, 0, 0, dpr * s, ox_d, oy_d),\r
            useScreen: () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0),\r
        };\r
    }\r
\r
    // Paints one screen rect (CSS px), clipped to it\r
    function paintRegion(p: Brush, sx0: number, sy0: number, sx1: number, sy1: number): void {\r
        const { ctx } = self, { dpr, ox, oy, scale } = p;\r
        ctx.save();\r
        ctx.setTransform(1, 0, 0, 1, 0, 0);\r
        const x = Math.floor(sx0 * dpr), y = Math.floor(sy0 * dpr);\r
        ctx.beginPath();\r
        ctx.rect(x, y, Math.ceil(sx1 * dpr) - x, Math.ceil(sy1 * dpr) - y);\r
        ctx.clip();\r
        if (self.transparent) ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);\r
        p.useScreen();\r
        self.paint(p,\r
            { x0: (sx0 - ox) / scale, y0: (sy0 - oy) / scale, x1: (sx1 - ox) / scale, y1: (sy1 - oy) / scale },\r
            { x0: sx0, y0: sy0, x1: sx1, y1: sy1 });\r
        ctx.restore();\r
    }\r
\r
    // content changes force a full repaint\r
    if (options.deps?.length) {\r
        self._.reactors.push(Reactor(() => self.invalidate(), { deps: options.deps }));\r
    }\r
    // camera, size and version changes render; within one flush, once\r
    self._.reactors.push(Reactor(() => self.render(), {\r
        deps: [camera.view, camera.screen, self.version],\r
        initFn: true,\r
        reaction_schedule: options.schedule ?? null,\r
    }));\r
\r
    return self;\r
}\r
`,v=`// ising.ts\r
//\r
// The physics, with no DOM: a square lattice of spins s = ±1 with periodic\r
// boundaries (the edges wrap, so the lattice is really a torus), and the\r
// two classic single-spin Markov steps.\r
//\r
//   E = -J Σ<ij> s_i s_j  -  h Σ s_i        (J = 1, k_B = 1)\r
//\r
// Flipping spin s with neighbour sum S changes the energy by\r
//\r
//   ΔE = 2 s (S + h)\r
//\r
// S is one of -4, -2, 0, 2, 4, so there are only ten (s, S) cases. Their\r
// acceptance probabilities are tabulated once per (T, h, rule) change, which\r
// keeps the inner loop to array reads and one Math.random().\r
\r
export type Rule = "metropolis" | "heat_bath";\r
\r
export const T_CRITICAL = 2 / Math.log(1 + Math.SQRT2); // Onsager, 2.269…\r
\r
export interface Lattice {\r
    n: number;               // side length; n × n spins\r
    spins: Int8Array;        // +1 up, -1 down, row-major\r
    flipped_at: Float64Array; // timestamp of each spin's last flip (for animation)\r
    M: number;               // Σ s_i\r
    B: number;               // bond energy -Σ<ij> s_i s_j\r
    sweeps: number;          // attempted flips / n², running total\r
    carry: number;           // fractional attempts left over between calls\r
}\r
\r
export function Lattice(n: number, fill: "random" | "up" | "down" = "random"): Lattice {\r
    const lat: Lattice = {\r
        n,\r
        spins: new Int8Array(n * n),\r
        flipped_at: new Float64Array(n * n).fill(-1e9),\r
        M: 0,\r
        B: 0,\r
        sweeps: 0,\r
        carry: 0,\r
    };\r
    fillLattice(lat, fill);\r
    return lat;\r
}\r
\r
export function fillLattice(lat: Lattice, fill: "random" | "up" | "down"): void {\r
    const { spins } = lat;\r
    for (let k = 0; k < spins.length; k++) {\r
        spins[k] = fill === "up" ? 1 : fill === "down" ? -1 : Math.random() < 0.5 ? 1 : -1;\r
    }\r
    lat.flipped_at.fill(-1e9);\r
    lat.sweeps = 0;\r
    lat.carry = 0;\r
    recount(lat);\r
}\r
\r
// Recomputes M and B from scratch (after a bulk edit)\r
export function recount(lat: Lattice): void {\r
    const { n, spins } = lat;\r
    let M = 0, B = 0;\r
    for (let i = 0; i < n; i++) {\r
        const row = i * n, below = ((i + 1) % n) * n;\r
        for (let j = 0; j < n; j++) {\r
            const s = spins[row + j];\r
            M += s;\r
            // each bond counted once: right and down\r
            B -= s * (spins[row + (j + 1) % n] + spins[below + j]);\r
        }\r
    }\r
    lat.M = M;\r
    lat.B = B;\r
}\r
\r
export function neighbourSum(lat: Lattice, idx: number): number {\r
    const { n, spins } = lat;\r
    const i = (idx / n) | 0, j = idx - i * n;\r
    const up = i === 0 ? idx + n * (n - 1) : idx - n;\r
    const down = i === n - 1 ? idx - n * (n - 1) : idx + n;\r
    const left = j === 0 ? idx + n - 1 : idx - 1;\r
    const right = j === n - 1 ? idx - n + 1 : idx + 1;\r
    return spins[up] + spins[down] + spins[left] + spins[right];\r
}\r
\r
// Probability of accepting a proposed flip that costs ΔE\r
export function acceptance(dE: number, T: number, rule: Rule): number {\r
    const t = Math.max(T, 1e-6);\r
    if (rule === "metropolis") return dE <= 0 ? 1 : Math.exp(-dE / t);\r
    return 1 / (1 + Math.exp(dE / t));\r
}\r
\r
// table[(s > 0 ? 5 : 0) + (S + 4) / 2] = acceptance for that case\r
export function acceptanceTable(T: number, h: number, rule: Rule): Float64Array {\r
    const table = new Float64Array(10);\r
    for (const s of [-1, 1]) {\r
        for (let S = -4; S <= 4; S += 2) {\r
            table[(s > 0 ? 5 : 0) + (S + 4) / 2] = acceptance(2 * s * (S + h), T, rule);\r
        }\r
    }\r
    return table;\r
}\r
\r
// \`sweeps\` × n² single-spin attempts at random sites. Fractions carry over,\r
// so 0.01 sweeps a frame still moves at the right average rate.\r
export function step(lat: Lattice, sweeps: number, table: Float64Array, now = 0): number {\r
    const { n, spins, flipped_at } = lat;\r
    const nn = n * n;\r
    const exact = sweeps * nn + lat.carry;\r
    const attempts = Math.floor(exact);\r
    lat.carry = exact - attempts;\r
\r
    let M = lat.M, B = lat.B, flips = 0;\r
    const last_row = n * (n - 1);\r
    for (let k = 0; k < attempts; k++) {\r
        const idx = (Math.random() * nn) | 0;\r
        const i = (idx / n) | 0, j = idx - i * n;\r
        const S = spins[i === 0 ? idx + last_row : idx - n]\r
            + spins[i === n - 1 ? idx - last_row : idx + n]\r
            + spins[j === 0 ? idx + n - 1 : idx - 1]\r
            + spins[j === n - 1 ? idx - n + 1 : idx + 1];\r
        const s = spins[idx];\r
        const p = table[(s > 0 ? 5 : 0) + ((S + 4) >> 1)];\r
        if (p >= 1 || Math.random() < p) {\r
            spins[idx] = -s;\r
            M -= 2 * s;\r
            B += 2 * s * S;\r
            flipped_at[idx] = now;\r
            flips++;\r
        }\r
    }\r
    lat.M = M;\r
    lat.B = B;\r
    lat.sweeps += attempts / nn;\r
    return flips;\r
}\r
\r
// Per-spin magnetization and energy\r
export function magnetization(lat: Lattice): number {\r
    return lat.M / (lat.n * lat.n);\r
}\r
export function energy(lat: Lattice, h: number): number {\r
    return (lat.B - h * lat.M) / (lat.n * lat.n);\r
}\r
\r
// Yang's exact spontaneous magnetization of the infinite 2D lattice (h = 0)\r
export function exactMagnetization(T: number): number {\r
    if (T >= T_CRITICAL) return 0;\r
    const x = Math.sinh(2 / T);\r
    return Math.pow(1 - Math.pow(x, -4), 1 / 8);\r
}\r
`,y=`// lattice_layer.ts\r
//\r
// A Layer (from the Pan & Zoom example) that paints a Lattice. Give it a\r
// Camera for the free, pannable view, or a FixedCamera for a still figure.\r
//\r
//   lattice, tick, colors ──► Layer.invalidate ──► paint(brush, world, screen)\r
//   camera.view, screen   ──► Layer render (a blit when only panning)\r
//\r
// Two ways to paint, chosen by sprite detail (see sprites.ts):\r
//   detail 0   one pixel per spin in an offscreen image, scaled up unsmoothed\r
//              and tiled across the region: cost is independent of zoom\r
//   detail > 0 a sprite per visible cell, batched into a few paths\r
//\r
// The lattice is periodic, so by default it repeats to fill the view.\r
\r
import { Observable, type Schedule } from "../../../core/index";\r
import { Layer } from "../../pan-zoom/layer.ts";\r
import type { Rect, ViewSource } from "../../pan-zoom/camera.ts";\r
import type { Lattice } from "../ising.ts";\r
import { colors, hexToU32 } from "../theme.ts";\r
import { SpriteBatch, addSpin, arrowAngle, detailAt, paintBatch, planeColor } from "./sprites.ts";\r
\r
export interface LatticeLayerOptions {\r
    lattice: Observable<Lattice>;\r
    tick: Observable<number>;        // bump when the spins change\r
    clock?: () => number;            // timestamps comparable with lattice.flipped_at\r
    schedule?: Schedule | null;\r
    tile?: boolean;                  // repeat the periodic lattice (default true)\r
    dim?: (idx: number) => boolean;  // cells drawn faintly, as context\r
    deps?: Observable<any>[];        // anything else that should repaint it\r
}\r
\r
export function LatticeLayer(camera: ViewSource, canvas: HTMLCanvasElement, options: LatticeLayerOptions): Layer {\r
    const tile = options.tile ?? true;\r
    const clock = options.clock ?? (() => performance.now());\r
\r
    // one pixel per spin, rebuilt at most once per change (not once per strip)\r
    const off = document.createElement("canvas");\r
    const off_ctx = off.getContext("2d")!;\r
    let image: ImageData | null = null;\r
    let image_for = "";\r
\r
    function pixels(lat: Lattice): HTMLCanvasElement {\r
        const c = colors._value;\r
        const key = \`\${options.tick._value}|\${lat.n}|\${c.up}|\${c.down}\`;\r
        if (key !== image_for || !image || image.width !== lat.n) {\r
            if (!image || image.width !== lat.n) {\r
                off.width = off.height = lat.n;\r
                image = off_ctx.createImageData(lat.n, lat.n);\r
            }\r
            const px = new Uint32Array(image.data.buffer), up = hexToU32(c.up), down = hexToU32(c.down);\r
            const spins = lat.spins;\r
            for (let k = 0; k < spins.length; k++) px[k] = spins[k] > 0 ? up : down;\r
            off_ctx.putImageData(image, 0, 0);\r
            image_for = key;\r
        }\r
        return off;\r
    }\r
\r
    return Layer(camera, canvas, {\r
        deps: [options.lattice, options.tick, colors, ...(options.deps ?? [])],\r
        schedule: options.schedule ?? null,\r
        paint(brush, world, screen) {\r
            const { ctx, scale: s, ox, oy, dpr } = brush;\r
            const lat = options.lattice._value, n = lat.n, c = colors._value;\r
            const detail = detailAt(s);\r
\r
            // the plane: between bubbles, and around an untiled lattice\r
            if (detail > 0 || !tile) {\r
                ctx.fillStyle = tile ? planeColor(c) : c.bg2;\r
                ctx.fillRect(screen.x0, screen.y0, screen.x1 - screen.x0, screen.y1 - screen.y0);\r
                if (!tile && detail > 0) {\r
                    ctx.fillStyle = planeColor(c);\r
                    ctx.fillRect(ox, oy, n * s, n * s);\r
                }\r
            }\r
\r
            if (detail === 0) {\r
                const img = pixels(lat), size = n * s;\r
                ctx.imageSmoothingEnabled = false;\r
                // snap tile edges to device pixels so neighbouring tiles meet without seams\r
                const snap = (v: number) => Math.round(v * dpr) / dpr;\r
                const span = (lo: number, hi: number, o: number) => tile\r
                    ? [Math.floor((lo - o) / size), Math.ceil((hi - o) / size)] : [0, 1];\r
                const [kx0, kx1] = span(screen.x0, screen.x1, ox), [ky0, ky1] = span(screen.y0, screen.y1, oy);\r
                for (let ky = ky0; ky < ky1; ky++) {\r
                    const top = snap(oy + ky * size), bottom = snap(oy + (ky + 1) * size);\r
                    for (let kx = kx0; kx < kx1; kx++) {\r
                        const left = snap(ox + kx * size), right = snap(ox + (kx + 1) * size);\r
                        ctx.drawImage(img, left, top, right - left, bottom - top);\r
                    }\r
                }\r
                return;\r
            }\r
\r
            // sprites: only the cells in the region being painted\r
            const { spins, flipped_at } = lat;\r
            const now = clock();\r
            const wrap = (v: number) => ((v % n) + n) % n;\r
            let j0 = Math.floor(world.x0), j1 = Math.ceil(world.x1);\r
            let i0 = Math.floor(world.y0), i1 = Math.ceil(world.y1);\r
            if (!tile) { j0 = Math.max(0, j0); i0 = Math.max(0, i0); j1 = Math.min(n, j1); i1 = Math.min(n, i1); }\r
            const main = SpriteBatch(detail);\r
            const faint = options.dim ? SpriteBatch(detail) : main;\r
            for (let i = i0; i < i1; i++) {\r
                const row = wrap(i) * n, y = oy + i * s;\r
                for (let j = j0; j < j1; j++) {\r
                    const idx = row + wrap(j);\r
                    const batch = options.dim && options.dim(idx) ? faint : main;\r
                    addSpin(batch, ox + j * s, y, s, spins[idx], arrowAngle(spins[idx], now - flipped_at[idx]));\r
                }\r
            }\r
            if (faint !== main) paintBatch(ctx, faint, c, 0.22);\r
            paintBatch(ctx, main, c);\r
        },\r
    });\r
}\r
\r
// The spin under a point on screen (CSS px within the camera's element), or -1\r
export function cellAt(camera: ViewSource, lattice: Lattice, sx: number, sy: number, tile = true): number {\r
    const v = camera.view._value, { w, h } = camera.screen._value, n = lattice.n;\r
    const j = Math.floor(v.x + (sx - w / 2) / v.scale), i = Math.floor(v.y + (sy - h / 2) / v.scale);\r
    if (!tile && (i < 0 || j < 0 || i >= n || j >= n)) return -1;\r
    return (((i % n) + n) % n) * n + (((j % n) + n) % n);\r
}\r
\r
// The world rect a whole lattice occupies (cells are 1 unit)\r
export const latticeRect = (lattice: Lattice): Rect => ({ x0: 0, y0: 0, x1: lattice.n, y1: lattice.n });\r
`,b=`// sprites.ts\r
//\r
// What one spin looks like on screen, and how that changes with zoom.\r
//\r
//   detail 0 (far)   a flat square, ink for up, paper for down\r
//   detail 0 → 1     the square shrinks a little and rounds into a circle,\r
//                    its color fades to a faint bubble, and the arrow fades in\r
//   detail 1 (near)  a faint bubble in the spin's color, with its arrow\r
//\r
// detail is a smoothstep of the cell's size in screen pixels, so the change\r
// is gradual and the same on every screen. A spin that has just flipped\r
// turns its arrow through half a turn over FLIP_MS.\r
//\r
// Sprites are batched: every cell adds to a few shared Path2Ds, and a batch\r
// is painted with one fill or stroke per layer, so thousands of cells cost a\r
// handful of draw calls.\r
\r
import type { Colors } from "../theme.ts";\r
\r
export const DETAIL_START = 16; // px per cell where the bubbles and arrows begin\r
export const DETAIL_FULL = 46;  // px per cell where they are fully formed\r
export const FLIP_MS = 220;\r
\r
const BUBBLE_ALPHA = 0.5;  // bubble opacity at full detail\r
const ARROW_ALPHA = 0.92;  // arrow opacity at full detail\r
const GAP = 0.09;          // inset of the bubble, as a fraction of the cell, at full detail\r
\r
export function detailAt(px_per_cell: number): number {\r
    const t = Math.min(1, Math.max(0, (px_per_cell - DETAIL_START) / (DETAIL_FULL - DETAIL_START)));\r
    return t * t * (3 - 2 * t);\r
}\r
\r
// Arrow angle in radians, 0 pointing up the screen. \`age\` is the time since\r
// the spin last flipped: within FLIP_MS it is still turning from the old side.\r
export function arrowAngle(spin: number, age: number): number {\r
    const rest = spin > 0 ? 0 : Math.PI;\r
    if (age >= FLIP_MS || age < 0) return rest;\r
    const p = age / FLIP_MS;\r
    return rest + Math.PI * Math.pow(1 - p, 3); // ease-out\r
}\r
\r
export interface SpriteBatch {\r
    detail: number;\r
    up: Path2D;     // bubbles of up spins\r
    down: Path2D;   // bubbles of down spins\r
    shafts: Path2D; // arrow shafts (stroked)\r
    heads: Path2D;  // arrow heads (filled)\r
    line_width: number;\r
}\r
\r
export function SpriteBatch(detail: number): SpriteBatch {\r
    return { detail, up: new Path2D(), down: new Path2D(), shafts: new Path2D(), heads: new Path2D(), line_width: 1 };\r
}\r
\r
// Adds the spin in the cell whose top-left corner is (x, y) and side is s\r
export function addSpin(batch: SpriteBatch, x: number, y: number, s: number, spin: number, angle: number): void {\r
    const t = batch.detail;\r
    const gap = t * GAP * s;\r
    const size = s - 2 * gap;\r
    const radius = t * size / 2;\r
    const path = spin > 0 ? batch.up : batch.down;\r
    if (radius < 0.5) path.rect(x + gap, y + gap, size, size);\r
    else path.roundRect(x + gap, y + gap, size, size, radius);\r
\r
    if (t === 0) return;\r
    const cx = x + s / 2, cy = y + s / 2, L = size;\r
    const cos = Math.cos(angle), sin = Math.sin(angle);\r
    const px = (lx: number, ly: number) => cx + lx * cos - ly * sin;\r
    const py = (lx: number, ly: number) => cy + lx * sin + ly * cos;\r
    batch.shafts.moveTo(px(0, 0.3 * L), py(0, 0.3 * L));\r
    batch.shafts.lineTo(px(0, -0.1 * L), py(0, -0.1 * L));\r
    batch.heads.moveTo(px(0, -0.34 * L), py(0, -0.34 * L));\r
    batch.heads.lineTo(px(-0.17 * L, -0.06 * L), py(-0.17 * L, -0.06 * L));\r
    batch.heads.lineTo(px(0.17 * L, -0.06 * L), py(0.17 * L, -0.06 * L));\r
    batch.heads.closePath();\r
    batch.line_width = Math.max(1, 0.075 * L);\r
}\r
\r
// Paints a batch. \`alpha\` dims the whole batch (used for context cells).\r
export function paintBatch(ctx: CanvasRenderingContext2D, batch: SpriteBatch, c: Colors, alpha = 1): void {\r
    const t = batch.detail;\r
    ctx.globalAlpha = alpha * (1 - (1 - BUBBLE_ALPHA) * t);\r
    ctx.fillStyle = c.up; ctx.fill(batch.up);\r
    ctx.fillStyle = c.down; ctx.fill(batch.down);\r
    if (t > 0) {\r
        ctx.globalAlpha = alpha * t * ARROW_ALPHA;\r
        ctx.strokeStyle = ctx.fillStyle = c.tx;\r
        ctx.lineWidth = batch.line_width;\r
        ctx.lineCap = "round";\r
        ctx.stroke(batch.shafts);\r
        ctx.fill(batch.heads);\r
    }\r
    ctx.globalAlpha = 1;\r
}\r
\r
// The color the empty space between bubbles shows through\r
export const planeColor = (c: Colors) => c.ui2;\r
`,x=`src/examples/pan-zoom/camera.ts`,S=`src/examples/pan-zoom/layer.ts`,C=[p(),m(),h(),n(`canvas`,`A canvas that pans and zooms`,`This section builds dragging, zooming, easing and momentum for a canvas in about a hundred lines, then shows the Camera and Layer from the Pan & Zoom example, which do the same with more input devices and less repainting.`,[`## goal | The finished canvas`,l(`camera`,{peek:!0,observers:`none`,result:`above`,text:`<p>Click the canvas, then drag it. Scroll or pinch to zoom; release a drag while moving and it keeps going. This is the Camera from the <a href="../pan-zoom/index.html">Pan &amp; Zoom</a> example.</p><p>The next part builds a smaller version of it.</p>`}),`## steps | Step by step`,l(`canvas`,{result:`above`,observers:`closed`,text:`<p>Four circles on a grid. Each step adds one behaviour.</p>`,steps:[{title:`Drawing through a view`,text:`<p>The circles have fixed positions in <em>world</em> coordinates. <code>view</code> says which world point is at the middle of the canvas and how many pixels one world unit covers. <code>toScreen</code> and <code>toWorld</code> convert between world coordinates and canvas pixels using it.</p><p><code>view</code> is an Observable and the drawing is a Reactor that reads it. The later steps change the view from pointer and wheel handlers; with this arrangement those handlers only assign <code>view.value</code>, and the picture is redrawn because the Reactor depends on it.</p><p>Nothing moves yet. Edit the initial view, for example <code>x: 100</code> or <code>scale: 2</code>, to see the effect.</p>`},{title:`Dragging`,text:`<p>While the pointer is pressed, each move shifts the view by the distance the pointer travelled, divided by the scale (at twice the scale, a pixel covers half as much of the world).</p><p>The handler assigns <code>view.value</code> and contains no drawing code.</p>`},{title:`Zooming about the pointer`,text:`<p>When zooming, the world point under the pointer should stay under the pointer. <code>placeAt(wx, wy, sx, sy, s)</code> returns the view that shows a given world point at a given screen point at scale <code>s</code>. The wheel handler looks up the world point under the pointer, computes the new scale, and calls it.</p><p>Hold Ctrl and scroll over the canvas, or pinch on a trackpad. The buttons zoom about the middle.</p>`},{title:`Easing toward a target`,text:`<p>The zoom in step 3 jumps. Now the wheel and the buttons change a second view, <code>target</code>, and a <code>requestAnimationFrame</code> loop moves <code>view</code> part of the way toward it each frame, stopping when it arrives.</p><p>The loop does not move <code>x</code>, <code>y</code> and <code>scale</code> independently, because then the point under the pointer drifts away during the animation and returns at the end. It moves the scale by a ratio and the world point under the anchor in a straight line, then rebuilds the view from those with <code>placeAt</code>, which keeps the anchored point exactly in place in every frame.</p><p>Dragging sets <code>view</code> and <code>target</code> together, so a drag is not delayed.</p>`},{title:`Momentum`,text:`<p>The drag handler records how far the last move went. After release, <code>coast</code> keeps shifting the view by that amount each frame, reduced by 6% per frame, until it is under a third of a pixel.</p>`}],tour:[[`view`,`The view`,`<p>One Observable holding <code>x</code>, <code>y</code> and <code>scale</code>. A change to any of them is one assignment and so one repaint.</p>`],[`convert`,`World and screen coordinates`,`<p>Both functions take the view as an optional third argument, so they can also convert for the target view.</p>`],[`paint`,`The drawing`,`<p>A Reactor that depends on <code>view</code> and <code>colors</code>.</p>`],[`place`,`placeAt`,`<p>Used by the wheel handler, the buttons and the easing loop.</p>`],[`ease`,`The target and the frame loop`,`<p><code>steer</code> sets the target and starts the loop if it is not running. The loop stops itself when the view has reached the target, so nothing runs while the canvas is still.</p>`],[`drag`,`Dragging`,`<p>Moves the view and the target together.</p>`],[`fling`,`Momentum`,`<p>A second loop, started on release.</p>`],[`wheel`,`Zooming`,`<p>Changes the target about a screen point.</p>`]]}),a(`<p><strong>A Home button.</strong> In step 4 or 5, add a button that eases the view back to <code>{ x: 0, y: 0, scale: 1 }</code>.</p>`,`<p>Next to the zoom buttons. <code>steer</code> takes the view to go to and the screen point to keep fixed.</p>`,o(`row.append(Button("Home", () => steer({ x: 0, y: 0, scale: 1 }, w / 2, h / 2)));`)),`## blit | Repainting only what changed`,l(`blit`,{result:`above`,observers:`closed`,text:`<p>Eight thousand dots that can be dragged. The line under the canvas reports how many dots each repaint drew and how long it took.</p>`,steps:[{title:`The whole canvas on every move`,text:`<p>All drawing goes through <code>paintRegion</code>, which draws the dots that overlap a given rectangle and clips to it. The Reactor calls it for the whole canvas on every change of <code>offset</code>, so each drag frame draws a few hundred dots.</p>`},{title:`Shift the picture, paint the uncovered strips`,text:`<p>After a drag of a few pixels, most of the new picture is the old picture, shifted. The Reactor now copies the canvas onto itself at the new offset with <code>drawImage</code> and calls <code>paintRegion</code> only for the strips the shift uncovered.</p><p><code>shown</code> records what the canvas currently shows. The copy is used only when the palette is unchanged and the shift is smaller than the canvas; otherwise everything is painted.</p><p>Drag again: a few dots per frame.</p>`}],tour:[[`region`,`Painting one rectangle`,`<p>The clip keeps a strip's drawing inside the strip. Dots outside the rectangle are skipped before any drawing.</p>`],[`render`,`Choosing how much to paint`,`<p>A Reactor on <code>offset</code> and <code>colors</code>.</p>`]]}),`<p>This relies on <code>paintRegion</code> drawing identical pixels for the same offset, so that a newly painted strip matches the copied pixels next to it. It applies to panning only: a zoom changes every pixel.</p>`,`## real | Camera and Layer`,l(`camera`,{result:`above`,observers:`open`,text:`<p>The same four circles, drawn with the example's <code>Camera</code> and <code>Layer</code>. Click the canvas first: inside this guide a Camera takes the wheel only after a click, so that scrolling the page still works.</p>`,tour:[[`stage`,`An element for the Camera`,`<p>The Camera listens for input on <code>stage</code>. The canvas fills it and ignores the pointer (see <code>style.css</code>), so events reach the stage.</p>`],[`camera`,`The Camera`,`<p>It handles mouse, trackpad, touch, pen and keyboard, and does the easing, momentum and limits. It draws nothing. Its output is Observables: <code>camera.view</code>, <code>camera.tap</code>, <code>camera.last_input</code> and others. They appear in the table below the canvas.</p>`],[`paint`,`The Layer and its paint function`,`<p><code>Layer</code> decides how much of the canvas to repaint, as in the previous part, and calls <code>paint</code> with the region to fill, in world units (<code>world</code>) and in pixels (<code>screen</code>).</p><p><code>brush.useWorld()</code> sets the canvas transform from the view, so the circles are drawn at their world positions without converting each one. <code>deps: [colors]</code> lists the Observables the content depends on.</p>`],[`read`,`Reactors on the Camera's Observables`,`<p>These are subscribed to the Camera's Observables in the same way as to Observables created in this file.</p>`],[`move`,`Moving the camera from code`,`<p><code>goHome</code>, <code>zoomAt</code>, <code>fit</code>, <code>lookAt</code> and <code>panBy</code> change the target, like <code>steer</code> in the hand-built version.</p>`]]}),`<p>Compared with the hand-built version, the Camera adds:</p>
     <ul>
       <li><strong>Easing by elapsed time.</strong> A fixed fraction per frame is faster on a 144 Hz display than on a 60 Hz one. The Camera uses <code>1 − e<sup>−dt/τ</sup></code>, which gives the same motion at any frame rate.</li>
       <li><strong>Input applied once per frame</strong>, through a manual stage, as in the pointer lab of the Schedulers section.</li>
       <li><strong>Touch.</strong> It uses the set of pointers currently down: the change in their average position is a pan, and the change in the distance between two of them is a zoom.</li>
       <li><strong>Mouse wheel and trackpad told apart.</strong> Both send <code>wheel</code> events; a wheel should zoom and a two-finger scroll should pan. The Camera classifies each burst of events, and <code>wheel_mode</code> overrides that.</li>
       <li><strong>Smoothing of wheel input.</strong> Wheel events are not aligned with frames (two in one frame, none in the next), so they change the target and the view follows over about two frames.</li>
       <li><strong>Limits</strong>: <code>zoom_limits</code> and <code>world_bounds</code>, both Observables.</li>
     </ul>
     <p>The Camera and the Layer do not call each other. The Layer needs an object with two Observables, <code>view</code> and <code>screen</code>, and repaints when they change. The example also has a <code>FixedCamera</code> with the same two Observables, which frames a rectangle and takes no input; the Ising explainer uses it for its figures.</p>`,s(`The source of one Camera frame`,c(x,g,`advance(now) {`,`isMoving() {`,[[`const dt = clamp(`,`The time since the previous frame, limited to 64 ms.`],[`// 1. input`,`Runs the manual input stage.`],[`// 2. momentum`,"The equivalent of `coast`, with the decay measured in milliseconds."],[`// 3. ease toward`,"The equivalent of `frame`."],[`const k = 1 - Math.exp`,"The fraction to cover this frame, then the same interpolation as in step 4: the world point under the anchor, the scale by ratio, `placeAt`."],[`// 5. publish`,"The only assignment to `view`, at most once per frame."]])),s(`The source of the Layer's choice between a shift and a full repaint`,c(S,_,`const last = self._.last;`,`self._.needs_full = false;`,[[`const last = self._.last;`,"The equivalent of `shown`."],[`const same_zoom`,`A shift is possible only when the scale and the size are unchanged.`],[`// snap only when`,`For copied and newly painted pixels to line up, the shift must be a whole number of device pixels, so the origin is rounded on pan frames.`],[`// shift the old frame`,`The copy, through a second off-screen canvas.`],[`// the exposed strips`,`The uncovered strips.`]],4),c(S,_,`// content changes force a full repaint`,`return self;`,[[`// content changes force`,"A Reactor on the content's `deps`: it marks the whole canvas for repainting."],[`// camera, size and version`,`A Reactor on the view, the size and that mark: it renders.`]]))]),n(`ising`,`The Ising model`,`The Ising Model example shows a grid of spins that can be zoomed from the whole grid down to single arrows turning over. This section builds the drawing of one spin, then the simulation, then combines them with the Camera.`,[`## goal | The finished lattice`,l(`ising-real`,{peek:!0,observers:`none`,result:`above`,text:`<p>Each square is a spin: it points up (dark) or down (light). A spin tends to match its four neighbours, and temperature makes spins flip at random.</p><p>Click the lattice and zoom in. The squares turn into discs with arrows, and a flipping spin's arrow rotates. The parts below build this. The full simulation and the physics behind it are in the <a href="../ising-model/index.html">Ising Model</a> example and its <a href="../ising-model/index.html#learn">explainer</a>.</p>`}),`## sprite | Drawing one spin`,l(`spin`,{result:`above`,observers:`closed`,text:`<p>Six steps, from one arrow to a grid of spins that changes appearance with zoom.</p>`,steps:[{title:`An arrow`,text:`<p><code>drawArrow</code> draws a shaft and a head pointing up, relative to its own centre. It first moves the canvas origin to <code>(cx, cy)</code> and rotates it by <code>angle</code>, so the same drawing code serves any position and direction.</p><p>It is called once. Nothing changes after that, so no Observable or Reactor is needed.</p>`},{title:`An angle that can change`,text:`<p>The slider should rotate the arrow. <code>angle</code> is an Observable that the slider assigns, and the drawing moves into a Reactor that reads <code>angle.value</code>. Each slider move runs the Reactor, which clears the canvas and draws the arrow at the new angle.</p><p>The Reactor also reads <code>colors.value</code>, an Observable holding the palette, so the arrow is redrawn if the system switches between light and dark.</p>`},{title:`A spin that flips over time`,text:`<p>A spin has two states, so <code>angle</code> is replaced by <code>spin</code>, which is +1 or −1. Clicking the canvas negates it and stores the time in <code>flipped_at</code>.</p><p>The arrow should take 420 ms to turn. <code>arrowAngle(spin, age)</code> returns its angle from the spin and the time since the flip. The drawing therefore depends on the current time as well, and that is the Observable <code>clock</code>. After a click, <code>advance</code> assigns <code>clock</code> every frame for 420 ms and then stops, so the Reactor repaints while the arrow turns and not afterwards.</p><p>The only stored state of the animation is one timestamp.</p>`},{title:`A colored disc behind the arrow`,text:`<p><code>drawBubble</code> fills a disc with the spin's color: the text color for up, the background color for down. During a flip it fills the previous color first and then the new color with an opacity that grows from 0 to 1 over the same 420 ms, which gives a cross-fade. The arrow is drawn in whichever of the two colors contrasts with the disc.</p>`},{title:`Appearance depends on size`,text:`<p>Zoomed out, a spin should be a flat square that fills its cell. Zoomed in, a disc with an arrow. <code>detailAt(pixels)</code> maps the cell's size on screen to a number: 0 below 16 px, 1 above 46 px, rising smoothly between.</p><p><code>drawSpin</code> replaces <code>drawBubble</code> and derives everything from that number: the corner radius goes from 0 (a square) to half the side (a circle), a gap opens around the shape, and the arrow's opacity goes from 0 to 1.</p><p>Move the slider between 4 and 110. The shape changes continuously, with no size at which it switches.</p>`},{title:`A grid of spins`,text:`<p>The same function is called for every cell of a 24 × 24 lattice. Two arrays hold each spin's value and the time of its last flip. A click flips the spin under the pointer.</p><p>At 4 px per spin, <code>detail</code> is 0 and each spin is one filled rectangle.</p>`}],tour:[[`arrow`,`The arrow`,`<p>Drawn around the origin; positioned and rotated by the canvas transform.</p>`],[`state`,`The state`,`<p>The spins, the times of their last flips, and the clock.</p>`],[`turn`,`Time`,`<p><code>arrowAngle</code> computes the angle from a timestamp. <code>advance</code> runs only while a flip is in progress.</p>`],[`detail`,`From size to detail`,`<p>Pixels per spin in, a number from 0 to 1 out.</p>`],[`bubble`,`The shape and its colors`,`<p>Radius, gap, colors and arrow, computed from <code>detail</code> and from the time since the flip.</p>`],[`paint`,`The drawing`,`<p>A Reactor that depends on the clock, the cell size and the palette.</p>`]]}),i(`Why a timestamp per spin`,`<p>There is no list of running animations to maintain. A spin that flips again while turning gets a new timestamp and continues from there. Many spins flipping in the same frame allocate nothing. The code that flips a spin and the code that draws it share only the timestamp. The cost is that something must keep repainting until the last turn has finished.</p>`),s(`The same sprite in the Ising example`,`<p>The example does not fill each cell separately. Every cell adds its outline to a few shared paths, and each path is filled once, so thousands of cells take a few draw calls.</p>`,c(`src/examples/ising-model/canvas/sprites.ts`,b,`export function addSpin`,`// Paints a batch`,[[`const gap = t * GAP * s;`,"`t` is the detail. The gap and the radius grow with it."],[`if (radius < 0.5)`,`At low detail, a plain rectangle.`],[`if (t === 0) return;`,`No arrow below 16 px.`],[`batch.shafts.moveTo`,`The arrow, rotated with cos and sin and added to the shared paths.`]])),`## loop | The simulation`,`<p>One step of the simulation:</p>
     <ol>
       <li>Pick a spin at random.</li>
       <li>Compute the energy that flipping it would cost: 2 × the spin × the sum of its four neighbours. Flipping a spin that agrees with its neighbours costs energy; flipping one that disagrees releases it.</li>
       <li>If the cost is zero or negative, flip it. Otherwise flip it with probability <i>e</i><sup>−cost/<i>T</i></sup>, where <i>T</i> is the temperature.</li>
     </ol>
     <p>A <em>sweep</em> is as many steps as there are spins.</p>`,l(`ising`,{result:`above`,observers:`closed`,steps:[{title:`A lattice drawn as pixels`,text:`<p>9,216 spins in an <code>Int8Array</code>, set at random. To draw them, each spin becomes one pixel of a 96 × 96 image, and the image is drawn enlarged with smoothing off, so each pixel appears as a sharp square. The cost of drawing is the same at any zoom.</p><p><code>paint()</code> is called once. Nothing changes yet.</p>`},{title:`The loop`,text:`<p><code>sweep()</code> performs 9,216 steps, changing the array in place. The frame loop calls it once per frame.</p><p>An Observable is not notified of changes inside an array (the to-do exercise). So the loop increments <code>sweeps</code>, an Observable counting completed sweeps, and <code>paint</code> reads it. <code>paint</code> is now run by a Reactor, and a second Reactor shows the count next to the slider. The loop could call <code>paint()</code> directly; the Observable is used because two things depend on a sweep having finished, and the loop does not need to know either of them.</p><p>Move the temperature slider. Below about 2.27 the spins form growing patches; above it they stay disordered.</p>`},{title:`A table of ten probabilities`,text:`<p>A spin is ±1 and its neighbours sum to −4, −2, 0, 2 or 4, which gives ten possible costs. A Reactor that depends on <code>temperature</code> stores their probabilities in <code>odds</code>, and <code>sweep</code> reads from that list in place of calling <code>Math.exp</code> on every step.</p><p>The list is rebuilt when the slider moves and read about 550,000 times a second.</p>`}],tour:[[`lattice`,`The data`,`<p>A typed array, plus a counter. The array is not held in an Observable because nothing depends on which array it is.</p>`],[`pixels`,`Drawing`,`<p>One 32-bit write per spin, then one image draw.</p>`],[`temperature`,`The temperature control`,`<p>An Observable, a slider that assigns it, and a Reactor that displays it.</p>`],[`odds`,`Derived data`,`<p>Recomputed only when <code>temperature</code> changes.</p>`],[`sweep`,`The steps`,`<p>The inner loop reads plain variables and arrays. No Observable is read or written inside it.</p>`],[`loop`,`The frame loop`,`<p>One sweep, then one assignment.</p>`]]}),`## rule | Exercise: the acceptance rule`,l(`metropolis`,{result:`above`,observers:`none`,exercise:{task:`<p>This lattice is at <i>T</i> = 1.5, where it should form large patches. It stays random because <code>accepts</code> returns <code>true</code> for every flip.</p><p>Make <code>accepts(cost, T)</code> return <code>true</code> when <code>cost</code> is zero or negative, and otherwise <code>true</code> with probability <i>e</i><sup>−cost/<i>T</i></sup>. The check calls the function several thousand times and compares the frequencies.</p>`,hint:`<p><code>Math.random() &lt; p</code> is true with probability <code>p</code>. <i>e</i><sup>−cost/<i>T</i></sup> is <code>Math.exp(-cost / T)</code>.</p>`,check:e=>{let t=e.window.accepts;if(typeof t!=`function`||t(0,1)!==!0||t(-4,1)!==!0)return!1;let n=0,r=0;for(let e=0;e<3e3;e++)t(2,2)&&n++,t(8,.5)&&r++;return Math.abs(n/3e3-Math.exp(-1))<.06&&r<10}}}),`## together | Sprite, simulation and Camera together`,l(`ising-zoom`,{result:`above`,observers:`closed`,text:`<p>The sprite and the simulation from the previous parts, moved into two files, and drawn through the Camera. Click the lattice, zoom in, and watch single spins turn.</p>`,tour:[[`stage`,`The page`,`<p>An element for the Camera with a canvas in it, and a slider.</p>`],[`state`,`The state`,`<p><code>clock</code> holds the time the picture is drawn for. A Reactor passes each new <code>temperature</code> to <code>physics.js</code>, which rebuilds its table.</p>`],[`camera`,`The Camera`,`<p>World units are spins, so the Camera's <code>scale</code> is the number of pixels per spin, which is the input <code>detailAt</code> takes. Zooming therefore changes the sprites with no extra code.</p><p><code>auto_advance: false</code> stops the Camera from running its own frames, because the loop below advances it.</p>`],[`paint`,`The Layer's paint function`,`<p>For the region it is given, it finds the spins inside it (indices wrap, since the lattice repeats) and calls <code>drawSpin</code> for each with the time since its flip. <code>deps: [clock, colors]</code> makes the Layer repaint when either changes.</p>`],[`loop`,`One frame loop`,`<p>Each frame: the Camera processes input and may assign its view; <code>sweep</code> flips spins and stamps each flip with <code>now</code>; then <code>clock</code> is assigned once, and the Layer repaints.</p>`]]}),`<p><code>physics.js</code> changes spins and timestamps and contains no drawing. <code>sprites.js</code> draws one spin from a value, an age and a detail level, on whatever canvas context it is given. The Camera turns input into a view. They meet in the paint function.</p>`,a(`<p><strong>Flip a spin by tapping it.</strong> The Camera's <code>tap</code> Observable holds the latest tap, with world coordinates.</p>`,`<p>In <code>main.js</code>. A tap's <code>x</code> and <code>y</code> are in world units, which are spins.</p>`,o(`
Reactor(() => {
    const tap = camera.tap.value;
    if (!tap) return;
    const i = ((Math.floor(tap.y) % N) + N) % N, j = ((Math.floor(tap.x) % N) + N) % N;
    spins[i * N + j] *= -1;
    flipped[i * N + j] = performance.now();
});`)),`## real | With the example's modules`,l(`ising-real`,{result:`above`,observers:`closed`,text:`<p>The same program written with the Ising example's modules. <code>Lattice</code> and <code>step</code> correspond to <code>physics.js</code>, and <code>LatticeLayer</code> is a Layer with the paint function built in.</p>`,tour:[[`state`,`The state`,`<p>The lattice, a counter that is incremented after each frame's flips, and the temperature with its table.</p>`],[`view`,`Camera and LatticeLayer`,`<p><code>LatticeLayer</code> repaints when <code>tick</code> or the view changes.</p>`],[`loop`,`The frame loop`,`<p>The same three lines as before.</p>`]]}),`<p>What the example's versions add:</p>
     <ul>
       <li><strong>Two drawing methods.</strong> At detail 0 it draws the one-pixel-per-spin image from the simulation lab; above 0 it draws sprites. At detail 0 a sprite is a flat square that fills its cell, the same pixels as the image, so changing method there is not visible.</li>
       <li><strong>Batched sprites</strong>, as in the source shown earlier.</li>
       <li><strong>Running totals.</strong> <code>step</code> updates the magnetization and the energy with each flip, so the readouts do not recount the lattice.</li>
       <li><strong>A render stage.</strong> In the full simulation the Camera's view and the tick can both change in one frame. The Layer renders on a Scheduler stage, so it paints once per frame.</li>
     </ul>`,s(`The source of step()`,c(`src/examples/ising-model/ising.ts`,v,`export function step`,`// Per-spin magnetization`,[[`const exact = sweeps * nn + lat.carry;`,`A fraction of a sweep is allowed; the remainder carries over to the next call.`],[`const S = spins[`,"The four neighbours. Wrapping is done with a comparison per side, which is cheaper than `%`."],[`const p = table[`,`The table of ten probabilities.`],[`if (p >= 1 || Math.random() < p) {`,`A certain flip uses no random number. On a flip the totals are adjusted and the time is stored.`]])),s(`The source of the pixel image`,c(`src/examples/ising-model/canvas/lattice_layer.ts`,y,`function pixels(lat: Lattice)`,`return Layer(camera, canvas, {`,[[`const key =`,`A Layer may paint several strips in one render. The image is rebuilt when the spins or colors change, and reused between strips.`],[`const px = new Uint32Array`,`One 32-bit write per spin.`]]))]),n(`reference`,`Reference`,`Where to find the rest.`,[`<p><strong>Docs.</strong> Every option, field and method of Observable, Reactor, Scheduler, Camera and Layer, with editable examples: <a href="./docs.html">the docs page</a>.</p>
     <p><strong>Examples.</strong> <a href="../pan-zoom/index.html">Pan &amp; Zoom</a>, <a href="../ising-model/index.html">Ising Model</a> and its <a href="../ising-model/index.html#learn">explainer</a>. Smaller ones: <a href="../click_counter/index.html">Click Counter</a>, <a href="../component-toggle/index.html">Component Toggle</a>, <a href="../cascades-and-schedules/index.html">Cascades &amp; Schedules</a>. All of them are in the <a href="../../../index.html">gallery</a>.</p>
     <p><strong>Source.</strong> <code>src/core</code> is under four hundred lines. The README's <a href="https://github.com/AlmostAPhysicist/excitejs#design-choices" target="_blank" rel="noopener">Design Choices</a> section lists the rules these sections demonstrate, and its task list names what ExciteJS does not have yet: templates, a way to dispose a group of Reactors together, tracking for Reactors created inside Reactors, reactivity for changes inside objects and arrays, and error handling for a reaction that throws.</p>
     <p><strong>Browser APIs</strong> used in the canvas sections, on MDN: <a href="https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events" target="_blank" rel="noopener">Pointer events</a>, <a href="https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent" target="_blank" rel="noopener">WheelEvent</a>, <a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame" target="_blank" rel="noopener">requestAnimationFrame</a>, <a href="https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D" target="_blank" rel="noopener">CanvasRenderingContext2D</a>.</p>
     <p><strong>Physics.</strong> N. Metropolis et al., <i>J. Chem. Phys.</i> 21, 1087 (1953). L. Onsager, <i>Phys. Rev.</i> 65, 117 (1944). C. N. Yang, <i>Phys. Rev.</i> 85, 808 (1952).</p>
     <p><strong>Type and color.</strong> Libron, from <a href="https://github.com/nicoverbruggen/ebook-fonts" target="_blank" rel="noopener">nicoverbruggen/ebook-fonts</a>. Fira Code Nerd Font Mono, from <a href="https://github.com/ryanoasis/nerd-fonts" target="_blank" rel="noopener">Nerd Fonts</a>. Colors from the Hubble palette in the <a href="../color-palettes/index.html">Color Palettes</a> example.</p>`])],w=[`The two basic pieces, through small examples and exercises.`,`Batching reactions and choosing when they run.`,`A small app with components, shared state, a timer and two pages.`,`Dragging, zooming, easing and momentum, built by hand.`,`One arrow, then a grid of spins, then the simulation.`,`Docs, examples, sources.`],T=e(``);function E(){let e=``;for(let t of C)t.node.getBoundingClientRect().top<innerHeight*.4&&(e=t.id);e!==T._value&&(T.value=e)}function D(){let e=r(`nav`,`top`);e.setAttribute(`aria-label`,`Sections`);let n=r(`a`,`top-home`,`ExciteJS, from the ground up`);n.href=`#`;let i=r(`div`,`top-links`);for(let e of C){let n=r(`a`,``,e.title);n.href=`#`+e.id,t(()=>{T.value===e.id?n.setAttribute(`aria-current`,`true`):n.removeAttribute(`aria-current`)}),i.append(n)}let a=r(`a`,``,`Docs`);return a.href=`./docs.html`,i.append(a),e.append(n,i),e}var O=r(`header`,`hero`,`
  <h1>ExciteJS, from the ground up</h1>
  <p>ExciteJS has three building blocks. Observables are values that can be observed for changes. Reactors react to those changes. Schedulers control when the reactions run.</p>
  <p>This guide starts with a counter and ends with a simulation of a magnet on a canvas that can be zoomed. Every code block on the page is running and can be edited, with its result shown directly under it.</p>`),k=r(`ol`,`contents`);C.forEach((e,t)=>{let n=r(`li`),i=r(`a`,``,`<i>${t+1}</i><b>${e.title}</b><span>${w[t]}</span>`);i.href=`#`+e.id,n.append(i),k.append(n)}),O.append(k);var A=r(`main`,`page`);A.append(O,...C.map(e=>e.node)),A.append(r(`footer`,`foot`,`Built with ExciteJS. <a href="../../../index.html">All examples</a> · <a href="./docs.html">Docs</a>`)),document.body.append(D(),A),window.addEventListener(`scroll`,E,{passive:!0}),window.addEventListener(`resize`,E),E();