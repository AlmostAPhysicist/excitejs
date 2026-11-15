import { Observable, Reactor } from "excitejs";

const logged_in = Observable(false);
const user_name = Observable("Ada");

function greet() {
    if (logged_in.value) console.log(`Welcome, ${user_name.value}`);
    else console.log("Please log in");
}

//#part greeter
//#until 2
const greeter = Reactor(greet);
//#end
//#step 2
//#until 3
const greeter = Reactor(greet, { deps: [logged_in] });
//#end
//#end
//#step 3
//#until 4
const greeter = Reactor(greet, { deps: [logged_in], initFn: true });
//#end
//#end
//#step 4
const greeter = Reactor(greet);
//#end
//#end

document.querySelector("#login").onclick = () => {
    logged_in.value = !logged_in.value;
};
document.querySelector("#rename").onclick = () => {
    user_name.value = user_name.value === "Ada" ? "Grace" : "Ada";
};
//#step 4
document.querySelector("#auto").onclick = () => {
    greeter.auto_deps = !greeter.auto_deps;
    console.log(`auto_deps: ${greeter.auto_deps}`);
};
//#end
