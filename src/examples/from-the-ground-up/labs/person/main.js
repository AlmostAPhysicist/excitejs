import { Observable, Reactor } from "excitejs";

const first = Observable("Ada");
const last = Observable("Lovelace");

const button = document.createElement("button");
button.textContent = "Change both names";
const list = document.createElement("ol");
document.body.append(button, list);

//#part write
button.onclick = () => {
    const ada = first.value === "Ada";
    first.value = ada ? "Grace" : "Ada";
    last.value = ada ? "Hopper" : "Lovelace";
};
//#end

//#part react
// adds one line to the list each time it runs
Reactor(() => {
    const line = document.createElement("li");
    line.textContent = `${first.value} ${last.value}`;
    list.append(line);
});
//#end
