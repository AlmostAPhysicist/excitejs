// ui.ts
//
// The demo's small DOM helpers (its styles are in demo.css).
//
//   el()         create an element with a class and inner HTML
//   Segmented()  a row of buttons bound to one Observable, with a pill that
//                slides to the chosen button
//   Toggle()     a button bound to an Observable<boolean> (aria-pressed)

import { Observable, Reactor } from "../../core/index";

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html) node.innerHTML = html;
    return node;
}

// `group` holds buttons whose data-value attributes are the choices. A click
// writes the Observable; the Observable marks its button and moves the pill.
// The pill is placed from the button's measured box, so it follows font
// loading and resizes too (instantly then, so only a real choice animates).
export function Segmented<T extends string>(group: HTMLElement, value: Observable<T>): Reactor {
    group.classList.add("pz-seg");
    const pill = el("span", "pz-seg-pill");
    group.prepend(pill);
    const buttons = () => [...group.querySelectorAll<HTMLButtonElement>("button[data-value]")];

    function place(animate: boolean): void {
        const on = buttons().find(b => b.dataset.value === value._value);
        if (!on) return;
        pill.classList.toggle("instant", !animate);
        pill.style.width = on.offsetWidth + "px";
        pill.style.transform = `translateX(${on.offsetLeft}px)`;
    }

    group.addEventListener("click", e => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-value]");
        if (b) value.value = b.dataset.value as T;
    });
    new ResizeObserver(() => place(false)).observe(group);

    return Reactor(() => {
        const v = value.value;
        buttons().forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === v)));
        place(true);
    }, { deps: [value], initFn: () => {
        buttons().forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === value._value)));
        place(false);
    } });
}

// A button that flips an Observable<boolean>, and shows it with aria-pressed
// (or aria-expanded, for a button that opens something)
export function Toggle(button: HTMLButtonElement, value: Observable<boolean>, attribute: "aria-pressed" | "aria-expanded" = "aria-pressed"): Reactor {
    button.addEventListener("click", () => value.value = !value._value);
    return Reactor(() => button.setAttribute(attribute, String(value.value)));
}
