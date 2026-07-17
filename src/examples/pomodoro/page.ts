// pomodoro.ts
//
// A pomodoro / focus timer built on the Observable + Reactor + Scheduler engine.
// - Configurable focus / short break / long break durations
// - Configurable number of focus cycles before a long break
// - Auto-start toggle for chaining sessions without touching the mouse
// - A brass-dial style circular timer with tick marks
// - A live favicon that fills like a pie chart as the session progresses
// - A completion chime (Web Audio, no external asset) + browser notification

import { Observable, Reactor, Scheduler } from "../../core/index";
import "./pomodoro.css";

type Mode = "focus" | "short_break" | "long_break";

interface Durations {
    focus: number;       // minutes
    short_break: number; // minutes
    long_break: number;  // minutes
}

const MODE_META: Record<Mode, { tab: string; status: string }> = {
    focus: { tab: "Focus", status: "Focusing" },
    short_break: { tab: "Short Break", status: "Short Break" },
    long_break: { tab: "Long Break", status: "Long Break" },
};

const MODE_ORDER: Mode[] = ["focus", "short_break", "long_break"];

const DEFAULT_DURATIONS: Durations = { focus: 25, short_break: 5, long_break: 15 };
const DEFAULT_CYCLES_BEFORE_LONG_BREAK = 4;

const RING_RADIUS = 100;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function clampInt(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, Math.round(value)));
}

function formatTime(total_seconds: number): string {
    const s = Math.max(0, Math.round(total_seconds));
    const mm = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
}

// Mirrors the --mode-focus / --mode-short / --mode-long custom properties
// in pomodoro.css. Kept as a plain constant rather than read via
// getComputedStyle: those variables are scoped to .pomodoro-page (and
// further to .dial-wrap[data-mode]), not :root, so reading them off
// document.documentElement always missed and silently fell back to
// the default color — which is why the favicon stayed gold in every
// mode. These are static design tokens, not user-configurable, so a
// single source of truth here is simpler and more reliable than a
// DOM round-trip.
const MODE_COLORS: Record<Mode, string> = {
    focus: "#c9962f",
    short_break: "#7c9473",
    long_break: "#6c87a6",
};

// --- Completion chime (synthesized, no external audio file needed) ---
//
// Browsers only let an AudioContext produce sound once it has been
// resumed inside a real user gesture. A phase completing 25 minutes
// later, from inside a setInterval callback, is NOT a gesture — so a
// context created at that moment stays silently "suspended" forever.
// We instead create/resume ONE context the moment the user clicks
// Start (a genuine gesture) and keep reusing that same context for
// every future chime, including ones fired long after, with no
// further gesture required.
let shared_audio_ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!shared_audio_ctx) {
        shared_audio_ctx = new Ctx();
    }
    return shared_audio_ctx;
}

// Call this from inside a click handler to unlock audio for later use.
function unlockAudio() {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => { });
    }
}

function playChime() {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
        ctx.resume().catch(() => { });
    }
    const now = ctx.currentTime;

    [880, 1318.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.5;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(1.0, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.0);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 2.1);
    });
}

// --- Browser notification ---
let notification_permission_requested = false;

function requestNotificationPermission() {
    if (notification_permission_requested) return;
    notification_permission_requested = true;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => { });
    }
}

function notify(title: string, body: string) {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try {
        new Notification(title, { body, silent: true });
    } catch {
        // Some environments (insecure context, no service worker, etc.) may throw.
    }
}

// --- Favicon: fills like a pie chart as the session elapses ---
function createFaviconUpdater() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
    }

    return function updateFavicon(elapsed_fraction: number, color: string) {
        const size = 64;
        const cx = size / 2;
        const cy = size / 2;
        const r = 27;
        const fraction = Math.min(1, Math.max(0, elapsed_fraction));

        ctx.clearRect(0, 0, size, size);

        // Base plate
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = "#211f24";
        ctx.fill();

        // Pie fill — starts at 12 o'clock, sweeps clockwise as time elapses
        if (fraction > 0) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            const start = -Math.PI / 2;
            const end = start + Math.PI * 2 * fraction;
            ctx.arc(cx, cy, r, start, end);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        }

        // Rim
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = 8;
        ctx.strokeStyle = color;
        ctx.stroke();

        link!.href = canvas.toDataURL("image/png");
    };
}

const SVG_NS = "http://www.w3.org/2000/svg";

