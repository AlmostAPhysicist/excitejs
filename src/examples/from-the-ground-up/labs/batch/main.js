//#starter
import { Observable, Reactor } from "excitejs";
//#end
//#solution
import { Observable, Reactor, Scheduler } from "excitejs";

const render = Scheduler().getOrCreate("render");
//#end

const red = Observable(120);
const green = Observable(160);
const blue = Observable(200);

const swatch = document.createElement("div");
swatch.className = "swatch";

//#starter
// One click writes three Observables, so this runs three times.
// Make it run once per click.
const paint = Reactor(() => {
    swatch.style.background = `rgb(${red.value} ${green.value} ${blue.value})`;
    console.log("painted");
});
//#end
//#solution
const paint = Reactor(() => {
    swatch.style.background = `rgb(${red.value} ${green.value} ${blue.value})`;
    console.log("painted");
}, { reaction_schedule: render });
//#end

const any = () => Math.floor(Math.random() * 256);
const button = document.createElement("button");
button.textContent = "Another color";
button.onclick = () => {
    red.value = any();
    green.value = any();
    blue.value = any();
};

document.body.append(swatch, button);
