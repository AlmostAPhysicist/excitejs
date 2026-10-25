// theory.ts
//
// "A little color theory" on the home page: the static figures (spectrum,
// cones, gamut, luminosity) and the section markup. The interactive parts
// (RGBA mixer, OKLCH picker, ramps, harmonies) are filled in by picker.ts.

import { PALETTES } from "../layout/palette_list.ts";
import { themes } from "../palette_settings.ts";
import { gamutChroma, hslToHex, lch, okL, oklch } from "../layout/color.ts";
import { overlay_key, selectHTML } from "../layout/state.ts";

const MONO = "IBM Plex Mono,monospace";
const SANS = "IBM Plex Sans,sans-serif";

// Approximate display color of a wavelength in nm
export function spectrumColor(w: number): string {
    let r = 0, g = 0, b = 0;
    if (w < 440) { r = -(w - 440) / 60; b = 1; }
    else if (w < 490) { g = (w - 440) / 50; b = 1; }
    else if (w < 510) { g = 1; b = -(w - 510) / 20; }
    else if (w < 580) { r = (w - 510) / 70; g = 1; }
    else if (w < 645) { r = 1; g = -(w - 645) / 65; }
    else r = 1;
    const f = w < 420 ? .3 + .7 * (w - 380) / 40 : w > 700 ? .3 + .7 * (750 - w) / 50 : 1;
    return "#" + [r, g, b].map(c => Math.round(255 * Math.pow(Math.max(0, c * f), .8)).toString(16).padStart(2, "0")).join("");
}

// Simplified bell curve for a cone's sensitivity
const bell = (w: number, peak: number, width: number) => Math.exp(-((w - peak) ** 2) / (2 * width * width));

// Strip of spectrum colors under a wavelength axis
function spectrumBar(X: (w: number) => number, y: number): string {
    let g = "";
    for (let w = 380; w < 720; w += 4) g += `<rect x="${X(w)}" y="${y}" width="${X(w + 4) - X(w) + .5}" height="12" fill="${spectrumColor(w)}"/>`;
    return g;
}

function spectrumSVG(): string {
    const W = 1000;
    let g = `<svg viewBox="0 0 ${W} 150" role="img" aria-label="The electromagnetic spectrum with the visible band enlarged">`;
    const bands: [string, number][] = [["gamma", .07], ["X-ray", .09], ["UV", .09], ["", .06], ["infrared", .14], ["microwave", .2], ["radio", .35]];
    let x = 0;
    bands.forEach(([n, w], i) => {
        const ww = w * W;
        g += i === 3 ? `<rect x="${x}" y="8" width="${ww}" height="26" fill="url(#vis)"/>`
            : `<rect x="${x}" y="8" width="${ww}" height="26" fill="var(--sunk)" stroke="var(--line)"/><text x="${x + ww / 2}" y="25" text-anchor="middle" font-size="12" fill="var(--ink-2)" font-family="${SANS}">${n}</text>`;
        if (i === 3) g += `<line x1="${x}" y1="34" x2="40" y2="70" stroke="var(--ink-3)"/><line x1="${x + ww}" y1="34" x2="${W - 40}" y2="70" stroke="var(--ink-3)"/>`;
        x += ww;
    });
    g += `<text x="0" y="50" font-size="11" fill="var(--ink-3)" font-family="${MONO}">short wavelength</text><text x="${W}" y="50" text-anchor="end" font-size="11" fill="var(--ink-3)" font-family="${MONO}">long wavelength</text>`;
    let stops = "";
    for (let w = 380; w <= 750; w += 10) stops += `<stop offset="${(w - 380) / 370}" stop-color="${spectrumColor(w)}"/>`;
    g += `<defs><linearGradient id="vis">${stops}</linearGradient></defs><rect x="40" y="70" width="${W - 80}" height="44" rx="6" fill="url(#vis)"/>`;
    [400, 450, 500, 550, 600, 650, 700].forEach(w => {
        const xx = 40 + (W - 80) * (w - 380) / 370;
        g += `<line x1="${xx}" y1="114" x2="${xx}" y2="122" stroke="var(--ink-3)"/><text x="${xx}" y="138" text-anchor="middle" font-size="12" fill="var(--ink-2)" font-family="${MONO}">${w} nm</text>`;
    });
    return g + "</svg>";
}