function buildDial(): { svg: SVGSVGElement; progressRing: SVGCircleElement } {
    const svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
    svg.setAttribute("viewBox", "0 0 280 280");
    svg.setAttribute("class", "dial-svg");

    // Tick marks — mechanical-timer style, 60 divisions, longer tick every 5th.
    const tickGroup = document.createElementNS(SVG_NS, "g");
    tickGroup.setAttribute("class", "dial-ticks");
    const center = 140;
    const outer = 132;
    for (let i = 0; i < 60; i++) {
        const angle = (Math.PI * 2 * i) / 60 - Math.PI / 2;
        const isMajor = i % 5 === 0;
        const inner = isMajor ? 120 : 125;
        const x1 = center + inner * Math.cos(angle);
        const y1 = center + inner * Math.sin(angle);
        const x2 = center + outer * Math.cos(angle);
        const y2 = center + outer * Math.sin(angle);
        const tick = document.createElementNS(SVG_NS, "line");
        tick.setAttribute("x1", x1.toFixed(2));
        tick.setAttribute("y1", y1.toFixed(2));
        tick.setAttribute("x2", x2.toFixed(2));
        tick.setAttribute("y2", y2.toFixed(2));
        tick.setAttribute("class", isMajor ? "tick tick-major" : "tick tick-minor");
        tickGroup.appendChild(tick);
    }
    svg.appendChild(tickGroup);

    // Track (the full circle, dim)
    const track = document.createElementNS(SVG_NS, "circle");
    track.setAttribute("cx", "140");
    track.setAttribute("cy", "140");
    track.setAttribute("r", String(RING_RADIUS));
    track.setAttribute("class", "dial-track");
    svg.appendChild(track);

    // Progress ring — the "patina" arc that recedes as time passes
    const progressRing = document.createElementNS(SVG_NS, "circle") as SVGCircleElement;
    progressRing.setAttribute("cx", "140");
    progressRing.setAttribute("cy", "140");
    progressRing.setAttribute("r", String(RING_RADIUS));
    progressRing.setAttribute("class", "dial-progress");
    progressRing.setAttribute("stroke-dasharray", RING_CIRCUMFERENCE.toFixed(2));
    svg.appendChild(progressRing);

    return { svg, progressRing };
}

function createDurationField(label: string, value: number): { field: HTMLDivElement; input: HTMLInputElement } {
    const field = document.createElement("div");
    field.className = "field";

    const labelEl = document.createElement("label");
    labelEl.className = "field-label";
    labelEl.textContent = label;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "180";
    input.value = String(value);
    input.className = "field-input";
    input.inputMode = "numeric";

    field.append(labelEl, input);
    return { field, input };
}

