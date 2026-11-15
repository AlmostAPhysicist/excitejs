import { Reactor } from "excitejs";
import { Camera, Layer } from "pan-zoom";
import { colors } from "hubble";

//#part stage
// the element the camera listens on, and a canvas filling it
const stage = document.createElement("div");
stage.className = "stage";
const canvas = document.createElement("canvas");
stage.append(canvas);
const readout = document.createElement("p");
document.body.append(stage, readout);
//#end

//#part camera
const camera = Camera(stage, { min_scale: 0.2, max_scale: 20 });
//#end

//#part paint
const SHAPES = [
    { x: -120, y: -40, r: 50, color: "blue" },
    { x: 60, y: 30, r: 70, color: "orange" },
    { x: 200, y: -80, r: 30, color: "green" },
    { x: -40, y: 120, r: 40, color: "purple" },
];

Layer(camera, canvas, {
    deps: [colors],
    paint(brush, world, screen) {
        const { ctx } = brush, c = colors.value;
        ctx.fillStyle = c.bg2;
        ctx.fillRect(screen.x0, screen.y0, screen.x1 - screen.x0, screen.y1 - screen.y0);

        brush.useWorld(); // from here on, coordinates are world units
        for (const s of SHAPES) {
            ctx.fillStyle = c[s.color];
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, 7);
            ctx.fill();
        }
    },
});
//#end

//#part read
Reactor(() => {
    const v = camera.view.value;
    readout.textContent = `looking at (${v.x.toFixed(0)}, ${v.y.toFixed(0)}), ${v.scale.toFixed(2)} px per unit, moved by: ${camera.last_input.value}`;
});

Reactor(() => {
    const tap = camera.tap.value;
    if (tap) console.log(`tap at world (${tap.x.toFixed(0)}, ${tap.y.toFixed(0)})`);
});
//#end

//#part move
const home = document.createElement("button");
home.textContent = "camera.goHome()";
home.onclick = () => camera.goHome();
document.body.append(home);
//#end