function conesSVG(): string {
    const W = 1000, H = 230, x0 = 40, x1 = W - 20, X = (w: number) => x0 + (x1 - x0) * (w - 380) / (720 - 380), Y = (v: number) => 180 - v * 150;
    let g = `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Approximate sensitivity curves of the three cone types">`;
    [0, .5, 1].forEach(v => g += `<line x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/>`);
    ([["S", 420, 28, "#4a6fe3"], ["M", 534, 42, "#3f9b52"], ["L", 564, 48, "#d0503f"]] as [string, number, number, string][]).forEach(([n, peak, s, c]) => {
        const pts: string[] = [];
        for (let w = 380; w <= 720; w += 4) pts.push(`${X(w)},${Y(bell(w, peak, s))}`);
        g += `<polygon points="${X(380)},${Y(0)} ${pts.join(" ")} ${X(720)},${Y(0)}" fill="${c}" opacity=".12"/><polyline points="${pts.join(" ")}" fill="none" stroke="${c}" stroke-width="2.5"/><text x="${X(peak)}" y="${Y(1) - 8}" text-anchor="middle" font-size="13" font-weight="600" fill="${c}" font-family="${SANS}">${n} · ${peak} nm</text>`;
    });
    g += spectrumBar(X, 188);
    [400, 500, 600, 700].forEach(w => g += `<text x="${X(w)}" y="220" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="${MONO}">${w}</text>`);
    g += `<text x="${x0}" y="14" font-size="11" fill="var(--ink-3)" font-family="${SANS}">relative sensitivity (simplified bell curves)</text>`;
    return g + "</svg>";
}

function gamutSVG(): string {
    const W = 560, H = 250, x0 = 34, x1 = W - 10, y0 = 210, yt = 16, X = (L: number) => x0 + (x1 - x0) * L, Y = (c: number) => y0 - (y0 - yt) * c / 0.33;
    let g = `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Maximum displayable chroma at each lightness for six hues">`;
    [0, .1, .2, .3].forEach(c => g += `<line x1="${x0}" x2="${x1}" y1="${Y(c)}" y2="${Y(c)}" stroke="var(--line)"/><text x="${x0 - 6}" y="${Y(c) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)" font-family="${MONO}">${c}</text>`);
    [0, .25, .5, .75, 1].forEach(l => g += `<text x="${X(l)}" y="${y0 + 18}" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="${MONO}">${l}</text>`);
    g += `<text x="${(x0 + x1) / 2}" y="${H - 2}" text-anchor="middle" font-size="11" fill="var(--ink-2)" font-family="${SANS}">lightness L →</text><text x="${x0 + 4}" y="${yt - 4}" font-size="11" fill="var(--ink-2)" font-family="${SANS}">max chroma on an sRGB screen</text>`;
    ([["red", 29], ["yellow", 110], ["green", 142], ["cyan", 195], ["blue", 264], ["magenta", 328]] as [string, number][]).forEach(([n, h]) => {
        const pts: string[] = [];
        let best = [0, 0];
        for (let L = 0; L <= 1.0001; L += .02) {
            const c = gamutChroma(L, h, .4);
            pts.push(`${X(L)},${Y(c)}`);
            if (c > best[1]) best = [L, c];
        }
        const col = lch(.62, .16, h);
        g += `<polyline points="${pts.join(" ")}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round"/><text x="${X(best[0])}" y="${Y(best[1]) - 6}" text-anchor="middle" font-size="11.5" font-weight="600" fill="${col}" font-family="${SANS}">${n}</text>`;
    });
    return g + "</svg>";
}

