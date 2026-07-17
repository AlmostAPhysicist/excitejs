// page.ts

import { Observable, Reactor, Scheduler } from "../../index"
import "./page.css"
import { Button } from "../button/button";
import { Toggle } from "../toggle/toggle";


export function ScheduledPage(): HTMLDivElement {

    //// Define page elements
    // page div
    const page_wrapper = document.createElement("div"); page_wrapper.className = "page-wrapper";

    // display text
    const text = document.createElement("div"); text.className = "text";
    page_wrapper.appendChild(text);

    // controls
    const button1 = Button("Button 1"); page_wrapper.appendChild(button1);
    const button2 = Button("Button 2"); page_wrapper.appendChild(button2);
    const toggle = Toggle(); page_wrapper.appendChild(toggle);

    //// Scheduler
    const scheduler = Scheduler();
    const compute_s = scheduler.getOrCreate("compute")
    const update_render_content_s = scheduler.getOrCreate("update-render-content")
    const render_s = scheduler.getOrCreate("render")


    //// Define observables, reactors and helper functions
    var n = 0;
    const stack = Observable<number[]>([]);
    const text_update = Reactor(() => { console.log("text_update start"); text.innerText = "[" + stack.value.toString() + "]"; console.log("text_update end") }, { reaction_schedule: render_s })

    const obs1 = Observable(true);
    const obs2 = Observable(true);
    var link = false

    const r1 = Reactor( // whenever obs1 or obs2 change, push a new element to stack
        () => {
            console.log("r1 start")
            stack.value.push(n++);
            stack.trigger();
            console.log("r1 end")
        },
        { deps: [obs1, obs2], reaction_schedule: update_render_content_s }
    )

    const r2 = Reactor( // if link is true, then whenever obs1 changes, change obs2
        () => {
            console.log("r2 start")
            if (link) {
                obs2.value = !obs2.value;
                console.log(`obs2 changed to ${obs2.value}`)

            }
            console.log("r2 end")
        },
        { deps: [obs1], reaction_schedule: compute_s }
    )

    //// Add button listeners
    button1.addEventListener("click", () => { console.log("button1 clicked"); obs1.value = !obs1.value; })
    button2.addEventListener("click", () => { console.log("button2 clicked"); obs2.value = !obs2.value; })
    toggle.addEventListener("change", () => { console.log("toggle changed"); link = !link; });

    return page_wrapper
}

export function UnscheduledPage(): HTMLDivElement {

    //// Define page elements
    // page div
    const page_wrapper = document.createElement("div"); page_wrapper.className = "page-wrapper";

    // display text
    const text = document.createElement("div"); text.className = "text";
    page_wrapper.appendChild(text);

    // controls
    const button1 = Button("Button 1"); page_wrapper.appendChild(button1);
    const button2 = Button("Button 2"); page_wrapper.appendChild(button2);
    const toggle = Toggle(); page_wrapper.appendChild(toggle);


    //// Define observables, reactors and helper functions
    var n = 0;
    const stack = Observable<number[]>([]);
    const text_update = Reactor(() => { console.log("text_update start"); text.innerText = "[" + stack.value.toString() + "]"; console.log("text_update end") })

    const obs1 = Observable(true);
    const obs2 = Observable(true);
    var link = false

    const r1 = Reactor( // whenever obs1 or obs2 change, push a new element to stack
        () => {
            console.log("r1 start")
            stack.value.push(n++);
            stack.trigger();
            console.log("r1 end")
        },
        { deps: [obs1, obs2] }
    )

    const r2 = Reactor( // if link is true, then whenever obs1 changes, change obs2
        () => {
            console.log("r2 start")
            if (link) {
                obs2.value = !obs2.value;
                console.log(`obs2 changed to ${obs2.value}`)
            }
            console.log("r2 end")
        },
        { deps: [obs1] }
    )

    //// Add button listeners
    button1.addEventListener("click", () => { console.log("button1 clicked"); obs1.value = !obs1.value })
    button2.addEventListener("click", () => { console.log("button2 clicked"); obs2.value = !obs2.value })
    toggle.addEventListener("change", () => { console.log("toggle changed"); link = !link; });
    return page_wrapper
}