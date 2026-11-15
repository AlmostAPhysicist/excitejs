import { Observable, Reactor } from "excitejs";
import { Camera } from "pan-zoom";
import { Lattice, LatticeLayer, acceptanceTable, step } from "ising";

const stage = document.createElement("div");
stage.className = "stage";
const canvas = document.createElement("canvas");
stage.append(canvas);
document.body.append(stage);

//#part state
const lattice = Observable(Lattice(128)); // the spins, their flip times, running totals
const tick = Observable(0);               // incremented after each frame's flips
const temperature = Observable(2.1);

let odds = acceptanceTable(temperature.value, 0, "metropolis");
const retable = Reactor(() => { odds = acceptanceTable(temperature.value, 0, "metropolis"); });
//#end

//#part view
const camera = Camera(stage, {
    view: { x: 64, y: 64, scale: 5 },
    min_scale: 2, max_scale: 140,
    auto_advance: false,
});
LatticeLayer(camera, canvas, { lattice, tick });
//#end

//#part loop
function frame(now) {
    camera.advance(now);
    step(lattice.value, 0.05, odds, now);
    tick.value++;
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
//#end
