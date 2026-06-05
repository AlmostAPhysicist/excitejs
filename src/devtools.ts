//devtools.ts

import { Observable, Reactor } from "./index";

declare global {
    interface Window {
        Excite: {
            Observable: typeof Observable;
            Reactor: typeof Reactor;
        };
    }
}

window.Excite = {
    Observable,
    Reactor
};

console.log("Excite devtools loaded.");