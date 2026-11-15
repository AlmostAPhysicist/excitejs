import { Observable, Reactor } from "excitejs";

const items = Observable([]);

const add = document.createElement("button");
add.textContent = "Add an item";
const list = document.createElement("ul");
document.body.append(add, list);

add.onclick = () => {
//#starter
    items.value.push(`item ${items.value.length + 1}`); // the bug is on this line
//#end
//#solution
    items.value = [...items.value, `item ${items.value.length + 1}`]; // a new array, assigned
//#end
};

Reactor(() => {
    list.replaceChildren(...items.value.map(text => {
        const li = document.createElement("li");
        li.textContent = text;
        return li;
    }));
});
