// ising.ts
//
// The physics, with no DOM: a square lattice of spins s = ±1 with periodic
// boundaries (the edges wrap, so the lattice is really a torus), and the
// two classic single-spin Markov steps.
//
//   E = -J Σ<ij> s_i s_j  -  h Σ s_i        (J = 1, k_B = 1)
//
// Flipping spin s with neighbour sum S changes the energy by
//
//   ΔE = 2 s (S + h)
//
// S is one of -4, -2, 0, 2, 4, so there are only ten (s, S) cases. Their
// acceptance probabilities are tabulated once per (T, h, rule) change, which
// keeps the inner loop to array reads and one Math.random().

export type Rule = "metropolis" | "heat_bath";

export const T_CRITICAL = 2 / Math.log(1 + Math.SQRT2); // Onsager, 2.269…

export interface Lattice {
    n: number;               // side length; n × n spins
    spins: Int8Array;        // +1 up, -1 down, row-major
    flipped_at: Float64Array; // timestamp of each spin's last flip (for animation)
    M: number;               // Σ s_i
    B: number;               // bond energy -Σ<ij> s_i s_j
    sweeps: number;          // attempted flips / n², running total
    carry: number;           // fractional attempts left over between calls
}

export function Lattice(n: number, fill: "random" | "up" | "down" = "random"): Lattice {
    const lat: Lattice = {
        n,
        spins: new Int8Array(n * n),
        flipped_at: new Float64Array(n * n).fill(-1e9),
        M: 0,
        B: 0,
        sweeps: 0,
        carry: 0,
    };
    fillLattice(lat, fill);
    return lat;
}

export function fillLattice(lat: Lattice, fill: "random" | "up" | "down"): void {
    const { spins } = lat;
    for (let k = 0; k < spins.length; k++) {
        spins[k] = fill === "up" ? 1 : fill === "down" ? -1 : Math.random() < 0.5 ? 1 : -1;
    }
    lat.flipped_at.fill(-1e9);
    lat.sweeps = 0;
    lat.carry = 0;
    recount(lat);
}

// Recomputes M and B from scratch (after a bulk edit)
export function recount(lat: Lattice): void {
    const { n, spins } = lat;
    let M = 0, B = 0;
    for (let i = 0; i < n; i++) {
        const row = i * n, below = ((i + 1) % n) * n;
        for (let j = 0; j < n; j++) {
            const s = spins[row + j];
            M += s;
            // each bond counted once: right and down
            B -= s * (spins[row + (j + 1) % n] + spins[below + j]);
        }
    }
    lat.M = M;
    lat.B = B;
}

export function neighbourSum(lat: Lattice, idx: number): number {
    const { n, spins } = lat;
    const i = (idx / n) | 0, j = idx - i * n;
    const up = i === 0 ? idx + n * (n - 1) : idx - n;
    const down = i === n - 1 ? idx - n * (n - 1) : idx + n;
    const left = j === 0 ? idx + n - 1 : idx - 1;
    const right = j === n - 1 ? idx - n + 1 : idx + 1;
    return spins[up] + spins[down] + spins[left] + spins[right];
}

// Probability of accepting a proposed flip that costs ΔE
export function acceptance(dE: number, T: number, rule: Rule): number {
    const t = Math.max(T, 1e-6);
    if (rule === "metropolis") return dE <= 0 ? 1 : Math.exp(-dE / t);
    return 1 / (1 + Math.exp(dE / t));
}

// table[(s > 0 ? 5 : 0) + (S + 4) / 2] = acceptance for that case
export function acceptanceTable(T: number, h: number, rule: Rule): Float64Array {
    const table = new Float64Array(10);
    for (const s of [-1, 1]) {
        for (let S = -4; S <= 4; S += 2) {
            table[(s > 0 ? 5 : 0) + (S + 4) / 2] = acceptance(2 * s * (S + h), T, rule);
        }
    }
    return table;
}

// `sweeps` × n² single-spin attempts at random sites. Fractions carry over,
// so 0.01 sweeps a frame still moves at the right average rate.
export function step(lat: Lattice, sweeps: number, table: Float64Array, now = 0): number {
    const { n, spins, flipped_at } = lat;
    const nn = n * n;
    const exact = sweeps * nn + lat.carry;
    const attempts = Math.floor(exact);
    lat.carry = exact - attempts;

    let M = lat.M, B = lat.B, flips = 0;
    const last_row = n * (n - 1);
    for (let k = 0; k < attempts; k++) {
        const idx = (Math.random() * nn) | 0;
        const i = (idx / n) | 0, j = idx - i * n;
        const S = spins[i === 0 ? idx + last_row : idx - n]
            + spins[i === n - 1 ? idx - last_row : idx + n]
            + spins[j === 0 ? idx + n - 1 : idx - 1]
            + spins[j === n - 1 ? idx - n + 1 : idx + 1];
        const s = spins[idx];
        const p = table[(s > 0 ? 5 : 0) + ((S + 4) >> 1)];
        if (p >= 1 || Math.random() < p) {
            spins[idx] = -s;
            M -= 2 * s;
            B += 2 * s * S;
            flipped_at[idx] = now;
            flips++;
        }
    }
    lat.M = M;
    lat.B = B;
    lat.sweeps += attempts / nn;
    return flips;
}

// Per-spin magnetization and energy
export function magnetization(lat: Lattice): number {
    return lat.M / (lat.n * lat.n);
}
export function energy(lat: Lattice, h: number): number {
    return (lat.B - h * lat.M) / (lat.n * lat.n);
}

// Yang's exact spontaneous magnetization of the infinite 2D lattice (h = 0)
export function exactMagnetization(T: number): number {
    if (T >= T_CRITICAL) return 0;
    const x = Math.sinh(2 / T);
    return Math.pow(1 - Math.pow(x, -4), 1 / 8);
}
