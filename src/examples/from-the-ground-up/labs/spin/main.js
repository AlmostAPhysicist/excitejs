//#step 2
import { Observable, Reactor } from "excitejs";
//#end
import { colors } from "hubble";
import { Canvas } from "./canvas.js";

const { element, ctx, w, h, at } = Canvas(640, 260);
document.body.append(element);
//#step 2

function Slider(text, value, min, max, step = 1) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "range";
    input.min = min; input.max = max; input.step = step;
    input.value = value.value;
    input.oninput = () => value.value = Number(input.value);
    label.append(text, input);
    return label;
}
//#end

//#part arrow
// an arrow `length` long, centred on (cx, cy), rotated by `angle` radians (0 points up)
function drawArrow(cx, cy, length, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.lineWidth = length * 0.08;
    ctx.lineCap = "round";
    ctx.beginPath(); // the shaft
    ctx.moveTo(0, length * 0.3);
    ctx.lineTo(0, -length * 0.1);
    ctx.stroke();
    ctx.beginPath(); // the head
    ctx.moveTo(0, -length * 0.34);
    ctx.lineTo(-length * 0.17, -length * 0.06);
    ctx.lineTo(length * 0.17, -length * 0.06);
    ctx.fill();
    ctx.restore();
}
//#end
//#until 2

//#part paint
ctx.strokeStyle = ctx.fillStyle = colors.value.tx;
drawArrow(w / 2, h / 2, 140, 0);
//#end
//#end
//#step 2
//#until 3

//#part state
const angle = Observable(0); // degrees
document.body.append(Slider("angle", angle, 0, 360));
//#end
//#end
//#end
//#step 3

//#part state
//#until 6
const spin = Observable(1); // +1 is up, −1 is down
let flipped_at = -1e9;      // the time of its last flip, ms
//#end
//#step 6
const N = 24;               // a lattice of N × N spins
const spins = new Int8Array(N * N).map(() => (Math.random() < 0.5 ? 1 : -1));
const flipped = new Float64Array(N * N).fill(-1e9); // the time of each spin's last flip
//#end
const clock = Observable(0); // the time the picture is drawn for, ms
//#step 5
const px = Observable(70);   // the side of one spin's cell, in pixels
document.body.append(Slider("pixels per spin", px, 4, 110));
//#end

element.onclick = e => {
//#until 6
    spin.value = -spin.value;
    flipped_at = performance.now();
//#end
//#step 6
    const p = at(e);
    const k = (Math.floor(p.y / px.value) % N) * N + Math.floor(p.x / px.value) % N;
    spins[k] *= -1;
    flipped[k] = performance.now();
//#end
    startTurning();
};
//#end

//#part turn
const FLIP_MS = 420; // how long an arrow takes to turn over

// the angle of a spin's arrow, `age` ms after it flipped
function arrowAngle(s, age) {
    const rest = s > 0 ? 0 : Math.PI;
    if (age >= FLIP_MS) return rest;
    const p = age / FLIP_MS;                 // 0 at the flip, 1 when settled
    return rest + Math.PI * (1 - p) ** 3;    // half a turn away at first, slowing as it arrives
}

// After a flip the picture changes for FLIP_MS, so the clock is moved forward
// every frame for that long, and then left alone.
let turning_until = 0;
function startTurning() {
    const running = performance.now() < turning_until;
    turning_until = performance.now() + FLIP_MS;
    if (!running) requestAnimationFrame(advance);
}
function advance() {
    clock.value = performance.now();
    if (clock.value < turning_until) requestAnimationFrame(advance);
}
//#end
//#end
//#step 5

//#part detail
// 0 below 16 px per spin, 1 above 46 px, a smooth curve in between
function detailAt(pixels) {
    const t = Math.min(1, Math.max(0, (pixels - 16) / (46 - 16)));
    return t * t * (3 - 2 * t);
}
//#end
//#end
//#step 4

//#part bubble
//#until 5
// a disc in the spin's color: ink for up, paper for down.
// During a flip the old color is drawn first and the new one over it.
function drawBubble(cx, cy, width, s, age) {
    const c = colors.value, p = Math.min(1, age / FLIP_MS);
    ctx.beginPath();
    ctx.arc(cx, cy, width / 2, 0, 7);
    ctx.fillStyle = s > 0 ? c.down : c.up; // the color before the flip
    ctx.fill();
    ctx.globalAlpha = p;
    ctx.fillStyle = s > 0 ? c.up : c.down; // the color after it
    ctx.fill();
    ctx.globalAlpha = 1;
    // the arrow is drawn in the opposite color of whichever fill dominates
    ctx.strokeStyle = ctx.fillStyle = (p > 0.5) === (s > 0) ? c.down : c.up;
}
//#end
//#step 5
// one spin, in the square cell whose top-left corner is (x, y).
// detail 0: a flat square filling the cell. detail 1: a disc with an arrow.
function drawSpin(x, y, width, s, age, detail) {
    const c = colors.value, p = Math.min(1, age / FLIP_MS);
    const gap = detail * 0.09 * width, side = width - 2 * gap;
    ctx.beginPath();
    ctx.roundRect(x + gap, y + gap, side, side, detail * side / 2); // corner radius 0 is a square, side / 2 a circle
    ctx.fillStyle = s > 0 ? c.down : c.up; // the color before the flip
    ctx.fill();
    ctx.globalAlpha = p;
    ctx.fillStyle = s > 0 ? c.up : c.down; // the color after it
    ctx.fill();
    ctx.globalAlpha = 1;
    if (detail === 0) return;

    ctx.globalAlpha = detail; // the arrow's opacity follows detail
    ctx.strokeStyle = ctx.fillStyle = (p > 0.5) === (s > 0) ? c.down : c.up;
    drawArrow(x + width / 2, y + width / 2, side, arrowAngle(s, age));
    ctx.globalAlpha = 1;
}
//#end
//#end
//#end
//#step 2

//#part paint
Reactor(() => {
    const c = colors.value;
//#until 4
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = ctx.fillStyle = c.tx;
//#end
//#step 4
    ctx.fillStyle = c.ui2;
    ctx.fillRect(0, 0, w, h);
//#end
//#until 3
    drawArrow(w / 2, h / 2, 140, angle.value * Math.PI / 180);
//#end
//#step 3
//#until 6
    const age = Math.max(0, clock.value - flipped_at);
//#end
//#until 4
    drawArrow(w / 2, h / 2, 140, arrowAngle(spin.value, age));
//#end
//#end
//#step 4
//#until 5
    drawBubble(w / 2, h / 2, 170, spin.value, age);
    drawArrow(w / 2, h / 2, 140, arrowAngle(spin.value, age));
//#end
//#end
//#step 5
//#until 6
    const s = px.value;
    drawSpin(w / 2 - s / 2, h / 2 - s / 2, s, spin.value, age, detailAt(s));
//#end
//#end
//#step 6
    const s = px.value, detail = detailAt(s), now = clock.value;
    for (let i = 0; i * s < h; i++) for (let j = 0; j * s < w; j++) {
        const k = (i % N) * N + (j % N); // past the lattice's edge it repeats
        drawSpin(j * s, i * s, s, spins[k], Math.max(0, now - flipped[k]), detail);
    }
//#end
});
//#end
//#end
