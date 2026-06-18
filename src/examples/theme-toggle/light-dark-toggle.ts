//light-dark-toggle.ts

import "./light-dark-toggle.css"

export function LightDarkToggle(): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "toggleWrapper";
    el.innerHTML = `
  <input class="input" id="dn" type="checkbox" />
  <label class="toggle" for="dn">
    <span class="toggle__handler">
      <span class="crater crater--1"></span>
      <span class="crater crater--2"></span>
      <span class="crater crater--3"></span>
    </span>
    <span class="star star--1"></span>
    <span class="star star--2"></span>
    <span class="star star--3"></span>
    <span class="star star--4"></span>
    <span class="star star--5"></span>
    <span class="star star--6"></span>
  </label>
    `;
    return el;
}