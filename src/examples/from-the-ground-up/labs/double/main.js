import { Observable, Reactor } from "excitejs";

const button = document.createElement("button");
button.textContent = "Press me";
const output = document.createElement("output");
const twice = document.createElement("output");
document.body.append(button, output, twice);

const count = Observable(0);

Reactor(() => {
    output.textContent = `count is ${count.value}`;
});
//#starter

// Your code here: keep `twice` showing "twice is …", double the count.
//#end
//#solution

Reactor(() => {
    twice.textContent = `twice is ${count.value * 2}`;
});
//#end

button.onclick = () => count.value++;
