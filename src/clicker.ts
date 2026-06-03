import { Observable } from "./core/Observable";
import { Reactor } from "./core/Reactor";

export function Clicker() {
    const count = Observable(0);
    function handleClick() { count.value += 1; }

    const button = document.createElement("button");
    button.onclick = handleClick;

    Reactor(() => {
        button.innerText = `Clicks: ${count.value}`;
    });

    return button;
}