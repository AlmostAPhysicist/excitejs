// taylor.ts
//
// Polynomial decomposition of sampled data. Only the samples (xs, ys) are
// used, never the function that produced them.
//
// Given k, finds c_0 .. c_{k-1} minimizing the squared error
//
//     sum_j ( y_j - sum_i c_i * x_j^i )^2
//
// i.e. the least-squares fit of the data by the first k powers of x.
//
// Fitting raw powers of x directly is numerically fragile: the columns of the
// Vandermonde matrix [1, x, x^2, ...] become nearly parallel as k grows. So:
//
//   1. x is mapped onto t = (x - shift) / scale in [-1, 1]
//   2. the system is solved in t with Householder QR (not the normal
//      equations, which would square the condition number)
//   3. the t-coefficients are expanded back into powers of x

/** Least-squares coefficients c_0 .. c_{k-1} of sum_i c_i x^i through the data. */
export function fitPolynomial(xs: number[], ys: number[], k: number): number[] {
    const m = Math.min(xs.length, ys.length);
    // With m points at most m coefficients are determined; the rest stay 0
    const n = Math.max(0, Math.min(k, m));
    if (n === 0) return new Array(k).fill(0);

    // 1. Scale x onto [-1, 1]
    let x_min = Infinity;
    let x_max = -Infinity;
    for (let j = 0; j < m; j++) {
        x_min = Math.min(x_min, xs[j]);
        x_max = Math.max(x_max, xs[j]);
    }
    const shift = (x_min + x_max) / 2;
    const scale = (x_max - x_min) / 2 || 1;

    // Vandermonde matrix in t, stored as columns: columns[i][j] = t_j^i
    const columns: Float64Array[] = [];
    for (let i = 0; i < n; i++) columns.push(new Float64Array(m));
    for (let j = 0; j < m; j++) {
        const t = (xs[j] - shift) / scale;
        let power = 1;
        for (let i = 0; i < n; i++) {
            columns[i][j] = power;
            power *= t;
        }
    }

    // 2. Solve in t
    const t_coeffs = leastSquares(columns, Float64Array.from(ys.slice(0, m)));

    // 3. Expand back into powers of x
    const x_coeffs = fromScaled(t_coeffs, shift, scale);
    while (x_coeffs.length < k) x_coeffs.push(0);
    return x_coeffs;
}

/** Evaluates sum_i coeffs[i] * x^i (Horner's rule). */
export function evalPolynomial(coeffs: number[], x: number): number {
    let y = 0;
    for (let i = coeffs.length - 1; i >= 0; i--) y = y * x + coeffs[i];
    return y;
}

/**
 * Minimizes |A c - b| for A given as columns (m rows, n columns), by Householder
 * QR. Coefficients the data can't determine (n > m, dependent columns) are 0.
 * Overwrites `columns` and `b`.
 */
export function leastSquares(columns: Float64Array[], b: Float64Array): number[] {
    const n = columns.length;
    const m = b.length;
    const r_diag = new Float64Array(n);

    for (let j = 0; j < n; j++) {
        const v = columns[j]; // v[j..m) becomes the Householder vector

        let norm = 0;
        for (let i = j; i < m; i++) norm += v[i] * v[i];
        norm = Math.sqrt(norm);
        if (norm === 0) continue; // column already reduced: rank deficient

        // Reflect v[j..m) onto alpha * e_j, choosing the sign that avoids cancellation
        const alpha = v[j] > 0 ? -norm : norm;
        v[j] -= alpha;
        r_diag[j] = alpha;

        let v_norm2 = 0;
        for (let i = j; i < m; i++) v_norm2 += v[i] * v[i];

        // Apply H = I - 2 v v^T / (v^T v) to the remaining columns and to b
        for (let c = j + 1; c < n; c++) reflect(v, columns[c], j, v_norm2);
        reflect(v, b, j, v_norm2);
    }

    // Back-substitute R c = Q^T b. R's strict upper triangle lives in columns[c][j], c > j
    const coeffs = new Array<number>(n).fill(0);
    const tolerance = 1e-12 * Math.max(...r_diag.map(Math.abs));
    for (let j = n - 1; j >= 0; j--) {
        if (Math.abs(r_diag[j]) <= tolerance) continue; // undetermined: leave at 0
        let sum = b[j];
        for (let c = j + 1; c < n; c++) sum -= columns[c][j] * coeffs[c];
        coeffs[j] = sum / r_diag[j];
    }
    return coeffs;
}

function reflect(v: Float64Array, target: Float64Array, from: number, v_norm2: number): void {
    let dot = 0;
    for (let i = from; i < target.length; i++) dot += v[i] * target[i];
    const f = (2 * dot) / v_norm2;
    for (let i = from; i < target.length; i++) target[i] -= f * v[i];
}

// Rewrites sum_j a_j t^j, with t = (x - shift) / scale, as sum_i c_i x^i.
function fromScaled(t_coeffs: number[], shift: number, scale: number): number[] {
    const n = t_coeffs.length;
    const x_coeffs = new Array<number>(n).fill(0);
    let t_power = [1]; // t^j as a polynomial in x
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < t_power.length; i++) x_coeffs[i] += t_coeffs[j] * t_power[i];

        // t^(j+1) = t^j * (x / scale - shift / scale)
        const next = new Array<number>(t_power.length + 1).fill(0);
        for (let i = 0; i < t_power.length; i++) {
            next[i] -= (t_power[i] * shift) / scale;
            next[i + 1] += t_power[i] / scale;
        }
        t_power = next;
    }
    return x_coeffs;
}
