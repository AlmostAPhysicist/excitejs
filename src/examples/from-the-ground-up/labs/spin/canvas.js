// A canvas with a fixed drawing size of w × h units, shown as wide as the
// page allows. at(event) gives a pointer event's position in those units.
export function Canvas(w, h) {
    const element = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;
    element.width = w * dpr;
    element.height = h * dpr;
    element.style.width = "100%";
    element.style.maxWidth = w + "px";
    element.style.aspectRatio = `${w} / ${h}`;
    const ctx = element.getContext("2d");
    ctx.scale(dpr, dpr);

    const at = event => {
        const box = element.getBoundingClientRect();
        return { x: (event.clientX - box.left) * w / box.width, y: (event.clientY - box.top) * h / box.height };
    };
    return { element, ctx, w, h, at };
}
