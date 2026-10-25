// verify_sources.mjs
//
// Checks every built-in palette against the upstream files it cites. Each
// palettes/*.ts file lists its sources in its header comment:
//   //   fetch: <url>
//   //   not upstream: #hex (why)
// This downloads the fetch URLs and reports any hex in the palette's code that
// none of them contains (3-digit shorthands like #c33 count). CSS / JSON
// palettes (from the editor) have no upstream and are skipped.
//
//   node src/examples/color-palettes/testing/verify_sources.mjs
//
// Needs network access. Exits 1 if anything is missing.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "palettes");
let failed = false;

for (const file of readdirSync(DIR).filter(f => f.endsWith(".ts")).sort()) {
    const text = readFileSync(join(DIR, file), "utf8");
    const comments = text.split("\n").filter(l => l.trimStart().startsWith("//")).join("\n");
    const code = text.split("\n").filter(l => !l.trimStart().startsWith("//")).join("\n");

    const urls = [...comments.matchAll(/fetch:\s*(\S+)/g)].map(m => m[1]);
    const known = new Set([...comments.matchAll(/not upstream:\s*(#[0-9a-f]{6})/gi)].map(m => m[1].toLowerCase()));
    if (!urls.length) { console.log(`?  ${file}: no fetch: lines`); failed = true; continue; }

    // hexes in the palette: #rrggbb, plus space-separated bare runs ("dc8a78 dd7878 …")
    const hexes = new Set((code.match(/#[0-9a-f]{6}\b/gi) || []).map(h => h.toLowerCase()));
    for (const m of code.matchAll(/"((?:[0-9a-f]{6} )+[0-9a-f]{6})"/gi)) m[1].split(" ").forEach(h => hexes.add("#" + h.toLowerCase()));

    let source = "";
    for (const url of urls) {
        const res = await fetch(url);
        if (!res.ok) { console.log(`✗  ${file}: ${url} → HTTP ${res.status}`); failed = true; continue; }
        source += "\n" + (await res.text()).toLowerCase();
    }
    // expand #abc shorthands
    source += " " + [...source.matchAll(/#([0-9a-f])([0-9a-f])([0-9a-f])\b/g)].map(m => `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`).join(" ");

    const missing = [...hexes].filter(h => !known.has(h) && !source.includes(h) && !source.includes(`"${h.slice(1)}"`) && !source.includes(`0x${h.slice(1)}`));
    if (missing.length) failed = true;
    console.log(`${missing.length ? "✗" : "✓"}  ${file}: ${hexes.size} colors, ${urls.length} source${urls.length > 1 ? "s" : ""}${known.size ? `, ${known.size} marked not upstream` : ""}${missing.length ? `\n     not found upstream: ${missing.join(" ")}` : ""}`);
}

for (const file of readdirSync(DIR).filter(f => !f.endsWith(".ts")).sort()) console.log(`-  ${file}: editor export, no upstream to check`);
process.exit(failed ? 1 : 0);
