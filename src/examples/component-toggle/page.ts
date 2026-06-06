//page.ts

// defining a simple page with a button at the bottom center of the page.
// it acts as a toggle button that cycles through 3 components that I found on uiverse.io:
// 1. svg.ts
// 2. loader.ts
// 3. switch.ts
// these components are defined to exist in a 300x300px container div at the center of the page
// the button has text matching the name of the component it will toggle to when clicked


import { Button } from "../button/button";
import { Svg } from "../svg/svg";
import { Loader } from "../loader/loader";
import { Switch } from "../switch/switch";
import { Observable, Reactor } from "../../core/index";
import "./page.css";

const components = [
    { name: "Svg", create: Svg },
    { name: "Loader", create: Loader },
    { name: "Switch", create: Switch },
];

const currentIndex = Observable(0);

function autoScaleComponent() {
    const container = document.querySelector('.display-container') as HTMLElement;

    // Grab whatever component is currently inside the container
    const child = container.firstElementChild as HTMLElement;

    if (!container || !child) return;

    // 1. Reset any previous scaling so we can measure its true, hardcoded size
    child.style.transform = 'scale(1)';

    // 2. Get the actual pixel dimensions of both boxes
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const childWidth = child.offsetWidth || child.clientWidth;
    const childHeight = child.offsetHeight || child.clientHeight;

    // Prevent division by zero errors if the component hasn't fully rendered yet
    if (childWidth === 0 || childHeight === 0) return;

    // 3. Calculate the scale factor for both width and height
    const scaleX = containerWidth / childWidth;
    const scaleY = containerHeight / childHeight;

    // 4. Use Math.min to ensure it fits entirely inside the box without clipping

    // scale dict for different components:
    const scaleDict: Record<string, number> = {
        "Svg": 1.0,
        "Loader": 0.2,
        "Switch": 0.6,
    };
    const finalScale = Math.min(scaleX, scaleY) * (scaleDict[components[currentIndex.value].name]);

    // 5. Apply the perfect scale
    child.style.transform = `scale(${finalScale})`;

    // Ensure it scales from the dead center
    child.style.transformOrigin = 'center center';
}

export function Page(): HTMLDivElement {
    // 1. Setup wrappers
    const pageWrapper = document.createElement("div"); pageWrapper.className = "page-wrapper";
    const displayContainer = document.createElement("div"); displayContainer.className = "display-container";


    // 2. Setup the Button
    const toggleButton = Button("");
    toggleButton.classList.add("page-toggle-btn");

    // 3. The Reactor 
    Reactor(() => {
        // Track the dependency
        const current = currentIndex.value;
        const next = (current + 1) % components.length;

        // Update button text
        toggleButton.innerText = `Next: ${components[next].name}`;

        // Create and mount the new component
        const activeComponent = components[current].create();
        displayContainer.appendChild(activeComponent);
        // Auto-scale the component to fit perfectly inside the display container
        setTimeout(() => {
            autoScaleComponent();
        }, 10);

        // Define the Preaction (Cleanup)
        // Because auto_preaction is true by default, your system will 
        // catch this returned function and run it right before the NEXT reaction.
        return () => {
            activeComponent.remove();
            // Note: You could also use displayContainer.innerHTML = "", 
            // but targeting the specific node is much safer and cleaner!
        };
    });

    // 4. Handle the click event to mutate state
    toggleButton.addEventListener("click", () => {
        currentIndex.value = (currentIndex.value + 1) % components.length;
    });

    // 5. On a window resize, re-run the auto-scaling logic to ensure the component always fits perfectly inside the display container
    window.addEventListener("resize", () => {
        autoScaleComponent();
    });

    // 6. Assemble the page
    pageWrapper.appendChild(displayContainer);
    pageWrapper.appendChild(toggleButton);

    return pageWrapper;
}