//loader.ts

import "./loader.css";

export function Loader(): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "loader";
    return el;
}