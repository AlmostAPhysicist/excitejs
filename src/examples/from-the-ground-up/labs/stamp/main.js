import { Observable, Reactor } from "excitejs";

const shape = Observable("square");

const board = document.createElement("div");
board.className = "board";
const count = document.createElement("p");
const next = document.createElement("button");
next.textContent = "Next shape";
next.onclick = () => {
    shape.value = shape.value === "square" ? "circle" : "square";
};
document.body.append(board, count, next);

//#part stamper
const stamper = Reactor(() => {
    const stamp = document.createElement("div");
    stamp.className = "stamp " + shape.value;
    board.append(stamp);
    count.textContent = `stamps on the board: ${board.children.length}`;
//#step 2

    return () => stamp.remove();
//#end
});
//#end
//#step 3

function Button(text, onclick) {
    const button = document.createElement("button");
    button.className = "quiet";
    button.textContent = text;
    button.onclick = onclick;
    return button;
}
document.body.append(
    Button("stamper.dispose()", () => stamper.dispose()),
    Button("stamper.react()", () => stamper.react()),
);
//#end
