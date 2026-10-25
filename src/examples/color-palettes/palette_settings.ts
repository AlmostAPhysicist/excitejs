// palette_settings.ts
//
// Everything about palettes that isn't specific to one palette: the shape a
// palette file describes (eight base slots and eight accent slots per theme),
// the helpers palette files are written with, the defaults filled in for
// fields a file leaves out, the page order, and the ranking presets.
//
// The palettes themselves are the files in palettes/. Every file there is
// listed: .ts modules (default export), and .css / .json files exported
// from the editor. layout/palette_list.ts loads them.

export type Mode = "light" | "dark";
export type ThemeColors = Record<string, string | null>; // slot/accent key → hex, null when the palette has none
export type Swatch = [string, string];                     // [name, hex]

export interface RowGroup { type: "row"; title: string; note: string; sw: Swatch[] }
export interface RunsGroup { type: "runs"; title: string; note: string; rows: [string, Swatch[]][] }
export type ExtraGroup = RowGroup | RunsGroup;

// One theme of a palette ("half" of a palette page). `after` orders a dark
// flavour after the main dark theme instead of before it.
export interface Theme {
    key: string;
    name: string;
    kind: Mode;
    after?: boolean;
    m: ThemeColors;
}

export interface Palette {
    id: string;
    name: string;
    description: string;            // one line, shown on cards and the palette page
    by: string;
    year: string;
    tier: string;                   // key of TIERS
    method: string;
    why: string;                    // the longer explanation
    variants: string;
    url: string;
    license: string;
    names: { light: string; dark: string };
    acc_note: Record<string, string>; // theme key → tag over the accents row
    map: string;                    // how the palette's own names map onto the slots
    light: ThemeColors;
    dark: ThemeColors;
    flavors: Theme[];
    extra: Record<string, ExtraGroup[]>; // theme key → more official colors
    // An official ramp for every accent (and "base"), replacing the derived ones
    ramps?: { steps: number[]; base_step: Record<Mode, number>; colors: Record<string, string[]> };
    neutrals?: Record<string, Swatch[]>;  // theme key → the palette's own neutral ramp, light → dark
    remix_labels?: Record<string, string>; // slot names carried into the editor when remixing
    labels?: Record<string, string>;       // the palette's own slot names, used in place of "red" etc.
    custom?: boolean;                      // the editor's in-progress palette
}

// What a palette file must provide; the rest comes from PALETTE_DEFAULTS
export type PaletteFile = Pick<Palette, "id" | "name" | "description" | "names" | "light" | "dark"> & Partial<Palette>;

export const PALETTE_DEFAULTS: Omit<Palette, "id" | "name" | "description" | "names" | "light" | "dark"> = {
    by: "",
    year: "",
    tier: "custom",
    method: "",
    why: "",
    variants: "One light, one dark.",
    url: "",
    license: "",
    acc_note: {},
    map: "",
    flavors: [],
    extra: {},
};

// Page order by id. Palettes not listed here follow, sorted by file name.
export const PALETTE_ORDER = ["flexoki", "solarized", "selenized", "modus", "everforest", "gruvbox", "kanagawa", "rosepine", "catppuccin", "tokyonight", "nord", "alabaster"];

export const SLOTS = ["bg", "bg2", "ui", "ui2", "ui3", "tx3", "tx2", "tx"];
export const SLOT_NAMES: Record<string, string> = { bg: "bg", bg2: "bg-2", ui: "ui", ui2: "ui-2", ui3: "ui-3", tx3: "tx-3", tx2: "tx-2", tx: "tx" };
export const SLOT_ROLES: Record<string, string> = { bg: "page", bg2: "panels", ui: "borders", ui2: "hover", ui3: "active", tx3: "faint", tx2: "muted", tx: "text" };
export const ACCENTS = ["re", "or", "ye", "gr", "cy", "bl", "pu", "ma"];
export const ACCENT_NAMES: Record<string, string> = { re: "red", or: "orange", ye: "yellow", gr: "green", cy: "cyan", bl: "blue", pu: "purple", ma: "magenta" };
export const TIERS: Record<string, [string, string]> = {
    custom: ["Custom", "t-aes"],
    model: ["Perceptual model", "t-model"],
    std: ["Accessibility standard", "t-std"],
    comfort: ["Comfort-focused", "t-comfort"],
    aes: ["Aesthetic", "t-aes"],
    philo: ["Design principle", "t-philo"],
};

//// Helpers for palette files

export const swatchRow = (title: string, note: string, sw: Swatch[]): RowGroup => ({ type: "row", title, note, sw });
export const swatchRuns = (title: string, note: string, rows: [string, Swatch[]][]): RunsGroup => ({ type: "runs", title, note, rows });

// Eight accent hexes (in ACCENTS order) → named swatches, skipping empty slots
export const accentSwatches = (hexes: (string | null)[]): Swatch[] =>
    ACCENTS.map((k, i) => [ACCENT_NAMES[k], hexes[i]] as Swatch).filter(x => x[1]);

// Eight base hexes and eight accent hexes, in slot order → one theme
export function makeTheme(base: (string | null)[], accents: (string | null)[]): ThemeColors {
    const out: ThemeColors = {};
    SLOTS.forEach((k, i) => out[k] = base[i] ?? null);
    ACCENTS.forEach((k, i) => out[k] = accents[i] ?? null);
    return out;
}

// All themes of a palette, ordered light → dark
export function themes(p: Palette): Theme[] {
    const flavors = p.flavors || [];
    return [
        { key: "light", name: p.names.light, kind: "light", m: p.light },
        ...flavors.filter(f => f.kind === "light"),
        ...flavors.filter(f => f.kind === "dark" && !f.after),
        { key: "dark", name: p.names.dark, kind: "dark", m: p.dark },
        ...flavors.filter(f => f.kind === "dark" && f.after),
    ];
}

// A slot's color, or a fallback when the palette leaves it empty
export const slotOr = (m: ThemeColors, k: string, fallback: string): string => m[k] || fallback;

//// Ranking presets: weight per criterion key, 0..5

export const PRESETS: Record<string, Record<string, number>> = {
    "Balanced": { text: 3, legible: 3, balance: 3, distinct: 3, cvd: 3, calm: 2, coverage: 2, parity: 1, gray: 0, flavours: 0 },
    "Accessibility first": { text: 5, legible: 5, balance: 1, distinct: 3, cvd: 5, calm: 0, coverage: 1, parity: 1, gray: 2, flavours: 0 },
    "Calm first": { text: 1, legible: 1, balance: 5, distinct: 2, cvd: 1, calm: 5, coverage: 0, parity: 2, gray: 0, flavours: 0 },
    "Color-blind friendly": { text: 2, legible: 2, balance: 1, distinct: 3, cvd: 5, calm: 0, coverage: 0, parity: 0, gray: 3, flavours: 0 },
    "Variety": { text: 1, legible: 1, balance: 1, distinct: 2, cvd: 1, calm: 1, coverage: 4, parity: 0, gray: 0, flavours: 5 },
};
