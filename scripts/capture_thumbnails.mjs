// capture_thumbnails.mjs
//
// Screenshots every example listed in src/gallery.ts into its own folder,
// src/examples/<slug>/thumbnail.webp, for the gallery cards. An example's
// `thumbnail_scroll: "selector@fraction"` scrolls that element's top to that
// fraction of the frame first, and `thumbnail_width` sets the capture window. Run it against the dev server whenever an
// example changes:
//
//   npm run dev                  (in another terminal)
//   npm run thumbnails           [-- <site root url>] [-- <slug> …]
//
// Uses headless Chrome / Edge from the usual install paths, or BROWSER=<path>.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLES_DIR = join(ROOT, "src", "examples");
const args = process.argv.slice(2);
const SITE = (args.find(a => a.startsWith("http")) || "http://localhost:5173/").replace(/\/?$/, "/");
const only = args.filter(a => !a.startsWith("http"));

// Capture at a desktop viewport, cropped to the visible content (with a little
// padding, widened to the card's 16:10 shape) and rendered at the saved size.
const DEFAULT_WIDTH = 960; // small enough that spread-out layouts sit close together; height at 16:10
let VIEWPORT = { width: DEFAULT_WIDTH, height: DEFAULT_WIDTH / 1.6 };
const OUT_WIDTH = 480;  // saved size: 480 × 300, about 1.5× the card's width
const QUALITY = 90;     // webp
const SETTLE_MS = 2500; // fonts, MathJax, first animation frames

// { slug, scroll } per gallery entry, read from gallery.ts's EXAMPLES
const gallery = readFileSync(join(ROOT, "src", "gallery.ts"), "utf8");
const examples = gallery.split(/(?=\bslug:\s*")/).slice(1).map(block => ({
    slug: block.match(/slug:\s*"([^"]+)"/)[1],
    scroll: (block.match(/thumbnail_scroll:\s*"([^"]+)"/) || [])[1],
    width: Number((block.match(/thumbnail_width:\s*(\d+)/) || [])[1]) || DEFAULT_WIDTH,
})).filter(e => !only.length || only.includes(e.slug));

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
const proc = spawn(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--remote-debugging-port=9335", `--user-data-dir=${mkdtempSync(join(tmpdir(), "thumbs-"))}`, "about:blank"], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch("http://127.0.0.1:9335/json")).json()).find(t => t.type === "page"); } catch { }
    if (!target) await sleep(250);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let next_id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise(r => { const id = ++next_id; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    // "Leave this page?" (beforeunload) and other dialogs would block navigation
    if (m.method === "Page.javascriptDialogOpening") send("Page.handleJavaScriptDialog", { accept: true });
};

await send("Page.enable");
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }] });

// Bounding box of what's visible in the first screen: text, media, form
// controls, and boxes with a background or border (page-sized ones excluded)
const MEASURE = `(() => {
    const vw = innerWidth, vh = innerHeight, rects = [];
    const add = r => { if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw) rects.push(r); };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        for (const r of range.getClientRects()) add(r);
    }
    for (const el of document.body.querySelectorAll("*")) {
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none") continue;
        const r = el.getBoundingClientRect();
        if (r.width * r.height > vw * vh * 0.8) continue;
        const media = /^(IMG|SVG|CANVAS|VIDEO|INPUT|BUTTON|SELECT|TEXTAREA)$/i.test(el.tagName);
        const painted = cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none" || parseFloat(cs.borderTopWidth) > 0;
        if (media || painted) add(r);
    }
    if (!rects.length) return null;
    return {
        sx: scrollX, sy: scrollY,
        x0: Math.max(0, Math.min(...rects.map(r => r.left))), y0: Math.max(0, Math.min(...rects.map(r => r.top))),
        x1: Math.min(vw, Math.max(...rects.map(r => r.right))), y1: Math.min(vh, Math.max(...rects.map(r => r.bottom))),
    };
})()`;

const PAD = 12;        // around the content
const MIN_WIDTH = 300; // caps the zoom on tiny pages (300 px → 480 px is 1.6×)

// The content's box, padded and widened to the viewport's shape
// (clip coordinates are page coordinates, so the scroll offset is added at the end)
async function contentClip() {
    const r = await send("Runtime.evaluate", { expression: MEASURE, returnByValue: true });
    const box = r.result?.result?.value;
    const sx = box ? box.sx : 0, sy = box ? box.sy : 0;
    const full = { x: sx, y: sy, ...VIEWPORT, scale: OUT_WIDTH / VIEWPORT.width };
    if (!box) return full;
    const aspect = VIEWPORT.width / VIEWPORT.height;
    let w = Math.max(box.x1 - box.x0 + 2 * PAD, MIN_WIDTH), h = box.y1 - box.y0 + 2 * PAD;
    // Too tall to show whole at the card's shape: keep its top, at least half its height
    const tall = h * aspect > VIEWPORT.width;
    if (tall) {
        h = Math.max(w / aspect, Math.min(h, VIEWPORT.height) * 0.5);
        w = h * aspect;
    } else if (w / h < aspect) w = h * aspect;
    else h = w / aspect;
    if (w >= VIEWPORT.width || h >= VIEWPORT.height) return full;
    // Center the crop on the content (tall content: from its top). Content
    // against the page's top or left edge would push the crop off the page,
    // so shift the page instead; its background fills the gap.
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
    let x = cx - w / 2, y = tall ? box.y0 - PAD : cy - h / 2;
    const dx = Math.max(0, -x), dy = Math.max(0, -y);
    if (dx || dy) {
        await send("Runtime.evaluate", { expression: `document.documentElement.style.transform = "translate(${dx}px, ${dy}px)"` });
        await sleep(100);
        x += dx;
        y += dy;
    }
    x = Math.min(x, VIEWPORT.width - w);
    y = Math.min(y, VIEWPORT.height - h);
    return { x: x + sx, y: y + sy, width: w, height: h, scale: OUT_WIDTH / w };
}

let failed = 0;
for (const { slug, scroll, width } of examples) {
    VIEWPORT = { width, height: Math.round(width / 1.6) };
    await send("Emulation.setDeviceMetricsOverride", { ...VIEWPORT, deviceScaleFactor: 1, mobile: false });
    const url = `${SITE}src/examples/${slug}/index.html`;
    const nav = await send("Page.navigate", { url });
    if (nav.result?.errorText) { console.log(`✗ ${slug}: ${nav.result.errorText}`); failed++; continue; }
    await sleep(SETTLE_MS);
    if (scroll) {
        const [selector, fraction = "0"] = scroll.split("@");
        const found = await send("Runtime.evaluate", { returnByValue: true, expression: `(() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return false;
            scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * ${Number(fraction)});
            return true;
        })()` });
        if (!found.result?.result?.value) console.log(`  ${slug}: thumbnail_scroll selector ${selector} not found`);
        await sleep(500);
    }
    const shot = await send("Page.captureScreenshot", { format: "webp", quality: QUALITY, clip: await contentClip() });
    if (!shot.result?.data) { console.log(`✗ ${slug}: no screenshot`); failed++; continue; }
    // Leave the page first: a new file under src/ makes the dev server reload
    // open pages, which would race the next navigation
    await send("Page.navigate", { url: "about:blank" });
    await sleep(200);
    writeFileSync(join(EXAMPLES_DIR, slug, "thumbnail.webp"), Buffer.from(shot.result.data, "base64"));
    console.log(`✓ ${slug} → src/examples/${slug}/thumbnail.webp`);
}

ws.close();
proc.kill();
process.exit(failed ? 1 : 0);
