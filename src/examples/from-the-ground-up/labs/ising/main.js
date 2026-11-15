//#step 2
import { Observable, Reactor } from "excitejs";
//#end
import { colors } from "hubble";
import { Canvas } from "./canvas.js";

const { element, ctx, w, h } = Canvas(320, 320);
document.body.append(element);

//#part lattice
const N = 96; // N × N spins, one byte each, row after row
const spins = new Int8Array(N * N).map(() => (Math.random() < 0.5 ? 1 : -1));
//#step 2
const sweeps = Observable(0); // how many sweeps have run
//#end
//#end

//#part pixels
// one pixel per spin, in an N × N image that is then drawn enlarged
const image = new ImageData(N, N);
const pixels = new Uint32Array(image.data.buffer); // each pixel as one 32-bit number
const small = document.createElement("canvas");
small.width = small.height = N;
// "#rrggbb" → that color as a 32-bit pixel
const pixel = hex => {
    const n = parseInt(hex.slice(1), 16);
    return (255 << 24 | (n & 255) << 16 | (n >> 8 & 255) << 8 | n >> 16) >>> 0;
};

function paint() {
//#step 2
    sweeps.value; // read, so that the Reactor below repaints after every sweep
//#end
    const c = colors.value, up = pixel(c.up), down = pixel(c.down);
    for (let k = 0; k < spins.length; k++) pixels[k] = spins[k] > 0 ? up : down;
    small.getContext("2d").putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = false; // enlarged pixels stay sharp squares
    ctx.drawImage(small, 0, 0, w, h);
}
//#until 2
paint();
//#end
//#step 2
Reactor(paint);
//#end
//#end
//#step 2

//#part temperature
const temperature = Observable(2.2);
const label = document.createElement("label");
const slider = document.createElement("input");
slider.type = "range";
slider.min = 0.5; slider.max = 4; slider.step = 0.01;
slider.value = temperature.value;
slider.oninput = () => temperature.value = Number(slider.value);
const readout = document.createElement("code");
Reactor(() => {
    readout.textContent = `T = ${temperature.value.toFixed(2)}, sweep ${sweeps.value}`;
});
label.append(slider, readout);
document.body.append(label);
//#end
//#step 3

//#part odds
// The cost of a flip is 2 · spin · (sum of the 4 neighbours). A spin is ±1
// and the sum is −4, −2, 0, 2 or 4, so there are ten possible costs. Their
// probabilities are stored in a list, rebuilt when the temperature changes.
let odds = [];
Reactor(() => {
    const T = temperature.value;
    odds = [];
    for (const s of [-1, 1]) for (let around = -4; around <= 4; around += 2) {
        const cost = 2 * s * around;
        odds.push(cost <= 0 ? 1 : Math.exp(-cost / T));
    }
});
//#end
//#end

//#part sweep
// one sweep: as many flip attempts as there are spins
function sweep() {
//#until 3
    const T = temperature.value;
//#end
    for (let n = 0; n < N * N; n++) {
        const i = Math.floor(Math.random() * N), j = Math.floor(Math.random() * N);
        const s = spins[i * N + j];
        const around = spins[((i + 1) % N) * N + j] + spins[((i + N - 1) % N) * N + j]
            + spins[i * N + (j + 1) % N] + spins[i * N + (j + N - 1) % N]; // % N: the edges wrap around
//#until 3
        const cost = 2 * s * around; // the energy this flip would cost
        if (cost <= 0 || Math.random() < Math.exp(-cost / T)) spins[i * N + j] = -s;
//#end
//#step 3
        if (Math.random() < odds[(s > 0 ? 5 : 0) + (around + 4) / 2]) spins[i * N + j] = -s;
//#end
    }
}
//#end

//#part loop
function frame() {
    sweep();
    sweeps.value++; // one write per frame, after thousands of changes to the array
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
//#end
//#end
