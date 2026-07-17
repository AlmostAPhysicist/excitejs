// matrix_helpers.ts

export interface WaveParams {
    frequency: number;
    amplitude: number;
    phase: number;
}

/**
 * Pure helper to calculate the ripple depth (0 to 1) for a grid coordinate
 */
export function calculateRipple(x: number, y: number, center_x: number, center_y: number, params: WaveParams): number {
    // Distance formula from the center point of the grid
    const distance = Math.sqrt((x - center_x) ** 2 + (y - center_y) ** 2);

    // Trigonometric sine wave calculation
    const current_wave = Math.sin(distance * params.frequency - params.phase);

    // Normalize value from [-1, 1] to a [0, 1] scale, factored by amplitude
    return (current_wave + 1) / 2 * (params.amplitude / 100);
}

/**
 * Pure DOM factory helper to construct a single high-intensity cell block
 */
export function toCellHTML(intensity: number): HTMLDivElement {
    const cell = document.createElement("div");
    cell.className = "matrix-cell";

    // Force the rendering engine to compute complex CSS transformations
    const size_scale = 0.3 + intensity * 0.7; // Scale from 30% to 100%
    const hue = Math.floor(180 + intensity * 100); // Shift color from Cyan to Magenta

    cell.style.width = "100%";
    cell.style.aspectRatio = "1";
    cell.style.borderRadius = `${intensity * 50}%`;
    cell.style.transform = `scale(${size_scale})`;
    cell.style.backgroundColor = `hsl(${hue}, 85%, 50%)`;
    cell.style.transition = "transform 0.05s ease-out"; // Force active layout interpolation

    return cell;
}