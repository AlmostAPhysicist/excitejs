//toggle.ts

import "./toggle.css";

export function Toggle(): HTMLLabelElement {
    const label = document.createElement("label");
    label.className = "switch";

    label.innerHTML = `
        <input type="checkbox">
        <span class="slider"></span>
    `;

    return label;
}