//preact-usage.ts

import { Observable, Reactor } from "./index";

export function PreactUsage() {
    const elapsed = Observable(0.0);
    const interval = Observable(1000);

    Reactor(() => {
        const id = setInterval(() => elapsed.value++, interval.value);
        return () => clearInterval(id);
    });

    // UI 
    // add container div
    const div = document.createElement("div");

    // text 
    const text = document.createElement("p");
    Reactor(() => {
        text.innerText = `Elapsed: ${elapsed.value}\nInterval: ${interval.value}ms`;
    });
    const button1 = document.createElement("button");
    button1.innerText = "Slow Down";
    button1.onclick = () => { interval.value *= 2; };

    const button2 = document.createElement("button");
    button2.innerText = "Speed Up";
    button2.onclick = () => { interval.value /= 2; };

    // append elements to the container
    div.appendChild(text);
    div.appendChild(button1);
    div.appendChild(button2);

    return div;
}
