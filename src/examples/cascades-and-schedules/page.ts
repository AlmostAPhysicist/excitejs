import { Observable, Reactor, Scheduler } from "../../core/index";
import type { Reactor as ReactorHandle } from "../../core/index";
import "./page.css";

// ─── Enemy definitions (visual only) ─────────────────────────────────────────

const ENEMY_DEFS = [
    { id: 0, color: "#c0392b", emoji: "👁", name: "The Forgetter" },
    { id: 1, color: "#6a0572", emoji: "🐢", name: "The Procrastinator" },
    { id: 2, color: "#1a4a6e", emoji: "🌑", name: "The Doubter" },
];

const ROUNDS_TO_DEFEAT = 3;
const ROUND_DURATION = 10; // seconds

const WHEEL_CX = 200;
const WHEEL_CY = 190;
const WHEEL_R = 130;

const PLAYER_X = 200;
const PLAYER_Y = 408;
const PLAYER_RADIUS = 28;
const PLAYER_LINE_Y = PLAYER_Y - PLAYER_RADIUS - 1;

const ROTATION_DURATION_MS = 360;

// ─── Mermaid diagrams ─────────────────────────────────────────────────────────

const MERMAID_SCHEDULER = `
flowchart TD
    CLK[Clock hits zero] --> RS[roundsSurvived increments]
    RS --> C0[Compute reactor 0]
    RS --> C1[Compute reactor 1]
    RS --> C2[Compute reactor 2]
    C0 --> D0[enemyDefeated 0 becomes true]
    C1 --> D1[enemyDefeated 1 becomes true]
    C2 --> D2[enemyDefeated 2 becomes true]
    D0 --> CYC[Cycle reactor]
    D1 --> CYC
    D2 --> CYC
    RS --> CYC
    CYC -. scheduler runs compute then render .-> ADV[Advance once]
    style CYC fill:#2a9d8f,color:#fff
    style ADV fill:#2a9d8f,color:#fff
`;

