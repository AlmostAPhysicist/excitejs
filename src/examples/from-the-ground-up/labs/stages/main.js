//#until 2
import { Observable, Reactor } from "excitejs";
//#end
//#step 2
import { Observable, Reactor, Scheduler } from "excitejs";

//#part stages
const scheduler = Scheduler();
//#step 3
const compute = scheduler.getOrCreate("compute"); // created first, so it runs first
//#end
const render = scheduler.getOrCreate("render");
//#end
//#end

const first = Observable("Ada");
const last = Observable("Lovelace");
//#step 3
const full = Observable("Ada Lovelace");
//#end

const button = document.createElement("button");
button.textContent = "Change both names";
const list = document.createElement("ol");
document.body.append(button, list);

button.onclick = () => {
    const ada = first.value === "Ada";
    first.value = ada ? "Grace" : "Ada";
    last.value = ada ? "Hopper" : "Lovelace";
};
//#step 3

//#part compute
Reactor(() => {
    full.value = `${first.value} ${last.value}`;
}, { reaction_schedule: compute });
//#end
//#end

//#part render
// adds one line to the list each time it runs
Reactor(() => {
    const line = document.createElement("li");
//#until 3
    line.textContent = `${first.value} ${last.value}`;
//#end
//#step 3
    line.textContent = full.value;
//#end
    list.append(line);
//#until 2
});
//#end
//#step 2
}, { reaction_schedule: render });
//#end
//#end
