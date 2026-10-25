// picker.ts
//
// The interactive parts of the theory section: the RGBA mixer, and the OKLCH
// picker (hue/chroma wheel + lightness slider) with everything that follows
// the picked color: tints/tones/shades/ramp rows, the lightness meter,
// contrast on white and black, harmonies and the nearest palette accents.
//
// `pick` (state.ts) is the single source of truth. Every input writes it
// through setPick(); one Reactor redraws all the outputs.

import { Observable, Reactor } from "../../../core/index";
import { ACCENTS, ACCENT_NAMES, themes } from "../palette_settings.ts";
import { PALETTES } from "../layout/palette_list.ts";
import { MIXS, cieL, clamp, contrast, deltaE, derived, gammaEncode, gamutChroma, hexToHsl, lch, lchToLinear, mix, okL, oklch, onColor, parseColor, rgb, type RampStep } from "../layout/color.ts";
import { overlay_key, pick, type Pick } from "../layout/state.ts";

const MAX_C = 0.37; // chroma at the wheel's rim

const $ = (id: string) => document.getElementById(id) as any;
const pickHex = (p: Pick) => lch(p.L, p.C, p.H);

//// RGBA mixer

function RgbaMixer(): Reactor {
    const rg = $("rgba");
    const rgba = Observable({ r: 30, g: 102, b: 245, a: 1 });
    const channels: [string, string, string, number][] = [["r", "R", "#e5484d", 255], ["g", "G", "#30a46c", 255], ["b", "B", "#3e63dd", 255], ["a", "A", "var(--ink-2)", 1]];

    rg.innerHTML = `<div class="rgba-sw checker"><i></i></div>${channels.map(([k, n, c, max]) => `<label class="rgba-row"><span style="color:${c};font-weight:600">${n}</span><input type="range" id="rg-${k}" min="0" max="${max}" step="${max === 1 ? .01 : 1}" value="${(rgba.value as any)[k]}" style="accent-color:${c}"><span class="mono" data-v="${k}"></span></label>`).join("")}<span class="rgba-out mono"></span>`;
    channels.forEach(([k]) => $("rg-" + k).oninput = (e: Event) => {
        rgba.value = { ...rgba.value, [k]: +(e.target as HTMLInputElement).value };
    });

    return Reactor(() => {
        const st = rgba.value;
        const hex = "#" + [st.r, st.g, st.b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
        rg.querySelector(".rgba-sw i").style.background = `rgba(${st.r},${st.g},${st.b},${st.a})`;
        rg.querySelector(".rgba-out").textContent = `rgba(${st.r}, ${st.g}, ${st.b}, ${st.a})  ·  ${hex}`;
        ["r", "g", "b", "a"].forEach(k => rg.querySelector(`[data-v="${k}"]`).textContent = (st as any)[k]);
    });
}

//// Wheel drawing

// Every displayable hue/chroma at the picked lightness, painted pixel by pixel
function drawPlane(L: number): void {
    const cv = $("wcv") as HTMLCanvasElement;
    if (!cv) return;
    const ctx = cv.getContext("2d")!, N = cv.width, R = N / 2 - 2, img = ctx.createImageData(N, N), d = img.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const dx = x - N / 2 + .5, dy = N / 2 - y - .5, r = Math.hypot(dx, dy);
        if (r > R) continue;
        const C = r / R * MAX_C, H = Math.atan2(dy, dx) * 180 / Math.PI;
        const v = lchToLinear(L, C, H);
        if (v.some(c => c < -0.001 || c > 1.001)) continue;
        const i = (y * N + x) * 4;
        d[i] = Math.round(clamp(gammaEncode(v[0])) * 255);
        d[i + 1] = Math.round(clamp(gammaEncode(v[1])) * 255);
        d[i + 2] = Math.round(clamp(gammaEncode(v[2])) * 255);
        d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
}

// Chroma rings, hue labels and (optionally) one theme's accents as dots
function drawOverlay(key: string): void {
    const ov = $("wov");
    if (!ov) return;
    let g = `<circle cx="150" cy="150" r="148" fill="none" stroke="var(--line-2)" stroke-dasharray="3 4"/>`;
    [.1, .2, .3].forEach(c => g += `<circle cx="150" cy="150" r="${c / MAX_C * 148}" fill="none" stroke="var(--line)" stroke-opacity=".6"/><text x="153" y="${150 - c / MAX_C * 148 + 11}" font-size="9" fill="var(--ink-3)" font-family="IBM Plex Mono,monospace">C ${c}</text>`);
    ([[0, "0°"], [90, "90°"], [180, "180°"], [270, "270°"]] as [number, string][]).forEach(([a, t]) => g += `<text x="${150 + 138 * Math.cos(a * Math.PI / 180)}" y="${150 - 138 * Math.sin(a * Math.PI / 180) + 3}" text-anchor="middle" font-size="9" fill="var(--ink-3)" font-family="IBM Plex Mono,monospace">${t}</text>`);
    if (key !== "none") {
        const [pid, theme_key] = key.split(":"), p = PALETTES.find(x => x.id === pid), t = p && themes(p).find(x => x.key === theme_key);
        if (t) ACCENTS.filter(k => t.m[k]).forEach(k => {
            const [, C, H] = oklch(t.m[k]!), r = Math.min(C, MAX_C) / MAX_C * 148;
            g += `<circle cx="${150 + r * Math.cos(H * Math.PI / 180)}" cy="${150 - r * Math.sin(H * Math.PI / 180)}" r="7" fill="${t.m[k]}" stroke="var(--surface)" stroke-width="2"><title>${ACCENT_NAMES[k]} ${t.m[k]}</title></circle>`;
        });
    }
    ov.innerHTML = g;
}

//// Outputs that follow the picked color

function drawFollowers(hex: string, p: Pick, a: number): void {
    const [hh, hs, hl] = hexToHsl(hex), on_white = a < 1 ? mix("#FFFFFF", hex, a) : null, on_black = a < 1 ? mix("#000000", hex, a) : null;

    const sw = $("pk-sw");
    sw.style.background = a < 1 ? `linear-gradient(90deg, ${on_white} 50%, ${on_black} 50%)` : hex;
    sw.style.color = onColor(hex);
    sw.innerHTML = `<span>${hex}${a < 1 ? ` · α ${a.toFixed(2)}` : ""}</span><span>${p.Cw - p.C > .004 ? "chroma limited by screen" : ""}</span>`;
    $("pk-kv").innerHTML = `<dt>OKLCH</dt><dd>oklch(${p.L.toFixed(3)} ${p.C.toFixed(3)} ${p.H.toFixed(1)})</dd><dt>RGB</dt><dd>rgb(${rgb(hex).map(c => Math.round(c * 255)).join(" ")}${a < 1 ? ` / ${a.toFixed(2)}` : ""})</dd><dt>HSL</dt><dd>hsl(${hh.toFixed(0)} ${hs.toFixed(0)}% ${hl.toFixed(0)}%)</dd>${a < 1 ? `<dt>On white</dt><dd>${on_white}</dd><dt>On black</dt><dd>${on_black}</dd>` : ""}`;

    // tints, tones, shades, ramp
    const row = (n: string, s: string, list: (string | RampStep)[], base_first = false) =>
        `<div class="strip-row"><span class="lab">${n}<small>${s}</small></span><div class="cells">${list.map((c: any, i) => `<button data-hex="${c.hex || c}" title="${c.hex || c}" aria-label="${c.hex || c}" style="background:${c.hex || c}" class="${(base_first && i === 0) || c.base ? "cell-base" : ""}"></button>`).join("")}</div></div>`;
    $("hue-rows").innerHTML = row("Tints", "+ white", MIXS.map(t => mix(hex, "#FFFFFF", t)), true)
        + row("Tones", "+ gray", MIXS.map(t => mix(hex, "#8A8A8A", t)), true)
        + row("Shades", "+ black", MIXS.map(t => mix(hex, "#000000", t)), true)
        + row("Ramp", "50 → 950", derived(hex))
        + `<p style="font-size:12.5px;color:var(--ink-3)">The outlined cell is the picked color.</p>`;

    // lightness, three ways
    const L = okL(hex);
    $("lmeter").innerHTML = `<span class="label">The picked color, measured three ways</span>
  <div class="lm-row"><span>HSL lightness</span><span class="lbar"><b style="width:${hl}%;background:var(--ink-3)"></b></span><span>${hl.toFixed(0)}</span></div>
  <div class="lm-row"><span>CIELAB L*</span><span class="lbar"><b style="width:${cieL(hex)}%;background:var(--ink-2)"></b></span><span>${cieL(hex).toFixed(0)}</span></div>
  <div class="lm-row"><span>Oklab L</span><span class="lbar"><b style="width:${L}%"></b></span><span>${L.toFixed(0)}</span></div>`;

    // contrast, harmonies, nearest accents
    const cw = contrast(hex, "#FFFFFF"), cb = contrast(hex, "#000000");
    const verdict = (c: number) => c >= 7 ? "AAA" : c >= 4.5 ? "AA" : c >= 3 ? "large text only" : "fails";
    $("pk-contrast").innerHTML = `<div class="contrast-demo"><div style="background:#FFFFFF;color:${hex}"><b>Aa text</b>on white · ${cw.toFixed(2)}:1 ${verdict(cw)}</div><div style="background:#000000;color:${hex}"><b>Aa text</b>on black · ${cb.toFixed(2)}:1 ${verdict(cb)}</div></div>`;
    $("pk-harm").innerHTML = ([["picked", 0], ["complement", 180], ["analog −30°", -30], ["analog +30°", 30], ["triad +120°", 120], ["triad −120°", -120]] as [string, number][]).map(([n, dd]) => {
        const c = dd ? lch(p.L, p.C, (p.H + dd + 360) % 360) : hex;
        return `<button class="sw" data-hex="${c}"><i style="background:${c}"></i>${n}<span>${c}</span></button>`;
    }).join("");

    const near: { p: typeof PALETTES[number]; t: ReturnType<typeof themes>[number]; k: string; c: string; d: number }[] = [];
    PALETTES.forEach(pal => themes(pal).forEach(t => ACCENTS.forEach(k => {
        if (t.m[k]) near.push({ p: pal, t, k, c: t.m[k]!, d: deltaE(hex, t.m[k]!) });
    })));
    near.sort((x, y) => x.d - y.d);
    $("pk-near").innerHTML = near.filter((x, i, arr) => arr.findIndex(y => y.p === x.p) === i)
        .map(x => `<div><i style="background:${hex}"></i><i style="background:${x.c}"></i>${x.p.name} ${x.t.name} · ${ACCENT_NAMES[x.k]}<span>${x.d.toFixed(1)}</span></div>`).join("");
}

//// Setup

// Wires the theory widgets on a freshly rendered home page; returns its Reactors
export function TheoryWidgets(): Reactor[] {
    const box = $("wbox"), pt = $("wpt"), lsl = $("lsl"), txt = $("pk-text"), picker = $("pk-pick"), err = $("pk-err");

    // Typed and system-picker values keep their text and alpha; everything else resets them
    let from_text = false;
    function setPick(next: Pick, text = false): void {
        next.C = gamutChroma(next.L, next.H, next.Cw);
        if (!text) next.a = 1;
        from_text = text;
        pick.value = next;
        from_text = false;
    }
    function setHex(hex: string, a: number): void {
        const [L, C, H] = oklch(hex);
        setPick({ ...pick.value, L, C, Cw: C, H: C > .002 ? H : pick.value.H, a }, true);
    }

    // wheel: drag or arrow keys
    const fromPointer = (e: PointerEvent) => {
        const r = box.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width * 300 - 150, dy = 150 - (e.clientY - r.top) / r.height * 300;
        let H = Math.atan2(dy, dx) * 180 / Math.PI;
        if (H < 0) H += 360;
        setPick({ ...pick.value, H, Cw: Math.min(1, Math.hypot(dx, dy) / 148) * MAX_C });
    };
    let dragging = false;
    box.addEventListener("pointerdown", (e: PointerEvent) => { dragging = true; box.setPointerCapture(e.pointerId); fromPointer(e); pt.focus({ preventScroll: true }); });
    box.addEventListener("pointermove", (e: PointerEvent) => { if (dragging) fromPointer(e); });
    box.addEventListener("pointerup", () => dragging = false);
    box.addEventListener("pointercancel", () => dragging = false);
    pt.addEventListener("keydown", (e: KeyboardEvent) => {
        const d = ({ ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, .005], ArrowDown: [0, -.005] } as Record<string, number[]>)[e.key];
        if (!d) return;
        e.preventDefault();
        const p = pick.value;
        setPick({ ...p, H: (p.H + d[0] + 360) % 360, Cw: clamp(p.C + d[1], 0, MAX_C) });
    });
    lsl.oninput = () => setPick({ ...pick.value, L: +lsl.value });

    // text field and system picker
    txt.oninput = () => {
        const r = parseColor(txt.value);
        if (!r) { err.hidden = false; return; }
        err.hidden = true;
        setHex(r.hex, r.a);
    };
    picker.oninput = () => {
        err.hidden = true;
        txt.value = picker.value.toUpperCase();
        setHex(picker.value.toUpperCase(), 1);
    };
    $("ovl").onchange = (e: Event) => overlay_key.value = (e.target as HTMLSelectElement).value;

    const p0 = pick.value;
    txt.value = p0.a < 1 ? `rgba(${rgb(pickHex(p0)).map(c => Math.round(c * 255)).join(", ")}, ${+p0.a.toFixed(2)})` : pickHex(p0);

    let plane_l: number | null = null; // lightness the canvas was last painted at
    from_text = true; // the first run keeps the text set above
    const pick_reactor = Reactor(() => {
        const p = pick.value, hex = pickHex(p);
        if (plane_l !== p.L) { drawPlane(p.L); plane_l = p.L; }

        const r = p.C / MAX_C * 148;
        pt.style.left = `${(150 + r * Math.cos(p.H * Math.PI / 180)) / 3}%`;
        pt.style.top = `${(150 - r * Math.sin(p.H * Math.PI / 180)) / 3}%`;
        pt.style.background = hex;
        lsl.value = p.L;
        lsl.style.background = `linear-gradient(to top, ${lch(0, 0, 0)}, ${[.2, .4, .6, .8].map(L => lch(L, p.C, p.H)).join(",")}, #FFFFFF)`;
        $("lval").textContent = `L ${(p.L * 100).toFixed(0)}`;
        if (!from_text) { txt.value = hex; err.hidden = true; }
        picker.value = hex.toLowerCase();

        drawFollowers(hex, p, p.a);
    });
    from_text = false;

    return [RgbaMixer(), pick_reactor, Reactor(() => drawOverlay(overlay_key.value))];
}
