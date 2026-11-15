//#step 6
import { Reactor } from "excitejs";
import { picked, seconds_left } from "../state.js";

export function Cup() {
    const cup = document.createElement("div");
    cup.className = "cup";

    Reactor(() => {
        const tea = picked.value;
        const steeped = 1 - seconds_left.value / tea.seconds; // 0 fresh water … 1 ready
        cup.style.setProperty("--tea", tea.color);
        cup.style.setProperty("--steeped", steeped);
    });

    return cup;
}
//#end
