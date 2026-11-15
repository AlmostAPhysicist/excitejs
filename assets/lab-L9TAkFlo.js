import{n as e,r as t,t as n}from"./reactor-BbvqANad.js";import{t as r}from"./scheduler-DR5rcNf-.js";import{n as i,r as a,t as o}from"./layer-CAjCvTwN.js";import{t as s}from"./spatial_grid-Cfxd6klu.js";import{_ as c,a as l,c as u,d,i as f,m as p,n as m,p as h,r as g,s as _,t as v,u as y}from"./lattice_layer-BUWj0YuO.js";function b(e,t,n){let r=document.createElement(e);return t&&(r.className=t),n&&(r.innerHTML=n),r}var x=e=>e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`),S=(e,t)=>t.split(`
`).map(t=>t?`<i class="${e}">${x(t)}</i>`:``).join(`
`),C=new Set(`const let var function return if else for while of in new typeof import export from type interface extends as null undefined true false this void break continue async await class`.split(` `)),w=/(\/\/.*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_$][\w$]*)|(=>|[-+*/%=<>!&|?]+)/g;function T(e){let t=``,n=0;for(let r of e.matchAll(w)){t+=x(e.slice(n,r.index)),n=r.index+r[0].length;let i=r[0];r[1]?t+=S(`c`,i):r[2]?t+=S(`s`,i):r[3]?t+=S(`n`,i):r[5]?t+=S(`o`,i):C.has(i)?t+=S(`k`,i):/^[A-Z][a-z]/.test(i)&&e[n]===`(`?t+=S(`f`,i):t+=x(i)}return t+x(e.slice(n))}var E=e=>x(e).replace(/(\/\*[\s\S]*?\*\/)/g,e=>e.split(`
`).map(e=>`<i class="c">${e}</i>`).join(`
`)).replace(/(^|\n)([ \t]*)([\w-]+)(\s*:)(?=[^\n{]*;)/g,`$1$2<i class="k">$3</i>$4`),D=e=>x(e).replace(/(&lt;!--[\s\S]*?--&gt;)/g,e=>e.split(`
`).map(e=>`<i class="c">${e}</i>`).join(`
`)).replace(/(&lt;\/?)([\w-]+)/g,`$1<i class="f">$2</i>`).replace(/("[^"\n]*")/g,`<i class="s">$1</i>`);function O(e,t=`ts`){return t===`css`?E(e):t===`html`?D(e):T(e)}function k(e){let t=Math.min(...e.filter(e=>e.trim()).map(e=>e.match(/^ */)[0].length));return e.map(e=>e.slice(t)).join(`
`)}function A(e,t,n,r=0){let i=e.split(/\r?\n/),a=i.findIndex(e=>e.includes(t)),o=typeof n==`number`?a+n:i.findIndex((e,t)=>t>a&&e.includes(n));if(a<0||o<0)throw Error(`excerpt "${t}" … "${n}" not found`);return k(i.slice(a,o+r))}var j=e=>e.join(`
`).replace(/^\s*\n/,``).replace(/\s+$/,``),M=e=>x(e).replace(/`([^`]+)`/g,`<code>$1</code>`).replace(/\*([^*]+)\*/g,`<em>$1</em>`),N=`https://github.com/AlmostAPhysicist/excitejs/blob/main/`;function P(e,t,n,r,i=[],a=0){let o=A(t,n,r,a).split(`
`),s=[],c=0;for(let[t,n]of i){let r=o.findIndex((e,n)=>n>=c&&e.includes(t));if(r<0)throw Error(`note anchor "${t}" not found in ${e}`);s.push({at:r,note:n}),c=r+1}let l=[];(!s.length||s[0].at>0)&&l.push({code:j(o.slice(0,s[0]?.at)),note:``}),s.forEach((e,t)=>l.push({code:j(o.slice(e.at,s[t+1]?.at)),note:e.note}));let u=b(`figure`,`src`),d=b(`figcaption`),f=b(`a`,``,x(e));f.href=N+e,f.target=`_blank`,f.rel=`noopener`,d.append(f),u.append(d);for(let e of l){if(!e.code)continue;let t=b(`div`,`src-seg`+(e.note?` has-note`:``)),n=b(`pre`);n.append(b(`code`,``,O(e.code))),t.append(n),e.note&&t.append(b(`aside`,``,M(e.note))),u.append(t)}return u}var F=e=>b(`div`,`prose`,e);function I(e,...t){let n=b(`details`,`fold`);n.append(b(`summary`,``,e));for(let e of t)n.append(typeof e==`string`?F(e):e);return n}function L(e,t=`js`){let n=b(`pre`,`snippet`);return n.append(b(`code`,``,O(e.replace(/^\n+|\s+$/g,``),t))),n}function R(e,t){let n=b(`aside`,`note`);return n.append(b(`h4`,``,e),F(t)),n}function z(e,...t){let n=b(`div`,`exercise`);return n.append(F(e),I(`One way to do it`,...t)),n}function B(e,t,n,r){let i=b(`section`,`section`);i.id=e,i.append(b(`h2`,``,t),b(`p`,`lead`,n));let a=[];for(let t of r){if(typeof t!=`string`){i.append(t);continue}let n=t.match(/^## (\S+) \| (.+)$/);if(n){let t=b(`h3`,``,n[2]);t.id=`${e}-${n[1]}`,a.push([t.id,n[2]]),i.append(t)}else i.append(F(t))}return{id:e,title:t,parts:a,node:i}}var V=`//#starter\r
import { Observable, Reactor } from "excitejs";\r
//#end\r
//#solution\r
import { Observable, Reactor, Scheduler } from "excitejs";\r
\r
const render = Scheduler().getOrCreate("render");\r
//#end\r
\r
const red = Observable(120);\r
const green = Observable(160);\r
const blue = Observable(200);\r
\r
const swatch = document.createElement("div");\r
swatch.className = "swatch";\r
\r
//#starter\r
// One click writes three Observables, so this runs three times.\r
// Make it run once per click.\r
const paint = Reactor(() => {\r
    swatch.style.background = \`rgb(\${red.value} \${green.value} \${blue.value})\`;\r
    console.log("painted");\r
});\r
//#end\r
//#solution\r
const paint = Reactor(() => {\r
    swatch.style.background = \`rgb(\${red.value} \${green.value} \${blue.value})\`;\r
    console.log("painted");\r
}, { reaction_schedule: render });\r
//#end\r
\r
const any = () => Math.floor(Math.random() * 256);\r
const button = document.createElement("button");\r
button.textContent = "Another color";\r
button.onclick = () => {\r
    red.value = any();\r
    green.value = any();\r
    blue.value = any();\r
};\r
\r
document.body.append(swatch, button);\r
`,H=`.swatch { width: 100%; height: 90px; border-radius: 14px; transition: background-color .3s; }\r
`,ee=`// A canvas with a fixed drawing size of w × h units, shown as wide as the\r
// page allows. at(event) gives a pointer event's position in those units.\r
export function Canvas(w, h) {\r
    const element = document.createElement("canvas");\r
    const dpr = window.devicePixelRatio || 1;\r
    element.width = w * dpr;\r
    element.height = h * dpr;\r
    element.style.width = "100%";\r
    element.style.maxWidth = w + "px";\r
    element.style.aspectRatio = \`\${w} / \${h}\`;\r
    const ctx = element.getContext("2d");\r
    ctx.scale(dpr, dpr);\r
\r
    const at = event => {\r
        const box = element.getBoundingClientRect();\r
        return { x: (event.clientX - box.left) * w / box.width, y: (event.clientY - box.top) * h / box.height };\r
    };\r
    return { element, ctx, w, h, at };\r
}\r
`,U=`import { Observable, Reactor } from "excitejs";\r
import { colors } from "hubble";\r
import { Canvas } from "./canvas.js";\r
\r
const { element, ctx, w, h, at } = Canvas(640, 300);\r
const report = document.createElement("p");\r
document.body.append(element, report);\r
\r
const HUES = ["blue", "orange", "green", "purple"];\r
const DOTS = Array.from({ length: 8000 }, (_, k) => ({\r
    x: Math.random() * 2400 - 1200,\r
    y: Math.random() * 1600 - 800,\r
    r: 3 + Math.random() * 8,\r
    color: HUES[k % 4],\r
}));\r
\r
// how far the picture has been dragged, in whole pixels\r
const offset = Observable({ x: 0, y: 0 });\r
\r
let last = null;\r
element.onpointerdown = e => { last = at(e); element.setPointerCapture(e.pointerId); };\r
element.onpointerup = () => last = null;\r
element.onpointermove = e => {\r
    if (!last) return;\r
    const p = at(e), dx = Math.round(p.x - last.x), dy = Math.round(p.y - last.y);\r
    last = { x: last.x + dx, y: last.y + dy };\r
    offset.value = { x: offset.value.x + dx, y: offset.value.y + dy };\r
};\r
\r
//#part region\r
// paints the rectangle (x0, y0)–(x1, y1) of the canvas, and nothing outside it\r
function paintRegion(x0, y0, x1, y1) {\r
    const c = colors.value, o = offset.value;\r
    ctx.save();\r
    ctx.beginPath();\r
    ctx.rect(x0, y0, x1 - x0, y1 - y0);\r
    ctx.clip();\r
    ctx.fillStyle = c.bg2;\r
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);\r
    let drawn = 0;\r
    for (const d of DOTS) {\r
        const x = w / 2 + d.x + o.x, y = h / 2 + d.y + o.y;\r
        if (x + d.r < x0 || x - d.r > x1 || y + d.r < y0 || y - d.r > y1) continue; // outside the rectangle\r
        ctx.fillStyle = c[d.color];\r
        ctx.beginPath();\r
        ctx.arc(x, y, d.r, 0, 7);\r
        ctx.fill();\r
        drawn++;\r
    }\r
    ctx.restore();\r
    return drawn;\r
}\r
//#end\r
\r
//#until 2\r
//#part render\r
Reactor(() => {\r
    const start = performance.now();\r
    const drawn = paintRegion(0, 0, w, h);\r
    report.textContent = \`whole canvas: \${drawn} dots drawn, \${(performance.now() - start).toFixed(1)} ms\`;\r
});\r
//#end\r
//#end\r
//#step 2\r
//#part render\r
let shown = null; // the offset and palette the canvas currently shows\r
\r
Reactor(() => {\r
    const o = offset.value, c = colors.value;\r
    const start = performance.now();\r
    const reusable = shown && shown.c === c;\r
    const dx = reusable ? o.x - shown.x : 0, dy = reusable ? o.y - shown.y : 0;\r
    let drawn = 0, what = "strips only";\r
\r
    if (!reusable || Math.abs(dx) >= w || Math.abs(dy) >= h) {\r
        drawn = paintRegion(0, 0, w, h); // nothing on the canvas can be kept\r
        what = "whole canvas";\r
    } else {\r
        ctx.drawImage(element, dx, dy, w, h);                  // copy the canvas onto itself, shifted\r
        if (dx > 0) drawn += paintRegion(0, 0, dx, h);         // the strip uncovered on the left\r
        if (dx < 0) drawn += paintRegion(w + dx, 0, w, h);     // or on the right\r
        if (dy > 0) drawn += paintRegion(0, 0, w, dy);         // at the top\r
        if (dy < 0) drawn += paintRegion(0, h + dy, w, h);     // or at the bottom\r
    }\r
    shown = { x: o.x, y: o.y, c };\r
    report.textContent = \`\${what}: \${drawn} dots drawn, \${(performance.now() - start).toFixed(1)} ms\`;\r
});\r
//#end\r
//#end\r
`,W=`//#step 6\r
import { Reactor } from "excitejs";\r
import { picked, seconds_left } from "../state.js";\r
\r
export function Cup() {\r
    const cup = document.createElement("div");\r
    cup.className = "cup";\r
\r
    Reactor(() => {\r
        const tea = picked.value;\r
        const steeped = 1 - seconds_left.value / tea.seconds; // 0 fresh water … 1 ready\r
        cup.style.setProperty("--tea", tea.color);\r
        cup.style.setProperty("--steeped", steeped);\r
    });\r
\r
    return cup;\r
}\r
//#end\r
`,G=`//#step 3\r
import { Reactor } from "excitejs";\r
import { picked } from "../state.js";\r
\r
export function TeaCard(tea) {\r
//#part element\r
    const card = document.createElement("button");\r
    card.className = "tea";\r
    card.style.setProperty("--tea", tea.color);\r
    card.innerHTML = \`<b>\${tea.name}</b><small>\${tea.seconds / 60} min</small>\`;\r
//#end\r
\r
//#part out\r
    card.onclick = () => picked.value = tea;\r
//#end\r
\r
//#part in\r
    Reactor(() => card.classList.toggle("is-picked", picked.value === tea));\r
//#end\r
\r
    return card;\r
}\r
//#end\r
`,K=`//#step 4\r
import { Reactor } from "excitejs";\r
//#until 5\r
import { seconds_left } from "../state.js";\r
//#end\r
//#step 5\r
import { brewing, seconds_left } from "../state.js";\r
//#end\r
\r
const clock = s => \`\${Math.floor(s / 60)}:\${String(s % 60).padStart(2, "0")}\`;\r
\r
export function Timer() {\r
    const box = document.createElement("div");\r
    box.className = "timer";\r
\r
    const time = document.createElement("output");\r
    Reactor(() => { time.textContent = clock(seconds_left.value); });\r
    box.append(time);\r
//#step 5\r
\r
    const start = document.createElement("button");\r
    start.onclick = () => brewing.value = !brewing.value;\r
    Reactor(() => {\r
        const done = seconds_left.value === 0;\r
        start.textContent = done ? "Ready!" : brewing.value ? "Pause" : "Brew";\r
        start.disabled = done;\r
    });\r
    box.append(start);\r
//#end\r
\r
    return box;\r
}\r
//#end\r
`,te=`<!DOCTYPE html>\r
<html lang="en">\r
  <head>\r
    <title>Brew</title>\r
    <link rel="stylesheet" href="./style.css">\r
  </head>\r
  <body>\r
    <main id="app"></main>\r
    <script type="module" src="./main.js"><\/script>\r
  </body>\r
</html>\r
`,q=`//#until 7\r
//#step 2\r
//#until 3\r
import { Reactor } from "excitejs";\r
import { picked } from "./state.js";\r
//#end\r
//#end\r
//#step 3\r
import { TEAS } from "./state.js";\r
import { TeaCard } from "./components/TeaCard.js";\r
//#end\r
//#step 6\r
import { Cup } from "./components/Cup.js";\r
//#end\r
//#step 4\r
import { Timer } from "./components/Timer.js";\r
//#end\r
\r
const app = document.querySelector("#app");\r
\r
const title = document.createElement("h1");\r
title.textContent = "Brew";\r
app.append(title);\r
//#step 2\r
//#until 3\r
\r
const note = document.createElement("p");\r
Reactor(() => {\r
    note.textContent = \`Picked: \${picked.value.name}, \${picked.value.seconds} seconds\`;\r
});\r
app.append(note);\r
//#end\r
//#end\r
//#step 3\r
\r
const teas = document.createElement("div");\r
teas.className = "teas";\r
teas.append(...TEAS.map(TeaCard));\r
app.append(teas);\r
//#end\r
//#step 6\r
app.append(Cup());\r
//#end\r
//#step 4\r
app.append(Timer());\r
//#end\r
//#end\r
//#step 7\r
import { Observable, Reactor } from "excitejs";\r
import { BrewPage } from "./pages/BrewPage.js";\r
import { LogPage } from "./pages/LogPage.js";\r
\r
const app = document.querySelector("#app");\r
\r
const title = document.createElement("h1");\r
title.textContent = "Brew";\r
const nav = document.createElement("nav");\r
nav.innerHTML = \`<a href="#/">Brew</a><a href="#/log">Log</a>\`;\r
app.append(title, nav);\r
\r
//#part route\r
// the address, as an Observable\r
const route = Observable(location.hash || "#/");\r
window.addEventListener("hashchange", () => route.value = location.hash || "#/");\r
//#end\r
\r
//#part links\r
for (const link of nav.children) {\r
    Reactor(() => link.classList.toggle("is-here", link.getAttribute("href") === route.value));\r
}\r
//#end\r
\r
//#part router\r
const brew_page = BrewPage(); // built once and kept, so the timer survives a visit to the log\r
\r
Reactor(() => {\r
    if (route.value === "#/log") {\r
        const log_page = LogPage();\r
        app.append(log_page.node);\r
        return () => { log_page.node.remove(); log_page.dispose(); };\r
    }\r
    app.append(brew_page);\r
    return () => brew_page.remove();\r
});\r
//#end\r
//#end\r
`,J=`//#step 7\r
import { TEAS } from "../state.js";\r
import { TeaCard } from "../components/TeaCard.js";\r
import { Cup } from "../components/Cup.js";\r
import { Timer } from "../components/Timer.js";\r
\r
export function BrewPage() {\r
    const page = document.createElement("section");\r
    const teas = document.createElement("div");\r
    teas.className = "teas";\r
    teas.append(...TEAS.map(TeaCard));\r
    page.append(teas, Cup(), Timer());\r
    return page;\r
}\r
//#end\r
`,Y=`//#step 7\r
import { Reactor } from "excitejs";\r
import { log } from "../state.js";\r
\r
export function LogPage() {\r
    const node = document.createElement("section");\r
    const empty = document.createElement("p");\r
    empty.textContent = "Nothing brewed yet. Finish a cup and it shows up here.";\r
    const list = document.createElement("ol");\r
    node.append(empty, list);\r
\r
    const render = Reactor(() => {\r
        empty.hidden = log.value.length > 0;\r
        list.replaceChildren(...log.value.map(entry => {\r
            const li = document.createElement("li");\r
            li.textContent = \`\${entry.tea}, at \${entry.at}\`;\r
            return li;\r
        }));\r
    });\r
\r
    // a page that can be taken down hands back how\r
    return { node, dispose: () => render.dispose() };\r
}\r
//#end\r
`,X=`//#step 2\r
//#until 4\r
import { Observable } from "excitejs";\r
//#end\r
//#step 4\r
import { Observable, Reactor } from "excitejs";\r
//#end\r
\r
export const TEAS = [\r
    { name: "Green", seconds: 120, color: "var(--green)" },\r
    { name: "Oolong", seconds: 180, color: "var(--orange)" },\r
    { name: "Black", seconds: 240, color: "var(--red)" },\r
    { name: "Herbal", seconds: 300, color: "var(--purple)" },\r
];\r
\r
//#part state\r
export const picked = Observable(TEAS[0]);\r
//#step 4\r
export const seconds_left = Observable(picked.value.seconds);\r
//#end\r
//#step 5\r
export const brewing = Observable(false);\r
//#end\r
//#step 7\r
export const log = Observable(JSON.parse(localStorage.getItem("brew-log") ?? "[]"));\r
//#end\r
//#end\r
//#step 4\r
\r
//#part reset\r
// a new tea resets the clock\r
Reactor(() => {\r
    seconds_left.value = picked.value.seconds;\r
//#step 5\r
    brewing.value = false;\r
//#end\r
}, { deps: [picked] });\r
//#end\r
//#end\r
//#step 5\r
\r
//#part clock\r
// while brewing, one second is removed every TICK_MS (a tenth of a second, to keep the demo short)\r
const TICK_MS = 100;\r
\r
Reactor(() => {\r
    if (!brewing.value) return;\r
    const timer = setInterval(() => {\r
        if (seconds_left.value > 1) { seconds_left.value--; return; }\r
        seconds_left.value = 0;\r
        brewing.value = false;\r
//#step 7\r
        log.value = [...log.value, { tea: picked.value.name, at: new Date().toLocaleTimeString() }];\r
//#end\r
    }, TICK_MS);\r
    return () => clearInterval(timer);\r
});\r
//#end\r
//#end\r
//#step 7\r
\r
//#part save\r
// whenever the log changes, save it\r
Reactor(() => localStorage.setItem("brew-log", JSON.stringify(log.value)));\r
//#end\r
//#end\r
//#end\r
`,Z=`body { gap: 14px; }\r
#app, section { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; width: 100%; }\r
h1 { font-size: 34px; letter-spacing: -.01em; }\r
/*#step 3*/\r
\r
.teas { display: flex; flex-wrap: wrap; gap: 8px; }\r
.tea {\r
  display: grid; gap: 0; text-align: left; padding: 8px 16px 9px;\r
  background: transparent; color: var(--tx); border-radius: 12px;\r
  box-shadow: inset 0 0 0 2px var(--ui-3);\r
}\r
.tea:hover { box-shadow: inset 0 0 0 2px var(--tea); }\r
.tea.is-picked { background: var(--tea); color: var(--bg); box-shadow: 0 3px 0 color-mix(in oklab, var(--tea) 60%, black); }\r
.tea.is-picked small { color: inherit; opacity: .85; }\r
/*#end*/\r
/*#step 4*/\r
\r
.timer { display: flex; align-items: center; gap: 16px; }\r
.timer output { font: 700 44px/1 "Libron", serif; font-variant-numeric: tabular-nums; min-width: 3.4ch; }\r
/*#end*/\r
/*#step 6*/\r
\r
.cup {\r
  width: 120px; height: 84px; position: relative;\r
  border: 4px solid var(--tx); border-top-width: 2px; border-radius: 6px 6px 54px 54px;\r
  /* the water takes on the tea's color as it steeps */\r
  background: linear-gradient(to top,\r
    color-mix(in oklab, var(--tea) calc(var(--steeped) * 100%), var(--bg-2)) 82%,\r
    transparent 82%);\r
  transition: background .2s;\r
}\r
.cup::after {\r
  content: ""; position: absolute; right: -30px; top: 12px; width: 26px; height: 38px;\r
  border: 4px solid var(--tx); border-left: 0; border-radius: 0 22px 22px 0;\r
}\r
/*#end*/\r
/*#step 7*/\r
\r
nav { display: flex; gap: 6px; }\r
nav a { padding: 3px 12px; border-radius: 99px; text-decoration: none; color: var(--tx-2); }\r
nav a.is-here { background: var(--tx); color: var(--bg); }\r
/*#end*/\r
`,Q=`import { Reactor } from "excitejs";\r
import { Camera, Layer } from "pan-zoom";\r
import { colors } from "hubble";\r
\r
//#part stage\r
// the element the camera listens on, and a canvas filling it\r
const stage = document.createElement("div");\r
stage.className = "stage";\r
const canvas = document.createElement("canvas");\r
stage.append(canvas);\r
const readout = document.createElement("p");\r
document.body.append(stage, readout);\r
//#end\r
\r
//#part camera\r
const camera = Camera(stage, { min_scale: 0.2, max_scale: 20 });\r
//#end\r
\r
//#part paint\r
const SHAPES = [\r
    { x: -120, y: -40, r: 50, color: "blue" },\r
    { x: 60, y: 30, r: 70, color: "orange" },\r
    { x: 200, y: -80, r: 30, color: "green" },\r
    { x: -40, y: 120, r: 40, color: "purple" },\r
];\r
\r
Layer(camera, canvas, {\r
    deps: [colors],\r
    paint(brush, world, screen) {\r
        const { ctx } = brush, c = colors.value;\r
        ctx.fillStyle = c.bg2;\r
        ctx.fillRect(screen.x0, screen.y0, screen.x1 - screen.x0, screen.y1 - screen.y0);\r
\r
        brush.useWorld(); // from here on, coordinates are world units\r
        for (const s of SHAPES) {\r
            ctx.fillStyle = c[s.color];\r
            ctx.beginPath();\r
            ctx.arc(s.x, s.y, s.r, 0, 7);\r
            ctx.fill();\r
        }\r
    },\r
});\r
//#end\r
\r
//#part read\r
Reactor(() => {\r
    const v = camera.view.value;\r
    readout.textContent = \`looking at (\${v.x.toFixed(0)}, \${v.y.toFixed(0)}), \${v.scale.toFixed(2)} px per unit, moved by: \${camera.last_input.value}\`;\r
});\r
\r
Reactor(() => {\r
    const tap = camera.tap.value;\r
    if (tap) console.log(\`tap at world (\${tap.x.toFixed(0)}, \${tap.y.toFixed(0)})\`);\r
});\r
//#end\r
\r
//#part move\r
const home = document.createElement("button");\r
home.textContent = "camera.goHome()";\r
home.onclick = () => camera.goHome();\r
document.body.append(home);\r
//#end\r
`,ne=`.stage { position: relative; width: 100%; height: 320px; border-radius: 12px; overflow: hidden; cursor: grab; }\r
.stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 0; pointer-events: none; }\r
`,$=`// A canvas with a fixed drawing size of w × h units, shown as wide as the\r
// page allows. at(event) gives a pointer event's position in those units.\r
export function Canvas(w, h) {\r
    const element = document.createElement("canvas");\r
    const dpr = window.devicePixelRatio || 1;\r
    element.width = w * dpr;\r
    element.height = h * dpr;\r
    element.style.width = "100%";\r
    element.style.maxWidth = w + "px";\r
    element.style.aspectRatio = \`\${w} / \${h}\`;\r
    const ctx = element.getContext("2d");\r
    ctx.scale(dpr, dpr);\r
\r
    const at = event => {\r
        const box = element.getBoundingClientRect();\r
        return { x: (event.clientX - box.left) * w / box.width, y: (event.clientY - box.top) * h / box.height };\r
    };\r
    return { element, ctx, w, h, at };\r
}\r
`,re=`import { Observable, Reactor } from "excitejs";\r
import { colors } from "hubble";\r
import { Canvas } from "./canvas.js";\r
\r
const { element, ctx, w, h, at } = Canvas(640, 320);\r
document.body.append(element);\r
\r
//#part view\r
// the world point shown at the middle of the canvas, and pixels per world unit\r
const view = Observable({ x: 0, y: 0, scale: 1 });\r
//#end\r
\r
//#part convert\r
const toScreen = (wx, wy, v = view.value) => ({\r
    x: w / 2 + (wx - v.x) * v.scale,\r
    y: h / 2 + (wy - v.y) * v.scale,\r
});\r
const toWorld = (sx, sy, v = view.value) => ({\r
    x: v.x + (sx - w / 2) / v.scale,\r
    y: v.y + (sy - h / 2) / v.scale,\r
});\r
//#end\r
\r
//#part paint\r
const SHAPES = [\r
    { x: -120, y: -40, r: 50, color: "blue" },\r
    { x: 60, y: 30, r: 70, color: "orange" },\r
    { x: 200, y: -80, r: 30, color: "green" },\r
    { x: -40, y: 120, r: 40, color: "purple" },\r
];\r
\r
Reactor(() => {\r
    const v = view.value, c = colors.value;\r
    ctx.fillStyle = c.bg2;\r
    ctx.fillRect(0, 0, w, h);\r
\r
    // a grid line every 50 world units\r
    ctx.fillStyle = c.ui3;\r
    const a = toWorld(0, 0), b = toWorld(w, h);\r
    for (let gx = Math.ceil(a.x / 50) * 50; gx < b.x; gx += 50) ctx.fillRect(toScreen(gx, 0).x, 0, 1, h);\r
    for (let gy = Math.ceil(a.y / 50) * 50; gy < b.y; gy += 50) ctx.fillRect(0, toScreen(0, gy).y, w, 1);\r
\r
    for (const s of SHAPES) {\r
        const p = toScreen(s.x, s.y);\r
        ctx.fillStyle = c[s.color];\r
        ctx.beginPath();\r
        ctx.arc(p.x, p.y, s.r * v.scale, 0, 7);\r
        ctx.fill();\r
    }\r
});\r
//#end\r
//#step 3\r
\r
//#part place\r
// the view that shows world point (wx, wy) at screen point (sx, sy), at scale s\r
const placeAt = (wx, wy, sx, sy, s) => ({\r
    scale: s,\r
    x: wx - (sx - w / 2) / s,\r
    y: wy - (sy - h / 2) / s,\r
});\r
//#end\r
//#end\r
//#step 4\r
\r
//#part ease\r
let target = { ...view.value }; // the view being eased toward\r
let anchor = { x: 0, y: 0 };    // the screen point a zoom keeps fixed\r
let moving = false;\r
\r
function frame() {\r
    const v = view.value;\r
    const close = Math.abs(Math.log(target.scale / v.scale)) < 0.002\r
        && Math.hypot(target.x - v.x, target.y - v.y) * v.scale < 0.4;\r
    if (close) { view.value = { ...target }; moving = false; return; }\r
\r
    const k = 0.18; // the fraction of the remaining distance covered each frame\r
    const from = toWorld(anchor.x, anchor.y, v), to = toWorld(anchor.x, anchor.y, target);\r
    const s = v.scale * Math.pow(target.scale / v.scale, k);\r
    view.value = placeAt(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, anchor.x, anchor.y, s);\r
    requestAnimationFrame(frame);\r
}\r
\r
function steer(next, sx, sy) {\r
    target = next;\r
    anchor = { x: sx, y: sy };\r
    if (!moving) { moving = true; requestAnimationFrame(frame); }\r
}\r
//#end\r
//#end\r
//#step 2\r
\r
//#part drag\r
let last = null; // the pointer's previous position while it is pressed\r
//#step 5\r
let velocity = { x: 0, y: 0 }; // how far the last move of the drag went\r
//#end\r
\r
element.onpointerdown = e => {\r
    last = at(e);\r
    element.setPointerCapture(e.pointerId);\r
//#step 5\r
    velocity = { x: 0, y: 0 };\r
//#end\r
};\r
element.onpointermove = e => {\r
    if (!last) return;\r
    const p = at(e), dx = p.x - last.x, dy = p.y - last.y, v = view.value;\r
    last = p;\r
//#until 4\r
    view.value = { ...v, x: v.x - dx / v.scale, y: v.y - dy / v.scale };\r
//#end\r
//#step 4\r
    // a drag moves the view and its target together, with no easing\r
    target = view.value = { ...v, x: v.x - dx / v.scale, y: v.y - dy / v.scale };\r
//#end\r
//#step 5\r
    velocity = { x: dx, y: dy };\r
//#end\r
};\r
//#until 5\r
element.onpointerup = () => last = null;\r
//#end\r
//#step 5\r
element.onpointerup = () => {\r
    last = null;\r
    requestAnimationFrame(coast);\r
};\r
//#end\r
//#end\r
//#end\r
//#step 5\r
\r
//#part fling\r
// after release: keep moving by the drag's last step, 6% less each frame\r
function coast() {\r
    if (last || Math.hypot(velocity.x, velocity.y) < 0.3) return;\r
    const v = view.value;\r
    target = view.value = { ...v, x: v.x - velocity.x / v.scale, y: v.y - velocity.y / v.scale };\r
    velocity = { x: velocity.x * 0.94, y: velocity.y * 0.94 };\r
    requestAnimationFrame(coast);\r
}\r
//#end\r
//#end\r
//#step 3\r
\r
//#part wheel\r
// zoom only while Ctrl is held (a trackpad pinch also sets ctrlKey),\r
// so plain scrolling still scrolls the page\r
element.onwheel = e => {\r
    if (!e.ctrlKey) return;\r
    e.preventDefault();\r
    const p = at(e);\r
//#until 4\r
    const under = toWorld(p.x, p.y);\r
    const s = Math.min(8, Math.max(0.25, view.value.scale * Math.exp(-e.deltaY * 0.004)));\r
    view.value = placeAt(under.x, under.y, p.x, p.y, s);\r
//#end\r
//#step 4\r
    const under = toWorld(p.x, p.y, target);\r
    const s = Math.min(8, Math.max(0.25, target.scale * Math.exp(-e.deltaY * 0.004)));\r
    steer(placeAt(under.x, under.y, p.x, p.y, s), p.x, p.y);\r
//#end\r
};\r
\r
function Button(text, onclick) {\r
    const button = document.createElement("button");\r
    button.textContent = text;\r
    button.onclick = onclick;\r
    return button;\r
}\r
// the buttons zoom about the middle of the canvas\r
const zoomBy = factor => {\r
//#until 4\r
    const mid = toWorld(w / 2, h / 2);\r
    view.value = placeAt(mid.x, mid.y, w / 2, h / 2, view.value.scale * factor);\r
//#end\r
//#step 4\r
    const mid = toWorld(w / 2, h / 2, target);\r
    steer(placeAt(mid.x, mid.y, w / 2, h / 2, target.scale * factor), w / 2, h / 2);\r
//#end\r
};\r
const row = document.createElement("div");\r
row.className = "row";\r
row.append(Button("Zoom in", () => zoomBy(2)), Button("Zoom out", () => zoomBy(0.5)));\r
document.body.append(row);\r
//#end\r
//#end\r
`,ie=`import { Observable, Reactor } from "excitejs";\r
\r
//#part elements\r
const button = document.createElement("button");\r
button.textContent = "Press me";\r
const output = document.createElement("output");\r
document.body.append(button, output);\r
//#end\r
\r
//#part state\r
const count = Observable(0);\r
//#end\r
\r
//#part react\r
Reactor(() => {\r
    output.textContent = \`count is \${count.value}\`;\r
});\r
//#end\r
\r
//#part write\r
button.onclick = () => count.value++;\r
//#end\r
`,ae=`import { Observable, Reactor } from "excitejs";\r
\r
const button = document.createElement("button");\r
button.textContent = "Press me";\r
const output = document.createElement("output");\r
const twice = document.createElement("output");\r
document.body.append(button, output, twice);\r
\r
const count = Observable(0);\r
\r
Reactor(() => {\r
    output.textContent = \`count is \${count.value}\`;\r
});\r
//#starter\r
\r
// Your code here: keep \`twice\` showing "twice is …", double the count.\r
//#end\r
//#solution\r
\r
Reactor(() => {\r
    twice.textContent = \`twice is \${count.value * 2}\`;\r
});\r
//#end\r
\r
button.onclick = () => count.value++;\r
`,oe=`<body>\r
  <button id="login">log in / log out</button>\r
  <button id="rename">change the name</button>\r
<!--#step 4-->\r
  <button id="auto">auto_deps on / off</button>\r
<!--#end-->\r
  <script type="module" src="./main.js"><\/script>\r
</body>\r
`,se=`import { Observable, Reactor } from "excitejs";\r
\r
const logged_in = Observable(false);\r
const user_name = Observable("Ada");\r
\r
function greet() {\r
    if (logged_in.value) console.log(\`Welcome, \${user_name.value}\`);\r
    else console.log("Please log in");\r
}\r
\r
//#part greeter\r
//#until 2\r
const greeter = Reactor(greet);\r
//#end\r
//#step 2\r
//#until 3\r
const greeter = Reactor(greet, { deps: [logged_in] });\r
//#end\r
//#end\r
//#step 3\r
//#until 4\r
const greeter = Reactor(greet, { deps: [logged_in], initFn: true });\r
//#end\r
//#end\r
//#step 4\r
const greeter = Reactor(greet);\r
//#end\r
//#end\r
\r
document.querySelector("#login").onclick = () => {\r
    logged_in.value = !logged_in.value;\r
};\r
document.querySelector("#rename").onclick = () => {\r
    user_name.value = user_name.value === "Ada" ? "Grace" : "Ada";\r
};\r
//#step 4\r
document.querySelector("#auto").onclick = () => {\r
    greeter.auto_deps = !greeter.auto_deps;\r
    console.log(\`auto_deps: \${greeter.auto_deps}\`);\r
};\r
//#end\r
`,ce=`// A canvas with a fixed drawing size of w × h units, shown as wide as the\r
// page allows. at(event) gives a pointer event's position in those units.\r
export function Canvas(w, h) {\r
    const element = document.createElement("canvas");\r
    const dpr = window.devicePixelRatio || 1;\r
    element.width = w * dpr;\r
    element.height = h * dpr;\r
    element.style.width = "100%";\r
    element.style.maxWidth = w + "px";\r
    element.style.aspectRatio = \`\${w} / \${h}\`;\r
    const ctx = element.getContext("2d");\r
    ctx.scale(dpr, dpr);\r
\r
    const at = event => {\r
        const box = element.getBoundingClientRect();\r
        return { x: (event.clientX - box.left) * w / box.width, y: (event.clientY - box.top) * h / box.height };\r
    };\r
    return { element, ctx, w, h, at };\r
}\r
`,le=`//#step 2\r
import { Observable, Reactor } from "excitejs";\r
//#end\r
import { colors } from "hubble";\r
import { Canvas } from "./canvas.js";\r
\r
const { element, ctx, w, h } = Canvas(320, 320);\r
document.body.append(element);\r
\r
//#part lattice\r
const N = 96; // N × N spins, one byte each, row after row\r
const spins = new Int8Array(N * N).map(() => (Math.random() < 0.5 ? 1 : -1));\r
//#step 2\r
const sweeps = Observable(0); // how many sweeps have run\r
//#end\r
//#end\r
\r
//#part pixels\r
// one pixel per spin, in an N × N image that is then drawn enlarged\r
const image = new ImageData(N, N);\r
const pixels = new Uint32Array(image.data.buffer); // each pixel as one 32-bit number\r
const small = document.createElement("canvas");\r
small.width = small.height = N;\r
// "#rrggbb" → that color as a 32-bit pixel\r
const pixel = hex => {\r
    const n = parseInt(hex.slice(1), 16);\r
    return (255 << 24 | (n & 255) << 16 | (n >> 8 & 255) << 8 | n >> 16) >>> 0;\r
};\r
\r
function paint() {\r
//#step 2\r
    sweeps.value; // read, so that the Reactor below repaints after every sweep\r
//#end\r
    const c = colors.value, up = pixel(c.up), down = pixel(c.down);\r
    for (let k = 0; k < spins.length; k++) pixels[k] = spins[k] > 0 ? up : down;\r
    small.getContext("2d").putImageData(image, 0, 0);\r
    ctx.imageSmoothingEnabled = false; // enlarged pixels stay sharp squares\r
    ctx.drawImage(small, 0, 0, w, h);\r
}\r
//#until 2\r
paint();\r
//#end\r
//#step 2\r
Reactor(paint);\r
//#end\r
//#end\r
//#step 2\r
\r
//#part temperature\r
const temperature = Observable(2.2);\r
const label = document.createElement("label");\r
const slider = document.createElement("input");\r
slider.type = "range";\r
slider.min = 0.5; slider.max = 4; slider.step = 0.01;\r
slider.value = temperature.value;\r
slider.oninput = () => temperature.value = Number(slider.value);\r
const readout = document.createElement("code");\r
Reactor(() => {\r
    readout.textContent = \`T = \${temperature.value.toFixed(2)}, sweep \${sweeps.value}\`;\r
});\r
label.append(slider, readout);\r
document.body.append(label);\r
//#end\r
//#step 3\r
\r
//#part odds\r
// The cost of a flip is 2 · spin · (sum of the 4 neighbours). A spin is ±1\r
// and the sum is −4, −2, 0, 2 or 4, so there are ten possible costs. Their\r
// probabilities are stored in a list, rebuilt when the temperature changes.\r
let odds = [];\r
Reactor(() => {\r
    const T = temperature.value;\r
    odds = [];\r
    for (const s of [-1, 1]) for (let around = -4; around <= 4; around += 2) {\r
        const cost = 2 * s * around;\r
        odds.push(cost <= 0 ? 1 : Math.exp(-cost / T));\r
    }\r
});\r
//#end\r
//#end\r
\r
//#part sweep\r
// one sweep: as many flip attempts as there are spins\r
function sweep() {\r
//#until 3\r
    const T = temperature.value;\r
//#end\r
    for (let n = 0; n < N * N; n++) {\r
        const i = Math.floor(Math.random() * N), j = Math.floor(Math.random() * N);\r
        const s = spins[i * N + j];\r
        const around = spins[((i + 1) % N) * N + j] + spins[((i + N - 1) % N) * N + j]\r
            + spins[i * N + (j + 1) % N] + spins[i * N + (j + N - 1) % N]; // % N: the edges wrap around\r
//#until 3\r
        const cost = 2 * s * around; // the energy this flip would cost\r
        if (cost <= 0 || Math.random() < Math.exp(-cost / T)) spins[i * N + j] = -s;\r
//#end\r
//#step 3\r
        if (Math.random() < odds[(s > 0 ? 5 : 0) + (around + 4) / 2]) spins[i * N + j] = -s;\r
//#end\r
    }\r
}\r
//#end\r
\r
//#part loop\r
function frame() {\r
    sweep();\r
    sweeps.value++; // one write per frame, after thousands of changes to the array\r
    requestAnimationFrame(frame);\r
}\r
requestAnimationFrame(frame);\r
//#end\r
//#end\r
`,ue=`import { Observable, Reactor } from "excitejs";\r
import { Camera } from "pan-zoom";\r
import { Lattice, LatticeLayer, acceptanceTable, step } from "ising";\r
\r
const stage = document.createElement("div");\r
stage.className = "stage";\r
const canvas = document.createElement("canvas");\r
stage.append(canvas);\r
document.body.append(stage);\r
\r
//#part state\r
const lattice = Observable(Lattice(128)); // the spins, their flip times, running totals\r
const tick = Observable(0);               // incremented after each frame's flips\r
const temperature = Observable(2.1);\r
\r
let odds = acceptanceTable(temperature.value, 0, "metropolis");\r
const retable = Reactor(() => { odds = acceptanceTable(temperature.value, 0, "metropolis"); });\r
//#end\r
\r
//#part view\r
const camera = Camera(stage, {\r
    view: { x: 64, y: 64, scale: 5 },\r
    min_scale: 2, max_scale: 140,\r
    auto_advance: false,\r
});\r
LatticeLayer(camera, canvas, { lattice, tick });\r
//#end\r
\r
//#part loop\r
function frame(now) {\r
    camera.advance(now);\r
    step(lattice.value, 0.05, odds, now);\r
    tick.value++;\r
    requestAnimationFrame(frame);\r
}\r
requestAnimationFrame(frame);\r
//#end\r
`,de=`.stage { position: relative; width: 100%; height: 320px; border-radius: 12px; overflow: hidden; cursor: grab; }\r
.stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 0; pointer-events: none; }\r
`,fe=`import { Observable, Reactor } from "excitejs";\r
import { Camera, Layer } from "pan-zoom";\r
import { colors } from "hubble";\r
import { N, spins, flipped, sweep, setTemperature } from "./physics.js";\r
import { detailAt, drawSpin } from "./sprites.js";\r
\r
//#part stage\r
const stage = document.createElement("div");\r
stage.className = "stage";\r
const canvas = document.createElement("canvas");\r
stage.append(canvas);\r
const slider = document.createElement("input");\r
slider.type = "range";\r
slider.min = 0.5; slider.max = 4; slider.step = 0.01;\r
document.body.append(stage, slider);\r
//#end\r
\r
//#part state\r
const clock = Observable(0); // the time the picture is drawn for, ms\r
const temperature = Observable(2.1);\r
slider.value = temperature.value;\r
slider.oninput = () => temperature.value = Number(slider.value);\r
const retable = Reactor(() => setTemperature(temperature.value));\r
//#end\r
\r
//#part camera\r
// One world unit is one spin, so the camera's scale is pixels per spin.\r
// auto_advance: false, because the frame loop below calls camera.advance().\r
const camera = Camera(stage, {\r
    view: { x: N / 2, y: N / 2, scale: 9 },\r
    min_scale: 6, max_scale: 140,\r
    auto_advance: false,\r
});\r
//#end\r
\r
//#part paint\r
Layer(camera, canvas, {\r
    deps: [clock, colors], // repaint when time moves on, or the palette changes\r
    paint(brush, world, screen) {\r
        const { ctx, scale } = brush, c = colors.value;\r
        const detail = detailAt(scale), now = clock.value;\r
        ctx.fillStyle = c.ui2;\r
        ctx.fillRect(screen.x0, screen.y0, screen.x1 - screen.x0, screen.y1 - screen.y0);\r
\r
        // the spins inside the region to paint; outside 0…N the lattice repeats\r
        for (let i = Math.floor(world.y0); i < world.y1; i++) for (let j = Math.floor(world.x0); j < world.x1; j++) {\r
            const k = ((i % N + N) % N) * N + (j % N + N) % N;\r
            const p = brush.toScreen(j, i);\r
            drawSpin(ctx, c, p.x, p.y, scale, spins[k], Math.max(0, now - flipped[k]), detail);\r
        }\r
    },\r
});\r
//#end\r
\r
//#part loop\r
function frame(now) {\r
    camera.advance(now); // input → view\r
    sweep(0.02, now);    // a fiftieth of a sweep per frame, so single flips can be followed\r
    clock.value = now;   // one write: the Layer repaints\r
    requestAnimationFrame(frame);\r
}\r
requestAnimationFrame(frame);\r
//#end\r
`,pe=`// The physics from the last lab, as a module: no drawing in here.\r
\r
export const N = 64;\r
export const spins = new Int8Array(N * N).map(() => (Math.random() < 0.5 ? 1 : -1));\r
export const flipped = new Float64Array(N * N).fill(-1e9); // when each spin last flipped, ms\r
\r
let odds = [];\r
export function setTemperature(T) {\r
    odds = [];\r
    for (const s of [-1, 1]) for (let around = -4; around <= 4; around += 2) {\r
        const cost = 2 * s * around;\r
        odds.push(cost <= 0 ? 1 : Math.exp(-cost / T));\r
    }\r
}\r
\r
// \`sweeps\` may be a fraction: what is left over waits for the next call\r
let owed = 0;\r
export function sweep(sweeps, now) {\r
    owed += sweeps * N * N;\r
    for (; owed >= 1; owed--) {\r
        const i = Math.floor(Math.random() * N), j = Math.floor(Math.random() * N), k = i * N + j;\r
        const s = spins[k];\r
        const around = spins[((i + 1) % N) * N + j] + spins[((i + N - 1) % N) * N + j]\r
            + spins[i * N + (j + 1) % N] + spins[i * N + (j + N - 1) % N];\r
        if (Math.random() < odds[(s > 0 ? 5 : 0) + (around + 4) / 2]) {\r
            spins[k] = -s;\r
            flipped[k] = now; // the stamp the arrow's turn is measured from\r
        }\r
    }\r
}\r
`,me=`// The sprite from the arrow lab, as a module. It draws on whatever context\r
// it is handed, so it works under any camera.\r
\r
export const FLIP_MS = 300;\r
\r
export function detailAt(pixels) {\r
    const t = Math.min(1, Math.max(0, (pixels - 16) / (46 - 16)));\r
    return t * t * (3 - 2 * t);\r
}\r
\r
function arrowAngle(s, age) {\r
    const rest = s > 0 ? 0 : Math.PI;\r
    if (age >= FLIP_MS) return rest;\r
    return rest + Math.PI * (1 - age / FLIP_MS) ** 3;\r
}\r
\r
export function drawSpin(ctx, c, x, y, width, s, age, detail) {\r
    const p = Math.min(1, age / FLIP_MS);\r
    const gap = detail * 0.09 * width, side = width - 2 * gap;\r
    ctx.beginPath();\r
    ctx.roundRect(x + gap, y + gap, side, side, detail * side / 2);\r
    if (p < 1) { ctx.fillStyle = s > 0 ? c.down : c.up; ctx.fill(); ctx.globalAlpha = p; }\r
    ctx.fillStyle = s > 0 ? c.up : c.down;\r
    ctx.fill();\r
    ctx.globalAlpha = 1;\r
    if (detail === 0) return;\r
\r
    ctx.save();\r
    ctx.globalAlpha = detail;\r
    ctx.strokeStyle = ctx.fillStyle = (p > 0.5) === (s > 0) ? c.down : c.up;\r
    ctx.translate(x + width / 2, y + width / 2);\r
    ctx.rotate(arrowAngle(s, age));\r
    ctx.lineWidth = side * 0.08;\r
    ctx.lineCap = "round";\r
    ctx.beginPath();\r
    ctx.moveTo(0, side * 0.3);\r
    ctx.lineTo(0, -side * 0.1);\r
    ctx.stroke();\r
    ctx.beginPath();\r
    ctx.moveTo(0, -side * 0.34);\r
    ctx.lineTo(-side * 0.17, -side * 0.06);\r
    ctx.lineTo(side * 0.17, -side * 0.06);\r
    ctx.fill();\r
    ctx.restore();\r
}\r
`,he=`.stage { position: relative; width: 100%; height: 320px; border-radius: 12px; overflow: hidden; cursor: grab; }\r
.stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 0; pointer-events: none; }\r
`,ge=`// A canvas with a fixed drawing size of w × h units, shown as wide as the\r
// page allows. at(event) gives a pointer event's position in those units.\r
export function Canvas(w, h) {\r
    const element = document.createElement("canvas");\r
    const dpr = window.devicePixelRatio || 1;\r
    element.width = w * dpr;\r
    element.height = h * dpr;\r
    element.style.width = "100%";\r
    element.style.maxWidth = w + "px";\r
    element.style.aspectRatio = \`\${w} / \${h}\`;\r
    const ctx = element.getContext("2d");\r
    ctx.scale(dpr, dpr);\r
\r
    const at = event => {\r
        const box = element.getBoundingClientRect();\r
        return { x: (event.clientX - box.left) * w / box.width, y: (event.clientY - box.top) * h / box.height };\r
    };\r
    return { element, ctx, w, h, at };\r
}\r
`,_e=`import { colors } from "hubble";\r
import { Canvas } from "./canvas.js";\r
\r
// Returns true if a flip should happen.\r
// cost: the energy the flip would cost. T: the temperature.\r
function accepts(cost, T) {\r
//#starter\r
    // Your code here. For now every flip is accepted.\r
    return true;\r
//#end\r
//#solution\r
    return cost <= 0 || Math.random() < Math.exp(-cost / T);\r
//#end\r
}\r
window.accepts = accepts; // the exercise's check calls it\r
\r
const { element, ctx, w, h } = Canvas(320, 320);\r
document.body.append(element);\r
\r
const N = 64, T = 1.5;\r
const spins = new Int8Array(N * N).map(() => (Math.random() < 0.5 ? 1 : -1));\r
\r
function frame() {\r
    for (let n = 0; n < N * N; n++) {\r
        const i = Math.floor(Math.random() * N), j = Math.floor(Math.random() * N);\r
        const s = spins[i * N + j];\r
        const around = spins[((i + 1) % N) * N + j] + spins[((i + N - 1) % N) * N + j]\r
            + spins[i * N + (j + 1) % N] + spins[i * N + (j + N - 1) % N];\r
        if (accepts(2 * s * around, T)) spins[i * N + j] = -s;\r
    }\r
    const c = colors.value, cell = w / N;\r
    ctx.fillStyle = c.down;\r
    ctx.fillRect(0, 0, w, h);\r
    ctx.fillStyle = c.up;\r
    for (let k = 0; k < spins.length; k++) {\r
        if (spins[k] > 0) ctx.fillRect((k % N) * cell, Math.floor(k / N) * cell, cell + 0.5, cell + 0.5);\r
    }\r
    requestAnimationFrame(frame);\r
}\r
requestAnimationFrame(frame);\r
`,ve=`import { Observable, Reactor, moveToTop } from "excitejs";\r
\r
const bell = Observable(0);\r
\r
Reactor(() => console.log("first"), { deps: [bell] });\r
Reactor(() => console.log("second"), { deps: [bell] });\r
const third = Reactor(() => console.log("third"), { deps: [bell] });\r
\r
function Button(text, onclick) {\r
    const button = document.createElement("button");\r
    button.textContent = text;\r
    button.onclick = onclick;\r
    return button;\r
}\r
document.body.append(\r
    Button("bell.value++", () => bell.value++),\r
    Button("moveToTop(bell.reactors, third)", () => moveToTop(bell.reactors, third)),\r
);\r
`,ye=`import { Observable, Reactor } from "excitejs";\r
\r
const first = Observable("Ada");\r
const last = Observable("Lovelace");\r
\r
const button = document.createElement("button");\r
button.textContent = "Change both names";\r
const list = document.createElement("ol");\r
document.body.append(button, list);\r
\r
//#part write\r
button.onclick = () => {\r
    const ada = first.value === "Ada";\r
    first.value = ada ? "Grace" : "Ada";\r
    last.value = ada ? "Hopper" : "Lovelace";\r
};\r
//#end\r
\r
//#part react\r
// adds one line to the list each time it runs\r
Reactor(() => {\r
    const line = document.createElement("li");\r
    line.textContent = \`\${first.value} \${last.value}\`;\r
    list.append(line);\r
});\r
//#end\r
`,be=`import { Observable, Reactor } from "excitejs";\r
\r
const ticks = Observable(0);\r
setInterval(() => ticks.value++, 800);\r
\r
const label = document.createElement("h2");\r
const display = Reactor(() => {\r
    label.textContent = \`tick \${ticks.value}\`;\r
});\r
\r
function Button(text, onclick) {\r
    const button = document.createElement("button");\r
    button.textContent = text;\r
    button.onclick = onclick;\r
    return button;\r
}\r
\r
const row = document.createElement("div");\r
row.className = "row";\r
row.append(\r
    Button("paused = !paused", () => display.paused = !display.paused),\r
    Button("dispose()", () => display.dispose()),\r
    Button("react()", () => display.react()),\r
);\r
document.body.append(label, row);\r
`,xe=`// A canvas with a fixed drawing size of w × h units, shown as wide as the\r
// page allows. at(event) gives a pointer event's position in those units.\r
export function Canvas(w, h) {\r
    const element = document.createElement("canvas");\r
    const dpr = window.devicePixelRatio || 1;\r
    element.width = w * dpr;\r
    element.height = h * dpr;\r
    element.style.width = "100%";\r
    element.style.maxWidth = w + "px";\r
    element.style.aspectRatio = \`\${w} / \${h}\`;\r
    const ctx = element.getContext("2d");\r
    ctx.scale(dpr, dpr);\r
\r
    const at = event => {\r
        const box = element.getBoundingClientRect();\r
        return { x: (event.clientX - box.left) * w / box.width, y: (event.clientY - box.top) * h / box.height };\r
    };\r
    return { element, ctx, w, h, at };\r
}\r
`,Se=`//#step 2\r
import { Observable, Reactor } from "excitejs";\r
//#end\r
import { colors } from "hubble";\r
import { Canvas } from "./canvas.js";\r
\r
const { element, ctx, w, h, at } = Canvas(640, 260);\r
document.body.append(element);\r
//#step 2\r
\r
function Slider(text, value, min, max, step = 1) {\r
    const label = document.createElement("label");\r
    const input = document.createElement("input");\r
    input.type = "range";\r
    input.min = min; input.max = max; input.step = step;\r
    input.value = value.value;\r
    input.oninput = () => value.value = Number(input.value);\r
    label.append(text, input);\r
    return label;\r
}\r
//#end\r
\r
//#part arrow\r
// an arrow \`length\` long, centred on (cx, cy), rotated by \`angle\` radians (0 points up)\r
function drawArrow(cx, cy, length, angle) {\r
    ctx.save();\r
    ctx.translate(cx, cy);\r
    ctx.rotate(angle);\r
    ctx.lineWidth = length * 0.08;\r
    ctx.lineCap = "round";\r
    ctx.beginPath(); // the shaft\r
    ctx.moveTo(0, length * 0.3);\r
    ctx.lineTo(0, -length * 0.1);\r
    ctx.stroke();\r
    ctx.beginPath(); // the head\r
    ctx.moveTo(0, -length * 0.34);\r
    ctx.lineTo(-length * 0.17, -length * 0.06);\r
    ctx.lineTo(length * 0.17, -length * 0.06);\r
    ctx.fill();\r
    ctx.restore();\r
}\r
//#end\r
//#until 2\r
\r
//#part paint\r
ctx.strokeStyle = ctx.fillStyle = colors.value.tx;\r
drawArrow(w / 2, h / 2, 140, 0);\r
//#end\r
//#end\r
//#step 2\r
//#until 3\r
\r
//#part state\r
const angle = Observable(0); // degrees\r
document.body.append(Slider("angle", angle, 0, 360));\r
//#end\r
//#end\r
//#end\r
//#step 3\r
\r
//#part state\r
//#until 6\r
const spin = Observable(1); // +1 is up, −1 is down\r
let flipped_at = -1e9;      // the time of its last flip, ms\r
//#end\r
//#step 6\r
const N = 24;               // a lattice of N × N spins\r
const spins = new Int8Array(N * N).map(() => (Math.random() < 0.5 ? 1 : -1));\r
const flipped = new Float64Array(N * N).fill(-1e9); // the time of each spin's last flip\r
//#end\r
const clock = Observable(0); // the time the picture is drawn for, ms\r
//#step 5\r
const px = Observable(70);   // the side of one spin's cell, in pixels\r
document.body.append(Slider("pixels per spin", px, 4, 110));\r
//#end\r
\r
element.onclick = e => {\r
//#until 6\r
    spin.value = -spin.value;\r
    flipped_at = performance.now();\r
//#end\r
//#step 6\r
    const p = at(e);\r
    const k = (Math.floor(p.y / px.value) % N) * N + Math.floor(p.x / px.value) % N;\r
    spins[k] *= -1;\r
    flipped[k] = performance.now();\r
//#end\r
    startTurning();\r
};\r
//#end\r
\r
//#part turn\r
const FLIP_MS = 420; // how long an arrow takes to turn over\r
\r
// the angle of a spin's arrow, \`age\` ms after it flipped\r
function arrowAngle(s, age) {\r
    const rest = s > 0 ? 0 : Math.PI;\r
    if (age >= FLIP_MS) return rest;\r
    const p = age / FLIP_MS;                 // 0 at the flip, 1 when settled\r
    return rest + Math.PI * (1 - p) ** 3;    // half a turn away at first, slowing as it arrives\r
}\r
\r
// After a flip the picture changes for FLIP_MS, so the clock is moved forward\r
// every frame for that long, and then left alone.\r
let turning_until = 0;\r
function startTurning() {\r
    const running = performance.now() < turning_until;\r
    turning_until = performance.now() + FLIP_MS;\r
    if (!running) requestAnimationFrame(advance);\r
}\r
function advance() {\r
    clock.value = performance.now();\r
    if (clock.value < turning_until) requestAnimationFrame(advance);\r
}\r
//#end\r
//#end\r
//#step 5\r
\r
//#part detail\r
// 0 below 16 px per spin, 1 above 46 px, a smooth curve in between\r
function detailAt(pixels) {\r
    const t = Math.min(1, Math.max(0, (pixels - 16) / (46 - 16)));\r
    return t * t * (3 - 2 * t);\r
}\r
//#end\r
//#end\r
//#step 4\r
\r
//#part bubble\r
//#until 5\r
// a disc in the spin's color: ink for up, paper for down.\r
// During a flip the old color is drawn first and the new one over it.\r
function drawBubble(cx, cy, width, s, age) {\r
    const c = colors.value, p = Math.min(1, age / FLIP_MS);\r
    ctx.beginPath();\r
    ctx.arc(cx, cy, width / 2, 0, 7);\r
    ctx.fillStyle = s > 0 ? c.down : c.up; // the color before the flip\r
    ctx.fill();\r
    ctx.globalAlpha = p;\r
    ctx.fillStyle = s > 0 ? c.up : c.down; // the color after it\r
    ctx.fill();\r
    ctx.globalAlpha = 1;\r
    // the arrow is drawn in the opposite color of whichever fill dominates\r
    ctx.strokeStyle = ctx.fillStyle = (p > 0.5) === (s > 0) ? c.down : c.up;\r
}\r
//#end\r
//#step 5\r
// one spin, in the square cell whose top-left corner is (x, y).\r
// detail 0: a flat square filling the cell. detail 1: a disc with an arrow.\r
function drawSpin(x, y, width, s, age, detail) {\r
    const c = colors.value, p = Math.min(1, age / FLIP_MS);\r
    const gap = detail * 0.09 * width, side = width - 2 * gap;\r
    ctx.beginPath();\r
    ctx.roundRect(x + gap, y + gap, side, side, detail * side / 2); // corner radius 0 is a square, side / 2 a circle\r
    ctx.fillStyle = s > 0 ? c.down : c.up; // the color before the flip\r
    ctx.fill();\r
    ctx.globalAlpha = p;\r
    ctx.fillStyle = s > 0 ? c.up : c.down; // the color after it\r
    ctx.fill();\r
    ctx.globalAlpha = 1;\r
    if (detail === 0) return;\r
\r
    ctx.globalAlpha = detail; // the arrow's opacity follows detail\r
    ctx.strokeStyle = ctx.fillStyle = (p > 0.5) === (s > 0) ? c.down : c.up;\r
    drawArrow(x + width / 2, y + width / 2, side, arrowAngle(s, age));\r
    ctx.globalAlpha = 1;\r
}\r
//#end\r
//#end\r
//#end\r
//#step 2\r
\r
//#part paint\r
Reactor(() => {\r
    const c = colors.value;\r
//#until 4\r
    ctx.clearRect(0, 0, w, h);\r
    ctx.strokeStyle = ctx.fillStyle = c.tx;\r
//#end\r
//#step 4\r
    ctx.fillStyle = c.ui2;\r
    ctx.fillRect(0, 0, w, h);\r
//#end\r
//#until 3\r
    drawArrow(w / 2, h / 2, 140, angle.value * Math.PI / 180);\r
//#end\r
//#step 3\r
//#until 6\r
    const age = Math.max(0, clock.value - flipped_at);\r
//#end\r
//#until 4\r
    drawArrow(w / 2, h / 2, 140, arrowAngle(spin.value, age));\r
//#end\r
//#end\r
//#step 4\r
//#until 5\r
    drawBubble(w / 2, h / 2, 170, spin.value, age);\r
    drawArrow(w / 2, h / 2, 140, arrowAngle(spin.value, age));\r
//#end\r
//#end\r
//#step 5\r
//#until 6\r
    const s = px.value;\r
    drawSpin(w / 2 - s / 2, h / 2 - s / 2, s, spin.value, age, detailAt(s));\r
//#end\r
//#end\r
//#step 6\r
    const s = px.value, detail = detailAt(s), now = clock.value;\r
    for (let i = 0; i * s < h; i++) for (let j = 0; j * s < w; j++) {\r
        const k = (i % N) * N + (j % N); // past the lattice's edge it repeats\r
        drawSpin(j * s, i * s, s, spins[k], Math.max(0, now - flipped[k]), detail);\r
    }\r
//#end\r
});\r
//#end\r
//#end\r
`,Ce=`//#until 2\r
import { Observable, Reactor } from "excitejs";\r
//#end\r
//#step 2\r
import { Observable, Reactor, Scheduler } from "excitejs";\r
\r
//#part stages\r
const scheduler = Scheduler();\r
//#step 3\r
const compute = scheduler.getOrCreate("compute"); // created first, so it runs first\r
//#end\r
const render = scheduler.getOrCreate("render");\r
//#end\r
//#end\r
\r
const first = Observable("Ada");\r
const last = Observable("Lovelace");\r
//#step 3\r
const full = Observable("Ada Lovelace");\r
//#end\r
\r
const button = document.createElement("button");\r
button.textContent = "Change both names";\r
const list = document.createElement("ol");\r
document.body.append(button, list);\r
\r
button.onclick = () => {\r
    const ada = first.value === "Ada";\r
    first.value = ada ? "Grace" : "Ada";\r
    last.value = ada ? "Hopper" : "Lovelace";\r
};\r
//#step 3\r
\r
//#part compute\r
Reactor(() => {\r
    full.value = \`\${first.value} \${last.value}\`;\r
}, { reaction_schedule: compute });\r
//#end\r
//#end\r
\r
//#part render\r
// adds one line to the list each time it runs\r
Reactor(() => {\r
    const line = document.createElement("li");\r
//#until 3\r
    line.textContent = \`\${first.value} \${last.value}\`;\r
//#end\r
//#step 3\r
    line.textContent = full.value;\r
//#end\r
    list.append(line);\r
//#until 2\r
});\r
//#end\r
//#step 2\r
}, { reaction_schedule: render });\r
//#end\r
//#end\r
`,we=`import { Observable, Reactor } from "excitejs";\r
\r
const shape = Observable("square");\r
\r
const board = document.createElement("div");\r
board.className = "board";\r
const count = document.createElement("p");\r
const next = document.createElement("button");\r
next.textContent = "Next shape";\r
next.onclick = () => {\r
    shape.value = shape.value === "square" ? "circle" : "square";\r
};\r
document.body.append(board, count, next);\r
\r
//#part stamper\r
const stamper = Reactor(() => {\r
    const stamp = document.createElement("div");\r
    stamp.className = "stamp " + shape.value;\r
    board.append(stamp);\r
    count.textContent = \`stamps on the board: \${board.children.length}\`;\r
//#step 2\r
\r
    return () => stamp.remove();\r
//#end\r
});\r
//#end\r
//#step 3\r
\r
function Button(text, onclick) {\r
    const button = document.createElement("button");\r
    button.className = "quiet";\r
    button.textContent = text;\r
    button.onclick = onclick;\r
    return button;\r
}\r
document.body.append(\r
    Button("stamper.dispose()", () => stamper.dispose()),\r
    Button("stamper.react()", () => stamper.react()),\r
);\r
//#end\r
`,Te=`.board { position: relative; width: 120px; height: 120px; border-radius: 8px; background: var(--bg-2); }\r
.stamp { position: absolute; inset: 20px; opacity: .85; }\r
.stamp.square { background: var(--blue); }\r
.stamp.circle { background: var(--orange); border-radius: 50%; }\r
`,Ee=`import { Observable, Reactor } from "excitejs";\r
\r
const items = Observable([]);\r
\r
const add = document.createElement("button");\r
add.textContent = "Add an item";\r
const list = document.createElement("ul");\r
document.body.append(add, list);\r
\r
add.onclick = () => {\r
//#starter\r
    items.value.push(\`item \${items.value.length + 1}\`); // the bug is on this line\r
//#end\r
//#solution\r
    items.value = [...items.value, \`item \${items.value.length + 1}\`]; // a new array, assigned\r
//#end\r
};\r
\r
Reactor(() => {\r
    list.replaceChildren(...items.value.map(text => {\r
        const li = document.createElement("li");\r
        li.textContent = text;\r
        return li;\r
    }));\r
});\r
`,De=`import { Observable, Reactor, Scheduler } from "excitejs";\r
\r
const pad = document.createElement("div");\r
pad.className = "pad";\r
const dot = document.createElement("i");\r
pad.append(dot);\r
const counts = document.createElement("p");\r
\r
//#part stage\r
// a stage that waits to be flushed (false = manual), in a Scheduler of its own\r
const input = Scheduler();\r
const each_frame = input.getOrCreate("each frame", false);\r
//#end\r
\r
//#part note\r
const pointer = Observable({ x: 40, y: 70 });\r
let moves = 0, applied = 0;\r
\r
function onMove(x, y) {\r
    moves++;\r
    pointer.value = { x, y }; // only stores the position\r
}\r
pad.onpointermove = e => onMove(e.offsetX, e.offsetY);\r
//#end\r
\r
//#part apply\r
const follow = Reactor(() => {\r
    applied++;\r
    dot.style.transform = \`translate(\${pointer.value.x}px, \${pointer.value.y}px)\`;\r
    counts.textContent = \`\${moves} moves heard, applied \${applied} times\`;\r
}, { reaction_schedule: each_frame });\r
//#end\r
\r
//#part frame\r
function frame() {\r
    input.flush(each_frame); // once per animation frame\r
    requestAnimationFrame(frame);\r
}\r
requestAnimationFrame(frame);\r
//#end\r
\r
const burst = document.createElement("button");\r
burst.textContent = "500 moves at once";\r
burst.onclick = () => {\r
    for (let k = 0; k < 500; k++) onMove(40 + k * 0.5, 70 + 40 * Math.sin(k / 30));\r
};\r
document.body.append(pad, counts, burst);\r
`,Oe=`.pad { position: relative; width: 100%; height: 150px; border-radius: 14px; background: var(--bg-2); overflow: hidden; cursor: crosshair; touch-action: none; }\r
.pad i { position: absolute; left: -11px; top: -11px; width: 22px; height: 22px; border-radius: 50%; background: var(--blue); pointer-events: none; }\r
`;function ke(e,t){let r=b(`div`,`ed`),i=b(`div`,`ed-inner`),a=b(`div`,`ed-region`);a.hidden=!0;let o=b(`pre`,`ed-paint`);o.setAttribute(`aria-hidden`,`true`);let s=b(`textarea`,`ed-input`);s.spellcheck=!1,s.autocapitalize=`off`,s.setAttribute(`autocorrect`,`off`),s.setAttribute(`aria-label`,`Code editor. Press Escape, then Tab, to leave it.`),s.wrap=`off`,i.append(a,o,s),r.append(i);let c=!1,l=(t,n)=>{s.value=t,s.selectionStart=s.selectionEnd=n,e.value=t};s.addEventListener(`input`,()=>e.value=s.value),s.addEventListener(`blur`,()=>c=!1),s.addEventListener(`keydown`,e=>{let{selectionStart:t,selectionEnd:n,value:r}=s;if(e.key===`Escape`){c=!0;return}if(e.key===`Tab`&&!c&&!e.ctrlKey&&!e.metaKey&&!e.altKey)if(e.preventDefault(),e.shiftKey){let e=r.lastIndexOf(`
`,t-1)+1,n=r.slice(e).match(/^ {1,4}/)?.[0].length??0;n&&l(r.slice(0,e)+r.slice(e+n),Math.max(e,t-n))}else l(r.slice(0,t)+`    `+r.slice(n),t+4);else if(e.key===`Enter`&&!e.ctrlKey&&!e.metaKey){e.preventDefault();let i=r.slice(r.lastIndexOf(`
`,t-1)+1,t),a=i.match(/^\s*/)[0]+(/[{(\[]\s*$/.test(i)?`    `:``);l(r.slice(0,t)+`
`+a+r.slice(n),t+1+a.length)}else e.key===`}`&&/^\s{4,}$/.test(r.slice(r.lastIndexOf(`
`,t-1)+1,t))?(e.preventDefault(),l(r.slice(0,t-4)+`}`+r.slice(n),t-3)):c=!1}),n(()=>{let n=e.value,r=t.fresh.value,i=t.file.value.split(`.`).pop();s.value!==n&&(s.value=n),o.innerHTML=O(n,i).split(`
`).map((e,t)=>`<span class="ln${r.has(t)?` is-fresh`:``}">${e||` `}</span>`).join(``)});let u=``;return n(()=>{let n=t.region.value;e.value,t.fresh.value;let i=n&&o.children[n.from],s=n&&o.children[Math.min(n.to,o.children.length-1)];if(a.hidden=!i||!s,!n||!i||!s){u=``;return}a.dataset.color=String(n.color),a.style.top=i.offsetTop-3+`px`,a.style.height=s.offsetTop+s.offsetHeight-i.offsetTop+6+`px`;let c=`${t.file._value}:${n.from}-${n.to}`;c!==u&&o.offsetHeight&&(u=c,(i.offsetTop<r.scrollTop+10||s.offsetTop+s.offsetHeight>r.scrollTop+r.clientHeight-10)&&r.scrollTo({top:Math.max(0,i.offsetTop-28),behavior:`smooth`}))}),new ResizeObserver(()=>t.region.trigger()).observe(o),n(()=>{let e=t.fresh._value;if(!e.size||t.region._value)return;let n=o.children[Math.min(...e)];n&&(r.scrollTop=Math.max(0,n.offsetTop-40))},{deps:[t.fresh]}),r}var Ae=160,je=7,Me=10;function Ne(e){return typeof e==`string`?e.length>16?`"${e.slice(0,15)}…"`:`"${e}"`:typeof e==`number`?Number.isInteger(e)?String(e):e.toFixed(2):Array.isArray(e)?`[${e.length} item${e.length===1?``:`s`}]`:e&&typeof e==`object`?`{…}`:String(e)}function Pe(e,t,r){let i=b(`details`,`obs`);i.open=r,i.innerHTML=`<summary>Observables in this code, and the Reactors subscribed to them</summary>
      <table><tbody></tbody></table><p class="obs-idle" hidden></p><ol class="obs-log"></ol>`;let a=i.querySelector(`tbody`),o=i.querySelector(`.obs-idle`),s=i.querySelector(`.obs-log`),c=0,l=[],u=0,d=``,f=new Map,p=new Map;n(()=>{e.value,c=0,l=[],d=``,f.clear(),p.clear(),a.replaceChildren(),s.replaceChildren()});function m(e){for(let t of a.querySelectorAll(`[data-node="${e.id}"]`))t.classList.remove(`is-marked`),t.offsetWidth,t.classList.add(`is-marked`)}function h(e){let t=b(`li`);for(t.textContent=e,s.append(t);s.children.length>je;)s.firstElementChild.remove()}function g(e,t){let n=e.node.name;e.kind===`run`&&f.set(e.node,(f.get(e.node)??0)+1),v(t),m(e.node),e.kind===`write`?h(`${n} = ${e.note}`):e.kind===`run`?h(`    ${n} ran`):e.kind===`cleanup`?h(`    ${n}: its preaction ran`):e.kind===`queue`?h(`    ${n} queued on "${e.note}"`):h(`"${n}" flushed (${e.note} task${e.note===`1`?``:`s`})`)}let _=e=>{let t=e.ref,n=f.get(e),r=t.paused?`paused`:t.reaction_schedule?`on "${t.reaction_schedule.name}"`:``;return e.name+(n||r?` (${[n?`ran ${n}×`:``,r].filter(Boolean).join(`, `)})`:``)};function v(e){let t=e.nodes.filter(e=>e.kind===`observable`),n=e.nodes.filter(e=>e.kind===`reactor`&&e.ref),r=e.nodes.filter(e=>e.kind===`stage`),i=t.slice(0,Me).map(e=>({o:e,subs:n.filter(t=>t.ref.observables.has(e.ref))})),s=n.filter(e=>!e.ref.observables.size),c=JSON.stringify([i.map(e=>[e.o.id,Ne(e.o.ref._value),e.subs.map(_)]),s.map(_),r.map(e=>[e.id,e.ref.tasks.size]),t.length]);if(c===d)return;d=c;let l=(e,t,n)=>{let r=b(`td`,e);return r.textContent=t,n&&(r.dataset.node=String(n.id)),r},u=[];for(let{o:e,subs:t}of i){let n=b(`tr`),r=b(`td`,`obs-subs`);t.length||r.append(b(`i`,``,`no Reactor is subscribed`)),t.forEach(e=>{let t=b(`span`);t.textContent=_(e),t.dataset.node=String(e.id),r.append(t)}),n.append(l(`obs-name`,e.name,e),l(`obs-value`,Ne(e.ref._value),e),r),u.push(n)}if(t.length>Me){let e=b(`tr`);e.append(l(`obs-more`,`and ${t.length-Me} more`)),u.push(e)}if(s.length){let e=b(`tr`),t=b(`td`,`obs-subs`);s.forEach(e=>{let n=b(`span`);n.textContent=_(e),n.dataset.node=String(e.id),t.append(n)}),e.append(l(`obs-none`,`subscribed to nothing`),b(`td`),t),u.push(e)}for(let e of r){let t=b(`tr`);t.append(l(`obs-stage`,`stage "${e.name}"`,e),l(`obs-value`,e.ref.tasks.size?`${e.ref.tasks.size} queued`:`empty`),l(`obs-subs`,e.ref.auto_flush?``:`manual: waits for flush()`)),u.push(t)}a.replaceChildren(...u),o.hidden=e.nodes.length>0,o.textContent=`This code has not created an Observable or a Reactor.`}function y(n){requestAnimationFrame(y);let r=e._value;if(!(!r||!i.open||!t()||document.hidden)){if(v(r),r.events.length<c&&(c=0),l.push(...r.events.slice(c)),c=r.events.length,l.length>40){for(let e of l.slice(0,-8))e.kind===`run`&&f.set(e.node,(f.get(e.node)??0)+1);l=l.slice(-8)}l.length&&n-u>(l.length>8?30:Ae)&&(u=n,g(l.shift(),r))}}return requestAnimationFrame(y),i}function Fe(e,t){e.delete(t)&&e.add(t)}function Ie(e,t){if(e.delete(t)){let n=[...e];e.clear(),e.add(t);for(let t of n)e.add(t)}}function Le(e,t){let n=[...e],r=n.indexOf(t);if(r>0){n[r]=n[r-1],n[r-1]=t,e.clear();for(let t of n)e.add(t)}}function Re(e,t){let n=[...e],r=n.indexOf(t);if(r!==-1&&r<n.length-1){n[r]=n[r+1],n[r+1]=t,e.clear();for(let t of n)e.add(t)}}var ze=`:host{display:block}*{box-sizing:border-box}.body{color:var(--tx);flex-direction:column;align-items:flex-start;gap:10px;font:18px/1.5 Libron,Georgia,serif;display:flex}h1,h2,h3,p{margin:0}h1{font-size:28px;line-height:1.1}h2{font-size:21px}small{color:var(--tx-2);font-size:15px}a{color:var(--blue);text-underline-offset:3px}code,output{font:14px Fira Code Nerd Font Mono,ui-monospace,monospace}button{color:var(--bg);background:var(--blue);cursor:pointer;border:0;border-radius:4px;padding:9px 18px;font:14px Fira Code Nerd Font Mono,ui-monospace,monospace;transition:background-color .15s,transform 80ms}button:hover{background:color-mix(in oklab, var(--blue) 86%, var(--tx))}button:active{transform:translateY(1px)scale(.98)}button:focus-visible,input:focus-visible,a:focus-visible{outline:2px solid var(--orange);outline-offset:2px}button:disabled{opacity:.5;cursor:default;transform:none}button.quiet{color:var(--tx);box-shadow:inset 0 0 0 1px var(--tx-3);background:0 0}input[type=text],input:not([type]){color:var(--tx);background:var(--bg);border:1px solid var(--tx-3);border-radius:4px;min-width:0;padding:6px 10px;font:17px Libron,Georgia,serif}input[type=range]{accent-color:var(--blue);width:min(240px,100%)}input[type=checkbox]{accent-color:var(--blue);width:17px;height:17px}label{white-space:nowrap;align-items:center;gap:8px;display:inline-flex}ul,ol{margin:0;padding-left:22px}canvas{background:var(--bg-2);touch-action:none;border-radius:8px;max-width:100%;display:block}.row{flex-wrap:wrap;align-items:center;gap:8px;display:flex}[data-armed]{outline:none;position:relative}[data-armed=false]:after{content:"click, then scroll or pinch to zoom";background:var(--bg);color:var(--tx-2);box-shadow:0 0 0 1px var(--ui-3);pointer-events:none;white-space:nowrap;border-radius:4px;padding:2px 10px;font:italic 14px Libron,serif;position:absolute;bottom:10px;left:50%;transform:translate(-50%)}[data-armed=true]{box-shadow:inset 0 0 0 2px var(--blue)}`,Be=/^\s*(?:\/\/|\/\*|<!--)\s*#(step|until|starter|solution|part|end)\b\s*([\w-]+)?\s*(?:\*\/|-->)?\s*$/;function Ve(e,t=99,n=`solution`){let r=[],i=new Set,a=[],o=[];for(let s of e.split(/\r?\n/)){let e=s.match(Be);if(e){if(e[1]===`end`){let e=o.pop();if(e?.part){let t=r.length-1;for(;t>=e.from&&!r[t].trim();)t--;t>=e.from&&a.push({name:e.part,from:e.from,to:t})}}else e[1]===`part`?o.push({show:!0,fresh:!1,part:e[2],from:r.length}):e[1]===`step`?o.push({show:t>=Number(e[2]),fresh:t===Number(e[2])}):e[1]===`until`?o.push({show:t<Number(e[2]),fresh:!1}):o.push({show:n===e[1],fresh:!1});continue}o.some(e=>!e.show)||!s.trim()&&(!r.length||!r[r.length-1].trim())||(o.some(e=>e.fresh)&&i.add(r.length),r.push(s))}for(;r.length&&!r[r.length-1].trim();)r.pop();return{text:r.join(`
`)+`
`,fresh:i,parts:a}}var He=[`excitejs`,`pan-zoom`,`ising`,`hubble`];function Ue(e){if(typeof e==`string`)return e;if(typeof e==`function`)return`ƒ `+(e.name||`()`);try{return JSON.stringify(e,(e,t)=>t instanceof Element?`<${t.tagName.toLowerCase()}>`:t)??String(e)}catch{return String(e)}}function We(e,t){let n=e.toString(),r=n.match(/([A-Za-z_$][\w$]*)\.(?:textContent|innerHTML|innerText|hidden|className|value|checked|disabled)\s*=(?!=)/)??n.match(/([A-Za-z_$][\w$]*)\.(?:style|classList|dataset)\b/);return r&&r[1]!==`console`?`updates `+r[1]:/\bconsole\.log\(/.test(n)?`logs`:/\.(?:fill|stroke|clearRect|drawImage)\w*\(/.test(n)?`paints`:`reactor `+t}function Ge(e){let t=[];return e=e.replace(/^[ \t]*import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?/gm,(e,t,n)=>`const {${t.replace(/\s+as\s+/g,`: `)}} = __import(${JSON.stringify(n)});`).replace(/^[ \t]*import\s*\*\s*as\s+([\w$]+)\s*from\s*["']([^"']+)["'];?/gm,(e,t,n)=>`const ${t} = __import(${JSON.stringify(n)});`).replace(/^[ \t]*import\s*["']([^"']+)["'];?/gm,(e,t)=>`__import(${JSON.stringify(t)});`).replace(/^([ \t]*)export\s+(function\*?|const|let|class)\s+([\w$]+)/gm,(e,n,r,i)=>(t.push(i),`${n}${r} ${i}`)),t.length?`${e}\n;Object.assign(__exports, { ${t.join(`, `)} });`:e}var Ke=e=>e.replace(/\b((?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*)(Observable|Reactor)\s*\(/g,(e,t,n,r)=>`${t}${r}.named(${JSON.stringify(n)})(`).replace(/\b(([A-Za-z_$][\w$]*)\s*:\s*)Observable\s*\(/g,(e,t,n)=>`${t}Observable.named(${JSON.stringify(n)})(`);function qe(e,t){if(!t.startsWith(`.`))return t;let n=e.split(`/`).slice(0,-1);for(let e of t.split(`/`))e===`..`?n.pop():e!==`.`&&n.push(e);return n.join(`/`)}var Je=e=>e.replace(/(^|[\s,}])(?:html|:root)(?=[\s,{])/g,`$1:host`).replace(/(^|[\s,}])body(?=[\s,{.:])/g,`$1.body`),Ye=0;function Xe(b,x,S={}){let C=S.id??`lab`+ ++Ye,w=S.storage??new Map,T=[],E=new Set,D=!1,O=0;x.replaceChildren();let k=document.createElement(`style`);k.textContent=ze+`
`+Object.entries(b).filter(([e])=>e.endsWith(`.css`)).map(([,e])=>Je(e)).join(`
`);let A=document.createElement(`div`);A.className=`body`,x.append(k,A);let j={body:A,nodes:[],events:[],window:{},logs:e([]),error:e(null),address:e(``),intervals:()=>E.size,dispose(){if(!D){D=!0;for(let e of T.reverse())try{e()}catch{}}}};function M(e,t,n){if(!D){if(t.count++,j.events.push({kind:e,node:t,note:n&&n.length>30?n.slice(0,29)+`…`:n}),j.events.length>400&&j.events.splice(0,200),++O>1500)throw O=0,Error(`This never settles: something keeps triggering itself. Does a reaction write an Observable it also reads?`);O===1&&queueMicrotask(()=>setTimeout(()=>O=0))}}let N=(e,t,n)=>{let r={id:j.nodes.length,kind:e,name:t,ref:n,count:0};return j.nodes.push(r),r},P=0;function F(t,n){let r=e(n),i=N(`observable`,t??`observable `+ ++P,r),a=r.trigger;return r.trigger=()=>{M(`write`,i,Ue(r._value)),a()},r}let I=Object.assign(e=>F(null,e),{named:e=>t=>F(e,t)}),L=0;function R(e,t,r={}){let i=N(`reactor`,e??We(t,++L),null),a=e=>typeof e==`function`?()=>(M(`cleanup`,i),e()):e,o=e=>()=>(M(`run`,i),a(e())),s={...r};if(typeof s.initFn==`function`&&(s.initFn=o(s.initFn)),s.preaction){let e=s.preaction;s.preaction=()=>(M(`cleanup`,i),e())}let c=n(o(t),s);i.ref=c;let l=c.schedule;return c.schedule=()=>{c.reaction_schedule&&!c.paused&&M(`queue`,i,c.reaction_schedule.name),l()},T.push(()=>c.dispose()),c}let z=Object.assign((e,t)=>R(null,e,t),{named:e=>(t,n)=>R(e,t,n)});function B(){let e=r(),t=e.getOrCreate;e.getOrCreate=(n,r)=>{let i=[...e.schedules].some(e=>e.name===n),a=t(n,r);return i||N(`stage`,n,a),a};let n=e.flush;return e.flush=t=>{for(let n of j.nodes)n.kind===`stage`&&(t?n.ref===t:e.schedules.has(n.ref))&&n.ref.tasks.size&&M(`flush`,n,String(n.ref.tasks.size));n(t)},e}let V=e=>((...t)=>{let n=e(...t);return T.push(()=>n.dispose()),n});function H(e,t){let n=N(`observable`,e,t),r=t.trigger;t.trigger=()=>{M(`write`,n,Ue(t._value)),r()}}function ee(e,t){let n=i(e,t);T.push(()=>n.dispose()),H(`camera.view`,n.view),H(`camera.tap`,n.tap),H(`camera.last_input`,n.last_input),e.dataset.armed=`false`;let r=()=>{e.dataset.armed=`false`};return e.addEventListener(`pointerdown`,()=>{e.dataset.armed=`true`}),e.addEventListener(`keydown`,e=>{e.key===`Escape`&&r()}),A.addEventListener(`wheel`,t=>{e.dataset.armed!==`true`&&t.composedPath().includes(e)&&t.stopPropagation()},{capture:!0}),W(document)(`pointerdown`,t=>{t.composedPath().includes(e)||r()}),W(window)(`scroll`,r,{passive:!0}),n}let U={excitejs:{Observable:I,Reactor:z,Scheduler:B,moveToTop:Ie,moveUp:Le,moveDown:Re,moveToBottom:Fe},"pan-zoom":{Camera:ee,FixedCamera:V(a),Layer:V(o),SpatialGrid:s},ising:{Lattice:_,step:c,acceptanceTable:y,fillLattice:h,magnetization:p,energy:d,T_CRITICAL:u,LatticeLayer:V(v),cellAt:m,latticeRect:g,detailAt:f},hubble:{colors:l}},W=e=>(t,n,r)=>{e.addEventListener(t,n,r),T.push(()=>e.removeEventListener(t,n,r))},G=new Set,K={get hash(){return j.address._value},set hash(e){e=e&&!e.startsWith(`#`)?`#`+e:e,e!==j.address._value&&(j.address.value=e,setTimeout(()=>{D||G.forEach(e=>e(new Event(`hashchange`)))}))}};A.addEventListener(`click`,e=>{let t=e.target.closest?.(`a[href]`),n=t?.getAttribute(`href`)??``;t&&(e.preventDefault(),n.startsWith(`#`)&&(K.hash=n))});let te={body:A,documentElement:A,head:{append(){},appendChild(){}},fonts:document.fonts,createElement:(e,t)=>document.createElement(e,t),createElementNS:(e,t)=>document.createElementNS(e,t),createTextNode:e=>document.createTextNode(e),createDocumentFragment:()=>document.createDocumentFragment(),querySelector:e=>x.querySelector(e),querySelectorAll:e=>x.querySelectorAll(e),getElementById:e=>x.querySelector(`#`+CSS.escape(e)),addEventListener:W(document),removeEventListener:document.removeEventListener.bind(document),get activeElement(){return x.activeElement}},q={setInterval(e,t){let n=window.setInterval(e,t);return E.add(n),n},clearInterval(e){window.clearInterval(e),E.delete(e)},setTimeout(e,t){let n=window.setTimeout(e,t);return T.push(()=>window.clearTimeout(n)),n},clearTimeout:e=>window.clearTimeout(e),requestAnimationFrame(e){return window.requestAnimationFrame(t=>{D||e(t)})},cancelAnimationFrame:e=>window.cancelAnimationFrame(e)};T.push(()=>{E.forEach(e=>window.clearInterval(e)),E.clear()});let J={getItem:e=>w.get(e)??null,setItem:(e,t)=>{w.set(e,String(t))},removeItem:e=>{w.delete(e)},clear:()=>w.clear()},Y={log:(...e)=>{j.logs.value=[...j.logs._value.slice(-59),e.map(Ue).join(` `)]},error:(...e)=>Y.log(`⚠`,...e),warn:(...e)=>Y.log(`⚠`,...e),info:(...e)=>Y.log(...e),clear:()=>{j.logs.value=[]}},X={...q,location:K,document:te,localStorage:J,console:Y,addEventListener(e,t,n){e===`hashchange`?G.add(t):W(window)(e,t,n)},removeEventListener(e,t){G.delete(t),window.removeEventListener(e,t)},matchMedia:e=>window.matchMedia(e),performance,get innerWidth(){return A.clientWidth},get innerHeight(){return A.clientHeight},get devicePixelRatio(){return window.devicePixelRatio}};j.window=X;let Z={document:te,window:X,globalThis:X,location:K,console:Y,localStorage:J,...q},Q=new Map;function ne(e,t){if(U[e])return U[e];if(Q.has(e))return Q.get(e);if(e.endsWith(`.css`)&&e in b)return{};if(!(e in b))throw Error(`${t} imports "${e}", but there is no such file. (Available: ${[...Object.keys(b).filter(e=>e.endsWith(`.js`)),...He.map(e=>`"${e}"`)].join(`, `)})`);let n={};Q.set(e,n);let r=`"use strict";${Ge(Ke(b[e]))}\n//# sourceURL=${C}/${e}`;return Function(`__import`,`__exports`,...Object.keys(Z),r)(t=>ne(qe(e,t),e),n,...Object.values(Z)),n}j.error.value=null;try{let e=b[`index.html`],t=`main.js`;if(e){let n=new DOMParser().parseFromString(e,`text/html`),r=n.querySelector(`script[src]`);r&&(t=qe(`index.html`,r.getAttribute(`src`))),n.querySelectorAll(`script, link, style`).forEach(e=>e.remove()),A.innerHTML=n.body.innerHTML}ne(t,`index.html`)}catch(e){t(null),j.error.value=Ze(e,C)}let $=e=>{String(e.error?.stack??e.filename).includes(C+`/`)&&(t(null),j.error.value=Ze(e.error??e.message,C))};return window.addEventListener(`error`,$),T.push(()=>window.removeEventListener(`error`,$)),j}function Ze(e,t){let n=e instanceof RangeError&&/call stack/i.test(e.message)?`This never settles: something keeps triggering itself. Does a reaction write an Observable it also reads?`:e instanceof Error?`${e.name}: ${e.message}`:String(e),r=e instanceof Error?e.stack?.match(RegExp(t+`/([^:)\\s]+):(\\d+)`)):null;return r?`${n}\n   in ${r[1]}, line ${Number(r[2])-2}`:n}var Qe=Object.assign({"../labs/batch/main.js":V,"../labs/batch/style.css":H,"../labs/blit/canvas.js":ee,"../labs/blit/main.js":U,"../labs/brew/components/Cup.js":W,"../labs/brew/components/TeaCard.js":G,"../labs/brew/components/Timer.js":K,"../labs/brew/index.html":te,"../labs/brew/main.js":q,"../labs/brew/pages/BrewPage.js":J,"../labs/brew/pages/LogPage.js":Y,"../labs/brew/state.js":X,"../labs/brew/style.css":Z,"../labs/camera/main.js":Q,"../labs/camera/style.css":ne,"../labs/canvas/canvas.js":$,"../labs/canvas/main.js":re,"../labs/counter/main.js":ie,"../labs/double/main.js":ae,"../labs/greeting/index.html":oe,"../labs/greeting/main.js":se,"../labs/ising/canvas.js":ce,"../labs/ising/main.js":le,"../labs/ising-real/main.js":ue,"../labs/ising-real/style.css":de,"../labs/ising-zoom/main.js":fe,"../labs/ising-zoom/physics.js":pe,"../labs/ising-zoom/sprites.js":me,"../labs/ising-zoom/style.css":he,"../labs/metropolis/canvas.js":ge,"../labs/metropolis/main.js":_e,"../labs/order/main.js":ve,"../labs/person/main.js":ye,"../labs/remote/main.js":be,"../labs/spin/canvas.js":xe,"../labs/spin/main.js":Se,"../labs/stages/main.js":Ce,"../labs/stamp/main.js":we,"../labs/stamp/style.css":Te,"../labs/todo/main.js":Ee,"../labs/trail/main.js":De,"../labs/trail/style.css":Oe}),$e=e=>(e===`index.html`?`0`:e===`main.js`?`1`:e.endsWith(`.css`)?`9`:e.includes(`/`)?`5`:`3`)+e,et=0;function tt(t,r={}){let i=`lab`+ ++et,a=`../labs/${t}/`,o={};for(let[e,t]of Object.entries(Qe))e.startsWith(a)&&(o[e.slice(a.length)]=t);if(!Object.keys(o).length)throw Error(`no lab files in labs/${t}`);let s=e(1),c=e(r.exercise?`starter`:`solution`),l=e({}),u=e({}),d=e({}),f=e(0),p=e(``),m=e(``),h=e(null),g=e(!1),_=e(!!r.peek),v=e(!1),y=new Map,x=b(`section`,`lab`);x.dataset.result=r.result??`below`;let S=b(`div`,`lab-notes`);r.text&&S.append(b(`div`,`prose`,r.text));let C=b(`div`,`lab-work`),w=b(`div`,`lab-code`),T=b(`div`,`lab-bar`),E=b(`nav`,`lab-files`);E.setAttribute(`aria-label`,`Files`);let D=b(`div`,`lab-actions`);T.append(E,D);let k=e(new Set),A=e(null);w.append(T,ke(m,{file:p,fresh:k,region:A}));let j=b(`div`,`lab-result`),M=b(`p`,`lab-address`);M.hidden=!r.address;let N=b(`div`,`lab-view`);r.view_height&&(N.style.minHeight=r.view_height+`px`);let P=N.attachShadow({mode:`open`}),F=b(`pre`,`lab-error`),I=b(`ol`,`lab-console`);j.append(M,N,F,I),C.append(w,j),r.observers!==`none`&&C.append(Pe(h,()=>g._value,r.observers===`open`)),n(()=>{k.value=u.value[p.value]??new Set});function L(){let e={},t={},n={};for(let i of Object.keys(o).sort((e,t)=>$e(e).localeCompare($e(t)))){let a=Ve(o[i],r.steps?s._value:99,c._value);a.text.trim()&&(e[i]=a.text,t[i]=a.fresh,n[i]=a.parts)}u.value=t,d.value=n,l.value=e;let i=Object.keys(e).find(e=>t[e].size);i&&r.steps?p.value=i:p._value in e?p.trigger():p.value=r.open&&r.open in e?r.open:Object.keys(e).find(e=>e.endsWith(`.js`))??Object.keys(e)[0]}n(L,{deps:[s,c],initFn:!0}),n(()=>{let e=l._value[p._value]??``;m._value!==e&&(m.value=e)},{deps:[p,l],initFn:!0}),n(()=>{let e=p._value;!(e in l._value)||l._value[e]===m._value||(u._value[e]?.size&&(u.value={...u._value,[e]:new Set}),d._value[e]?.length&&(d.value={...d._value,[e]:[]}),l.value={...l._value,[e]:m._value})},{deps:[m]}),n(()=>{let e=Object.keys(l.value),t=p.value;E.hidden=e.length<2,E.replaceChildren(...e.map(e=>{let n=b(`button`,`lab-file`),r=e.lastIndexOf(`/`);return n.innerHTML=(r<0?``:`<i>${e.slice(0,r+1)}</i>`)+e.slice(r+1),n.setAttribute(`aria-pressed`,String(e===t)),u._value[e]?.size&&n.classList.add(`is-fresh`),n.addEventListener(`click`,()=>p.value=e),n}))});function R(){h._value?.dispose();let e=Xe(l._value,P,{storage:y,id:i});h.value=e,r.exercise&&!e.error._value&&H()}n(()=>{if(!g._value)return;if(!h._value){R();return}let e=setTimeout(R,350);return()=>clearTimeout(e)},{deps:[l,g]}),new IntersectionObserver(e=>{let t=e[e.length-1].isIntersecting;t!==g._value&&(g.value=t)},{rootMargin:`300px`}).observe(x),n(()=>{M.textContent=t+`.app/`+(h.value?.address.value??``)}),n(()=>{let e=h.value?.error.value??null;F.hidden=!e,F.textContent=e??``}),n(()=>{let e=h.value?.logs.value??[];I.hidden=!e.length,I.replaceChildren(...e.map(e=>{let t=b(`li`);return t.textContent=e,t})),I.scrollTop=I.scrollHeight});let z=(e,t,n)=>{let r=b(`button`,`lab-act`,e);return r.title=t,r.addEventListener(`click`,n),D.append(r),r};if(r.exercise){let e=z(``,`Swap between the starting code and one solution`,()=>c.value=c._value===`solution`?`starter`:`solution`);n(()=>{e.textContent=c.value===`solution`?`Hide solution`:`Show solution`})}if(z(`Reset`,`Put the code back as it was`,()=>{r.exercise?c.value=`starter`:s.trigger()}),z(`Run again`,`Start the page over`,R),n(()=>{x.dataset.folded=String(_.value)}),r.peek){let e=b(`button`,`lab-peek`);e.addEventListener(`click`,()=>_.value=!_._value),n(()=>{e.textContent=_.value?`Show the code`:`Hide the code`}),S.append(e)}if(r.steps){let e=r.steps,t=b(`div`,`lab-steps`),i=b(`span`,`lab-count`),a=b(`button`,`lab-nav`,`Back`),o=b(`button`,`lab-nav is-next`,`Next step`),c=b(`div`,`prose`);c.setAttribute(`aria-live`,`polite`),a.addEventListener(`click`,()=>s.value=Math.max(1,s._value-1)),o.addEventListener(`click`,()=>s.value=Math.min(e.length,s._value+1)),n(()=>{let t=s.value,n=e[t-1];a.disabled=t===1,o.disabled=t===e.length,i.textContent=`Step ${t} of ${e.length}`,c.innerHTML=`<h4>${n.title}</h4>${n.text}`+(n.code?`<pre class="snippet"><code>${O(n.code.trim(),`js`)}</code></pre>`:``)});let l=b(`div`,`lab-navrow`);l.append(i,a,o),t.append(l,c),S.append(t),r.tour||n(()=>{let t=e[s.value-1].focus,n=t&&d.value[p.value]?.find(e=>e.name===t);A.value=n?{from:n.from,to:n.to,color:0}:null})}let B=()=>(r.tour??[]).map(([e,t,n],r)=>{let i=Object.keys(d._value).find(t=>d._value[t].some(t=>t.name===e));return i?{title:t,text:n,color:r%4,file:i,part:d._value[i].find(t=>t.name===e)}:null}).filter(e=>e!==null);if(r.tour){let e=b(`div`,`lab-tour`),t=b(`span`,`lab-count`),r=b(`button`,`lab-nav`,`Back`),i=b(`button`,`lab-nav is-next`,`Next`),a=b(`div`,`prose`);a.setAttribute(`aria-live`,`polite`);let o=e=>{let t=B();if(!t.length)return;let n=t[Math.max(0,Math.min(t.length-1,e))];p._value!==n.file&&(p.value=n.file),f.value=t.indexOf(n)};r.addEventListener(`click`,()=>o(f._value-1)),i.addEventListener(`click`,()=>o(f._value+1));let s=b(`div`,`lab-navrow`);s.append(t,r,i),e.append(s,a),S.append(e),n(()=>{d.value;let n=B(),o=Math.min(f.value,n.length-1),s=n[o],c=p.value;e.hidden=!s,A.value=s&&s.file===c?{from:s.part.from,to:s.part.to,color:s.color}:null,s&&(e.dataset.color=String(s.color),r.disabled=o===0,i.disabled=o===n.length-1,t.textContent=`Part ${o+1} of ${n.length}`+(s.file===c?``:`, in ${s.file}`),a.innerHTML=`<h4>${s.title}</h4>${s.text}`)})}if(r.exercise){let e=r.exercise,t=b(`div`,`lab-task`);t.innerHTML=`<div class="prose">${e.task}</div>`+(e.hint?`<details class="fold"><summary>Hint</summary><div class="prose">${e.hint}</div></details>`:``);let i=b(`p`,`lab-status`);i.setAttribute(`aria-live`,`polite`),t.append(i),n(()=>{x.classList.toggle(`is-solved`,v.value),i.textContent=v.value?`Solved: the check passes.`:`Not solved yet. The check runs each time you stop typing.`}),S.append(t)}let V=0;async function H(){let e=++V,t=b(`div`);t.style.cssText=`position:fixed;left:-9999px;top:0;width:420px;height:320px;overflow:hidden;visibility:hidden`,document.body.append(t);let n=Xe(l._value,t.attachShadow({mode:`open`}),{id:i+`check`}),a=e=>n.body.querySelector(e),o=(e,...t)=>t.forEach(t=>e.dispatchEvent(new Event(t,{bubbles:!0}))),s={body:n.body,text:()=>n.body.textContent??``,all:e=>[...n.body.querySelectorAll(e)],click:(e,t=1)=>{for(let n=0;n<t;n++)a(e)?.click()},type:(e,t)=>{let n=a(e);n&&(n.value=t,o(n,`input`,`change`))},tick:(e,t)=>{let n=a(e);n&&n.checked!==t&&n.click()},logs:()=>n.logs._value,window:n.window,wait:(e=0)=>new Promise(t=>setTimeout(t,e))},c=!1;try{c=!n.error._value&&!!await r.exercise.check(s)&&!n.error._value}catch{c=!1}n.dispose(),t.remove(),e===V&&c!==v._value&&(v.value=c)}return S.children.length?x.append(S):x.classList.add(`is-solo`),x.append(C),x}export{B as a,b as c,R as i,z as n,L as o,I as r,P as s,tt as t};