import { Observable, Reactor } from "excitejs";

const ticks = Observable(0);
setInterval(() => ticks.value++, 800);

const label = document.createElement("h2");
const display = Reactor(() => {
    label.textContent = `tick ${ticks.value}`;
});

function Button(text, onclick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.onclick = onclick;
    return button;
}

const row = document.createElement("div");
row.className = "row";
row.append(
    Button("paused = !paused", () => display.paused = !display.paused),
    Button("dispose()", () => display.dispose()),
    Button("react()", () => display.react()),
);
document.body.append(label, row);
