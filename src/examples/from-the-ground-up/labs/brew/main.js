//#until 7
//#step 2
//#until 3
import { Reactor } from "excitejs";
import { picked } from "./state.js";
//#end
//#end
//#step 3
import { TEAS } from "./state.js";
import { TeaCard } from "./components/TeaCard.js";
//#end
//#step 6
import { Cup } from "./components/Cup.js";
//#end
//#step 4
import { Timer } from "./components/Timer.js";
//#end

const app = document.querySelector("#app");

const title = document.createElement("h1");
title.textContent = "Brew";
app.append(title);
//#step 2
//#until 3

const note = document.createElement("p");
Reactor(() => {
    note.textContent = `Picked: ${picked.value.name}, ${picked.value.seconds} seconds`;
});
app.append(note);
//#end
//#end
//#step 3

const teas = document.createElement("div");
teas.className = "teas";
teas.append(...TEAS.map(TeaCard));
app.append(teas);
//#end
//#step 6
app.append(Cup());
//#end
//#step 4
app.append(Timer());
//#end
//#end
//#step 7
import { Observable, Reactor } from "excitejs";
import { BrewPage } from "./pages/BrewPage.js";
import { LogPage } from "./pages/LogPage.js";

const app = document.querySelector("#app");

const title = document.createElement("h1");
title.textContent = "Brew";
const nav = document.createElement("nav");
nav.innerHTML = `<a href="#/">Brew</a><a href="#/log">Log</a>`;
app.append(title, nav);

//#part route
// the address, as an Observable
const route = Observable(location.hash || "#/");
window.addEventListener("hashchange", () => route.value = location.hash || "#/");
//#end

//#part links
for (const link of nav.children) {
    Reactor(() => link.classList.toggle("is-here", link.getAttribute("href") === route.value));
}
//#end

//#part router
const brew_page = BrewPage(); // built once and kept, so the timer survives a visit to the log

Reactor(() => {
    if (route.value === "#/log") {
        const log_page = LogPage();
        app.append(log_page.node);
        return () => { log_page.node.remove(); log_page.dispose(); };
    }
    app.append(brew_page);
    return () => brew_page.remove();
});
//#end
//#end