function luminositySVG(): string {
    const W = 560, H = 250, x0 = 10, x1 = W - 10, X = (w: number) => x0 + (x1 - x0) * (w - 380) / (720 - 380), Y = (v: number) => 196 - v * 160;
    let g = `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cone sensitivities and the overall luminosity curve">`;
    ([["S", 420, 28, "#4a6fe3"], ["M", 534, 42, "#3f9b52"], ["L", 564, 48, "#d0503f"]] as [string, number, number, string][]).forEach(([n, p, s, c]) => {
        const pts: string[] = [];
        for (let w = 380; w <= 720; w += 4) pts.push(`${X(w)},${Y(.8 * bell(w, p, s))}`);
        g += `<polyline points="${pts.join(" ")}" fill="none" stroke="${c}" stroke-width="1.6" opacity=".7"/><text x="${X(p)}" y="${Y(.8) - 6}" text-anchor="middle" font-size="11" fill="${c}" font-family="${SANS}">${n}</text>`;
    });
    const pts: string[] = [];
    for (let w = 380; w <= 720; w += 4) pts.push(`${X(w)},${Y(bell(w, 555, 42))}`);
    g += `<polygon points="${X(380)},${Y(0)} ${pts.join(" ")} ${X(720)},${Y(0)}" fill="var(--ink)" opacity=".06"/><polyline points="${pts.join(" ")}" fill="none" stroke="var(--ink)" stroke-width="3"/><text x="${X(555)}" y="${Y(1) - 8}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--ink)" font-family="${SANS}">luminosity · peak 555 nm</text>`;
    g += spectrumBar(X, 204);
    [400, 500, 600, 700].forEach(w => g += `<text x="${X(w)}" y="240" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="${MONO}">${w}</text>`);
    g += `<text x="${x0}" y="14" font-size="11" fill="var(--ink-3)" font-family="${SANS}">simplified curves: cone responses (thin) and overall brightness sensitivity (black)</text>`;
    return g + "</svg>";
}

// Click-to-copy strip of cells
const cellStrip = (list: string[]) => `<div class="cells">${list.map(h => `<button data-hex="${h}" style="background:${h}" aria-label="${h}"></button>`).join("")}</div>`;

