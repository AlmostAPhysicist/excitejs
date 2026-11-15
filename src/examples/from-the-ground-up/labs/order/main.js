import { Observable, Reactor, moveToTop } from "excitejs";

const bell = Observable(0);

Reactor(() => console.log("first"), { deps: [bell] });
Reactor(() => console.log("second"), { deps: [bell] });
const third = Reactor(() => console.log("third"), { deps: [bell] });

function Button(text, onclick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.onclick = onclick;
    return button;
}
document.body.append(
    Button("bell.value++", () => bell.value++),
    Button("moveToTop(bell.reactors, third)", () => moveToTop(bell.reactors, third)),
);
