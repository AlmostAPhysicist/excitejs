//#step 4
import { Reactor } from "excitejs";
//#until 5
import { seconds_left } from "../state.js";
//#end
//#step 5
import { brewing, seconds_left } from "../state.js";
//#end

const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function Timer() {
    const box = document.createElement("div");
    box.className = "timer";

    const time = document.createElement("output");
    Reactor(() => { time.textContent = clock(seconds_left.value); });
    box.append(time);
//#step 5

    const start = document.createElement("button");
    start.onclick = () => brewing.value = !brewing.value;
    Reactor(() => {
        const done = seconds_left.value === 0;
        start.textContent = done ? "Ready!" : brewing.value ? "Pause" : "Brew";
        start.disabled = done;
    });
    box.append(start);
//#end

    return box;
}
//#end