const MERMAID_NAIVE = `
flowchart TD
    CLK[Clock hits zero] --> RS[roundsSurvived increments]
    RS --> CR[Compute reactor]
    CR --> ED[enemyDefeated becomes true]
    ED --> CYC1[Cycle reactor fires]
    RS --> CYC2[Cycle reactor fires again]
    CYC1 --> SKIP[Enemy skipped]
    CYC2 --> SKIP
    style CYC1 fill:#e63946,color:#fff
    style CYC2 fill:#e63946,color:#fff
    style SKIP fill:#e63946,color:#fff
`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Page(): HTMLElement {
    const root = document.createElement("div");
    root.className = "page-root";

    // ── Story ─────────────────────────────────────────────────────────────────
    const header = document.createElement("header");
    header.className = "story-header";
    header.innerHTML = `
        <h1 class="title">The Wheel of Trials</h1>
        <p class="subtitle">A reactive battle in three acts</p>
        <div class="story-body">
            <p>
                Three enemies wait on the wheel. The active enemy is always the one
                closest to you, at the bottom of the wheel. Each
                <strong>round lasts ${ROUND_DURATION} seconds</strong>. When it ends,
                the wheel rotates to the next foe. Survive
                <strong>${ROUNDS_TO_DEFEAT} rounds</strong> against any enemy and they
                are removed from the wheel entirely.
            </p>
            <p>
                Each enemy has its own <em>roundsSurvived</em> and
                <em>enemyDefeated</em> observable. The <strong>Cycle Reactor</strong>
                watches all six. Without the Scheduler, surviving round
                ${ROUNDS_TO_DEFEAT} mutates two observables synchronously — the Cycle
                Reactor fires twice and skips an enemy. Toggle it off to watch it happen.
            </p>
        </div>
    `;

    // ── Scheduler Toggle ──────────────────────────────────────────────────────
    const toggleSection = document.createElement("div");
    toggleSection.className = "toggle-section";
    toggleSection.innerHTML = `
        <label class="scheduler-toggle-label">
            <span class="toggle-text">Use Scheduler</span>
            <div class="toggle-track">
                <input type="checkbox" class="toggle-input" checked />
                <span class="toggle-thumb"></span>
            </div>
            <span class="toggle-badge">ACTIVE</span>
        </label>
        <p class="toggle-hint">Compute flushes before render — the wheel rotates exactly once per round.</p>
    `;
    const toggleInput = toggleSection.querySelector(".toggle-input") as HTMLInputElement;
    const toggleBadge = toggleSection.querySelector(".toggle-badge") as HTMLElement;
    const toggleHint = toggleSection.querySelector(".toggle-hint") as HTMLElement;

    // ── Mermaid ───────────────────────────────────────────────────────────────
    const diagramSection = document.createElement("div");
    diagramSection.className = "diagram-section";
    const diagramTitle = document.createElement("h2");
    diagramTitle.className = "diagram-title";
    diagramTitle.textContent = "Flow Diagram";
    const mermaidWrapper = document.createElement("div");
    mermaidWrapper.className = "mermaid-wrapper";
    const mermaidPre = document.createElement("pre");
    mermaidPre.className = "mermaid";
    mermaidPre.textContent = MERMAID_SCHEDULER;
    mermaidWrapper.appendChild(mermaidPre);
    diagramSection.append(diagramTitle, mermaidWrapper);

    // ── SVG Wheel ─────────────────────────────────────────────────────────────
    const wheelWrap = document.createElement("div");
    wheelWrap.className = "wheel-wrap";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 400 460");
    svg.setAttribute("class", "wheel-svg");

    const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    track.setAttribute("cx", String(WHEEL_CX));
    track.setAttribute("cy", String(WHEEL_CY));
    track.setAttribute("r", String(WHEEL_R));
    track.setAttribute("fill", "none");
    track.setAttribute("stroke", "#264653");
    track.setAttribute("stroke-width", "1.5");
    track.setAttribute("stroke-dasharray", "6 4");
    track.setAttribute("opacity", "0.25");
    svg.appendChild(track);

    const wheelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(wheelGroup);

    const nodesG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wheelGroup.appendChild(nodesG);

    // const vsLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    // vsLine.setAttribute("stroke", "#e63946");
    // vsLine.setAttribute("stroke-width", "1.5");
    // vsLine.setAttribute("stroke-dasharray", "4 3");
    // vsLine.setAttribute("opacity", "0.55");
    // svg.appendChild(vsLine);

    const playerG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    playerG.setAttribute("transform", `translate(${PLAYER_X},${PLAYER_Y})`);

    const playerBg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    playerBg.setAttribute("r", String(PLAYER_RADIUS));
    playerBg.setAttribute("fill", "#fffdf0");
    playerBg.setAttribute("stroke", "#f4a261");
    playerBg.setAttribute("stroke-width", "3");

    const playerEmoji = document.createElementNS("http://www.w3.org/2000/svg", "text");
    playerEmoji.setAttribute("text-anchor", "middle");
    playerEmoji.setAttribute("dominant-baseline", "central");
    playerEmoji.setAttribute("font-size", "20");
    playerEmoji.textContent = "🧙";

    const playerLbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    playerLbl.setAttribute("text-anchor", "middle");
    playerLbl.setAttribute("y", "42");
    playerLbl.setAttribute("font-size", "9");
    playerLbl.setAttribute("fill", "#264653");
    playerLbl.setAttribute("font-family", "Cinzel,serif");
    playerLbl.textContent = "YOU";

    playerG.append(playerBg, playerEmoji, playerLbl);
    svg.appendChild(playerG);

    wheelWrap.appendChild(svg);

    // ── HUD ───────────────────────────────────────────────────────────────────
    const hud = document.createElement("div");
    hud.className = "hud";

    const hudEnemyName = document.createElement("span");
    hudEnemyName.className = "hud-value";
    const hudEnemyBlock = document.createElement("div");
    hudEnemyBlock.className = "hud-enemy";
    hudEnemyBlock.innerHTML = `<span class="hud-label">Facing</span>`;
    hudEnemyBlock.appendChild(hudEnemyName);

    const pip0 = document.createElement("span");
    pip0.className = "pip";
    const pip1 = document.createElement("span");
    pip1.className = "pip";
    const pip2 = document.createElement("span");
    pip2.className = "pip";
    const pips = [pip0, pip1, pip2];
    const roundPips = document.createElement("div");
    roundPips.className = "round-pips";
    roundPips.append(pip0, pip1, pip2);
    const hudRounds = document.createElement("div");
    hudRounds.className = "hud-rounds";
    hudRounds.innerHTML = `<span class="hud-label">Rounds</span>`;
    hudRounds.appendChild(roundPips);

    const hudTimer = document.createElement("span");
    hudTimer.className = "hud-value timer-value";
    const hudTimerBlock = document.createElement("div");
    hudTimerBlock.className = "hud-timer";
    hudTimerBlock.innerHTML = `<span class="hud-label">Time Left</span>`;
    hudTimerBlock.appendChild(hudTimer);

    hud.append(hudEnemyBlock, hudRounds, hudTimerBlock);

    // Timer bar
    const timerBarWrap = document.createElement("div");
    timerBarWrap.className = "timer-bar-wrap";
    const timerBar = document.createElement("div");
    timerBar.className = "timer-bar";
    timerBarWrap.appendChild(timerBar);

    // Controls
    const controls = document.createElement("div");
    controls.className = "battle-controls";
    const btnSpeed = document.createElement("button");
    btnSpeed.className = "btn btn-speed";
    btnSpeed.textContent = "⚡ Speed Up";
    const btnDefeat = document.createElement("button");
    btnDefeat.className = "btn btn-defeat";
    btnDefeat.textContent = "💥 Defeat";
    const btnReset = document.createElement("button");
    btnReset.className = "btn btn-reset";
    btnReset.textContent = "↺ Reset";
    controls.append(btnSpeed, btnDefeat, btnReset);

    // Banner
    const banner = document.createElement("div");
    banner.className = "banner hidden";
    const bannerText = document.createElement("span");
    banner.appendChild(bannerText);

    // Assemble
    const arena = document.createElement("section");
    arena.className = "arena";
    arena.append(wheelWrap, hud, timerBarWrap, controls, banner);
    root.append(header, toggleSection, diagramSection, arena);

    // ═══════════════════════════════════════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════════════════════════════════════

    const roundsSurvived = [
        Observable(0),
        Observable(0),
        Observable(0),
    ];

    const enemyDefeated = [
        Observable(false),
        Observable(false),
        Observable(false),
    ];

    const selectorIdx = Observable(0);
    const timeLeft = Observable(ROUND_DURATION);
    const gameOver = Observable(false);

    // ── Scheduler ────────────────────────────────────────────────────────────
    const scheduler = Scheduler();
    const computeSchedule = scheduler.getOrCreate("compute");
    const renderSchedule = scheduler.getOrCreate("render");

    let useScheduler = true;

    function flush() {
        if (useScheduler) scheduler.run();
    }

    // ── Clock ─────────────────────────────────────────────────────────────────
    let clockInterval: ReturnType<typeof setInterval> | null = null;

    function stopClock() {
        if (clockInterval) {
            clearInterval(clockInterval);
            clockInterval = null;
        }
    }

    function startClock() {
        stopClock();
        if (gameOver.value) return;

        clockInterval = setInterval(() => {
            if (gameOver.value) {
                stopClock();
                return;
            }

            const next = timeLeft.value - 1;
            if (next <= 0) {
                timeLeft.value = 0;
                stopClock();

                const idx = selectorIdx.value;
                roundsSurvived[idx].value = roundsSurvived[idx].value + 1;
                flush();
            } else {
                timeLeft.value = next;
                flush();
            }
        }, 1000);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  COMPUTE REACTORS
    // ═══════════════════════════════════════════════════════════════════════════

    const computeReactors: ReactorHandle[] = ENEMY_DEFS.map((_, i) =>
        Reactor(() => {
            const rounds = roundsSurvived[i].value;
            if (rounds >= ROUNDS_TO_DEFEAT && !enemyDefeated[i].value) {
                enemyDefeated[i].value = true;
            }
        }, { reaction_schedule: useScheduler ? computeSchedule : null })
    );

    // ═══════════════════════════════════════════════════════════════════════════
    //  VISUAL STATE / ANIMATION
    // ═══════════════════════════════════════════════════════════════════════════

    let currentWheelRotation = 0;
    let targetWheelRotation = 0;
    let rotationRaf: number | null = null;









    let activeNodeEls: Array<{
        outer: SVGGElement;
        circle: SVGCircleElement;
        content: SVGGElement;
        emoji: SVGTextElement;
        badge: SVGTextElement;
        label: SVGTextElement;
    }> = [];

    // Create persistent node DOM once
    ENEMY_DEFS.forEach(() => {
        const outer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const content = document.createElementNS("http://www.w3.org/2000/svg", "g");

        const emoji = document.createElementNS("http://www.w3.org/2000/svg", "text");
        emoji.setAttribute("text-anchor", "middle");
        emoji.setAttribute("dominant-baseline", "central");

        const badge = document.createElementNS("http://www.w3.org/2000/svg", "text");
        badge.setAttribute("text-anchor", "middle");
        badge.setAttribute("font-size", "8");
        badge.setAttribute("fill", "#7a8a92");
        badge.setAttribute("font-family", "Cinzel,serif");

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("font-size", "8");
        label.setAttribute("fill", "#9aabb2");
        label.setAttribute("font-family", "Cinzel,serif");

        content.append(emoji, badge, label);
        outer.append(circle, content);
        nodesG.appendChild(outer);

        activeNodeEls.push({ outer, circle, content, emoji, badge, label });
    });

    function easeInOutCubic(t: number): number {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function stopRotationAnimation() {
        if (rotationRaf !== null) {
            cancelAnimationFrame(rotationRaf);
            rotationRaf = null;
        }
    }

    function animateWheelTo(nextRotation: number) {
        if (Math.abs(nextRotation - targetWheelRotation) < 0.001) return;

        stopRotationAnimation();

        const startRotation = currentWheelRotation;
        const delta = nextRotation - startRotation;
        targetWheelRotation = nextRotation;
        const startTime = performance.now();

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / ROTATION_DURATION_MS);
            const eased = easeInOutCubic(t);

            currentWheelRotation = startRotation + delta * eased;
            updateScene();

            if (t < 1) {
                rotationRaf = requestAnimationFrame(tick);
            } else {
                currentWheelRotation = nextRotation;
                rotationRaf = null;
                updateScene();
            }
        };

        rotationRaf = requestAnimationFrame(tick);
    }

    function updateScene() {
        const alive = ENEMY_DEFS.map((_, i) => i).filter(i => !enemyDefeated[i].value);
        const idx = selectorIdx.value;
        const time = timeLeft.value;
        const isOver = gameOver.value;

        const n = alive.length;
        const step = n > 0 ? 360 / n : 0;

        // ── Timer bar ────────────────────────────────────────────────────────
        timerBar.style.width = `${((ROUND_DURATION - time) / ROUND_DURATION) * 100}%`;

        // ── Victory banner ───────────────────────────────────────────────────
        if (isOver) {
            banner.classList.remove("hidden", "banner-win");
            banner.classList.add("banner-win");
            bannerText.textContent = "🏆 Victory! The wheel is still.";
            hudEnemyName.textContent = "All fallen";
            hudTimer.textContent = "—";
            hudTimer.style.color = "";
            // vsLine.setAttribute("x1", "0");
            // vsLine.setAttribute("y1", "0");
            // vsLine.setAttribute("x2", "0");
            // vsLine.setAttribute("y2", "0");

            activeNodeEls.forEach(({ outer }) => {
                outer.style.display = "none";
            });

            pips.forEach(p => {
                p.className = "pip";
            });

            wheelGroup.setAttribute("transform", `rotate(0 ${WHEEL_CX} ${WHEEL_CY})`);
            return;
        }

        banner.className = "banner hidden";

        if (alive.length === 0) {
            return;
        }

        const activeIdx = alive.includes(idx) ? idx : alive[0];
        const activePos = alive.indexOf(activeIdx);
        const desiredRotation = -(activePos * step);

        if (Math.abs(desiredRotation - targetWheelRotation) > 0.001 && rotationRaf === null) {
            animateWheelTo(desiredRotation);
        }

        // Current visible rotation
        wheelGroup.setAttribute(
            "transform",
            `rotate(${currentWheelRotation} ${WHEEL_CX} ${WHEEL_CY})`
        );

        // HUD
        const currentDef = ENEMY_DEFS[activeIdx];
        hudEnemyName.textContent = currentDef.name;
        hudTimer.textContent = String(time);
        hudTimer.style.color = time <= 3 ? "#e63946" : "";

        const rounds = roundsSurvived[activeIdx]?.value ?? 0;
        pips.forEach((pip, i) => {
            pip.className = `pip${i < rounds ? " pip-filled" : ""}`;
        });

        // Enemy nodes
        activeNodeEls.forEach(({ outer }) => {
            outer.style.display = "none";
        });

        const rotationForText = -currentWheelRotation;

        alive.forEach((defId, pos) => {
            const def = ENEMY_DEFS[defId];
            const node = activeNodeEls[defId];
            const isCurrent = defId === activeIdx;
            const rs = roundsSurvived[defId].value;

            const angleDeg = (pos / n) * 360 + 90;
            const angleRad = (angleDeg * Math.PI) / 180;
            const ex = WHEEL_CX + WHEEL_R * Math.cos(angleRad);
            const ey = WHEEL_CY + WHEEL_R * Math.sin(angleRad);
            const nodeR = isCurrent ? 34 : 24;

            node.outer.style.display = "";
            node.outer.setAttribute("transform", `translate(${ex.toFixed(1)},${ey.toFixed(1)})`);

            node.circle.setAttribute("r", String(nodeR));
            node.circle.setAttribute("fill", def.color);
            node.circle.setAttribute("stroke", isCurrent ? "#f4a261" : "rgba(255,255,255,0.15)");
            node.circle.setAttribute("stroke-width", isCurrent ? "3" : "1.5");
            node.circle.setAttribute("opacity", isCurrent ? "1" : "0.5");

            node.content.setAttribute("transform", `rotate(${rotationForText})`);

            node.emoji.setAttribute("font-size", isCurrent ? "24" : "16");
            node.emoji.textContent = def.emoji;

            node.badge.setAttribute("y", String(nodeR + 14));
            node.badge.setAttribute("font-size", isCurrent ? "10" : "8");
            node.badge.setAttribute("fill", isCurrent ? "#264653" : "#7a8a92");
            node.badge.textContent = `${rs}/${ROUNDS_TO_DEFEAT}`;

            node.label.setAttribute("y", String(nodeR + 26));
            node.label.setAttribute("fill", isCurrent ? "#264653" : "#9aabb2");
            node.label.textContent = def.name;
        });

        // Connector line: player -> active enemy
        const activeAngleDeg = (activePos / n) * 360 + 90;
        const activeAngleRad = (activeAngleDeg * Math.PI) / 180;
        const activeX = WHEEL_CX + WHEEL_R * Math.cos(activeAngleRad);
        const activeY = WHEEL_CY + WHEEL_R * Math.sin(activeAngleRad);

        const activeNodeRadius = activeIdx === idx ? 34 : 24;
        const enemyConnectorY = activeY + activeNodeRadius;

        // vsLine.setAttribute("x1", String(PLAYER_X));
        // vsLine.setAttribute("y1", String(PLAYER_LINE_Y));
        // vsLine.setAttribute("x2", activeX.toFixed(1));
        // vsLine.setAttribute("y2", enemyConnectorY.toFixed(1));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  CYCLE REACTOR
    // ═══════════════════════════════════════════════════════════════════════════

    let cycleReactor: ReactorHandle;
    cycleReactor = Reactor(() => {
        const rs = roundsSurvived.map(o => o.value);
        const ed = enemyDefeated.map(o => o.value);

        if (rs.every(r => r === 0) && ed.every(d => !d)) return;
        if (gameOver.value) return;

        const aliveIds = ENEMY_DEFS.map((_, i) => i).filter(i => !ed[i]);
        if (aliveIds.length === 0) {
            gameOver.value = true;
            stopClock();
            updateScene();
            return;
        }

        const currentIdx = selectorIdx.value;
        const nextAlive = aliveIds.find(i => i > currentIdx) ?? aliveIds[0];
        selectorIdx.value = nextAlive;
        timeLeft.value = ROUND_DURATION;

        updateScene();
        startClock();
    }, { deps: [...roundsSurvived, ...enemyDefeated], reaction_schedule: useScheduler ? renderSchedule : null });

    // ═══════════════════════════════════════════════════════════════════════════
    //  RENDER REACTOR
    // ═══════════════════════════════════════════════════════════════════════════

    let renderReactor: ReactorHandle;
    renderReactor = Reactor(() => {
        updateScene();
    }, { reaction_schedule: useScheduler ? renderSchedule : null });

    // Create persistent node DOM once
    ENEMY_DEFS.forEach(() => {
        const outer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const content = document.createElementNS("http://www.w3.org/2000/svg", "g");

        const emoji = document.createElementNS("http://www.w3.org/2000/svg", "text");
        emoji.setAttribute("text-anchor", "middle");
        emoji.setAttribute("dominant-baseline", "central");

        const badge = document.createElementNS("http://www.w3.org/2000/svg", "text");
        badge.setAttribute("text-anchor", "middle");
        badge.setAttribute("font-size", "8");
        badge.setAttribute("fill", "#7a8a92");
        badge.setAttribute("font-family", "Cinzel,serif");

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("font-size", "8");
        label.setAttribute("fill", "#9aabb2");
        label.setAttribute("font-family", "Cinzel,serif");

        content.append(emoji, badge, label);
        outer.append(circle, content);
        nodesG.appendChild(outer);

        activeNodeEls.push({ outer, circle, content, emoji, badge, label });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    btnSpeed.onclick = () => {
        if (gameOver.value) return;
        stopClock();
        timeLeft.value = 0;
        const idx = selectorIdx.value;
        roundsSurvived[idx].value = roundsSurvived[idx].value + 1;
        flush();
    };

    btnDefeat.onclick = () => {
        if (gameOver.value) return;
        stopClock();
        const idx = selectorIdx.value;
        enemyDefeated[idx].value = true;
        flush();
    };

    btnReset.onclick = () => {
        stopClock();
        stopRotationAnimation();
        currentWheelRotation = 0;
        targetWheelRotation = 0;

        roundsSurvived.forEach(o => { o.value = 0; });
        enemyDefeated.forEach(o => { o.value = false; });
        selectorIdx.value = 0;
        timeLeft.value = ROUND_DURATION;
        gameOver.value = false;

        updateScene();
        flush();
        startClock();
    };

    // ── Scheduler toggle ──────────────────────────────────────────────────────
    toggleInput.onchange = () => {
        useScheduler = toggleInput.checked;

        toggleBadge.textContent = useScheduler ? "ACTIVE" : "OFF";
        toggleBadge.className = `toggle-badge${useScheduler ? "" : " badge-off"}`;
        toggleHint.textContent = useScheduler
            ? "Compute flushes before render — the wheel rotates exactly once per round."
            : "Naive: roundsSurvived fires Cycle, then enemyDefeated fires it again — enemy skipped!";

        computeReactors.forEach(r => { r.reaction_schedule = useScheduler ? computeSchedule : null; });
        cycleReactor.reaction_schedule = useScheduler ? renderSchedule : null;
        renderReactor.reaction_schedule = useScheduler ? renderSchedule : null;

        mermaidPre.textContent = useScheduler ? MERMAID_SCHEDULER : MERMAID_NAIVE;
        mermaidPre.removeAttribute("data-processed");
        (window as any).mermaid?.run({ nodes: [mermaidPre] });
    };

    // ── Mermaid ───────────────────────────────────────────────────────────────
    const mermaidScript = document.createElement("script");
    mermaidScript.type = "module";
    mermaidScript.textContent = `
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        mermaid.initialize({
            startOnLoad: true,
            theme: 'neutral',
            flowchart: { useMaxWidth: true, htmlLabels: true },
            themeVariables: {
                primaryColor: '#264653',
                primaryTextColor: '#fffdf0',
                lineColor: '#f4a261',
                secondaryColor: '#2a9d8f',
                tertiaryColor: '#fffdf0'
            }
        });
        window.mermaid = mermaid;
    `;
    document.head.appendChild(mermaidScript);

    // ── Boot ──────────────────────────────────────────────────────────────────
    updateScene();
    flush();
    startClock();

    return root;
}