export function PomodoroTimer(): HTMLDivElement {
    // 1. Engine
    const scheduler = Scheduler();
    const compute_s = scheduler.getOrCreate("compute");
    const render_s = scheduler.getOrCreate("render");

    // 2. State domain
    const mode = Observable<Mode>("focus");
    const durations = Observable<Durations>({ ...DEFAULT_DURATIONS });
    const cycles_before_long_break = Observable<number>(DEFAULT_CYCLES_BEFORE_LONG_BREAK);
    const completed_focus_cycles = Observable<number>(0);
    const remaining_seconds = Observable<number>(DEFAULT_DURATIONS.focus * 60);
    const is_running = Observable<boolean>(false);
    const auto_start = Observable<boolean>(false);

    const updateFavicon = createFaviconUpdater();

    // 3. UI elements
    const wrapper = document.createElement("div");
    wrapper.className = "pomodoro-page";

    const plate = document.createElement("div");
    plate.className = "plate";

    const eyebrowRow = document.createElement("div");
    eyebrowRow.className = "eyebrow-row";
    eyebrowRow.innerHTML = `<span class="eyebrow-dot"></span><span class="eyebrow-text">Focus Timer</span>`;

    const modeTabs = document.createElement("div");
    modeTabs.className = "mode-tabs";
    const tabButtons: Record<Mode, HTMLButtonElement> = {} as any;
    for (const m of MODE_ORDER) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mode-tab";
        btn.textContent = MODE_META[m].tab;
        btn.addEventListener("click", () => {
            is_running.value = false;
            mode.value = m;
        });
        tabButtons[m] = btn;
        modeTabs.appendChild(btn);
    }

    const dialWrap = document.createElement("div");
    dialWrap.className = "dial-wrap";
    const { svg: dialSvg, progressRing } = buildDial();

    const dialCenter = document.createElement("div");
    dialCenter.className = "dial-center";
    const timeReadout = document.createElement("div");
    timeReadout.className = "time-readout";
    const statusReadout = document.createElement("div");
    statusReadout.className = "status-readout";
    const cycleReadout = document.createElement("div");
    cycleReadout.className = "cycle-readout";
    dialCenter.append(timeReadout, statusReadout, cycleReadout);
    dialWrap.append(dialSvg, dialCenter);

    const controlsRow = document.createElement("div");
    controlsRow.className = "controls-row";
    const startPauseBtn = document.createElement("button");
    startPauseBtn.type = "button";
    startPauseBtn.className = "btn btn-primary";
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn btn-ghost";
    resetBtn.textContent = "Reset";
    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "btn btn-ghost";
    skipBtn.textContent = "Skip";
    controlsRow.append(startPauseBtn, resetBtn, skipBtn);

    const settingsPlate = document.createElement("div");
    settingsPlate.className = "settings-plate";

    const settingsTitle = document.createElement("div");
    settingsTitle.className = "settings-title";
    settingsTitle.textContent = "Session Settings";

    const durationRow = document.createElement("div");
    durationRow.className = "settings-row durations-row";
    const focusField = createDurationField("Focus (min)", DEFAULT_DURATIONS.focus);
    const shortField = createDurationField("Short Break (min)", DEFAULT_DURATIONS.short_break);
    const longField = createDurationField("Long Break (min)", DEFAULT_DURATIONS.long_break);
    durationRow.append(focusField.field, shortField.field, longField.field);

    const cyclesRow = document.createElement("div");
    cyclesRow.className = "settings-row";
    const cyclesField = createDurationField("Focus Cycles Before Long Break", DEFAULT_CYCLES_BEFORE_LONG_BREAK);
    cyclesField.input.max = "12";
    cyclesRow.append(cyclesField.field);

    const autoStartRow = document.createElement("div");
    autoStartRow.className = "settings-row toggle-row";
    const autoStartLabel = document.createElement("label");
    autoStartLabel.className = "toggle-label";
    autoStartLabel.textContent = "Auto-start next session";
    const toggleSwitch = document.createElement("label");
    toggleSwitch.className = "switch";
    const autoStartInput = document.createElement("input");
    autoStartInput.type = "checkbox";
    const toggleTrack = document.createElement("span");
    toggleTrack.className = "switch-track";
    toggleSwitch.append(autoStartInput, toggleTrack);
    autoStartRow.append(autoStartLabel, toggleSwitch);

    settingsPlate.append(settingsTitle, durationRow, cyclesRow, autoStartRow);

    plate.append(eyebrowRow, modeTabs, dialWrap, controlsRow, settingsPlate);
    wrapper.append(plate);

    // 4. Reactive pipeline
    //
    // All three reactors below use explicit `deps` (auto_deps: false)
    // rather than auto-tracking. Two reasons:
    //   1. It makes each reactor's real dependency list an honest,
    //      readable contract instead of "whatever happened to get
    //      read this run" — e.g. the resync reactor must NOT depend
    //      on is_running, and listing deps explicitly guarantees that
    //      even if the body is edited later.
    //   2. Because auto_deps is off, reads inside these bodies never
    //      trigger tracking, so there's no need for _value escape
    //      hatches to dodge accidental subscriptions.
    // `initFn: true` makes each one still run immediately on creation
    // (auto_deps normally implies that; with explicit deps we have to
    // ask for it).

    // Keep remaining_seconds in sync with the selected mode / durations
    // whenever the timer is NOT running. Runs synchronously (no
    // schedule) — this is cheap arithmetic, not something that
    // benefits from batching, and staying synchronous keeps its
    // ordering relative to the interval reactor unambiguous.
    Reactor(() => {
        const m = mode.value;
        const d = durations.value;
        if (!is_running.value) {
            remaining_seconds.value = d[m] * 60;
        }
    }, { deps: [mode, durations], auto_deps: false, initFn: true });

    // Drive the ticking interval purely off is_running, using the
    // engine's preaction mechanism for teardown (mirrors the
    // "active component" pattern in page.ts): whatever this reaction
    // returns becomes the cleanup that automatically runs before the
    // NEXT time this reactor fires — clearInterval always happens
    // before a new interval can be created, even if is_running flips
    // false→true synchronously in the same tick (e.g. auto-start).
    // No schedule is assigned, so preact()+react() run immediately
    // and in order on every change — no deferred/batched execution
    // that could let two intervals exist at once.
    Reactor(() => {
        if (!is_running.value) return;

        let last = Date.now();
        const id = window.setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - last) / 1000);
            if (elapsed <= 0) return;
            last = now;
            const next = remaining_seconds._value - elapsed;
            if (next > 0) {
                remaining_seconds.value = next;
            } else {
                remaining_seconds.value = 0;
                handlePhaseComplete(false);
            }
        }, 250);

        return () => window.clearInterval(id);
    }, { deps: [is_running], auto_deps: false, initFn: true });

    // Render: dial, digits, tabs, favicon, document title, button labels.
    // This one DOES stay on render_s — batching several state writes
    // (e.g. mode + remaining_seconds changing together on phase
    // completion) into a single paint is exactly what that schedule
    // is for, and a render is always safe to coalesce or re-run.
    Reactor(() => {
        const m = mode.value;
        const d = durations.value;
        const remaining = remaining_seconds.value;
        const running = is_running.value;
        const completed = completed_focus_cycles.value;
        const cycleTarget = cycles_before_long_break.value;

        const total = Math.max(1, d[m] * 60);
        const elapsedFraction = 1 - remaining / total;

        timeReadout.textContent = formatTime(remaining);
        statusReadout.textContent = MODE_META[m].status.toUpperCase();
        const cyclePosition = (completed % cycleTarget) + 1;
        cycleReadout.textContent = `Cycle ${cyclePosition} of ${cycleTarget}`;

        for (const key of MODE_ORDER) {
            tabButtons[key].classList.toggle("active", key === m);
        }
        dialWrap.setAttribute("data-mode", m);

        const offset = RING_CIRCUMFERENCE * (1 - elapsedFraction);
        progressRing.setAttribute("stroke-dashoffset", offset.toFixed(2));

        startPauseBtn.textContent = running ? "Pause" : (remaining < total ? "Resume" : "Start");
        startPauseBtn.classList.toggle("is-running", running);

        document.title = `${formatTime(remaining)} · ${MODE_META[m].tab} — Pomodoro`;

        updateFavicon(elapsedFraction, MODE_COLORS[m]);
    }, {
        deps: [mode, durations, remaining_seconds, is_running, completed_focus_cycles, cycles_before_long_break],
        auto_deps: false,
        initFn: true,
        reaction_schedule: render_s,
    });

    // 5. Phase completion + native handlers

    function handlePhaseComplete(silent: boolean) {
        is_running.value = false;

        const finishedMode = mode.value;
        let next: Mode;
        if (finishedMode === "focus") {
            completed_focus_cycles.value += 1;
            const isLongBreakDue = completed_focus_cycles.value % cycles_before_long_break.value === 0;
            next = isLongBreakDue ? "long_break" : "short_break";
        } else {
            next = "focus";
        }

        if (!silent) {
            playChime();
            notify(`${MODE_META[finishedMode].tab} complete`, `Time for ${MODE_META[next].tab.toLowerCase()}.`);
        }

        mode.value = next;

        if (auto_start.value) {
            is_running.value = true;
        }
    }

    startPauseBtn.addEventListener("click", () => {
        unlockAudio();
        requestNotificationPermission();
        is_running.value = !is_running.value;
    });

    resetBtn.addEventListener("click", () => {
        is_running.value = false;
        remaining_seconds.value = durations.value[mode.value] * 60;
    });

    skipBtn.addEventListener("click", () => {
        handlePhaseComplete(true);
    });

    focusField.input.addEventListener("input", () => {
        const v = clampInt(Number(focusField.input.value), 1, 180);
        durations.value = { ...durations.value, focus: v };
    });
    shortField.input.addEventListener("input", () => {
        const v = clampInt(Number(shortField.input.value), 1, 180);
        durations.value = { ...durations.value, short_break: v };
    });
    longField.input.addEventListener("input", () => {
        const v = clampInt(Number(longField.input.value), 1, 180);
        durations.value = { ...durations.value, long_break: v };
    });
    cyclesField.input.addEventListener("input", () => {
        const v = clampInt(Number(cyclesField.input.value), 1, 12);
        cycles_before_long_break.value = v;
    });
    autoStartInput.addEventListener("change", () => {
        auto_start.value = autoStartInput.checked;
    });

    return wrapper;
}