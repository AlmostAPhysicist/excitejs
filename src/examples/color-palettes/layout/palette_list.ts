// palette_list.ts
//
// Every file in palettes/ becomes a palette:
//   *.ts    default export, a PaletteFile
//   *.css   CSS custom properties (the editor's CSS / Tailwind export)
//   *.json  design tokens or simple JSON (the editor's JSON exports)
// Missing fields are filled from PALETTE_DEFAULTS, and palettes are ordered
// by PALETTE_ORDER, then by file name.

import { PALETTE_DEFAULTS, PALETTE_ORDER, type Palette, type PaletteFile } from "../palette_settings.ts";
import { fromCSS, fromJSON, parsedToPalette } from "./palette_format.ts";

const modules = import.meta.glob<PaletteFile>("../palettes/*.ts", { eager: true, import: "default" });
const sheets = import.meta.glob<string>(["../palettes/*.css", "../palettes/*.json"], { eager: true, query: "?raw", import: "default" });

const fileName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

function loadAll(): Palette[] {
    const found: { file: string; p: PaletteFile }[] = [];
    for (const [path, p] of Object.entries(modules)) found.push({ file: fileName(path), p });
    for (const [path, text] of Object.entries(sheets)) {
        const file = fileName(path);
        try {
            const parsed = file.endsWith(".css") ? fromCSS(text) : fromJSON(JSON.parse(text));
            const p = parsedToPalette(parsed, file);
            if (p) found.push({ file, p });
            else console.warn(`palettes/${file}: needs a bg and tx color for both light and dark, skipped`);
        } catch (e) {
            console.warn(`palettes/${file}: could not be read, skipped`, e);
        }
    }

    const rank = (id: string) => { const i = PALETTE_ORDER.indexOf(id); return i < 0 ? PALETTE_ORDER.length : i; };
    found.sort((a, b) => rank(a.p.id) - rank(b.p.id) || a.file.localeCompare(b.file));

    const ids = new Set<string>();
    return found.map(({ p }) => {
        let id = p.id || "palette", n = 2;
        while (ids.has(id) || id === "create" || id === "custom") id = `${p.id}-${n++}`; // ids are routes
        ids.add(id);
        return { ...PALETTE_DEFAULTS, ...p, id };
    });
}

export const PALETTES: Palette[] = loadAll();
