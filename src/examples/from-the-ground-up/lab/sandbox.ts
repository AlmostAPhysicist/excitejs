// lab/sandbox.ts
//
// Runs a small pseudo file system of JavaScript, CSS and HTML inside a shadow
// root, with ExciteJS handed to it through instrumented wrappers, so the
// X-ray (xray.ts) can show what the code built and what it does.
//
//   files ──► [modules] import/export rewritten ──► new Function(...)
//                 │
//                 ├─ "excitejs"  Observable / Reactor / Scheduler, wrapped:
//                 │              every one made is a Node, every write, run,
//                 │              cleanup, queue and flush is an Event
//                 ├─ "pan-zoom"  Camera, FixedCamera, Layer, SpatialGrid
//                 ├─ "ising"     Lattice, step, acceptanceTable, LatticeLayer…
//                 └─ "hubble"    colors
//
// The code sees stand-ins for `document`, `window`, `location`, `console`,
// `localStorage` and the timer functions. They behave like the real ones but
// stay inside the lab: `document.body` is the preview, timers and listeners
// are remembered and removed on the next run, and `location.hash` moves the
// preview's address bar, not the page.

import { Observable, Reactor, Scheduler, setActiveReactor } from "../../../core/index";
import { moveDown, moveToBottom, moveToTop, moveUp } from "../../../core/priority";
import { Camera, FixedCamera } from "../../pan-zoom/camera.ts";
import { Layer } from "../../pan-zoom/layer.ts";
import { SpatialGrid } from "../../pan-zoom/spatial_grid.ts";
import { Lattice, T_CRITICAL, acceptanceTable, energy, fillLattice, magnetization, step } from "../../ising-model/ising.ts";
import { LatticeLayer, cellAt, latticeRect } from "../../ising-model/canvas/lattice_layer.ts";
import { detailAt } from "../../ising-model/canvas/sprites.ts";
import { colors } from "../../ising-model/theme.ts";
import preview_css from "./preview.css?inline";

export type NodeKind = "observable" | "reactor" | "stage";
export interface XNode { id: number; kind: NodeKind; name: string; ref: any; count: number }
export type EventKind = "write" | "run" | "cleanup" | "queue" | "flush";
export interface XEvent { kind: EventKind; node: XNode; note?: string }

export interface Run {
    body: HTMLElement;
    nodes: XNode[];
    events: XEvent[];                 // appended as things happen; the X-ray consumes them
    logs: Observable<string[]>;
    error: Observable<string | null>;
    address: Observable<string>;      // the preview's location hash
    intervals(): number;              // how many intervals are alive (for exercise checks)
    window: Record<string, any>;      // the `window` the code sees (what it puts there, a check can read)
    dispose(): void;
}

export interface RunOptions {
    storage?: Map<string, string>;    // what localStorage reads and writes
    id?: string;                      // names the code in stack traces
}

const MARKER = /^\s*(?:\/\/|\/\*|<!--)\s*#(step|until|starter|solution|part|end)\b\s*([\w-]+)?\s*(?:\*\/|-->)?\s*$/;

export interface Part { name: string; from: number; to: number } // lines from..to, inclusive

// A file as it stands at one step, or as an exercise's starter or solution.
//   //#step 3 … //#end      lines that appear from step 3 on
//   //#until 3 … //#end     lines that are gone from step 3 on
//   //#starter … //#end     only in the exercise's starting code
//   //#solution … //#end    only in its solution
//   //#part name … //#end   a named region, for the walkthrough's colored boxes
export function derive(raw: string, step = 99, variant: "starter" | "solution" = "solution"): { text: string; fresh: Set<number>; parts: Part[] } {
    const out: string[] = [], fresh = new Set<number>(), parts: Part[] = [];
    const stack: { show: boolean; fresh: boolean; part?: string; from?: number }[] = [];
    for (const line of raw.split(/\r?\n/)) {
        const m = line.match(MARKER);
        if (m) {
            if (m[1] === "end") {
                const top = stack.pop();
                if (top?.part) {
                    let to = out.length - 1;
                    while (to >= top.from! && !out[to].trim()) to--;
                    if (to >= top.from!) parts.push({ name: top.part, from: top.from!, to });
                }
            }
            else if (m[1] === "part") stack.push({ show: true, fresh: false, part: m[2], from: out.length });
            else if (m[1] === "step") stack.push({ show: step >= Number(m[2]), fresh: step === Number(m[2]) });
            else if (m[1] === "until") stack.push({ show: step < Number(m[2]), fresh: false });
            else stack.push({ show: variant === m[1], fresh: false });
            continue;
        }
        if (stack.some(s => !s.show)) continue;
        // hidden blocks leave their blank lines behind: never two in a row, none at the top
        if (!line.trim() && (!out.length || !out[out.length - 1].trim())) continue;
        if (stack.some(s => s.fresh)) fresh.add(out.length);
        out.push(line);
    }
    while (out.length && !out[out.length - 1].trim()) out.pop();
    return { text: out.join("\n") + "\n", fresh, parts };
}

