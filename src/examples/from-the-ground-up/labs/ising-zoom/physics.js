// The physics from the last lab, as a module: no drawing in here.

export const N = 64;
export const spins = new Int8Array(N * N).map(() => (Math.random() < 0.5 ? 1 : -1));
export const flipped = new Float64Array(N * N).fill(-1e9); // when each spin last flipped, ms

let odds = [];
export function setTemperature(T) {
    odds = [];
    for (const s of [-1, 1]) for (let around = -4; around <= 4; around += 2) {
        const cost = 2 * s * around;
        odds.push(cost <= 0 ? 1 : Math.exp(-cost / T));
    }
}

// `sweeps` may be a fraction: what is left over waits for the next call
let owed = 0;
export function sweep(sweeps, now) {
    owed += sweeps * N * N;
    for (; owed >= 1; owed--) {
        const i = Math.floor(Math.random() * N), j = Math.floor(Math.random() * N), k = i * N + j;
        const s = spins[k];
        const around = spins[((i + 1) % N) * N + j] + spins[((i + N - 1) % N) * N + j]
            + spins[i * N + (j + 1) % N] + spins[i * N + (j + N - 1) % N];
        if (Math.random() < odds[(s > 0 ? 5 : 0) + (around + 4) / 2]) {
            spins[k] = -s;
            flipped[k] = now; // the stamp the arrow's turn is measured from
        }
    }
}
