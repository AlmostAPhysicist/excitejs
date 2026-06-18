import "./circle.css";

type CircleColor = "blue" | "red";
type CircleAnim = "in" | "out";

export function Circle(color: CircleColor, anim: CircleAnim): HTMLDivElement {
    const el = document.createElement("div");
    el.className = `circle-container ${color} ${anim}`;

    // SVG allows us to cleanly animate the circumference line
    el.innerHTML = `
        <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" />
        </svg>
    `;

    return el;
}