//// Names: what each identifier is, for coloring and for the X-ray

export type Role = "o" | "r" | "s" | "d";

// o: holds an Observable, r: a Reactor, s: a Scheduler or stage, d: an element
export function classify(files: Record<string, string>): Map<string, Role> {
    const names = new Map<string, Role>();
    const add = (pattern: RegExp, role: Role) => {
        for (const text of Object.values(files)) for (const m of text.matchAll(pattern)) if (!names.has(m[1])) names.set(m[1], role);
    };
    add(/([A-Za-z_$][\w$]*)\s*[=:]\s*Observable\s*\(/g, "o");
    add(/([A-Za-z_$][\w$]*)\s*=\s*Reactor\s*\(/g, "r");
    add(/([A-Za-z_$][\w$]*)\s*=\s*(?:Scheduler\s*\(|[\w$.]+\.getOrCreate\s*\()/g, "s");
    add(/([A-Za-z_$][\w$]*)\s*=\s*(?:document\.(?:createElement|querySelector|getElementById)|[\w$.]+\.(?:appendChild|querySelector)|el)\s*\(/g, "d");
    return names;
}

const BUILTINS = ["excitejs", "pan-zoom", "ising", "hubble"];

function show(value: unknown): string {
    if (typeof value === "string") return value;
    if (typeof value === "function") return "ƒ " + (value.name || "()");
    try { return JSON.stringify(value, (_, v) => v instanceof Element ? `<${v.tagName.toLowerCase()}>` : v) ?? String(value); }
    catch { return String(value); }
}

// What a reaction seems to do, for a reactor nobody named
function describe(fn: Function, n: number): string {
    const src = fn.toString();
    const set = src.match(/([A-Za-z_$][\w$]*)\.(?:textContent|innerHTML|innerText|hidden|className|value|checked|disabled)\s*=(?!=)/)
        ?? src.match(/([A-Za-z_$][\w$]*)\.(?:style|classList|dataset)\b/);
    if (set && set[1] !== "console") return "updates " + set[1];
    if (/\bconsole\.log\(/.test(src)) return "logs";
    if (/\.(?:fill|stroke|clearRect|drawImage)\w*\(/.test(src)) return "paints";
    return "reactor " + n;
}

// import / export → __import() / __exports
function toModule(code: string): string {
    const exported: string[] = [];
    code = code
        .replace(/^[ \t]*import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?/gm, (_, list: string, from: string) =>
            `const {${list.replace(/\s+as\s+/g, ": ")}} = __import(${JSON.stringify(from)});`)
        .replace(/^[ \t]*import\s*\*\s*as\s+([\w$]+)\s*from\s*["']([^"']+)["'];?/gm, (_, ns: string, from: string) => `const ${ns} = __import(${JSON.stringify(from)});`)
        .replace(/^[ \t]*import\s*["']([^"']+)["'];?/gm, (_, from: string) => `__import(${JSON.stringify(from)});`)
        .replace(/^([ \t]*)export\s+(function\*?|const|let|class)\s+([\w$]+)/gm, (_, pad: string, kind: string, name: string) => { exported.push(name); return `${pad}${kind} ${name}`; });
    return exported.length ? `${code}\n;Object.assign(__exports, { ${exported.join(", ")} });` : code;
}

// `const count = Observable(0)` → the node is called "count"
const named = (code: string) => code
    .replace(/\b((?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*)(Observable|Reactor)\s*\(/g, (_, head: string, name: string, what: string) => `${head}${what}.named(${JSON.stringify(name)})(`)
    .replace(/\b(([A-Za-z_$][\w$]*)\s*:\s*)Observable\s*\(/g, (_, head: string, name: string) => `${head}Observable.named(${JSON.stringify(name)})(`);

function resolve(from: string, spec: string): string {
    if (!spec.startsWith(".")) return spec;
    const parts = from.split("/").slice(0, -1);
    for (const p of spec.split("/")) { if (p === "..") parts.pop(); else if (p !== ".") parts.push(p); }
    return parts.join("/");
}

const scopeCss = (css: string) => css.replace(/(^|[\s,}])(?:html|:root)(?=[\s,{])/g, "$1:host").replace(/(^|[\s,}])body(?=[\s,{.:])/g, "$1.body");

let run_count = 0;

export function runFiles(files: Record<string, string>, root: ShadowRoot, options: RunOptions = {}): Run {
    const id = options.id ?? "lab" + (++run_count);
    const storage = options.storage ?? new Map<string, string>();
    const undo: (() => void)[] = [];
    const live_intervals = new Set<number>();
    let disposed = false, burst = 0;

    root.replaceChildren();
    const style = document.createElement("style");
    style.textContent = preview_css + "\n" + Object.entries(files).filter(([n]) => n.endsWith(".css")).map(([, t]) => scopeCss(t)).join("\n");
    const body = document.createElement("div");
    body.className = "body";
    root.append(style, body);

    const self: Run = {
        body, nodes: [], events: [], window: {},
        logs: Observable<string[]>([]),
        error: Observable<string | null>(null),
        address: Observable(""),
        intervals: () => live_intervals.size,
        dispose() {
            if (disposed) return;
            disposed = true;
            for (const fn of undo.reverse()) { try { fn(); } catch { /* already gone */ } }
        },
    };

    function emit(kind: EventKind, node: XNode, note?: string): void {
        if (disposed) return;
        node.count++;
        self.events.push({ kind, node, note: note && note.length > 30 ? note.slice(0, 29) + "…" : note });
        if (self.events.length > 400) self.events.splice(0, 200);
        // a reactor that keeps waking itself would never return
        if (++burst > 1500) { burst = 0; throw new Error("This never settles: something keeps triggering itself. Does a reaction write an Observable it also reads?"); }
        if (burst === 1) queueMicrotask(() => setTimeout(() => burst = 0));
    }
    const node = (kind: NodeKind, name: string, ref: any): XNode => { const n = { id: self.nodes.length, kind, name, ref, count: 0 }; self.nodes.push(n); return n; };

    //// ExciteJS, instrumented

    let unnamed = 0;
    function makeObservable(name: string | null, value: unknown) {
        const o = Observable(value);
        const n = node("observable", name ?? "observable " + (++unnamed), o);
        const trigger = o.trigger;
        o.trigger = () => { emit("write", n, show(o._value)); trigger(); };
        return o;
    }
    const XObservable = Object.assign((value: unknown) => makeObservable(null, value), { named: (name: string) => (value: unknown) => makeObservable(name, value) });

    let reactors = 0;
    function makeReactor(name: string | null, reaction: () => any, opts: Parameters<typeof Reactor>[1] = {}) {
        const n = node("reactor", name ?? describe(reaction, ++reactors), null);
        const tidy = (out: unknown) => typeof out === "function" ? () => { emit("cleanup", n); return out(); } : out;
        const wrap = (fn: () => any) => () => { emit("run", n); return tidy(fn()); };
        const options = { ...opts };
        if (typeof options.initFn === "function") options.initFn = wrap(options.initFn);
        if (options.preaction) { const pre = options.preaction; options.preaction = () => { emit("cleanup", n); return pre(); }; }
        const r = Reactor(wrap(reaction), options);
        n.ref = r;
        const schedule = r.schedule;
        r.schedule = () => { if (r.reaction_schedule && !r.paused) emit("queue", n, r.reaction_schedule.name); schedule(); };
        undo.push(() => r.dispose());
        return r;
    }
    const XReactor = Object.assign((reaction: () => any, opts?: any) => makeReactor(null, reaction, opts), { named: (name: string) => (reaction: () => any, opts?: any) => makeReactor(name, reaction, opts) });

    function XScheduler() {
        const s = Scheduler();
        const getOrCreate = s.getOrCreate;
        s.getOrCreate = (name, auto) => {
            const known = [...s.schedules].some(x => x.name === name);
            const stage = getOrCreate(name, auto);
            if (!known) node("stage", name, stage);
            return stage;
        };
        const flush = s.flush;
        s.flush = stage => {
            for (const n of self.nodes) if (n.kind === "stage" && (stage ? n.ref === stage : s.schedules.has(n.ref)) && n.ref.tasks.size) emit("flush", n, String(n.ref.tasks.size));
            flush(stage);
        };
        return s;
    }

    // things with a dispose(): made here, undone on the next run
    const kept = <F extends (...args: any[]) => { dispose(): void }>(factory: F) => ((...args: any[]) => { const made = factory(...args); undo.push(() => made.dispose()); return made; }) as F;

    // an Observable the code did not make itself, shown in the X-ray all the same
    function adopt(name: string, o: Observable<any>): void {
        const n = node("observable", name, o);
        const trigger = o.trigger;
        o.trigger = () => { emit("write", n, show(o._value)); trigger(); };
    }

    // A Camera takes the wheel, which would trap the guide's own scrolling.
    // Inside a lab it only gets the wheel after a press on its element, and
    // gives it back on Escape, a press elsewhere, or when the page scrolls.
    function XCamera(element: HTMLElement, opts?: Parameters<typeof Camera>[1]) {
        const cam = Camera(element, opts);
        undo.push(() => cam.dispose());
        adopt("camera.view", cam.view);
        adopt("camera.tap", cam.tap);
        adopt("camera.last_input", cam.last_input);
        element.dataset.armed = "false";
        const disarm = () => { element.dataset.armed = "false"; };
        element.addEventListener("pointerdown", () => { element.dataset.armed = "true"; });
        element.addEventListener("keydown", e => { if (e.key === "Escape") disarm(); });
        body.addEventListener("wheel", e => { if (element.dataset.armed !== "true" && e.composedPath().includes(element)) e.stopPropagation(); }, { capture: true });
        listen(document)("pointerdown", e => { if (!e.composedPath().includes(element)) disarm(); });
        listen(window)("scroll", disarm, { passive: true });
        return cam;
    }

    const builtins: Record<string, object> = {
        excitejs: { Observable: XObservable, Reactor: XReactor, Scheduler: XScheduler, moveToTop, moveUp, moveDown, moveToBottom },
        "pan-zoom": { Camera: XCamera, FixedCamera: kept(FixedCamera), Layer: kept(Layer), SpatialGrid },
        ising: { Lattice, step, acceptanceTable, fillLattice, magnetization, energy, T_CRITICAL, LatticeLayer: kept(LatticeLayer), cellAt, latticeRect, detailAt },
        hubble: { colors },
    };

    //// Stand-ins for the page

    const listen = (target: EventTarget) => (type: string, fn: (e: any) => void, opts?: boolean | AddEventListenerOptions) => {
        target.addEventListener(type, fn, opts);
        undo.push(() => target.removeEventListener(type, fn, opts));
    };
    const hash_listeners = new Set<(e: Event) => void>();
    const location = {
        get hash() { return self.address._value; },
        set hash(v: string) {
            v = v && !v.startsWith("#") ? "#" + v : v;
            if (v === self.address._value) return;
            self.address.value = v;
            setTimeout(() => { if (!disposed) hash_listeners.forEach(fn => fn(new Event("hashchange"))); });
        },
    };
    body.addEventListener("click", e => {
        const a = (e.target as Element).closest?.("a[href]");
        const href = a?.getAttribute("href") ?? "";
        if (!a) return;
        e.preventDefault(); // a link must never navigate the guide away
        if (href.startsWith("#")) location.hash = href;
    });

    const fakeDocument = {
        body, documentElement: body, head: { append() { }, appendChild() { } },
        fonts: document.fonts,
        createElement: (tag: string, o?: ElementCreationOptions) => document.createElement(tag, o),
        createElementNS: (ns: string, tag: string) => document.createElementNS(ns, tag),
        createTextNode: (text: string) => document.createTextNode(text),
        createDocumentFragment: () => document.createDocumentFragment(),
        querySelector: (s: string) => root.querySelector(s),
        querySelectorAll: (s: string) => root.querySelectorAll(s),
        getElementById: (i: string) => root.querySelector("#" + CSS.escape(i)),
        addEventListener: listen(document), removeEventListener: document.removeEventListener.bind(document),
        get activeElement() { return root.activeElement; },
    };
    const timers = {
        setInterval(fn: () => void, ms?: number) { const t = window.setInterval(fn, ms); live_intervals.add(t); return t; },
        clearInterval(t?: number) { window.clearInterval(t); live_intervals.delete(t!); },
        setTimeout(fn: () => void, ms?: number) { const t = window.setTimeout(fn, ms); undo.push(() => window.clearTimeout(t)); return t; },
        clearTimeout: (t?: number) => window.clearTimeout(t),
        requestAnimationFrame(fn: FrameRequestCallback) { const t = window.requestAnimationFrame(now => { if (!disposed) fn(now); }); return t; },
        cancelAnimationFrame: (t: number) => window.cancelAnimationFrame(t),
    };
    undo.push(() => { live_intervals.forEach(t => window.clearInterval(t)); live_intervals.clear(); });
    const fakeStorage = {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => { storage.set(k, String(v)); },
        removeItem: (k: string) => { storage.delete(k); },
        clear: () => storage.clear(),
    };
    const fakeConsole = {
        log: (...args: unknown[]) => { self.logs.value = [...self.logs._value.slice(-59), args.map(show).join(" ")]; },
        error: (...args: unknown[]) => fakeConsole.log("⚠", ...args), warn: (...args: unknown[]) => fakeConsole.log("⚠", ...args),
        info: (...args: unknown[]) => fakeConsole.log(...args), clear: () => { self.logs.value = []; },
    };
    const fakeWindow = {
        ...timers, location, document: fakeDocument, localStorage: fakeStorage, console: fakeConsole,
        addEventListener(type: string, fn: any, opts?: any) { if (type === "hashchange") hash_listeners.add(fn); else listen(window)(type, fn, opts); },
        removeEventListener(type: string, fn: any) { hash_listeners.delete(fn); window.removeEventListener(type, fn); },
        matchMedia: (q: string) => window.matchMedia(q), performance,
        get innerWidth() { return body.clientWidth; }, get innerHeight() { return body.clientHeight; },
        get devicePixelRatio() { return window.devicePixelRatio; },
    };
    self.window = fakeWindow;
    const scope: Record<string, unknown> = {
        document: fakeDocument, window: fakeWindow, globalThis: fakeWindow, location, console: fakeConsole, localStorage: fakeStorage, ...timers,
    };

    //// Modules

    const loaded = new Map<string, object>();
    function load(name: string, from: string): object {
        if (builtins[name]) return builtins[name];
        if (loaded.has(name)) return loaded.get(name)!;
        if (name.endsWith(".css") && name in files) return {};
        if (!(name in files)) throw new Error(`${from} imports "${name}", but there is no such file. (Available: ${[...Object.keys(files).filter(f => f.endsWith(".js")), ...BUILTINS.map(b => `"${b}"`)].join(", ")})`);
        const exports = {};
        loaded.set(name, exports);
        const code = `"use strict";${toModule(named(files[name]))}\n//# sourceURL=${id}/${name}`;
        const fn = new Function("__import", "__exports", ...Object.keys(scope), code);
        fn((spec: string) => load(resolve(name, spec), name), exports, ...Object.values(scope));
        return exports;
    }

    self.error.value = null;
    try {
        const html = files["index.html"];
        let entry = "main.js";
        if (html) {
            const doc = new DOMParser().parseFromString(html, "text/html");
            const script = doc.querySelector("script[src]");
            if (script) entry = resolve("index.html", script.getAttribute("src")!);
            doc.querySelectorAll("script, link, style").forEach(n => n.remove());
            body.innerHTML = doc.body.innerHTML;
        }
        load(entry, "index.html");
    } catch (error) {
        setActiveReactor(null); // a reaction that threw leaves itself in the tracking slot
        self.error.value = explain(error, id);
    }

    // errors thrown later, from handlers and timers of this run
    const later = (e: ErrorEvent) => {
        if (!String(e.error?.stack ?? e.filename).includes(id + "/")) return;
        setActiveReactor(null);
        self.error.value = explain(e.error ?? e.message, id);
    };
    window.addEventListener("error", later);
    undo.push(() => window.removeEventListener("error", later));

    return self;
}

function explain(error: unknown, id: string): string {
    const endless = error instanceof RangeError && /call stack/i.test(error.message);
    const message = endless ? "This never settles: something keeps triggering itself. Does a reaction write an Observable it also reads?"
        : error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    const at = error instanceof Error ? error.stack?.match(new RegExp(id + "/([^:)\\s]+):(\\d+)")) : null;
    // new Function() puts two lines before the code
    return at ? `${message}\n   in ${at[1]}, line ${Number(at[2]) - 2}` : message;
}
