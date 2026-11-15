// lab/observers.ts
//
// A small table under a lab's result: every Observable the code created,
// its current value, and the Reactors subscribed to it. Below it, the last
// few things that happened, in order.
//
//   count   3    ← updates label (ran 4×)
//
// Nothing is declared to it. It reads the run's nodes (see sandbox.ts) and,
// each frame, fields the library keeps anyway: `observable.reactors`,
// `_value`, `reactor.paused`, `stage.tasks.size`. Events that happen within
// one instant (a write, then the runs it causes) are shown a beat apart, so
// their order can be seen.

import { Reactor, type Observable } from "../../../core/index";
import { el } from "../kit.ts";
import type { Run, XEvent, XNode } from "./sandbox.ts";

const BEAT_MS = 160;
const LOG_MAX = 7;
const MAX_ROWS = 10;

function preview(value: unknown): string {
    if (typeof value === "string") return value.length > 16 ? `"${value.slice(0, 15)}…"` : `"${value}"`;
    if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
    if (Array.isArray(value)) return `[${value.length} item${value.length === 1 ? "" : "s"}]`;
    if (value && typeof value === "object") return "{…}";
    return String(value);
}

export function Observers(run: Observable<Run | null>, isVisible: () => boolean, open: boolean): HTMLElement {
    const root = el("details", "obs");
    root.open = open;
    root.innerHTML = `<summary>Observables in this code, and the Reactors subscribed to them</summary>
      <table><tbody></tbody></table><p class="obs-idle" hidden></p><ol class="obs-log"></ol>`;
    const rows = root.querySelector("tbody")!;
    const idle = root.querySelector<HTMLElement>(".obs-idle")!;
    const log = root.querySelector<HTMLElement>(".obs-log")!;

    let seen = 0;
    let playing: XEvent[] = [];
    let last_beat = 0;
    let drawn = "";
    const runs = new Map<XNode, number>();
    const cells = new Map<XNode, HTMLElement>(); // where each node's name is shown

    Reactor(() => {
        run.value;
        seen = 0; playing = []; drawn = "";
        runs.clear(); cells.clear();
        rows.replaceChildren(); log.replaceChildren();
    });

    function mark(node: XNode): void {
        for (const cell of rows.querySelectorAll<HTMLElement>(`[data-node="${node.id}"]`)) {
            cell.classList.remove("is-marked");
            void cell.offsetWidth; // restart the fade
            cell.classList.add("is-marked");
        }
    }

    function line(text: string): void {
        const li = el("li");
        li.textContent = text;
        log.append(li);
        while (log.children.length > LOG_MAX) log.firstElementChild!.remove();
    }

    function play(e: XEvent, r: Run): void {
        const n = e.node.name;
        if (e.kind === "run") runs.set(e.node, (runs.get(e.node) ?? 0) + 1);
        draw(r); // first bring the table up to date, then mark the cell in it
        mark(e.node);
        if (e.kind === "write") line(`${n} = ${e.note}`);
        else if (e.kind === "run") line(`    ${n} ran`);
        else if (e.kind === "cleanup") line(`    ${n}: its preaction ran`);
        else if (e.kind === "queue") line(`    ${n} queued on "${e.note}"`);
        else line(`"${n}" flushed (${e.note} task${e.note === "1" ? "" : "s"})`);
    }

    const reactorLabel = (n: XNode) => {
        const r = n.ref, count = runs.get(n);
        const state = r.paused ? "paused" : r.reaction_schedule ? `on "${r.reaction_schedule.name}"` : "";
        return n.name + (count || state ? ` (${[count ? `ran ${count}×` : "", state].filter(Boolean).join(", ")})` : "");
    };

    // one row per Observable; then the Reactors subscribed to nothing; then the stages
    function draw(r: Run): void {
        const observables = r.nodes.filter(n => n.kind === "observable");
        const reactors = r.nodes.filter(n => n.kind === "reactor" && n.ref);
        const stages = r.nodes.filter(n => n.kind === "stage");
        const model = observables.slice(0, MAX_ROWS).map(o => ({ o, subs: reactors.filter(re => re.ref.observables.has(o.ref)) }));
        const loose = reactors.filter(re => !re.ref.observables.size);
        const signature = JSON.stringify([
            model.map(m => [m.o.id, preview(m.o.ref._value), m.subs.map(reactorLabel)]),
            loose.map(reactorLabel), stages.map(s => [s.id, s.ref.tasks.size]), observables.length,
        ]);
        if (signature === drawn) return;
        drawn = signature;

        const cell = (cls: string, text: string, node?: XNode) => {
            const td = el("td", cls);
            td.textContent = text;
            if (node) td.dataset.node = String(node.id);
            return td;
        };
        const out: HTMLElement[] = [];
        for (const { o, subs } of model) {
            const tr = el("tr");
            const who = el("td", "obs-subs");
            if (!subs.length) who.append(el("i", "", "no Reactor is subscribed"));
            subs.forEach(s => { const b = el("span"); b.textContent = reactorLabel(s); b.dataset.node = String(s.id); who.append(b); });
            tr.append(cell("obs-name", o.name, o), cell("obs-value", preview(o.ref._value), o), who);
            out.push(tr);
        }
        if (observables.length > MAX_ROWS) { const tr = el("tr"); tr.append(cell("obs-more", `and ${observables.length - MAX_ROWS} more`)); out.push(tr); }
        if (loose.length) {
            const tr = el("tr");
            const who = el("td", "obs-subs");
            loose.forEach(s => { const b = el("span"); b.textContent = reactorLabel(s); b.dataset.node = String(s.id); who.append(b); });
            tr.append(cell("obs-none", "subscribed to nothing"), el("td"), who);
            out.push(tr);
        }
        for (const s of stages) {
            const tr = el("tr");
            tr.append(cell("obs-stage", `stage "${s.name}"`, s), cell("obs-value", s.ref.tasks.size ? `${s.ref.tasks.size} queued` : "empty"), cell("obs-subs", s.ref.auto_flush ? "" : "manual: waits for flush()"));
            out.push(tr);
        }
        rows.replaceChildren(...out);
        idle.hidden = r.nodes.length > 0;
        idle.textContent = "This code has not created an Observable or a Reactor.";
    }

    function frame(now: number): void {
        requestAnimationFrame(frame);
        const r = run._value;
        if (!r || !root.open || !isVisible() || document.hidden) return;
        draw(r);
        // take new events; when far behind (an animation loop writes every frame), keep only the latest
        if (r.events.length < seen) seen = 0;
        playing.push(...r.events.slice(seen));
        seen = r.events.length;
        if (playing.length > 40) { for (const e of playing.slice(0, -8)) if (e.kind === "run") runs.set(e.node, (runs.get(e.node) ?? 0) + 1); playing = playing.slice(-8); }
        if (playing.length && now - last_beat > (playing.length > 8 ? 30 : BEAT_MS)) {
            last_beat = now;
            play(playing.shift()!, r);
        }
    }
    requestAnimationFrame(frame);
    return root;
}
