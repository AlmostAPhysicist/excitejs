// The sprite from the arrow lab, as a module. It draws on whatever context
// it is handed, so it works under any camera.

export const FLIP_MS = 300;

export function detailAt(pixels) {
    const t = Math.min(1, Math.max(0, (pixels - 16) / (46 - 16)));
    return t * t * (3 - 2 * t);
}

function arrowAngle(s, age) {
    const rest = s > 0 ? 0 : Math.PI;
    if (age >= FLIP_MS) return rest;
    return rest + Math.PI * (1 - age / FLIP_MS) ** 3;
}

export function drawSpin(ctx, c, x, y, width, s, age, detail) {
    const p = Math.min(1, age / FLIP_MS);
    const gap = detail * 0.09 * width, side = width - 2 * gap;
    ctx.beginPath();
    ctx.roundRect(x + gap, y + gap, side, side, detail * side / 2);
    if (p < 1) { ctx.fillStyle = s > 0 ? c.down : c.up; ctx.fill(); ctx.globalAlpha = p; }
    ctx.fillStyle = s > 0 ? c.up : c.down;
    ctx.fill();
    ctx.globalAlpha = 1;
    if (detail === 0) return;

    ctx.save();
    ctx.globalAlpha = detail;
    ctx.strokeStyle = ctx.fillStyle = (p > 0.5) === (s > 0) ? c.down : c.up;
    ctx.translate(x + width / 2, y + width / 2);
    ctx.rotate(arrowAngle(s, age));
    ctx.lineWidth = side * 0.08;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, side * 0.3);
    ctx.lineTo(0, -side * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -side * 0.34);
    ctx.lineTo(-side * 0.17, -side * 0.06);
    ctx.lineTo(side * 0.17, -side * 0.06);
    ctx.fill();
    ctx.restore();
}
