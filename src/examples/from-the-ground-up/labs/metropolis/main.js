import { colors } from "hubble";
import { Canvas } from "./canvas.js";

// Returns true if a flip should happen.
// cost: the energy the flip would cost. T: the temperature.
function accepts(cost, T) {
//#starter
    // Your code here. For now every flip is accepted.
    return true;
//#end
//#solution
    return cost <= 0 || Math.random() < Math.exp(-cost / T);
//#end
}
window.accepts = accepts; // the exercise's check calls it

const { element, ctx, w, h } = Canvas(320, 320);
document.body.append(element);

const N = 64, T = 1.5;
const spins = new Int8Array(N * N).map(() => (Math.random() < 0.5 ? 1 : -1));

function frame() {
    for (let n = 0; n < N * N; n++) {
        const i = Math.floor(Math.random() * N), j = Math.floor(Math.random() * N);
        const s = spins[i * N + j];
        const around = spins[((i + 1) % N) * N + j] + spins[((i + N - 1) % N) * N + j]
            + spins[i * N + (j + 1) % N] + spins[i * N + (j + N - 1) % N];
        if (accepts(2 * s * around, T)) spins[i * N + j] = -s;
    }
    const c = colors.value, cell = w / N;
    ctx.fillStyle = c.down;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = c.up;
    for (let k = 0; k < spins.length; k++) {
        if (spins[k] > 0) ctx.fillRect((k % N) * cell, Math.floor(k / N) * cell, cell + 0.5, cell + 0.5);
    }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
