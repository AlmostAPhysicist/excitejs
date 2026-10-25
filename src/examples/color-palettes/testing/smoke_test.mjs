// smoke_test.mjs
//
// Drives a headless Chrome / Edge through the page over the DevTools
// protocol and fails on any runtime error or broken page:
//   - every file in palettes/ shows up as a card and opens a working page
//   - palette page controls: views, flavours, focus, full screen, CVD, shades, keys
//   - home: presets, weights, sorting, the picker
//   - the editor: start from a palette, edit, generate, describe, and every
//     export format (the CSS and JSON ones are imported back and compared)
//
//   npm run dev     (in another terminal)
//   node src/examples/color-palettes/testing/smoke_test.mjs [page url]
//
// The browser is found at the usual install paths, or set BROWSER=<path>.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const URL = process.argv[2] || "http://localhost:5173/src/examples/color-palettes/index.html";
const PALETTE_FILES = readdirSync(join(dirname(fileURLToPath(import.meta.url)), "..", "palettes"));
const BROWSERS = [
    process.env.BROWSER,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].filter(Boolean);
const browser = BROWSERS.find(p => existsSync(p));
if (!browser) { console.error("No Chrome / Edge found; set BROWSER=<path>"); process.exit(2); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const proc = spawn(browser, ["--headless=new", "--disable-gpu", "--remote-debugging-port=9334", `--user-data-dir=${mkdtempSync(join(tmpdir(), "cp-smoke-"))}`, "--window-size=1300,900", "about:blank"], { stdio: "ignore" });

//// DevTools connection

let target;
for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch("http://127.0.0.1:9334/json")).json()).find(t => t.type === "page"); } catch { }
    if (!target) await sleep(250);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let next_id = 0;
