// color.ts
//
// sRGB ⇄ linear light ⇄ Oklab / OKLCH, WCAG contrast, ΔE, the deuteranopia
// simulation used by the metrics, the derived 50–950 ramps, and parsing
// what people type into color fields.

export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));

// "#RRGGBB" → [r, g, b], gamma-encoded, 0..1
export function rgb(hex: string): number[] {
    const h = hex.replace("#", "");
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
}

export const linearize = (c: number): number => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
export const gammaEncode = (c: number): number => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

// WCAG relative luminance Y
export function luminance(hex: string): number {
    const [r, g, b] = rgb(hex).map(linearize);
    return .2126 * r + .7152 * g + .0722 * b;
}

// WCAG 2 contrast ratio, 1..21
export function contrast(a: string, b: string): number {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

export function linearToOklab([r, g, b]: number[]): number[] {
    const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
    const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
    const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    return [
        .2104542553 * l + .7936177850 * m - .0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + .4505937099 * s,
        .0259040371 * l + .7827717662 * m - .8086757660 * s,
    ];
}

export const oklab = (hex: string): number[] => linearToOklab(rgb(hex).map(linearize));

// [L 0..1, C, H degrees]
export function oklch(hex: string): [number, number, number] {
    const [L, a, b] = oklab(hex);
    let H = Math.atan2(b, a) * 180 / Math.PI;
    if (H < 0) H += 360;
    return [L, Math.hypot(a, b), H];
}

// Oklab lightness, 0..100: the lightness used everywhere on the page
export const okL = (hex: string): number => oklab(hex)[0] * 100;

// CIELAB L*
export function cieL(hex: string): number {
    const Y = luminance(hex);
    return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
}

export function lchToLinear(L: number, C: number, H: number): number[] {
    const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
    const l = (L + .3963377774 * a + .2158037573 * b) ** 3;
    const m = (L - .1055613458 * a - .0638541728 * b) ** 3;
    const s = (L - .0894841775 * a - 1.2914855480 * b) ** 3;
    return [
        4.0767416621 * l - 3.3077115913 * m + .2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
        -.0041960863 * l - .7034186147 * m + 1.7076147010 * s,
    ];
}

export const toHex = (v: number[]): string =>
    "#" + v.map(c => Math.round(Math.min(1, Math.max(0, gammaEncode(c))) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();

// OKLCH → hex, reducing chroma until the color fits on an sRGB screen
export function lch(L: number, C: number, H: number): string {
    let c = C, v = lchToLinear(L, c, H), n = 0;
    while (v.some(x => x < -0.0005 || x > 1.0005) && n < 300) {
        c -= 0.002;
        v = lchToLinear(L, Math.max(0, c), H);
        n++;
    }
    return toHex(v);
}

// Largest displayable chroma up to `want` at this lightness and hue
export function gamutChroma(L: number, H: number, want: number): number {
    let lo = 0, hi = want;
    const fits = (c: number) => lchToLinear(L, c, H).every(x => x >= -1e-6 && x <= 1 + 1e-6);
    if (fits(want)) return want;
    for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
    }
    return lo;
}

// Oklab distance, ×100
export function deltaE(a: string, b: string): number {
    const x = oklab(a), y = oklab(b);
    return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

// Machado, Oliveira & Fernandes 2009, severity 1
const CVD_MATRICES: Record<string, number[][]> = {
    deutan: [[.367322, .860646, -.227968], [.280085, .672501, .047413], [-.011820, .042940, .968881]],
};

function simulatedOklab(hex: string, type: string): number[] {
    const v = rgb(hex).map(linearize), mat = CVD_MATRICES[type];
    return linearToOklab(mat.map(r => Math.min(1, Math.max(0, r[0] * v[0] + r[1] * v[1] + r[2] * v[2]))));
}

// ΔE between two colors as seen with a color-vision deficiency
export function deltaESim(a: string, b: string, type: string): number {
    const x = simulatedOklab(a, type), y = simulatedOklab(b, type);
    return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

// Readable label color on top of a swatch
export const onColor = (hex: string): string =>
    contrast(hex, "#000000") > contrast(hex, "#ffffff") ? "rgba(0,0,0,.74)" : "rgba(255,255,255,.88)";

export function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return "#" + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// hex → [H degrees, S %, L %]
export function hexToHsl(hex: string): number[] {
    const [r, g, b] = rgb(hex), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let H = 0, S = 0;
    if (d) {
        S = d / (1 - Math.abs(2 * l - 1));
        H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        H *= 60;
        if (H < 0) H += 360;
    }
    return [H, S * 100, l * 100];
}

// Straight sRGB mix, t = 0 → a, t = 1 → b
export function mix(a: string, b: string, t: number): string {
    const x = rgb(a), y = rgb(b);
    return "#" + x.map((c, i) => Math.round((c * (1 - t) + y[i] * t) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

//// Ramps

export interface RampStep {
    s: number | string; // step label
    hex: string;
    base?: boolean;     // the official / chosen color itself
    lab?: string;       // label above a base chip ("bg", "tx")
}

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const LIGHTNESS_TARGETS = [.97, .93, .87, .79, .71, .63, .55, .47, .38, .29, .22];
export const MIXS = [0, .1, .2, .3, .4, .5, .6, .7, .8]; // tint / tone / shade mix amounts

// 11-step ramp in OKLCH: hue fixed, chroma tapering toward the ends, the
// color itself kept exactly at its nearest step
export function derived(hex: string): RampStep[] {
    const [L0, C0, H] = oklch(hex);
    let near = 0;
    LIGHTNESS_TARGETS.forEach((l, i) => {
        if (Math.abs(l - L0) < Math.abs(LIGHTNESS_TARGETS[near] - L0)) near = i;
    });
    return STEPS.map((s, i) => {
        if (i === near) return { s, hex: hex.toUpperCase(), base: true };
        const L = LIGHTNESS_TARGETS[i];
        const d = L > L0 ? (L - L0) / Math.max(.01, 1 - L0) : (L0 - L) / Math.max(.01, L0);
        return { s, hex: lch(L, C0 * (1 - .72 * d * d), H) };
    });
}

//// Parsing: hex (3, 4, 6 or 8 digits), rgb(a), hsl(a) and oklch(); null when it isn't a color

export interface ParsedColor {
    hex: string;
    a: number; // alpha, 0..1
}

const toByteHex = (v: number[]) => "#" + v.map(c => Math.round(c * 255).toString(16).padStart(2, "0")).join("").toUpperCase();

export function parseColor(input: string): ParsedColor | null {
    const s = (input || "").trim().toLowerCase();
    let a = 1, m: RegExpMatchArray | null;
    const num = (v: string, max: number) => v.endsWith("%") ? parseFloat(v) / 100 * max : parseFloat(v);
    const parts = (body: string) => body.split(/[\s,\/]+/).filter(Boolean);

    if ((m = s.match(/^#?([0-9a-f]{3,8})$/))) {
        let h = m[1];
        if (h.length === 3 || h.length === 4) h = h.split("").map(c => c + c).join("");
        if (h.length !== 6 && h.length !== 8) return null;
        if (h.length === 8) {
            a = parseInt(h.slice(6), 16) / 255;
            h = h.slice(0, 6);
        }
        return { hex: "#" + h.toUpperCase(), a };
    }

    if ((m = s.match(/^rgba?\(([^)]+)\)$/))) {
        const p = parts(m[1]);
        if (p.length < 3) return null;
        const v = p.slice(0, 3).map(x => clamp(num(x, 255) / 255));
        if (v.some(isNaN)) return null;
        if (p[3]) a = clamp(num(p[3], 1));
        return { hex: toByteHex(v), a };
    }

    if ((m = s.match(/^hsla?\(([^)]+)\)$/))) {
        const p = parts(m[1]);
        if (p.length < 3) return null;
        const h = parseFloat(p[0]), sat = parseFloat(p[1]), l = parseFloat(p[2]);
        if ([h, sat, l].some(isNaN)) return null;
        if (p[3]) a = clamp(num(p[3], 1));
        return { hex: hslToHex(((h % 360) + 360) % 360, clamp(sat, 0, 100), clamp(l, 0, 100)), a };
    }

    if ((m = s.match(/^oklch\(([^)]+)\)$/))) {
        const p = parts(m[1]);
        if (p.length < 3) return null;
        const L = p[0].endsWith("%") ? parseFloat(p[0]) / 100 : parseFloat(p[0]), C = parseFloat(p[1]), H = parseFloat(p[2]);
        if ([L, C, H].some(isNaN)) return null;
        if (p[3]) a = clamp(num(p[3], 1));
        return { hex: lch(clamp(L), Math.max(0, C), H), a };
    }

    return null;
}
