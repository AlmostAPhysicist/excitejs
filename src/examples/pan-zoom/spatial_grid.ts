// spatial_grid.ts
//
// A uniform grid of buckets over world space. Each item is filed under every
// bucket its bounding box touches, so finding what is in a rect (to draw a
// strip) or under a point (to hit test) only looks at nearby items, however
// many there are. Results keep insertion order, which is the draw order.

import type { Rect } from "./camera.ts";

export interface SpatialGrid<T extends { rect: Rect }> {
    within(r: Rect): T[];      // items whose box overlaps r, in insertion (draw) order
    at(x: number, y: number): T[]; // items whose box contains the point
}

export function SpatialGrid<T extends { rect: Rect }>(items: T[], cell = 256): SpatialGrid<T> {
    const buckets = new Map<string, number[]>();
    const key = (i: number, j: number) => i + "," + j;
    const range = (r: Rect) => [Math.floor(r.x0 / cell), Math.floor(r.y0 / cell), Math.floor(r.x1 / cell), Math.floor(r.y1 / cell)];

    items.forEach((item, index) => {
        const [i0, j0, i1, j1] = range(item.rect);
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
            const k = key(i, j);
            let list = buckets.get(k);
            if (!list) buckets.set(k, list = []);
            list.push(index);
        }
    });

    function within(r: Rect): T[] {
        const [i0, j0, i1, j1] = range(r);
        // a huge rect (zoomed far out) is cheaper as a plain scan
        if ((i1 - i0 + 1) * (j1 - j0 + 1) > buckets.size) {
            return items.filter(it => it.rect.x0 < r.x1 && it.rect.x1 > r.x0 && it.rect.y0 < r.y1 && it.rect.y1 > r.y0);
        }
        const found = new Set<number>();
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
            const list = buckets.get(key(i, j));
            if (list) for (const index of list) found.add(index);
        }
        return [...found].sort((a, b) => a - b).map(k => items[k])
            .filter(it => it.rect.x0 < r.x1 && it.rect.x1 > r.x0 && it.rect.y0 < r.y1 && it.rect.y1 > r.y0);
    }

    return {
        within,
        at: (x, y) => within({ x0: x - 1e-9, y0: y - 1e-9, x1: x + 1e-9, y1: y + 1e-9 }),
    };
}
