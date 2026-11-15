//#step 2
//#until 4
import { Observable } from "excitejs";
//#end
//#step 4
import { Observable, Reactor } from "excitejs";
//#end

export const TEAS = [
    { name: "Green", seconds: 120, color: "var(--green)" },
    { name: "Oolong", seconds: 180, color: "var(--orange)" },
    { name: "Black", seconds: 240, color: "var(--red)" },
    { name: "Herbal", seconds: 300, color: "var(--purple)" },
];

//#part state
export const picked = Observable(TEAS[0]);
//#step 4
export const seconds_left = Observable(picked.value.seconds);
//#end
//#step 5
export const brewing = Observable(false);
//#end
//#step 7
export const log = Observable(JSON.parse(localStorage.getItem("brew-log") ?? "[]"));
//#end
//#end
//#step 4

//#part reset
// a new tea resets the clock
Reactor(() => {
    seconds_left.value = picked.value.seconds;
//#step 5
    brewing.value = false;
//#end
}, { deps: [picked] });
//#end
//#end
//#step 5

//#part clock
// while brewing, one second is removed every TICK_MS (a tenth of a second, to keep the demo short)
const TICK_MS = 100;

Reactor(() => {
    if (!brewing.value) return;
    const timer = setInterval(() => {
        if (seconds_left.value > 1) { seconds_left.value--; return; }
        seconds_left.value = 0;
        brewing.value = false;
//#step 7
        log.value = [...log.value, { tea: picked.value.name, at: new Date().toLocaleTimeString() }];
//#end
    }, TICK_MS);
    return () => clearInterval(timer);
});
//#end
//#end
//#step 7

//#part save
// whenever the log changes, save it
Reactor(() => localStorage.setItem("brew-log", JSON.stringify(log.value)));
//#end
//#end
//#end
