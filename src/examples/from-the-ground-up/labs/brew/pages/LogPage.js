//#step 7
import { Reactor } from "excitejs";
import { log } from "../state.js";

export function LogPage() {
    const node = document.createElement("section");
    const empty = document.createElement("p");
    empty.textContent = "Nothing brewed yet. Finish a cup and it shows up here.";
    const list = document.createElement("ol");
    node.append(empty, list);

    const render = Reactor(() => {
        empty.hidden = log.value.length > 0;
        list.replaceChildren(...log.value.map(entry => {
            const li = document.createElement("li");
            li.textContent = `${entry.tea}, at ${entry.at}`;
            return li;
        }));
    });

    // a page that can be taken down hands back how
    return { node, dispose: () => render.dispose() };
}
//#end
