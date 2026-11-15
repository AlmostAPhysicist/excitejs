import { Observable, Reactor } from "excitejs";
import { colors } from "hubble";
import { Canvas } from "./canvas.js";

const { element, ctx, w, h, at } = Canvas(640, 320);
document.body.append(element);

//#part view
// the world point shown at the middle of the canvas, and pixels per world unit
const view = Observable({ x: 0, y: 0, scale: 1 });
//#end

//#part convert
const toScreen = (wx, wy, v = view.value) => ({
    x: w / 2 + (wx - v.x) * v.scale,
    y: h / 2 + (wy - v.y) * v.scale,
});
const toWorld = (sx, sy, v = view.value) => ({
    x: v.x + (sx - w / 2) / v.scale,
    y: v.y + (sy - h / 2) / v.scale,
});
//#end

//#part paint
const SHAPES = [
    { x: -120, y: -40, r: 50, color: "blue" },
    { x: 60, y: 30, r: 70, color: "orange" },
    { x: 200, y: -80, r: 30, color: "green" },
    { x: -40, y: 120, r: 40, color: "purple" },
];

Reactor(() => {
    const v = view.value, c = colors.value;
    ctx.fillStyle = c.bg2;
    ctx.fillRect(0, 0, w, h);

    // a grid line every 50 world units
    ctx.fillStyle = c.ui3;
    const a = toWorld(0, 0), b = toWorld(w, h);
    for (let gx = Math.ceil(a.x / 50) * 50; gx < b.x; gx += 50) ctx.fillRect(toScreen(gx, 0).x, 0, 1, h);
    for (let gy = Math.ceil(a.y / 50) * 50; gy < b.y; gy += 50) ctx.fillRect(0, toScreen(0, gy).y, w, 1);

    for (const s of SHAPES) {
        const p = toScreen(s.x, s.y);
        ctx.fillStyle = c[s.color];
        ctx.beginPath();
        ctx.arc(p.x, p.y, s.r * v.scale, 0, 7);
        ctx.fill();
    }
});
//#end
//#step 3

//#part place
// the view that shows world point (wx, wy) at screen point (sx, sy), at scale s
const placeAt = (wx, wy, sx, sy, s) => ({
    scale: s,
    x: wx - (sx - w / 2) / s,
    y: wy - (sy - h / 2) / s,
});
//#end
//#end
//#step 4

//#part ease
let target = { ...view.value }; // the view being eased toward
let anchor = { x: 0, y: 0 };    // the screen point a zoom keeps fixed
let moving = false;

function frame() {
    const v = view.value;
    const close = Math.abs(Math.log(target.scale / v.scale)) < 0.002
        && Math.hypot(target.x - v.x, target.y - v.y) * v.scale < 0.4;
    if (close) { view.value = { ...target }; moving = false; return; }

    const k = 0.18; // the fraction of the remaining distance covered each frame
    const from = toWorld(anchor.x, anchor.y, v), to = toWorld(anchor.x, anchor.y, target);
    const s = v.scale * Math.pow(target.scale / v.scale, k);
    view.value = placeAt(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, anchor.x, anchor.y, s);
    requestAnimationFrame(frame);
}

function steer(next, sx, sy) {
    target = next;
    anchor = { x: sx, y: sy };
    if (!moving) { moving = true; requestAnimationFrame(frame); }
}
//#end
//#end
//#step 2

//#part drag
let last = null; // the pointer's previous position while it is pressed
//#step 5
let velocity = { x: 0, y: 0 }; // how far the last move of the drag went
//#end

element.onpointerdown = e => {
    last = at(e);
    element.setPointerCapture(e.pointerId);
//#step 5
    velocity = { x: 0, y: 0 };
//#end
};
element.onpointermove = e => {
    if (!last) return;
    const p = at(e), dx = p.x - last.x, dy = p.y - last.y, v = view.value;
    last = p;
//#until 4
    view.value = { ...v, x: v.x - dx / v.scale, y: v.y - dy / v.scale };
//#end
//#step 4
    // a drag moves the view and its target together, with no easing
    target = view.value = { ...v, x: v.x - dx / v.scale, y: v.y - dy / v.scale };
//#end
//#step 5
    velocity = { x: dx, y: dy };
//#end
};
//#until 5
element.onpointerup = () => last = null;
//#end
//#step 5
element.onpointerup = () => {
    last = null;
    requestAnimationFrame(coast);
};
//#end
//#end
//#end
//#step 5

//#part fling
// after release: keep moving by the drag's last step, 6% less each frame
function coast() {
    if (last || Math.hypot(velocity.x, velocity.y) < 0.3) return;
    const v = view.value;
    target = view.value = { ...v, x: v.x - velocity.x / v.scale, y: v.y - velocity.y / v.scale };
    velocity = { x: velocity.x * 0.94, y: velocity.y * 0.94 };
    requestAnimationFrame(coast);
}
//#end
//#end
//#step 3

//#part wheel
// zoom only while Ctrl is held (a trackpad pinch also sets ctrlKey),
// so plain scrolling still scrolls the page
element.onwheel = e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const p = at(e);
//#until 4
    const under = toWorld(p.x, p.y);
    const s = Math.min(8, Math.max(0.25, view.value.scale * Math.exp(-e.deltaY * 0.004)));
    view.value = placeAt(under.x, under.y, p.x, p.y, s);
//#end
//#step 4
    const under = toWorld(p.x, p.y, target);
    const s = Math.min(8, Math.max(0.25, target.scale * Math.exp(-e.deltaY * 0.004)));
    steer(placeAt(under.x, under.y, p.x, p.y, s), p.x, p.y);
//#end
};

function Button(text, onclick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.onclick = onclick;
    return button;
}
// the buttons zoom about the middle of the canvas
const zoomBy = factor => {
//#until 4
    const mid = toWorld(w / 2, h / 2);
    view.value = placeAt(mid.x, mid.y, w / 2, h / 2, view.value.scale * factor);
//#end
//#step 4
    const mid = toWorld(w / 2, h / 2, target);
    steer(placeAt(mid.x, mid.y, w / 2, h / 2, target.scale * factor), w / 2, h / 2);
//#end
};
const row = document.createElement("div");
row.className = "row";
row.append(Button("Zoom in", () => zoomBy(2)), Button("Zoom out", () => zoomBy(0.5)));
document.body.append(row);
//#end
//#end
