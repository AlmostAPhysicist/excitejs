//page.ts
import { Observable, Reactor, Scheduler } from "../../core/index"; // Adjust path as needed
import { Button } from "../button/button";
import { Toggle } from "../toggle/toggle";
import "./page.css"; // Uses the instant-transition CSS from the previous step

export function Page(): HTMLElement {
    // --- 1. DOM Setup ---
    const container = document.createElement("div");
    container.className = "page-container";

    const display = document.createElement("h1");
    display.className = "points-display";

    const controls = document.createElement("div");
    controls.className = "controls-container";

    const addBtn = Button("Add Point");
    const resetBtn = Button("Reset");

    const toggleWrapper = document.createElement("div");
    toggleWrapper.className = "toggle-wrapper";
    const toggleLabel = document.createElement("span");
    toggleLabel.innerText = "Premature Victory:";
    const victoryToggle = Toggle();
    const toggleInput = victoryToggle.querySelector("input") as HTMLInputElement;

    toggleWrapper.append(toggleLabel, victoryToggle);
    controls.append(addBtn, resetBtn);
    container.append(display, controls, toggleWrapper);

    // --- 2. State Initialization ---
    const points = Observable(0);
    const victory = Observable(false);

    // --- 3. Reactivity Approaches ---

    /* =========================================================================
       APPROACH 1: Naive Reactor (Commented Out)
       Uncomment this block (and comment out Approach 2) to test.
       Watch the console when points hit 6: you will see [Naive Draw] execute 
       multiple times because state changes trigger cascading, unbatched updates.
    ========================================================================= */
    /*
    // Compute Logic
    Reactor(() => {
        console.log(`[Naive Compute] Running logic. Current points: ${points.value}, Current victory: ${victory._value}`);

        if (points.value > 5 && !victory._value) {
            console.log(`[Naive Compute -> Change] Threshold exceeded! Mutating victory to true.`);
            victory.value = true; // This instantly triggers the render reactor mid-cycle
        }
    });

    // Render Logic
    Reactor(() => {
        const colorState = victory.value ? "Red (victory)" : "Blue (playing)";
        console.log(`[Naive Draw] Updating DOM -> Displaying Points: ${points.value} | Color: ${colorState}`);

        display.innerText = `Points: ${points.value}`;

        if (victory.value) {
            display.classList.add("victory");
            display.classList.remove("playing");
            addBtn.disabled = true;
            toggleInput.checked = true;
        } else {
            display.classList.add("playing");
            display.classList.remove("victory");
            addBtn.disabled = false;
            toggleInput.checked = false;
        }
    });

    function executeUpdates() {
        // No manual flushing needed for naive approach; mutation drives immediate execution.
    }
    */

    /* =========================================================================
       APPROACH 2: Scheduler Reactor (Active)
       Batches computations and renders. Because we create 'compute' before 
       'render', scheduler.run() natively evaluates logic before writing to the DOM,
       ensuring [Scheduler Draw] only runs ONCE per interaction cycle.
    ========================================================================= */

    // /*
    const scheduler = Scheduler();
    const computeSchedule = scheduler.getOrCreate("compute");
    const renderSchedule = scheduler.getOrCreate("render");

    // Compute Logic
    Reactor(() => {
        console.log(`[Scheduler Compute] Running logic. Current points: ${points.value}, Current victory: ${victory.value}`);

        if (points.value > 5 && !victory.value) {
            console.log(`[Scheduler Compute -> Change] Threshold exceeded! Mutating victory to true.`);
            victory.value = true;
        }
    }, { reaction_schedule: computeSchedule });

    // Render Logic
    Reactor(() => {
        const colorState = victory.value ? "Red (victory)" : "Blue (playing)";
        console.log(`[Scheduler Draw] Updating DOM -> Displaying Points: ${points.value} | Color: ${colorState}`);

        display.innerText = `Points: ${points.value}`;

        if (victory.value) {
            display.classList.add("victory");
            display.classList.remove("playing");
            addBtn.disabled = true;
            toggleInput.checked = true;
        } else {
            display.classList.add("playing");
            display.classList.remove("victory");
            addBtn.disabled = false;
            toggleInput.checked = false;
        }
    }, { reaction_schedule: renderSchedule });

    function executeUpdates() {
        scheduler.run(); // Flushes all schedules in the order they were created
    }
    // */


    // --- 4. Event Listeners ---
    addBtn.onclick = () => {
        if (!victory._value) {
            console.log("\n[Action] User clicked 'Add Point'");
            points.value += 1;
            executeUpdates();
        }
    };

    resetBtn.onclick = () => {
        console.log("\n[Action] User clicked 'Reset'");
        victory.value = false;
        points.value = 0;
        executeUpdates();
    };

    toggleInput.onchange = (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        console.log(`\n[Action] User toggled victory to: ${isChecked}`);
        victory.value = isChecked;
        executeUpdates();
    };

    // Kickoff the initial render
    console.log("\n[Init] Bootstrapping initial state...");
    executeUpdates();

    return container;
}