// sections/app.ts
//
// Section 3 of the guide: building a small app, file by file.

import { Exercise, Section, Snippet } from "../kit.ts";
import { Lab } from "../lab/lab.ts";

export const appSection = () => Section("app", "Building a page",
    "ExciteJS has no component system, template language or router. This section builds a small app to show how each of those is written with Observables, Reactors and the DOM.", [

    "## goal | The finished app",
    Lab("brew", {
        peek: true, address: true, observers: "none", view_height: 300,
        text: `<p>Brew is a tea timer. Pick a tea and press Brew: the clock counts down, the cup takes on the tea's color, and a finished cup is added to the Log page. The clock runs ten times faster than real time, so Green tea takes about twelve seconds.</p>
               <p>It contains what most small apps contain: state shared between parts, a list built from data, a timer that has to be stopped, two pages, and data kept between visits. The next part builds it from an empty page.</p>`,
    }),

    "## steps | Step by step",
    Lab("brew", {
        address: true, view_height: 300,
        text: `<p>Seven steps. Each adds a few lines, marked green, sometimes in a new file (a green dot on its tab). The code can be edited at any step; <em>Reset</em> restores the step.</p>`,
        steps: [
            { title: "Three files", text: `<p><code>index.html</code> contains an empty <code>&lt;main&gt;</code> and loads <code>main.js</code>. <code>main.js</code> finds that element and adds a heading. <code>style.css</code> sets spacing.</p><p>Nothing changes on this page yet, so nothing from ExciteJS is used.</p>` },
            { title: "State in its own file", text: `<p><code>state.js</code> exports the list of teas and one Observable, <code>picked</code>, holding the selected tea. The list is a constant because it never changes; <code>picked</code> is an Observable because parts of the page will need to update when it does.</p><p>A file that imports <code>picked</code> gets the same Observable as every other file, which is how state is shared here. For now <code>main.js</code> shows the picked tea with one Reactor. Change <code>TEAS[0]</code> to <code>TEAS[2]</code> in <code>state.js</code> to see it update.</p>` },
            { title: "A component", text: `<p><code>components/TeaCard.js</code> exports a function that takes a tea and returns a button. Inside it does three things: it creates the element; it assigns <code>picked</code> when clicked; and it creates a Reactor that adds or removes the <code>is-picked</code> class.</p><p><code>main.js</code> calls it once per tea with <code>TEAS.map(TeaCard)</code>. Each card has its own Reactor, and all four depend on <code>picked</code>. Clicking a card runs all four; each compares <code>picked.value</code> with its own tea.</p>` },
            { title: "A second component, and a rule in state.js", text: `<p><code>components/Timer.js</code> shows <code>seconds_left</code> as minutes and seconds.</p><p><code>state.js</code> gains a Reactor that sets <code>seconds_left</code> to the picked tea's time. It has <code>deps: [picked]</code>, so it runs when the tea changes and at no other time. It lives in <code>state.js</code> because it describes how two pieces of state relate, independent of any component.</p>` },
            { title: "The clock", text: `<p><code>brewing</code> is a boolean Observable, toggled by a new button in the Timer.</p><p>A Reactor in <code>state.js</code> reads <code>brewing.value</code>. When it is true, the Reactor starts an interval that decrements <code>seconds_left</code>, and returns a function that clears the interval. That function is the preaction: it runs before the Reactor's next run. So pausing stops the interval, and so does picking another tea, because the rule from step 4 now also sets <code>brewing</code> to false.</p>` },
            { title: "The cup", text: `<p><code>components/Cup.js</code> has one Reactor that writes two CSS variables on its element: the tea's color, and the fraction of the brewing time that has passed. The stylesheet turns those into the fill color. No elements are created or removed when the values change.</p>` },
            { title: "Two pages and a saved log", text: `<p><code>state.js</code> gains <code>log</code>, an Observable holding an array read from <code>localStorage</code>. A finished brew assigns a new array with one more entry, and a one-line Reactor writes the array back to <code>localStorage</code> whenever it changes.</p><p><code>main.js</code> becomes a router. <code>route</code> is an Observable holding the address after <code>#</code>. One Reactor adds the page for the current route to the document and returns a function that removes it, so the previous page is removed before the next is added.</p><p>Brew a cup, open the Log, then press <em>Run again</em>: the app restarts and the entry is still listed.</p>` },
        ],
        tour: [
            ["state", "The state", `<p>Every Observable the app has, exported from one file. Components import the ones they use.</p>`],
            ["reset", "A rule between two Observables", `<p>When <code>picked</code> changes, the clock is reset and brewing stops.</p>`],
            ["clock", "The clock, with its cleanup", `<p>Runs an interval while <code>brewing</code> is true. The returned function clears it before the next run.</p>`],
            ["save", "Saving", `<p>Reads <code>log.value</code>, so it runs whenever <code>log</code> is assigned.</p>`],
            ["element", "A component creates its element once", `<p>The element is built when the component function is called. It is not rebuilt later.</p>`],
            ["out", "It writes state from event handlers", `<p>A click assigns <code>picked</code>.</p>`],
            ["in", "It updates itself with a Reactor", `<p>The only part of the card that changes is one class, and this Reactor sets it.</p>`],
            ["route", "The address as an Observable", `<p><code>route</code> starts from <code>location.hash</code> and is assigned again on every <code>hashchange</code> event.</p>`],
            ["links", "One Reactor per link", `<p>Each marks its link when the link's address equals the route.</p>`],
            ["router", "Adding and removing pages", `<p>The brew page is created once and kept, so the clock keeps running while the log is open. The log page is created on each visit, and the cleanup removes it and disposes its Reactor.</p><p>The Reactor reads <code>route.value</code> before it creates a page. Creating a Reactor inside a running Reactor ends the outer one's dependency tracking for the rest of that run, so the outer one must read what it depends on first.</p>`],
        ],
    }),
    `<p>When a tea is picked, no component function runs again. A few Reactors run, and each sets one class, one text or one CSS variable on an element it already holds.</p>`,

    "## exercises | Exercises",
    `<p>These use step 7 of the lab above.</p>`,
    Exercise(`<p><strong>A fifth tea.</strong> Add a white tea that brews for 90 seconds and uses the palette's cyan.</p>`,
        `<p>One line in the <code>TEAS</code> array in <code>state.js</code>. The cards are built from that array, and everything else depends on <code>picked</code>, so no other file changes.</p>`,
        Snippet(`{ name: "White", seconds: 90, color: "var(--cyan)" },`)),
    Exercise(`<p><strong>A “+30 s” button.</strong> Add a button to the Timer that adds 30 seconds to the clock.</p>`,
        `<p>In <code>components/Timer.js</code>, before <code>return box</code>. The button only assigns <code>seconds_left</code>; the display and the cup already depend on it.</p>`,
        Snippet(`
const more = document.createElement("button");
more.className = "quiet";
more.textContent = "+30 s";
more.onclick = () => seconds_left.value += 30;
box.append(more);`)),
    Exercise(`<p><strong>A count in the navigation.</strong> Make the Log link read “Log (3)” when three cups have been brewed.</p>`,
        `<p>In <code>main.js</code>, after the navigation is created.</p>`,
        Snippet(`
import { log } from "./state.js";

Reactor(() => {
    nav.children[1].textContent = log.value.length ? \`Log (\${log.value.length})\` : "Log";
});`)),
    Exercise(`<p><strong>Clear the log.</strong> Add a button to the log page that empties the log.</p>`,
        `<p>In <code>pages/LogPage.js</code>. Assigning an empty array is enough: the saving Reactor in <code>state.js</code> depends on <code>log</code> and writes the empty array to <code>localStorage</code>.</p>`,
        Snippet(`
const clear = document.createElement("button");
clear.textContent = "Clear";
clear.onclick = () => log.value = [];
node.append(clear);`)),

    "## summary | What the app is made of",
    `<ul>
       <li><strong>A component</strong> is a function that creates an element, assigns Observables from its event handlers, and creates Reactors for the parts of the element that change.</li>
       <li><strong>Shared state</strong> is a file that exports Observables.</li>
       <li><strong>A rule between pieces of state</strong> is a Reactor in that file.</li>
       <li><strong>Showing and removing a page</strong> is a Reactor that adds an element and returns a function that removes it.</li>
       <li><strong>A route</strong> is an Observable assigned from <code>hashchange</code>.</li>
       <li><strong>Saved data</strong> is a Reactor that writes an Observable to storage.</li>
     </ul>
     <p>Two things are done by hand that larger frameworks automate: creating elements, and disposing Reactors. A Reactor that only touches its own element can be discarded together with the element. A component that owns a timer or an event listener, or whose Reactors depend on long-lived state, should return a <code>dispose</code> function, as <code>LogPage</code> does.</p>`,
]);
