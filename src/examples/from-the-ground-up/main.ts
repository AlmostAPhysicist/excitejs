// main.ts
//
// ExciteJS, from the ground up: the guide.
//
//   kit.ts        el, highlight, Source, Fold, Section
//   lab/          the Lab: notes beside a small editable file system, with
//                 the page those files make under it
//   labs/         the files each lab starts from (plain .js, .css, .html)
//   sections/     the text of the guide and its labs
//   docs.ts       the reference page (docs.html)
//
// The page itself is built with ExciteJS: `here`, the id of the section
// being read, is an Observable, and each link in the top bar has a Reactor
// that marks it when it is the current one.

import { Observable, Reactor } from "../../core/index";
import "../color-palettes/palettes/hubble.css";
import "./guide.css";
import { el, type Section } from "./kit.ts";
import { reactiveSection, schedulerSection } from "./sections/core.ts";
import { appSection } from "./sections/app.ts";
import { canvasSection, isingSection, referenceSection } from "./sections/canvas.ts";

const sections: Section[] = [reactiveSection(), schedulerSection(), appSection(), canvasSection(), isingSection(), referenceSection()];

const ABOUT = [
    "The two basic pieces, through small examples and exercises.",
    "Batching reactions and choosing when they run.",
    "A small app with components, shared state, a timer and two pages.",
    "Dragging, zooming, easing and momentum, built by hand.",
    "One arrow, then a grid of spins, then the simulation.",
    "Docs, examples, sources.",
];

const here = Observable(""); // id of the section being read; "" above the first

function locate(): void {
    let id = "";
    for (const s of sections) if (s.node.getBoundingClientRect().top < innerHeight * 0.4) id = s.id;
    if (id !== here._value) here.value = id; // Observables don't compare values, so the check is here
}

function TopBar(): HTMLElement {
    const bar = el("nav", "top");
    bar.setAttribute("aria-label", "Sections");
    const home = el("a", "top-home", "ExciteJS, from the ground up");
    home.href = "#";
    const links = el("div", "top-links");
    for (const s of sections) {
        const a = el("a", "", s.title);
        a.href = "#" + s.id;
        Reactor(() => { if (here.value === s.id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
        links.append(a);
    }
    const docs = el("a", "", "Docs");
    docs.href = "./docs.html";
    links.append(docs);
    bar.append(home, links);
    return bar;
}

const hero = el("header", "hero", `
  <h1>ExciteJS, from the ground up</h1>
  <p>ExciteJS has three building blocks. Observables are values that can be observed for changes. Reactors react to those changes. Schedulers control when the reactions run.</p>
  <p>This guide starts with a counter and ends with a simulation of a magnet on a canvas that can be zoomed. Every code block on the page is running and can be edited, with its result shown directly under it.</p>`);
const contents = el("ol", "contents");
sections.forEach((s, k) => {
    const li = el("li");
    const a = el("a", "", `<i>${k + 1}</i><b>${s.title}</b><span>${ABOUT[k]}</span>`);
    a.href = "#" + s.id;
    li.append(a);
    contents.append(li);
});
hero.append(contents);

const page = el("main", "page");
page.append(hero, ...sections.map(s => s.node));
page.append(el("footer", "foot", `Built with ExciteJS. <a href="../../../index.html">All examples</a> · <a href="./docs.html">Docs</a>`));
document.body.append(TopBar(), page);

window.addEventListener("scroll", locate, { passive: true });
window.addEventListener("resize", locate);
locate();
