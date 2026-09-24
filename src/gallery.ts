// gallery.ts
//
// The site's home page: a searchable, tag-filterable list of the examples.
// Built with excitejs itself. Every card, tag chip and the result count has
// its own auto-tracking Reactor, so a keystroke only touches what changed.

import { Observable, Reactor } from "./core/index";
import "./gallery.css";

interface Example {
    slug: string; // folder name under src/examples/
    title: string;
    description: string;
    tags: string[];
}

const EXAMPLES: Example[] = [
    {
        slug: "click_counter",
        title: "Click Counter",
        description: "A click counter, and an interval whose returned cleanup restarts it whenever its speed changes.",
        tags: ["auto deps", "preaction"],
    },
    {
        slug: "directory",
        title: "Team Directory",
        description: "Search and filter a list. Filtering runs on a compute schedule, DOM updates on a render schedule.",
        tags: ["auto deps", "scheduler", "derived state"],
    },
    {
        slug: "cascades-and-schedules",
        title: "Cascades & Schedules",
        description: "The same chain of reactors side by side, with and without a Scheduler, to show how schedules order work.",
        tags: ["explicit deps", "scheduler", "trigger"],
    },
    {
        slug: "component-toggle",
        title: "Component Toggle",
        description: "Cycles through UI components. Each is removed by the reaction's cleanup before the next one mounts.",
        tags: ["preaction", "components"],
    },
    {
        slug: "themed-page",
        title: "Themed Page",
        description: "A light/dark switch driving the page theme from a single Observable.",
        tags: ["components"],
    },
    {
        slug: "theme-workbench",
        title: "Theme Workbench",
        description: "Raw controls feed derived style values that restyle live previews, split across compute and render schedules.",
        tags: ["scheduler", "derived state"],
    },
    {
        slug: "ripple",
        title: "Ripple Matrix",
        description: "A 50×50 grid of 2,500 cells redrawn from a handful of wave Observables.",
        tags: ["scheduler", "performance"],
    },
    {
        slug: "pomodoro",
        title: "Pomodoro Timer",
        description: "A complete focus timer: configurable sessions, a dial, a live favicon and a completion chime.",
        tags: ["app", "scheduler"],
    },
];

const ALL_TAGS = [...new Set(EXAMPLES.flatMap(example => example.tags))].sort();

function el<K extends keyof HTMLElementTagNameMap>(tag: K, class_name?: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (class_name) node.className = class_name;
    if (text) node.textContent = text;
    return node;
}

export function Gallery(): HTMLElement {
    //// State
    const search_query = Observable("");
    const active_tag = Observable<string | null>(null);

    // Reads both observables, so any Reactor that calls it tracks both
    function matches(example: Example): boolean {
        const query = search_query.value.trim().toLowerCase();
        const tag = active_tag.value;

        const matches_tag = tag === null || example.tags.includes(tag);
        const haystack = `${example.title} ${example.description} ${example.tags.join(" ")}`.toLowerCase();
        return matches_tag && haystack.includes(query);
    }

    //// Header
    const page = el("main", "gallery");

    const header = el("header", "gallery-header");
    const logo = el("img", "gallery-logo");
    logo.src = "logo.svg";
    logo.alt = "";
    const links = el("nav", "gallery-links");
    for (const [label, href] of [
        ["GitHub", "https://github.com/AlmostAPhysicist/excitejs"],
        ["npm", "https://www.npmjs.com/package/excitejs"],
    ]) {
        const link = el("a", undefined, label);
        link.href = href;
        links.appendChild(link);
    }
    header.append(
        logo,
        el("h1", undefined, "ExciteJS"),
        el("p", "gallery-tagline", "A lightweight reactive framework built on Observables and Reactors. Every example below, and this page, runs on it."),
        links,
    );

    //// Controls
    const controls = el("div", "gallery-controls");

    const search_input = el("input", "gallery-search");
    search_input.type = "search";
    search_input.placeholder = "Search examples…";
    search_input.setAttribute("aria-label", "Search examples");
    search_input.oninput = () => { search_query.value = search_input.value; };

    const chips = el("div", "gallery-chips");
    for (const tag of [null, ...ALL_TAGS]) {
        const chip = el("button", "chip", tag ?? "all");
        chip.type = "button";
        chip.onclick = () => {
            active_tag.value = active_tag.value === tag ? null : tag;
        };
        Reactor(() => {
            const is_active = active_tag.value === tag;
            chip.classList.toggle("active", is_active);
            chip.setAttribute("aria-pressed", String(is_active));
        });
        chips.appendChild(chip);
    }

    const status = el("p", "gallery-status");
    status.setAttribute("aria-live", "polite");

    controls.append(search_input, chips, status);

    //// Cards
    const grid = el("div", "gallery-grid");
    for (const example of EXAMPLES) {
        const card = el("a", "card");
        card.href = `src/examples/${example.slug}/index.html`;

        const tags = el("div", "card-tags");
        for (const tag of example.tags) tags.appendChild(el("span", "card-tag", tag));

        card.append(
            el("h2", undefined, example.title),
            el("p", undefined, example.description),
            tags,
        );

        Reactor(() => { card.hidden = !matches(example); });
        grid.appendChild(card);
    }

    const empty = el("p", "gallery-empty", "No examples match.");

    Reactor(() => {
        const count = EXAMPLES.filter(matches).length;
        status.textContent = count === EXAMPLES.length
            ? `${count} examples`
            : `${count} of ${EXAMPLES.length} examples`;
        empty.hidden = count !== 0;
    });

    page.append(header, controls, grid, empty);
    return page;
}
