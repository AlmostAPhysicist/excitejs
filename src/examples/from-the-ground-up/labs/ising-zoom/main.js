import { Observable, Reactor } from "excitejs";
import { Camera, Layer } from "pan-zoom";
import { colors } from "hubble";
import { N, spins, flipped, sweep, setTemperature } from "./physics.js";
import { detailAt, drawSpin } from "./sprites.js";

//#part stage
const stage = document.createElement("div");
stage.className = "stage";
const canvas = document.createElement("canvas");
stage.append(canvas);
const slider = document.createElement("input");
slider.type = "range";
slider.min = 0.5; slider.max = 4; slider.step = 0.01;
document.body.append(stage, slider);
//#end

//#part state
const clock = Observable(0); // the time the picture is drawn for, ms
const temperature = Observable(2.1);
slider.value = temperature.value;
slider.oninput = () => temperature.value = Number(slider.value);
const retable = Reactor(() => setTemperature(temperature.value));
//#end

//#part camera
// One world unit is one spin, so the camera's scale is pixels per spin.
// auto_advance: false, because the frame loop below calls camera.advance().
const camera = Camera(stage, {
    view: { x: N / 2, y: N / 2, scale: 9 },
    min_scale: 6, max_scale: 140,
    auto_advance: false,
});
//#end

//#part paint
Layer(camera, canvas, {
    deps: [clock, colors], // repaint when time moves on, or the palette changes
    paint(brush, world, screen) {
        const { ctx, scale } = brush, c = colors.value;
        const detail = detailAt(scale), now = clock.value;
        ctx.fillStyle = c.ui2;
        ctx.fillRect(screen.x0, screen.y0, screen.x1 - screen.x0, screen.y1 - screen.y0);

        // the spins inside the region to paint; outside 0…N the lattice repeats
        for (let i = Math.floor(world.y0); i < world.y1; i++) for (let j = Math.floor(world.x0); j < world.x1; j++) {
            const k = ((i % N + N) % N) * N + (j % N + N) % N;
            const p = brush.toScreen(j, i);
            drawSpin(ctx, c, p.x, p.y, scale, spins[k], Math.max(0, now - flipped[k]), detail);
        }
    },
});
//#end

//#part loop
function frame(now) {
    camera.advance(now); // input → view
    sweep(0.02, now);    // a fiftieth of a sweep per frame, so single flips can be followed
    clock.value = now;   // one write: the Layer repaints
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
//#end
