import { Observable } from "./core/Observable";
import { Reactor } from "./core/Reactor";

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