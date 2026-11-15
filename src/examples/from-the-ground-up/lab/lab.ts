// lab/lab.ts
//
// A Lab: notes on the left; on the right a small pseudo file system you can
// edit, with the page those files make directly under it.
//
//   labs/<folder>/*  (imported as text)
//        │  derive(step, variant)
//        ▼
//   sources ──► [editor] ◄──► current file
//      │
//      └─► (a beat after the last keystroke) runFiles ──► run ──► result, console, observers table
//                                              └─► exercise check, on a hidden second run
//
// A lab's state is a handful of Observables (which file is open, which step,
// which region is being explained, starter or solution, solved or not), and
// everything on screen is a Reactor on them.
//
// Steps, regions and exercises are not separate copies of the files. One
// file carries markers (see derive() in sandbox.ts): `//#step 3 … //#end`
// for lines that arrive at step 3, `//#part name … //#end` for a region the
// notes explain, `//#starter` and `//#solution` for an exercise.

import { Observable, Reactor } from "../../../core/index";
import { el, highlight } from "../kit.ts";
import { Editor, type Region } from "./editor.ts";
import { Observers } from "./observers.ts";
import { derive, runFiles, type Part, type Run } from "./sandbox.ts";

const RAW = import.meta.glob<string>("../labs/**/*", { query: "?raw", import: "default", eager: true });

export interface Step {
    title: string;
    text: string;
    code?: string;   // the lines this step adds or changes, repeated in the notes
    focus?: string;  // a region (#part name) to put the rectangle on, so the change is in view
}

// What an exercise's check may do to a (hidden) run of the reader's code
export interface Probe {
    body: HTMLElement;
    text(): string;                               // everything the page shows
    all(selector: string): Element[];
    click(selector: string, times?: number): void;
    type(selector: string, value: string): void;  // into an input, as if typed
    tick(selector: string, on: boolean): void;    // a checkbox
    logs(): string[];
    window: Record<string, any>;                  // what the code put on `window`
    wait(ms?: number): Promise<void>;
}

export interface Exercise {
    task: string;
    hint?: string;
    check(p: Probe): boolean | Promise<boolean>;
}

export interface LabOptions {
    text?: string;                                        // notes beside the code
    steps?: Step[];                                       // step k shows the lines marked #step ≤ k
    tour?: [part: string, title: string, text: string][]; // regions of the code, explained one at a time
    exercise?: Exercise;
    observers?: "open" | "closed" | "none";               // the table of Observables and Reactors (default closed)
    result?: "below" | "above";                           // where the page sits relative to the code (default below)
    open?: string;                                        // the file shown first
    peek?: boolean;                                       // start with the code folded away
    address?: boolean;                                    // show the page's address (for labs with routes)
    view_height?: number;                                 // minimum height of the page, px
}

const ORDER = (name: string) => (name === "index.html" ? "0" : name === "main.js" ? "1" : name.endsWith(".css") ? "9" : name.includes("/") ? "5" : "3") + name;
let lab_count = 0;