export function theoryHTML(): string {
    const [bL, bC, bH] = oklch("#1E66F5"); // the blue in section 5
    return `<section class="h-sec" id="theory">
  <div class="sec-head"><h2>A little color theory</h2><p class="lede">From light to the numbers on a screen to the way designers reason about color. Short on purpose; each step links to a deeper read.</p></div>
  <div class="theory">

   <div class="fig wide"><h3>1 · Color starts as light</h3>
    <p>Light is electromagnetic radiation, the same thing as radio waves and X-rays at different wavelengths. Our eyes respond to a thin slice of it, roughly 380 to 750 nanometres, and we experience different wavelengths in that slice as different colors. Most colors you see are mixtures of many wavelengths; magenta has no single wavelength at all.</p>
    ${spectrumSVG()}
    <a href="https://en.wikipedia.org/wiki/Visible_spectrum" target="_blank" rel="noopener">Visible spectrum on Wikipedia</a></div>

   <div class="fig wide"><h3>2 · From light to the eye: three cones</h3>
    <div class="two"><div>${conesSVG()}</div><div style="display:grid;gap:10px">
     <p>The retina has three kinds of cone cells, sensitive to short (S), medium (M) and long (L) wavelengths. Every color you see is the brain comparing just those three signals. (Rods handle dim light and don't contribute color.)</p>
     <p>That is why three numbers are enough to describe a color, and why screens can fake any color with only three lights. It also explains color blindness: if one cone type is missing or shifted, two colors that differ only for that cone look the same.</p>
     <a href="https://en.wikipedia.org/wiki/Cone_cell" target="_blank" rel="noopener">Cone cells on Wikipedia</a></div></div></div>

   <div class="fig wide"><h3>3 · RGBA: how screens store color</h3>
    <div class="two"><div class="rgbmix"><svg viewBox="0 0 220 200" role="img" aria-label="Additive mixing of red, green and blue light"><rect width="220" height="200" rx="12" fill="#000"/><g style="mix-blend-mode:screen"><circle cx="110" cy="78" r="52" fill="#ff0000" style="mix-blend-mode:screen"/><circle cx="80" cy="128" r="52" fill="#00ff00" style="mix-blend-mode:screen"/><circle cx="140" cy="128" r="52" fill="#0000ff" style="mix-blend-mode:screen"/></g></svg>
      <div class="rgba-ctl" id="rgba"></div></div>
     <div style="display:grid;gap:10px"><p>Each pixel has a red, green and blue light, each set from 0 to 255. Light adds up: red plus green makes yellow, all three at full make white. That gives 256³, about 16.7 million combinations.</p>
      <p>The <b>A</b> is alpha, opacity. It is not a property of the color itself; it says how much of whatever sits behind shows through. A 50% blue looks different on white than on black.</p>
      <p>The numbers are stored with a gamma curve (sRGB), so 128 is not half the light of 255. That detail matters later.</p>
      <a href="https://en.wikipedia.org/wiki/SRGB" target="_blank" rel="noopener">sRGB on Wikipedia</a></div></div></div>

   <div class="fig wide"><h3>4 · Why RGB is a poor way to think about color</h3>
    <p>RGB describes the hardware, not what you see. Changing one channel changes how light the color looks, how colorful it is and what hue it is, all at once. People describe color with three separate questions: <b>how light is it</b>, <b>how much color does it have</b>, and <b>which color is it</b>. Those are lightness, chroma and hue. Each has neighbouring terms that are valid in their own right but measure something slightly different:</p>
    <div class="tbl-wrap" style="box-shadow:none"><table class="gloss"><thead><tr><th>Term</th><th>Means</th><th>Related terms, and how they differ</th></tr></thead><tbody>
     <tr><td><b>Hue</b></td><td>Which family: red, yellow, green, blue… An angle around a circle.</td><td><b>Hue angle</b> is the same thing given in degrees. Everyday "color" usually means hue, but also includes lightness and chroma.</td></tr>
     <tr><td><b>Chroma</b></td><td>How far from gray, compared with a white of the same lightness.</td><td><b>Colorfulness</b> is the same idea in absolute terms: a flower in sunlight is more colorful than in shade, while its chroma stays the same. <b>Saturation</b> is colorfulness relative to the color's own brightness, so a deep navy can be highly saturated with modest chroma. HSL/HSV "saturation" is a quick formula on RGB that only loosely tracks it.</td></tr>
     <tr><td><b>Lightness</b></td><td>How light it looks relative to white.</td><td><b>Brightness</b> is the absolute impression and changes when you turn up the screen; lightness does not. <b>Value</b> (HSV) is the largest RGB channel, a fast stand-in. <b>Luminance</b> is the physical light output; lightness is roughly its cube root. <b>Luma</b> is video's weighted sum of gamma-encoded RGB, an approximation of luminance.</td></tr>
    </tbody></table></div>
    <a href="https://en.wikipedia.org/wiki/Colorfulness" target="_blank" rel="noopener">Colorfulness, chroma and saturation on Wikipedia</a></div>

   <div class="fig wide"><h3>5 · One blue, one axis at a time</h3><p>The same blue, changing only lightness, only chroma or only hue. Click a cell to copy it.</p>
    <div class="strip-row"><span class="lab">Lightness<small>0.20 → 0.95</small></span>${cellStrip(Array.from({length:12},(_,i)=>lch(.2+i*.068,bC,bH)))}</div>
    <div class="strip-row"><span class="lab">Chroma<small>0 → max</small></span>${cellStrip(Array.from({length:12},(_,i)=>lch(bL,i*.017,bH)))}</div>
    <div class="strip-row"><span class="lab">Hue<small>0° → 330°</small></span>${cellStrip(Array.from({length:12},(_,i)=>lch(.62,.11,i*30)))}</div>
    <p style="font-size:13px">The last few chroma cells barely change: at this lightness a screen cannot show a more vivid blue. Section 6 explains why.</p></div>

   <div class="fig wide"><h3>6 · Every hue and chroma at once: a wheel</h3>
    <p>Spin hue around a circle and push chroma outward from the gray center, and every color at one lightness fits on a disc. Stack those discs from black to white and you get a cylinder: that is the OKLCH color space. Drag the point to set hue and chroma; the slider beside the wheel sets lightness. Empty areas are colors a normal (sRGB) screen cannot display at that lightness.</p>
    <div class="pick-grid" id="picker">
     <div class="wheel-col"><div class="wheelbox" id="wbox"><canvas id="wcv" width="300" height="300" aria-hidden="true"></canvas><svg id="wov" viewBox="0 0 300 300" aria-hidden="true"></svg><button class="wpt" id="wpt" aria-label="Hue and chroma point. Arrow keys: left/right hue, up/down chroma"></button></div>
      <div class="lcol"><input type="range" class="lslider" id="lsl" min="0" max="1" step="0.005" aria-label="Lightness"><span class="mono" id="lval"></span></div></div>
     <div class="pick-info"><div class="big-sw" id="pk-sw"></div>
      <div class="field-in"><input type="color" id="pk-pick" aria-label="System color picker"><input type="text" id="pk-text" spellcheck="false" aria-label="Color value"></div>
      <span class="err" id="pk-err" hidden>That doesn't look like a color. Try #1e66f5, rgb(30 102 245), hsl(220 90% 54%) or oklch(0.6 0.2 260).</span>
      <dl class="kv" id="pk-kv"></dl>
      <div class="ctrl"><span style="font-size:13px;color:var(--ink-2)">Overlay accents from</span>${selectHTML("ovl",[["none","nothing"],...PALETTES.flatMap(p=>themes(p).map(t=>[p.id+":"+t.key,p.name+" "+t.name]))],overlay_key._value,"Overlay palette accents")}</div>
      <p style="font-size:12.5px;color:var(--ink-3)">Overlay dots show hue and chroma only; their lightness may differ from the slider.</p></div></div>
    <h4 class="sub-h">Why it is not a perfect cylinder</h4>
    <div class="two"><div>${gamutSVG()}</div><div style="display:grid;gap:10px">
     <p>OKLCH's coordinates form a cylinder, but only part of it is reachable. A screen makes every color from three lights with a fixed maximum, so the colors it can show (its <b>gamut</b>) are a lumpy solid inside the cylinder.</p>
     <p>The shape follows from the primaries. Yellow is red plus green at full power, which is inherently bright, so vivid yellows exist only near the top. The blue light on its own is dark, so the most vivid blue sits low. Near black and near white every hue has to fade to gray, because there is no room left to add color. The chart shows the largest displayable chroma at each lightness for six hues.</p>
     <p>Wider-gamut screens (Display P3) push the boundary outward, and the limit of human vision lies further still, but none of them fill the cylinder.</p>
     <p><a href="https://en.wikipedia.org/wiki/Gamut" target="_blank" rel="noopener">Gamut on Wikipedia</a> · <a href="https://oklch.com" target="_blank" rel="noopener">oklch.com, an interactive gamut explorer</a></p></div></div></div>

   <div class="fig wide"><h3>7 · What one hue can do: tints, tones, shades, ramps</h3>
    <p>Keep the hue and you can still move along two axes. A <b>tint</b> mixes in white, a <b>tone</b> mixes in gray, a <b>shade</b> mixes in black. A design <b>ramp</b> (the 50 to 950 scales in Flexoki or Tailwind) steps lightness evenly while managing chroma, so each step looks equally far from the next. These rows use the color picked above.</p>
    <div id="hue-rows" style="display:grid;gap:8px"></div>
    <h4 class="sub-h">How the ramp here is built</h4>
    <p>The ramp in the last row, and on every palette page without an official ramp, is a simple recipe in OKLCH. Hue stays fixed. Lightness steps through eleven fixed targets, from 0.97 at step 50 down to 0.22 at step 950. Chroma starts at the color's own value and tapers toward black and white, where \\(d\\) is how far a step is from the color's lightness, as a fraction of the way to white or black:</p>
    <div class="math">\\[ C_{\\text{step}} = C_0\\,\\bigl(1 - 0.72\\,d^{2}\\bigr) \\]</div>
    <p>A step the screen can't show has its chroma reduced until it fits, and the original color replaces whichever step is closest in lightness, so it always appears exactly. Hand-made ramps such as Flexoki's, Tailwind's or <a href="https://www.radix-ui.com/colors" target="_blank" rel="noopener">Radix Colors</a> also nudge hue and chroma per step by eye.</p></div>

   <div class="fig wide"><h3>8 · What hue, chroma and lightness really are</h3>
    <p>Lightness, chroma and hue are not arbitrary axes. Each one matches something the visual system actually computes from the three cone signals.</p>

    <div class="sub"><h4 class="sub-h">Hue</h4>
     <p>The brain doesn't receive hue directly. It compares the cones in two <b>opponent channels</b>: red against green (L cones minus M) and yellow against blue (L + M minus S). Hue is the direction a color points in that two-channel plane. That is why you can imagine a bluish green but never a reddish green: red and green sit at opposite ends of the same channel. Oklab copies this layout with an <i>a</i> axis (green to red) and a <i>b</i> axis (blue to yellow):</p>
     <div class="math">\\[ h = \\operatorname{atan2}(b,\\ a) \\]</div>
     <a href="https://en.wikipedia.org/wiki/Opponent_process" target="_blank" rel="noopener">Opponent process on Wikipedia</a></div>

    <div class="sub"><h4 class="sub-h">Chroma</h4>
     <p>Chroma is how far a color sits from the gray center of that same plane: how strongly the opponent channels are pushed, compared with a gray of equal lightness. A gray leaves both channels balanced, so its chroma is zero.</p>
     <div class="math">\\[ C = \\sqrt{a^{2} + b^{2}} \\]</div></div>

    <div class="sub"><h4 class="sub-h">Lightness</h4>
     <p>Lightness is the hardest of the three, and several definitions are in everyday use. They disagree, sometimes badly.</p>
     <h5>HSL lightness</h5>
     <p>HSL takes the largest and smallest RGB channel and averages them:</p>
     <div class="math">\\[ L_{\\text{HSL}} = \\frac{\\max(R,G,B) + \\min(R,G,B)}{2} \\]</div>
     <p>It was designed in the late 1970s for color pickers on early graphics hardware: a cheap, exactly reversible rearrangement of the RGB cube that puts black at 0, white at 1 and every pure primary at the 50% midpoint. It never asks how bright a color looks. These six colors all have an HSL lightness of exactly 50%; the bar under each is its perceived lightness.</p>
     <div class="hsl-row">${([[0,"red"],[60,"yellow"],[120,"green"],[180,"cyan"],[240,"blue"],[300,"magenta"]] as [number, string][]).map(([h,n])=>{const x=hslToHex(h,100,50),L=okL(x);return`<div><i style="background:${x}"></i>${n}<span class="lbar"><b style="width:${L}%"></b></span>Oklab L ${L.toFixed(0)}</div>`;}).join("")}</div>
     <a href="https://en.wikipedia.org/wiki/HSL_and_HSV" target="_blank" rel="noopener">HSL and HSV on Wikipedia</a>

     <h5>Why that isn't what you see</h5>
     <div class="two"><div>${luminositySVG()}</div><div style="display:grid;gap:8px">
      <p><b>The eye is not equally sensitive to every wavelength.</b> Add up the cones' responses and you get the luminosity curve (black), which peaks in yellow-green around 555 nm and falls off toward blue. The same amount of light looks far brighter as green than as blue.</p>
      <p><b>Stored values aren't light.</b> sRGB numbers pass through a gamma curve, so 128 is about a fifth of the light of 255, not half.</p>
      <p><b>Perception is compressed.</b> Twice the light does not look twice as light; the response is closer to a cube root.</p>
      <p>Smaller effects pile on top: vivid colors look brighter than grays of equal luminance (the <a href="https://en.wikipedia.org/wiki/Helmholtz%E2%80%93Kohlrausch_effect" target="_blank" rel="noopener">Helmholtz–Kohlrausch effect</a>), and surroundings shift what you perceive.</p></div></div>

     <h5>Measuring perceived lightness</h5>
     <p>Each problem above becomes one step of the calculation. Every channel is a number from 0 to 1.</p>
     <p class="step"><b>Step 1, undo the gamma curve,</b> to get back to actual light:</p>
     <div class="math">\\[ C_{\\text{lin}} = \\begin{cases} C \\,/\\, 12.92 & C \\le 0.04045 \\\\ \\bigl((C + 0.055)\\,/\\,1.055\\bigr)^{2.4} & \\text{otherwise} \\end{cases} \\]</div>
     <p class="step"><b>Step 2, weight each channel by the eye's sensitivity,</b> which gives relative luminance <i>Y</i>. Green counts about ten times more than blue. WCAG contrast ratios are built on <i>Y</i>:</p>
     <div class="math">\\[ Y = 0.2126\\,R_{\\text{lin}} + 0.7152\\,G_{\\text{lin}} + 0.0722\\,B_{\\text{lin}}, \\qquad \\text{contrast} = \\frac{Y_1 + 0.05}{Y_2 + 0.05} \\]</div>
     <p class="step"><b>Step 3, compress the way the eye does.</b> CIELAB (1976) applies a cube root to <i>Y</i>, so 50 looks halfway between black and white:</p>
     <div class="math">\\[ L^{*} = 116\\,\\sqrt[3]{Y} - 16 \\]</div>
     <p class="step">Oklab (2020) applies the cube root to each cone signal before combining them, which keeps hue steadier as lightness changes and predicts blues better. Here \\(M_1\\) is a fixed 3×3 matrix from linear RGB to cone responses:</p>
     <div class="math">\\[ (l,\\,m,\\,s) = M_1\\,(R_{\\text{lin}},\\,G_{\\text{lin}},\\,B_{\\text{lin}}), \\qquad L_{\\text{ok}} = 0.2105\\,\\sqrt[3]{l} + 0.7936\\,\\sqrt[3]{m} - 0.0041\\,\\sqrt[3]{s} \\]</div>
     <p><a href="https://www.w3.org/TR/WCAG21/#dfn-relative-luminance" target="_blank" rel="noopener">WCAG luminance</a> · <a href="https://en.wikipedia.org/wiki/CIELAB_color_space" target="_blank" rel="noopener">CIELAB</a> · <a href="https://bottosson.github.io/posts/oklab/" target="_blank" rel="noopener">Oklab, by Björn Ottosson</a> · <a href="https://www.w3.org/TR/css-color-4/#ok-lab" target="_blank" rel="noopener">CSS Color 4</a></p>
     <div class="lmeter" id="lmeter"></div>
     <p style="font-size:13px">Every lightness number on this site uses Oklab L. Contrast ratios use <i>Y</i>, because that is what WCAG defines.</p></div></div>

   <div class="fig wide"><h3>9 · Comparing colors</h3>
    <p>With lightness, chroma and hue as coordinates, the difference between two colors is just a distance. In Oklab:</p>
    <div class="math">\\[ \\Delta E_{\\text{ok}} = \\sqrt{\\Delta L^2 + \\Delta a^2 + \\Delta b^2}, \\qquad a = C\\cos h,\\; b = C\\sin h \\]</div>
    <p>Below about 2 (×100 scale, as used on this site) most people can't tell two colors apart; above 8 they are clearly different. The same geometry gives <b>harmonies</b>: colors at fixed angles around the wheel, here at the picked color's lightness and chroma.</p>
    <div class="cmp-wrap"><div id="pk-contrast"></div><div style="display:grid;gap:8px"><span class="label">Harmonies of the picked color</span><div class="chipset" id="pk-harm"></div>
     <div class="harm">${([["Complementary","180° apart",[30,210]],["Analogous","±30°",[230,260,290]],["Triadic","120° apart",[30,150,270]]] as [string, string, number[]][]).map(([t,s,hs])=>{const c=50,r=36;
      return`<div><svg viewBox="0 0 100 100" width="90" aria-hidden="true"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--line)" stroke-width="5"/>${hs.length>2?`<polygon points="${hs.map(h=>`${c+r*Math.cos(h*Math.PI/180)},${c-r*Math.sin(h*Math.PI/180)}`).join(" ")}" fill="none" stroke="var(--ink-3)" stroke-dasharray="3 3"/>`:`<line x1="${c+r*Math.cos(hs[0]*Math.PI/180)}" y1="${c-r*Math.sin(hs[0]*Math.PI/180)}" x2="${c+r*Math.cos(hs[1]*Math.PI/180)}" y2="${c-r*Math.sin(hs[1]*Math.PI/180)}" stroke="var(--ink-3)" stroke-dasharray="3 3"/>`}${hs.map(h=>`<circle cx="${c+r*Math.cos(h*Math.PI/180)}" cy="${c-r*Math.sin(h*Math.PI/180)}" r="8" fill="${lch(.65,.14,h)}" stroke="var(--surface)" stroke-width="2"/>`).join("")}</svg><b>${t}</b><small>${s}</small></div>`;}).join("")}</div></div></div>
    <div style="display:grid;gap:8px"><span class="label">Closest accent in each palette to the picked color (ΔE)</span><div class="near" id="pk-near"></div></div></div>

   <div class="fig wide"><h3>10 · Base vs. accent</h3>
    <div class="two"><div style="display:grid;gap:8px"><div class="roles"><div style="flex:62;background:#eff1f5;color:#6c6f85">base 60%</div><div style="flex:18;background:#ccd0da;color:#4c4f69">ui 18%</div><div style="flex:12;background:#4c4f69;color:#eff1f5">text 12%</div><div style="flex:3;background:#179299"></div><div style="flex:2.5;background:#fe640b"></div><div style="flex:2.5;background:#8839ef"></div></div>
      <p style="font-size:12.5px">Catppuccin Latte, approximate share of a typical code editor.</p></div>
     <p>A theme has two jobs. <b>Base</b> colors (backgrounds, borders, text) cover nearly the whole screen and should be quiet: low chroma, well-spaced lightness. <b>Accents</b> are the small amount of color that carries meaning: errors, links, syntax. A rule of thumb rather than a law: once accents cover more than about a tenth of the screen, a scheme stops feeling calm. Everything in the rest of this site measures how well each palette does both jobs.</p></div></div>
  </div>
 </section>`;
}
