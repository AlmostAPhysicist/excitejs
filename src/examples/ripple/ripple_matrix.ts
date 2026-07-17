// ripple_matrix.ts
import { Observable, Reactor, Scheduler } from "../../index";
import { calculateRipple, toCellHTML, type WaveParams } from "./matrix_helpers";

export function RippleMatrix(): HTMLDivElement {
    // 1. Setup Scheduler
    const scheduler = Scheduler();
    const compute_s = scheduler.getOrCreate("compute");
    const render_s = scheduler.getOrCreate("render");

    // 2. High-Frequency State (snake_case)
    const wave_frequency = Observable<number>(0.4);
    const wave_amplitude = Observable<number>(80);
    const wave_phase = Observable<number>(0);

    // Packaged configuration for processing
    const live_params = Observable<WaveParams>({ frequency: 0.4, amplitude: 80, phase: 0 });

    // Grid Dimensions (50x50 = 2,500 Nodes)
    const grid_size = 50;
    const center_point = grid_size / 2;

    // 3. Structural Layout Elements
    const container = document.createElement("div");
    container.className = "matrix-workbench";

    const control_panel = document.createElement("div");
    control_panel.className = "control-panel";

    // Continuous slider tracks
    const freq_slider = document.createElement("input");
    freq_slider.type = "range"; freq_slider.min = "0.1"; freq_slider.max = "1.5"; freq_slider.step = "0.01"; freq_slider.value = "0.4";

    const amp_slider = document.createElement("input");
    amp_slider.type = "range"; amp_slider.min = "10"; amp_slider.max = "100"; amp_slider.step = "1"; amp_slider.value = "80";

    const phase_slider = document.createElement("input");
    phase_slider.type = "range"; phase_slider.min = "0"; phase_slider.max = "10"; phase_slider.step = "0.1"; phase_slider.value = "0";

    control_panel.append(
        document.createTextNode("Wave Frequency:"), freq_slider,
        document.createElement("br"),
        document.createTextNode("Wave Amplitude:"), amp_slider,
        document.createElement("br"),
        document.createTextNode("Phase Shift:"), phase_slider
    );

    // The Render Target Canvas
    const grid_viewport = document.createElement("div");
    grid_viewport.className = "grid-viewport";

    // Strict layout styles to stack elements cleanly
    grid_viewport.style.display = "grid";
    grid_viewport.style.gridTemplateColumns = `repeat(${grid_size}, 1fr)`;
    grid_viewport.style.gap = "2px";
    grid_viewport.style.width = "500px";
    grid_viewport.style.height = "500px";
    grid_viewport.style.background = "#0f172a";
    grid_viewport.style.padding = "10px";

    container.append(control_panel, grid_viewport);

    // 4. Reactive Pipeline

    // Phase 1 (Compute): Collate state inputs into unified geometry configuration
    Reactor(() => {
        live_params.value = {
            frequency: wave_frequency.value,
            amplitude: wave_amplitude.value,
            phase: wave_phase.value
        };
    }, { reaction_schedule: compute_s });

    // Phase 2 (Intense Render): Drop old DOM nodes, process 2,500 points, allocation bottleneck
    Reactor(() => {
        const params = live_params.value;

        // CRITICAL BOOTLENECK START: Blow away the previous 2,500 element nodes
        grid_viewport.innerHTML = "";

        // Double-loop allocation to assemble the procedural grid matrix
        for (let y = 0; y < grid_size; y++) {
            for (let x = 0; x < grid_size; x++) {
                // 1. Math calculation step
                const intensity = calculateRipple(x, y, center_point, center_point, params);

                // 2. Heavy DOM Node instantiation and inline styling injection
                const cell_element = toCellHTML(intensity);

                // 3. Mount onto active layout tree
                grid_viewport.appendChild(cell_element);
            }
        }
        // CRITICAL BOTTLENECK END
    }, { reaction_schedule: render_s });


    // 5. Native DOM Event Listeners (Triggers dozens of events per second on mouse drag)
    freq_slider.oninput = () => {
        wave_frequency.value = parseFloat(freq_slider.value);
    };

    amp_slider.oninput = () => {
        wave_amplitude.value = parseFloat(amp_slider.value);
    };

    phase_slider.oninput = () => {
        wave_phase.value = parseFloat(phase_slider.value);
    };

    return container;
}