const pending = new Map(), errors = [];
ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "warning")) errors.push(`console.${m.params.type}: ` + m.params.args.map(a => a.value ?? a.description).join(" "));
};
const send = (method, params = {}) => new Promise(r => { const id = ++next_id; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
async function js(expr) {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "evaluation failed");
    return r.result.result?.value;
}
await send("Runtime.enable");
await send("Page.enable");

//// Checks

let failures = 0;
async function check(name, step) {
    const before = errors.length;
    try {
        const problem = await step();
        await sleep(250);
        const new_errors = errors.slice(before);
        if (problem || new_errors.length) throw new Error(problem || new_errors.join("\n      "));
        console.log(`✓ ${name}`);
    } catch (e) {
        failures++;
        console.log(`✗ ${name}\n      ${String(e.message || e).split("\n")[0]}`);
    }
}
const click = sel => js(`document.querySelector(${JSON.stringify(sel)}).click()`);
const choose = (sel, value) => js(`(() => { const s = document.querySelector(${JSON.stringify(sel)}); s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event(s.tagName === "SELECT" ? "change" : "input", { bubbles: true })); })()`);
const key = k => js(`document.body.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(k)}, bubbles: true }))`);
const count = sel => js(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
const go = async hash => { await js(`location.hash = ${JSON.stringify(hash)}`); await sleep(300); };

// Waits until the page has left about:blank and rendered its header
async function loaded() {
    for (let i = 0; i < 60; i++) {
        const ready = await js(`location.protocol.startsWith("http") && !!document.querySelector("#bar .brand")`).catch(() => false);
        if (ready) return;
        await sleep(250);
    }
    throw new Error(`${URL} did not load; is the dev server running?`);
}

await send("Page.navigate", { url: URL });
await loaded();
await js("localStorage.clear()");
await send("Page.reload", { ignoreCache: true });
await sleep(500);
await loaded();
await sleep(1000);

await check(`home lists all ${PALETTE_FILES.length} files in palettes/`, async () => {
    const n = await count(".pcard[data-go]:not(.pc-create)");
    return n === PALETTE_FILES.length ? null : `${n} cards for ${PALETTE_FILES.length} files`;
});

const ids = await js(`[...document.querySelectorAll(".pcard[data-go]:not(.pc-create)")].map(a => a.dataset.go)`);
for (const id of ids) {
    await check(`palette "${id}" renders`, async () => {
        await go(id);
        const halves = await count(".half"), title = await js(`document.querySelector(".p-head h1").textContent`);
        return halves >= 1 && title ? null : `${halves} theme panels, title "${title}"`;
    });
}

await check("palette page controls", async () => {
    await go("catppuccin");
    await click('#viewseg [data-v="dark"]');
    if (await count(".half") !== 1) return "dark only should show one panel";
    await click('#viewseg [data-v="split"]');
    await js(`(() => { const a = document.getElementById("allfl"); a.checked = true; a.dispatchEvent(new Event("change")); })()`);
    if (await count(".half") !== 4) return "all flavours should show four panels";
    await click('[data-focus="frappe"]');
    if (await count(".half") !== 1) return "focus should show one panel";
    await click('[data-fs="frappe"]');
    await choose("#cvd", "deutan");
    if (await js(`document.getElementById("cmp").hidden`)) return "CVD comparison should show";
    await choose('[data-shade="frappe"]', "tones");
    await key("s");
    await key("ArrowRight");
    await sleep(300);
    return (await js("location.hash")) === "#tokyonight" ? null : "→ should open the next palette";
});

await check("home: ranking, sorting, picker", async () => {
    await go("");
    await click('[data-preset="Calm first"]');
    await choose("#w-text", "5");
    await click('[data-sort="text"]');
    await choose("#pk-text", "oklch(0.6 0.2 30)");
    await choose("#lsl", "0.4");
    await choose("#ovl", "nord:light");
    return (await js(`document.getElementById("pk-kv").textContent`)).includes("oklch(0.400") ? null : "picker did not follow the slider";
});

await check("editor: start, edit, describe, generate", async () => {
    await go("create");
    await choose("#cu-start", "flexoki");
    await choose("#cu-desc", "A smoke-test description.");
    await click('[data-cell="dark|gr"]');
    await click("#cu-sugg [data-apply]");
    await choose('[data-cell="light|re"] .hx', "#cc2200");
    await click('[data-gen="light"]');
    await click("#cu-addx");
    await sleep(400);
    return (await count("#cbody .half")) ? null : "the preview body should render";
});

const formats = await js(`(() => { document.querySelector('[data-io="export"]').click(); return [...document.querySelectorAll("#exp-fmt [data-f]")].map(b => b.dataset.f); })()`);
for (const f of formats) {
    await check(`export ${f}${f === "module" ? "" : " and import it back"}`, async () => {
        await js(`document.querySelector('[data-io="export"]').getAttribute("aria-pressed") === "true" || document.querySelector('[data-io="export"]').click()`);
        await click(`#exp-fmt [data-f="${f}"]`);
        const out = await js(`document.getElementById("exp-out").value`);
        if (!out.includes("smoke-test description")) return "the description is missing";
        if (f === "module") return out.includes("export default palette") && out.includes("makeTheme(") ? null : "not a palette module";
        const before = await js(`document.querySelector('[data-cell="dark|bg"] .hx').value`);
        await click('[data-io="import"]');
        await js(`document.getElementById("imp-in").value = ${JSON.stringify(out)}`);
        await click("#imp-go");
        await sleep(300);
        const after = await js(`document.querySelector('[data-cell="dark|bg"] .hx').value`);
        const desc = await js(`document.getElementById("cu-desc").value`);
        await click('[data-io="export"]');
        return after === before && desc === "A smoke-test description." ? null : `round trip changed dark bg ${before} → ${after}, description "${desc}"`;
    });
}

await check("undo", async () => { await click("#cu-undo"); return null; });

ws.close();
proc.kill();
console.log(failures ? `\n${failures} check${failures > 1 ? "s" : ""} failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
