// priority.ts

export function moveToBottom<T>(set: Set<T>, item: T): void {
    if (set.delete(item)) {
        set.add(item); // Re-appending naturally drops it to the end
    }
}

export function moveToTop<T>(set: Set<T>, item: T): void {
    if (set.delete(item)) {
        const rest = [...set];
        set.clear();
        set.add(item);
        for (const v of rest) set.add(v);
    }
}

export function moveUp<T>(set: Set<T>, item: T): void {
    const arr = [...set];
    const i = arr.indexOf(item);
    if (i > 0) {
        arr[i] = arr[i - 1];
        arr[i - 1] = item;
        set.clear();
        for (const v of arr) set.add(v);
    }
}

export function moveDown<T>(set: Set<T>, item: T): void {
    const arr = [...set];
    const i = arr.indexOf(item);
    if (i !== -1 && i < arr.length - 1) {
        arr[i] = arr[i + 1];
        arr[i + 1] = item;
        set.clear();
        for (const v of arr) set.add(v);
    }
}