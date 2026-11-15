//#step 3
import { Reactor } from "excitejs";
import { picked } from "../state.js";

export function TeaCard(tea) {
//#part element
    const card = document.createElement("button");
    card.className = "tea";
    card.style.setProperty("--tea", tea.color);
    card.innerHTML = `<b>${tea.name}</b><small>${tea.seconds / 60} min</small>`;
//#end

//#part out
    card.onclick = () => picked.value = tea;
//#end

//#part in
    Reactor(() => card.classList.toggle("is-picked", picked.value === tea));
//#end

    return card;
}
//#end
