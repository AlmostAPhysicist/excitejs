//page.ts
import { LightDarkToggle } from "../theme-toggle/light-dark-toggle";
import { Reactor, Observable } from "../../core/index";
import "./page.css";

export function Page(): HTMLDivElement {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const themeObservable = Observable("light");

    const page = document.createElement("div");
    // Reactor to handle theme switching
    Reactor(() => {
        const theme = themeObservable.value;
        page.className = `page ${theme}`;
        // Add this line to update the toggle's state
        input.checked = theme === "dark";
    });

    // Wrapper for the toggle
    const toggleWrapper = document.createElement("div");
    toggleWrapper.className = "toggle-wrapper-top-right";

    const toggle = LightDarkToggle();
    const input = toggle.querySelector("input") as HTMLInputElement;

    toggleWrapper.appendChild(toggle);
    // Event listener to trigger reaction
    input.addEventListener("change", () => {
        themeObservable.value = input.checked ? "dark" : "light";
    });

    page.appendChild(toggleWrapper);

    const content = document.createElement("div");
    content.className = "content";
    content.innerHTML = `
    <h1 style="margin-bottom: 20px;">Themed Page</h1>
    <p>Toggle the switch to change the theme.</p>
  `;
    page.appendChild(content);

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", (event) => {
        input.click();
    });

    if (prefersDark) {
        input.click();
    }

    return page;
}


