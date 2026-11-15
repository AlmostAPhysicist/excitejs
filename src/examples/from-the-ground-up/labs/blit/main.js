import { Observable, Reactor } from "excitejs";
import { colors } from "hubble";
import { Canvas } from "./canvas.js";

const { element, ctx, w, h, at } = Canvas(640, 300);
const report = document.createElement("p");
document.body.append(element, report);

const HUES = ["blue", "orange", "green", "purple"];
const DOTS = Array.from({ length: 8000 }, (_, k) => ({
    x: Math.random() * 2400 - 1200,
    y: Math.random() * 1600 - 800,
    r: 3 + Math.random() * 8,
    color: HUES[k % 4],
}));

// how far the picture has been dragged, in whole pixels
const offset = Observable({ x: 0, y: 0 });

let last = null;
element.onpointerdown = e => { last = at(e); element.setPointerCapture(e.pointerId); };
element.onpointerup = () => last = null;
element.onpointermove = e => {
    if (!last) return;
    const p = at(e), dx = Math.round(p.x - last.x), dy = Math.round(p.y - last.y);
    last = { x: last.x + dx, y: last.y + dy };
    offset.value = { x: offset.value.x + dx, y: offset.value.y + dy };
};

//#part region
// paints the rectangle (x0, y0)–(x1, y1) of the canvas, and nothing outside it
function paintRegion(x0, y0, x1, y1) {
    const c = colors.value, o = offset.value;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, x1 - x0, y1 - y0);
    ctx.clip();
    ctx.fillStyle = c.bg2;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    let drawn = 0;
    for (const d of DOTS) {
        const x = w / 2 + d.x + o.x, y = h / 2 + d.y + o.y;
        if (x + d.r < x0 || x - d.r > x1 || y + d.r < y0 || y - d.r > y1) continue; // outside the rectangle
        ctx.fillStyle = c[d.color];
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, 7);
        ctx.fill();
        drawn++;
    }
    ctx.restore();
    return drawn;
}
//#end

//#until 2
//#part render
Reactor(() => {
    const start = performance.now();
    const drawn = paintRegion(0, 0, w, h);
    report.textContent = `whole canvas: ${drawn} dots drawn, ${(performance.now() - start).toFixed(1)} ms`;
});
//#end
//#end
//#step 2
//#part render
let shown = null; // the offset and palette the canvas currently shows

Reactor(() => {
    const o = offset.value, c = colors.value;
    const start = performance.now();
    const reusable = shown && shown.c === c;
    const dx = reusable ? o.x - shown.x : 0, dy = reusable ? o.y - shown.y : 0;
    let drawn = 0, what = "strips only";

    if (!reusable || Math.abs(dx) >= w || Math.abs(dy) >= h) {
        drawn = paintRegion(0, 0, w, h); // nothing on the canvas can be kept
        what = "whole canvas";
    } else {
        ctx.drawImage(element, dx, dy, w, h);                  // copy the canvas onto itself, shifted
        if (dx > 0) drawn += paintRegion(0, 0, dx, h);         // the strip uncovered on the left
        if (dx < 0) drawn += paintRegion(w + dx, 0, w, h);     // or on the right
        if (dy > 0) drawn += paintRegion(0, 0, w, dy);         // at the top
        if (dy < 0) drawn += paintRegion(0, h + dy, w, h);     // or at the bottom
    }
    shown = { x: o.x, y: o.y, c };
    report.textContent = `${what}: ${drawn} dots drawn, ${(performance.now() - start).toFixed(1)} ms`;
});
//#end
//#end
