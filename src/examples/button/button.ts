//button.ts

// defined in button.css is set of styling rules for class named .btn for when the following selectors are applied to an element with class .btn
//.btn
//.btn:disabled
//.button:hover
//.btn:active


import "./button.css";

// let's define a UI Component called Button with the .btn class applied to it


export function Button(text: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "btn";
    button.innerText = text;
    return button;
}