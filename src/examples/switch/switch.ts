//switch.ts

import "./switch.css";

export function Switch(): HTMLLabelElement {
    const label = document.createElement("label");
    label.className = "switch";

    label.innerHTML = `
        <input class="toggle" type="checkbox" />
        <span class="slider"></span>
        <span class="card-side"></span>
    `;

    return label;
}