export function Lab(folder: string, options: LabOptions = {}): HTMLElement {
    const id = "lab" + (++lab_count);
    const prefix = `../labs/${folder}/`;
    const raw: Record<string, string> = {};
    for (const [path, text] of Object.entries(RAW)) if (path.startsWith(prefix)) raw[path.slice(prefix.length)] = text;
    if (!Object.keys(raw).length) throw new Error(`no lab files in labs/${folder}`);

    //// State

    const step = Observable(1);
    const variant = Observable<"starter" | "solution">(options.exercise ? "starter" : "solution");
    const sources = Observable<Record<string, string>>({});
    const fresh = Observable<Record<string, Set<number>>>({});
    const parts = Observable<Record<string, Part[]>>({}); // named regions per file
    const stop = Observable(0);            // which region the notes are on
    const open = Observable("");
    const current = Observable("");        // the open file's text, as the editor has it
    const run = Observable<Run | null>(null);
    const near = Observable(false);        // close to the viewport: worth running
    const folded = Observable(!!options.peek);
    const solved = Observable(false);
    const storage = new Map<string, string>();

    //// Skeleton

    const root = el("section", "lab");
    root.dataset.result = options.result ?? "below";
    const notes = el("div", "lab-notes");
    if (options.text) notes.append(el("div", "prose", options.text));
    const work = el("div", "lab-work");

    const codebox = el("div", "lab-code");
    const bar = el("div", "lab-bar");
    const files_nav = el("nav", "lab-files");
    files_nav.setAttribute("aria-label", "Files");
    const actions = el("div", "lab-actions");
    bar.append(files_nav, actions);
    const marks = Observable(new Set<number>());
    const region = Observable<Region | null>(null);
    codebox.append(bar, Editor(current, { file: open, fresh: marks, region }));

    const result = el("div", "lab-result");
    const address = el("p", "lab-address");
    address.hidden = !options.address;
    const view = el("div", "lab-view");
    if (options.view_height) view.style.minHeight = options.view_height + "px";
    const shadow = view.attachShadow({ mode: "open" });
    const error = el("pre", "lab-error");
    const log = el("ol", "lab-console");
    result.append(address, view, error, log);

    work.append(codebox, result);
    if (options.observers !== "none") work.append(Observers(run, () => near._value, options.observers === "open"));

    Reactor(() => { marks.value = fresh.value[open.value] ?? new Set(); });

    //// Files: derived from the step and the variant; replaced when either changes

    function load(): void {
        const next: Record<string, string> = {}, lines: Record<string, Set<number>> = {}, regions: Record<string, Part[]> = {};
        for (const name of Object.keys(raw).sort((a, b) => ORDER(a).localeCompare(ORDER(b)))) {
            const d = derive(raw[name], options.steps ? step._value : 99, variant._value);
            if (!d.text.trim()) continue;
            next[name] = d.text;
            lines[name] = d.fresh;
            regions[name] = d.parts;
        }
        fresh.value = lines;
        parts.value = regions;
        sources.value = next;
        const added = Object.keys(next).find(n => lines[n].size);
        if (added && options.steps) open.value = added;
        else if (!(open._value in next)) open.value = options.open && options.open in next ? options.open : Object.keys(next).find(n => n.endsWith(".js")) ?? Object.keys(next)[0];
        else open.trigger();
    }
    Reactor(load, { deps: [step, variant], initFn: true });

    // open file ⇄ editor. Observables don't compare values, so each side
    // does: without these two guards the pair would trigger each other forever.
    Reactor(() => {
        const text = sources._value[open._value] ?? "";
        if (current._value !== text) current.value = text;
    }, { deps: [open, sources], initFn: true });
    Reactor(() => {
        const name = open._value;
        if (!(name in sources._value) || sources._value[name] === current._value) return;
        // edited: the line marks and regions of this file no longer line up
        if (fresh._value[name]?.size) fresh.value = { ...fresh._value, [name]: new Set() };
        if (parts._value[name]?.length) parts.value = { ...parts._value, [name]: [] };
        sources.value = { ...sources._value, [name]: current._value };
    }, { deps: [current] });

    Reactor(() => {
        const list = Object.keys(sources.value), now = open.value;
        files_nav.hidden = list.length < 2;
        files_nav.replaceChildren(...list.map(name => {
            const b = el("button", "lab-file");
            const slash = name.lastIndexOf("/");
            b.innerHTML = (slash < 0 ? "" : `<i>${name.slice(0, slash + 1)}</i>`) + name.slice(slash + 1);
            b.setAttribute("aria-pressed", String(name === now));
            if (fresh._value[name]?.size) b.classList.add("is-fresh");
            b.addEventListener("click", () => open.value = name);
            return b;
        }));
    });

    //// Running: once in view, and a beat after each edit

    function execute(): void {
        run._value?.dispose();
        const r = runFiles(sources._value, shadow, { storage, id });
        run.value = r;
        if (options.exercise && !r.error._value) check();
    }
    Reactor(() => {
        if (!near._value) return;
        if (!run._value) { execute(); return; }
        const timer = setTimeout(execute, 350);
        return () => clearTimeout(timer);
    }, { deps: [sources, near] });

    new IntersectionObserver(entries => {
        const inside = entries[entries.length - 1].isIntersecting;
        if (inside !== near._value) near.value = inside;
    }, { rootMargin: "300px" }).observe(root);

    Reactor(() => { address.textContent = folder + ".app/" + (run.value?.address.value ?? ""); });
    Reactor(() => {
        const message = run.value?.error.value ?? null;
        error.hidden = !message;
        error.textContent = message ?? "";
    });
    Reactor(() => {
        const lines = run.value?.logs.value ?? [];
        log.hidden = !lines.length;
        log.replaceChildren(...lines.map(text => { const li = el("li"); li.textContent = text; return li; }));
        log.scrollTop = log.scrollHeight;
    });

    //// Actions, in the corner of the code

    const action = (label: string, title: string, fn: () => void) => {
        const b = el("button", "lab-act", label);
        b.title = title;
        b.addEventListener("click", fn);
        actions.append(b);
        return b;
    };
    if (options.exercise) {
        const reveal = action("", "Swap between the starting code and one solution", () => variant.value = variant._value === "solution" ? "starter" : "solution");
        Reactor(() => { reveal.textContent = variant.value === "solution" ? "Hide solution" : "Show solution"; });
    }
    action("Reset", "Put the code back as it was", () => { if (options.exercise) variant.value = "starter"; else step.trigger(); });
    action("Run again", "Start the page over", execute);

    Reactor(() => { root.dataset.folded = String(folded.value); });
    if (options.peek) {
        const toggle = el("button", "lab-peek");
        toggle.addEventListener("click", () => folded.value = !folded._value);
        Reactor(() => { toggle.textContent = folded.value ? "Show the code" : "Hide the code"; });
        notes.append(toggle);
    }

    //// Steps

    if (options.steps) {
        const steps = options.steps;
        const box = el("div", "lab-steps");
        const count = el("span", "lab-count");
        const prev = el("button", "lab-nav", "Back"), next = el("button", "lab-nav is-next", "Next step");
        const text = el("div", "prose");
        text.setAttribute("aria-live", "polite");
        prev.addEventListener("click", () => step.value = Math.max(1, step._value - 1));
        next.addEventListener("click", () => step.value = Math.min(steps.length, step._value + 1));
        Reactor(() => {
            const k = step.value, s = steps[k - 1];
            prev.disabled = k === 1;
            next.disabled = k === steps.length;
            count.textContent = `Step ${k} of ${steps.length}`;
            text.innerHTML = `<h4>${s.title}</h4>${s.text}`
                + (s.code ? `<pre class="snippet"><code>${highlight(s.code.trim(), "js")}</code></pre>` : "");
        });
        const nav = el("div", "lab-navrow");
        nav.append(count, prev, next);
        box.append(nav, text);
        notes.append(box);

        // a step may name the region its change is in; the rectangle goes there
        if (!options.tour) Reactor(() => {
            const focus = steps[step.value - 1].focus;
            const part = focus && parts.value[open.value]?.find(p => p.name === focus);
            region.value = part ? { from: part.from, to: part.to, color: 0 } : null;
        });
    }

    //// Regions: one rounded rectangle over the lines being explained

    // the stops whose region exists in the files as they are now
    const stops = () => (options.tour ?? []).map(([name, title, text], k) => {
        const file = Object.keys(parts._value).find(f => parts._value[f].some(p => p.name === name));
        return file ? { title, text, color: k % 4, file, part: parts._value[file].find(p => p.name === name)! } : null;
    }).filter(s => s !== null);

    if (options.tour) {
        const box = el("div", "lab-tour");
        const count = el("span", "lab-count");
        const prev = el("button", "lab-nav", "Back"), next = el("button", "lab-nav is-next", "Next");
        const text = el("div", "prose");
        text.setAttribute("aria-live", "polite");
        const go = (k: number) => {
            const all = stops();
            if (!all.length) return;
            const to = all[Math.max(0, Math.min(all.length - 1, k))];
            if (open._value !== to.file) open.value = to.file;
            stop.value = all.indexOf(to);
        };
        prev.addEventListener("click", () => go(stop._value - 1));
        next.addEventListener("click", () => go(stop._value + 1));
        const nav = el("div", "lab-navrow");
        nav.append(count, prev, next);
        box.append(nav, text);
        notes.append(box);

        Reactor(() => {
            parts.value;
            const all = stops(), k = Math.min(stop.value, all.length - 1), at = all[k], file = open.value;
            box.hidden = !at;
            region.value = at && at.file === file ? { from: at.part.from, to: at.part.to, color: at.color } : null;
            if (!at) return;
            box.dataset.color = String(at.color);
            prev.disabled = k === 0;
            next.disabled = k === all.length - 1;
            count.textContent = `Part ${k + 1} of ${all.length}` + (at.file !== file ? `, in ${at.file}` : "");
            text.innerHTML = `<h4>${at.title}</h4>${at.text}`;
        });
    }

    //// Exercise

    if (options.exercise) {
        const exercise = options.exercise;
        const card = el("div", "lab-task");
        card.innerHTML = `<div class="prose">${exercise.task}</div>` + (exercise.hint ? `<details class="fold"><summary>Hint</summary><div class="prose">${exercise.hint}</div></details>` : "");
        const status = el("p", "lab-status");
        status.setAttribute("aria-live", "polite");
        card.append(status);
        Reactor(() => {
            root.classList.toggle("is-solved", solved.value);
            status.textContent = solved.value ? "Solved: the check passes." : "Not solved yet. The check runs each time you stop typing.";
        });
        notes.append(card);
    }

    let check_id = 0;
    async function check(): Promise<void> {
        const mine = ++check_id;
        const host = el("div");
        host.style.cssText = "position:fixed;left:-9999px;top:0;width:420px;height:320px;overflow:hidden;visibility:hidden";
        document.body.append(host);
        const r = runFiles(sources._value, host.attachShadow({ mode: "open" }), { id: id + "check" });
        const q = (s: string) => r.body.querySelector<HTMLElement>(s);
        const fire = (n: Element, ...types: string[]) => types.forEach(t => n.dispatchEvent(new Event(t, { bubbles: true })));
        const probe: Probe = {
            body: r.body,
            text: () => r.body.textContent ?? "",
            all: s => [...r.body.querySelectorAll(s)],
            click: (s, times = 1) => { for (let k = 0; k < times; k++) q(s)?.click(); },
            type: (s, value) => { const i = q(s) as HTMLInputElement | null; if (i) { i.value = value; fire(i, "input", "change"); } },
            tick: (s, on) => { const i = q(s) as HTMLInputElement | null; if (i && i.checked !== on) i.click(); },
            logs: () => r.logs._value,
            window: r.window,
            wait: (ms = 0) => new Promise(done => setTimeout(done, ms)),
        };
        let ok = false;
        try { ok = !r.error._value && !!(await options.exercise!.check(probe)) && !r.error._value; } catch { ok = false; }
        r.dispose();
        host.remove();
        if (mine === check_id && ok !== solved._value) solved.value = ok;
    }

    if (notes.children.length) root.append(notes);
    else root.classList.add("is-solo");
    root.append(work);
    return root;
}
