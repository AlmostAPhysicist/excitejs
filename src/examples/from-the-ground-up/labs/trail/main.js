import { Observable, Reactor, Scheduler } from "excitejs";

const pad = document.createElement("div");
pad.className = "pad";
const dot = document.createElement("i");
pad.append(dot);
const counts = document.createElement("p");

//#part stage
// a stage that waits to be flushed (false = manual), in a Scheduler of its own
const input = Scheduler();
const each_frame = input.getOrCreate("each frame", false);
//#end

//#part note
const pointer = Observable({ x: 40, y: 70 });
let moves = 0, applied = 0;

function onMove(x, y) {
    moves++;
    pointer.value = { x, y }; // only stores the position
}
pad.onpointermove = e => onMove(e.offsetX, e.offsetY);
//#end

//#part apply
const follow = Reactor(() => {
    applied++;
    dot.style.transform = `translate(${pointer.value.x}px, ${pointer.value.y}px)`;
    counts.textContent = `${moves} moves heard, applied ${applied} times`;
}, { reaction_schedule: each_frame });
//#end

//#part frame
function frame() {
    input.flush(each_frame); // once per animation frame
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
//#end

const burst = document.createElement("button");
burst.textContent = "500 moves at once";
burst.onclick = () => {
    for (let k = 0; k < 500; k++) onMove(40 + k * 0.5, 70 + 40 * Math.sin(k / 30));
};
document.body.append(pad, counts, burst);
