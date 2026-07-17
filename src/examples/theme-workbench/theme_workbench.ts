// theme_workbench.ts
import { Observable, Reactor, Scheduler } from "../../index";
import { createPreviewCard, createPreviewButton, createAlertBox } from "./theme_helpers";
import { type StyleConfig } from "./theme_helpers";

export function ThemeWorkbench(): HTMLDivElement {
    const scheduler = Scheduler();
    const compute_s = scheduler.getOrCreate("compute");
    const render_s = scheduler.getOrCreate("render");

    const primary_hue = Observable<number>(220);
    const raw_radius = Observable<number>(8);
    const raw_padding = Observable<number>(16);

    const computed_styles = Observable<StyleConfig>({
        primary_color: "hsl(220, 85%, 45%)",
        accent_color: "hsl(250, 85%, 65%)",
        border_radius: "8px",
        padding_scale: "16px"
    });

    const container = document.createElement("div");
    container.className = "workbench-container";

    const control_panel = document.createElement("div");
    control_panel.className = "control-panel";

    const hue_slider = document.createElement("input");
    hue_slider.type = "range"; hue_slider.min = "0"; hue_slider.max = "360"; hue_slider.value = "220";

    const radius_slider = document.createElement("input");
    radius_slider.type = "range"; radius_slider.min = "0"; radius_slider.max = "30"; radius_slider.value = "8";

    const padding_slider = document.createElement("input");
    padding_slider.type = "range"; padding_slider.min = "6"; padding_slider.max = "32"; padding_slider.value = "16";

    control_panel.append(
        document.createTextNode("Theme Primary Hue:"), hue_slider,
        document.createElement("br"),
        document.createTextNode("Border Radius (px):"), radius_slider,
        document.createElement("br"),
        document.createTextNode("Padding Scale (px):"), padding_slider
    );

    const preview_canvas = document.createElement("div");
    preview_canvas.className = "preview-canvas";
    preview_canvas.style.background = "#f3f4f6";
    preview_canvas.style.padding = "24px";

    container.append(control_panel, preview_canvas);

    // --- DOM ELEMENT CACHE REFERENCES ---
    let is_mounted = false;
    let card1: HTMLDivElement, card2: HTMLDivElement, card3: HTMLDivElement;
    let btn1: HTMLButtonElement, btn2: HTMLButtonElement;
    let alert_box: HTMLDivElement;

    // Phase 1 (Compute)
    Reactor(() => {
        const hue = primary_hue.value;
        computed_styles.value = {
            primary_color: `hsl(${hue}, 85%, 45%)`,
            accent_color: `hsl(${(hue + 40) % 360}, 85%, 60%)`,
            border_radius: `${raw_radius.value}px`,
            padding_scale: `${raw_padding.value}px`
        };
    }, { reaction_schedule: compute_s });

    // Phase 2 (Optimized Render)
    Reactor(() => {
        const styles = computed_styles.value;

        if (!is_mounted) {
            // INITIAL RENDER ONLY: Allocate elements onto the screen
            const grid = document.createElement("div");
            grid.style.display = "grid";
            grid.style.gap = "16px";
            grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(200px, 1fr))";

            card1 = createPreviewCard("Analytics Node", "Real-time stream evaluation window metrics.", styles);
            card2 = createPreviewCard("System Settings", "Configure secure network tokens and parameters.", styles);
            card3 = createPreviewCard("Cloud Node", "Storage threshold clusters operating correctly.", styles);
            grid.append(card1, card2, card3);

            const action_bar = document.createElement("div");
            action_bar.style.marginTop = "20px";
            action_bar.style.display = "flex";
            action_bar.style.gap = "12px";

            btn1 = createPreviewButton("Save Configuration", true, styles);
            btn2 = createPreviewButton("Reset Layout", false, styles);
            action_bar.append(btn1, btn2);

            alert_box = createAlertBox("Notice: Applying adjustments changes globally active DOM nodes.", styles);
            alert_box.style.marginTop = "20px";

            preview_canvas.append(grid, action_bar, alert_box);
            is_mounted = true;
        } else {
            // HIGH PERFORMANCE RE-RENDER: Mutate inline layout directly without deleting anything!
            // Update Card 1
            card1.style.borderRadius = styles.border_radius;
            card1.style.padding = styles.padding_scale;
            card1.style.borderColor = styles.accent_color;
            (card1.querySelector("h3") as HTMLElement).style.color = styles.primary_color;

            // Update Card 2
            card2.style.borderRadius = styles.border_radius;
            card2.style.padding = styles.padding_scale;
            card2.style.borderColor = styles.accent_color;
            (card2.querySelector("h3") as HTMLElement).style.color = styles.primary_color;

            // Update Card 3
            card3.style.borderRadius = styles.border_radius;
            card3.style.padding = styles.padding_scale;
            card3.style.borderColor = styles.accent_color;
            (card3.querySelector("h3") as HTMLElement).style.color = styles.primary_color;

            // Update Primary Button
            btn1.style.borderRadius = styles.border_radius;
            btn1.style.padding = `calc(${styles.padding_scale} * 0.5) ${styles.padding_scale}`;
            btn1.style.backgroundColor = styles.primary_color;

            // Update Secondary Button
            btn2.style.borderRadius = styles.border_radius;
            btn2.style.padding = `calc(${styles.padding_scale} * 0.5) ${styles.padding_scale}`;
            btn2.style.color = styles.primary_color;
            btn2.style.borderColor = styles.primary_color;

            // Update Alert Box
            alert_box.style.borderRadius = styles.border_radius;
            alert_box.style.padding = styles.padding_scale;
            alert_box.style.backgroundColor = `${styles.accent_color}22`;
            alert_box.style.borderColor = styles.accent_color;
            alert_box.style.color = styles.primary_color;
        }
    }, { reaction_schedule: render_s });

    // 5. Native DOM Event Listeners
    hue_slider.oninput = () => { primary_hue.value = parseInt(hue_slider.value, 10); };
    radius_slider.oninput = () => { raw_radius.value = parseInt(radius_slider.value, 10); };
    padding_slider.oninput = () => { raw_padding.value = parseInt(padding_slider.value, 10); };

    return container;
}