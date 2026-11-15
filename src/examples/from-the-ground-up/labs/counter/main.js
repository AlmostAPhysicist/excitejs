import { Observable, Reactor } from "excitejs";

//#part elements
const button = document.createElement("button");
button.textContent = "Press me";
const output = document.createElement("output");
document.body.append(button, output);
//#end

//#part state
const count = Observable(0);
//#end

//#part react
Reactor(() => {
    output.textContent = `count is ${count.value}`;
});
//#end

//#part write
button.onclick = () => count.value++;
//#end
