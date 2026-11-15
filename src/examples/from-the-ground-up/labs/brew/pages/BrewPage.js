//#step 7
import { TEAS } from "../state.js";
import { TeaCard } from "../components/TeaCard.js";
import { Cup } from "../components/Cup.js";
import { Timer } from "../components/Timer.js";

export function BrewPage() {
    const page = document.createElement("section");
    const teas = document.createElement("div");
    teas.className = "teas";
    teas.append(...TEAS.map(TeaCard));
    page.append(teas, Cup(), Timer());
    return page;
}
//#end
