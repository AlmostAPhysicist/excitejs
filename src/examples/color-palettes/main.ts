// main.ts
//
// Color Palettes: a field guide to color schemes that are easy on the eyes.
//
//   route ──► [router] ──► HomePage | PalettePage | CreatePage
//
// The router is one Reactor with explicit deps on `route`. Each page returns
// the Reactors it created; the router hands back a cleanup that disposes
// them, which ExciteJS runs as the preaction before the next page renders.
//
// Folders:
//   palette_settings.ts   palette shape, defaults, page order, ranking presets
//   palettes/             one file per palette; every file there is listed
//   layout/               pages, shared state and helpers, styles
//   theory_and_history/   the color theory section and research palettes
//   testing/              browser smoke test and upstream source check

import "./layout/base.css";
import "./layout/palette.css";
import "./layout/tools.css";
import { Reactor } from "../../core/index";
import { PALETTES } from "./layout/palette_list.ts";
import { HomePage, loadMathJax } from "./layout/home.ts";
import { PalettePage, installPaletteShortcuts } from "./layout/palette_page.ts";
import { CreatePage } from "./layout/create_page.ts";
import { app, bar, flash, focus_key, go, page, route, toast } from "./layout/state.ts";

//// Shell

const CVD_FILTERS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="cvd-deutan"><feColorMatrix type="matrix" values="0.367322 0.860646 -0.227968 0 0  0.280085 0.672501 0.047413 0 0  -0.011820 0.042940 0.968881 0 0  0 0 0 1 0"/></filter>
  <filter id="cvd-protan"><feColorMatrix type="matrix" values="0.152286 1.052583 -0.204868 0 0  0.114503 0.786281 0.099216 0 0  -0.003882 -0.048116 1.051998 0 0  0 0 0 1 0"/></filter>
  <filter id="cvd-tritan"><feColorMatrix type="matrix" values="1.255528 -0.076749 -0.178779 0 0  -0.078411 0.930809 0.147602 0 0  0.004733 0.691367 0.303900 0 0  0 0 0 1 0"/></filter>
  <filter id="cvd-gray"><feColorMatrix type="saturate" values="0"/></filter>
</svg>`;

const header = document.createElement("header");
header.className = "bar";
header.append(bar);
document.body.insertAdjacentHTML("beforeend", CVD_FILTERS);
document.body.append(header, app, toast);

//// Global listeners

// Any [data-hex] copies its color; any [data-go] navigates
document.addEventListener("click", e => {
    const t = e.target as HTMLElement;
    const s = t.closest<HTMLElement>("[data-hex]");
    if (s) {
        const h = s.dataset.hex!.toUpperCase();
        try { navigator.clipboard.writeText(h).then(() => flash("Copied " + h), () => flash(h)); } catch (_) { flash(h); }
        return;
    }
    const g = t.closest<HTMLElement>("[data-go]");
    if (g) { e.preventDefault(); go(g.dataset.go!); }
});
installPaletteShortcuts();
loadMathJax();

//// Router

let current = ""; // the id last rendered, normalised

Reactor(() => {
    const id = route.value;
    const p = PALETTES.find(x => x.id === id);
    current = p ? p.id : id === "create" ? "create" : "";
    focus_key._value = null;
    page.palette = null;

    const reactors = p ? PalettePage(p) : id === "create" ? CreatePage() : HomePage();

    // a home-page section id (e.g. #theory) scrolls to it
    const anchor = !p && id && id !== "create" ? document.getElementById(id) : null;
    if (anchor) anchor.scrollIntoView();
    else window.scrollTo(0, 0);

    return () => reactors.forEach(r => r.dispose());
}, { deps: [route], initFn: true });

window.addEventListener("popstate", () => route.value = location.hash.slice(1));
window.addEventListener("hashchange", () => {
    const h = location.hash.slice(1);
    if (h !== current) route.value = h;
});
