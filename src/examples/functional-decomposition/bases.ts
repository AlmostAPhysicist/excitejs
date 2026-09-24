// bases.ts
//
// Decompositions of sampled data onto a family of basis functions. Every
// basis is fit the same way, by least squares on the samples alone:
//
//     minimize  sum_j ( y_j - sum_i c_i * phi_i(x_j) )^2
//
// The bases other than powers of x live on the sampling range [a, b], written
// with xi = x - a and L = b - a:
//
//   powers     x^i                                   (fit via taylor.ts)
//   Legendre   P_n(2 xi / L - 1), orthogonal on [a, b]
//   Fourier    1, cos(2 n pi xi / L), sin(2 n pi xi / L): period L
//   sine       sin(n pi xi / L), n >= 1: zero at both ends of the range
//   cosine     cos(n pi xi / L), n >= 0: flat at both ends of the range
//   B-spline   B_{i,m}: order m (degree m - 1) on clamped uniform knots
//   cubic      1, u, u^2, u^3, (u - kappa_j)^3_+ with u = xi / L: the same
//   spline     space as order-4 B-splines, in the truncated-power basis
//   natural    cubic spline with f'' = 0 at both ends
//   Catmull-   cardinal basis of the C1 Catmull-Rom spline; the coefficients
//   Rom        are the curve's values at the knots
//   exp        e^(n x): powers of t = e^x, so complete on [a, b]
//              (Weierstrass in t), and fit via taylor.ts on t
//
// "Linear" means linear in the coefficients: each phi_i is fixed before the
// fit. A model like c1 e^(c2 x) is not of this form and needs nonlinear least
// squares (Gauss-Newton, Levenberg-Marquardt).

import { fitPolynomial, leastSquares } from "./taylor.ts";

export interface BasisTerm {
    name: string; // coefficient name, e.g. "c₂", "a₁", "b₃"
    label: string; // basis function, e.g. "x²", "P₂", "sin(3πξ/L)"
    f: (x: number) => number;
}

export interface Basis {
    id: string;
    label: string;
    uses_range: boolean; // written in xi = x - a and L = b - a
    terms(k: number, a: number, b: number): BasisTerm[];
    formula(terms: BasisTerm[]): string;
    fit?(xs: number[], ys: number[], terms: BasisTerm[]): number[]; // specialised solver
}

export interface Fit {
    basis: Basis;
    terms: BasisTerm[];
    coeffs: number[];
    evaluate(x: number): number;
}

// ----------------------------------------------------------------------------
// Formatting
// ----------------------------------------------------------------------------

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
export function superscript(n: number): string {
    return [...String(n)].map(d => SUPERSCRIPTS[Number(d)]).join("");
}

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
export function subscript(n: number): string {
    return [...String(n)].map(d => SUBSCRIPTS[Number(d)]).join("");
}

// "nπξ/L" with n = 1 written as "πξ/L"
function angle(n: number): string {
    return `${n === 1 ? "" : n}πξ/L`;
}

// ----------------------------------------------------------------------------
// Bases
// ----------------------------------------------------------------------------

const POWERS: Basis = {
    id: "powers",
    label: "powers xⁱ",
    uses_range: false,
    terms(k) {
        return Array.from({ length: k }, (_, i) => ({
            name: `c${subscript(i)}`,
            label: i === 0 ? "1" : i === 1 ? "x" : `x${superscript(i)}`,
            f: (x: number) => x ** i,
        }));
    },
    formula(terms) {
        return `f(x) = ${terms.map(t => `${t.name}${t.label === "1" ? "" : t.label}`).join(" + ")}`;
    },
    // Raw powers are ill-conditioned; taylor.ts rescales x before solving
    fit(xs, ys, terms) {
        return fitPolynomial(xs, ys, terms.length);
    },
};

const LEGENDRE: Basis = {
    id: "legendre",
    label: "Legendre Pₙ",
    uses_range: true,
    terms(k, a, b) {
        return Array.from({ length: k }, (_, n) => ({
            name: `c${subscript(n)}`,
            label: `P${subscript(n)}`,
            f: (x: number) => legendre(n, (2 * (x - a)) / (b - a) - 1),
        }));
    },
    formula() {
        return "f(x) = Σ cₙ Pₙ(2ξ/L − 1)";
    },
};

// P_n(u) by Bonnet's recursion: (n + 1) P_{n+1} = (2n + 1) u P_n - n P_{n-1}
function legendre(n: number, u: number): number {
    if (n === 0) return 1;
    let prev = 1;
    let curr = u;
    for (let m = 1; m < n; m++) {
        const next = ((2 * m + 1) * u * curr - m * prev) / (m + 1);
        prev = curr;
        curr = next;
    }
    return curr;
}

const FOURIER: Basis = {
    id: "fourier",
    label: "Fourier (sin + cos)",
    uses_range: true,
    // a₀, a₁, b₁, a₂, b₂, ...: a constant, then cosine/sine pairs of period L/n
    terms(k, a, b) {
        const L = b - a;
        return Array.from({ length: k }, (_, j) => {
            if (j === 0) return { name: "a₀", label: "1", f: () => 1 };
            const n = Math.ceil(j / 2);
            const is_cos = j % 2 === 1;
            const w = (2 * n * Math.PI) / L;
            return {
                name: `${is_cos ? "a" : "b"}${subscript(n)}`,
                label: `${is_cos ? "cos" : "sin"}(${angle(2 * n)})`,
                f: (x: number) => (is_cos ? Math.cos(w * (x - a)) : Math.sin(w * (x - a))),
            };
        });
    },
    formula() {
        return "f(x) = a₀ + Σ [aₙ cos(2nπξ/L) + bₙ sin(2nπξ/L)]";
    },
};

const SINE: Basis = {
    id: "sine",
    label: "sine sin(nπx/L)",
    uses_range: true,
    terms(k, a, b) {
        const L = b - a;
        return Array.from({ length: k }, (_, j) => {
            const n = j + 1;
            return {
                name: `c${subscript(n)}`,
                label: `sin(${angle(n)})`,
                f: (x: number) => Math.sin((n * Math.PI * (x - a)) / L),
            };
        });
    },
    formula() {
        return "f(x) = Σ cₙ sin(nπξ/L),  n = 1 … k";
    },
};

const COSINE: Basis = {
    id: "cosine",
    label: "cosine cos(nπx/L)",
    uses_range: true,
    terms(k, a, b) {
        const L = b - a;
        return Array.from({ length: k }, (_, n) => ({
            name: `c${subscript(n)}`,
            label: n === 0 ? "1" : `cos(${angle(n)})`,
            f: (x: number) => Math.cos((n * Math.PI * (x - a)) / L),
        }));
    },
    formula() {
        return "f(x) = Σ cₙ cos(nπξ/L),  n = 0 … k − 1";
    },
};

// B-splines of order m (degree m - 1). With k functions on [a, b], the knot
// vector is clamped: a repeated m times, k - m evenly spaced interior knots,
// b repeated m times (k + m knots). Each B_{i,m} is a piecewise polynomial of
// degree m - 1, nonzero on m knot spans, C^(m-2) at each interior knot; they
// are all >= 0 and sum to 1 on [a, b]. If k < m the order drops to k.
function bsplineBasis(order: number, name: string): Basis {
    return {
        id: `bspline${order}`,
        label: `B-spline, order ${order} (${name})`,
        uses_range: true,
        terms(k, a, b) {
            const m = Math.min(order, k);
            const interior = k - m;
            const knots: number[] = [];
            for (let i = 0; i < m; i++) knots.push(a);
            for (let j = 1; j <= interior; j++) knots.push(a + ((b - a) * j) / (interior + 1));
            for (let i = 0; i < m; i++) knots.push(b);
            return Array.from({ length: k }, (_, i) => ({
                name: `c${subscript(i)}`,
                label: `B${subscript(i)},${subscript(m)}`,
                f: (x: number) => coxDeBoor(i, m, knots, x, k - 1),
            }));
        },
        formula(terms) {
            const k = terms.length;
            const m = Math.min(order, k);
            return `f(x) = Σ cᵢ Bᵢ,${subscript(m)}(x)\norder ${m} = degree ${m - 1}, ${k - m} interior knots`
                + (m < order ? " (order capped at k)" : "");
        },
    };
}

// B_{i,m}(x) by the Cox-de Boor recursion, with 0/0 taken as 0.
// `last` is the last nonempty knot span, which also owns x = b.
function coxDeBoor(i: number, m: number, t: number[], x: number, last: number): number {
    if (m === 1) {
        if (t[i] <= x && x < t[i + 1]) return 1;
        return x === t[t.length - 1] && i === last ? 1 : 0;
    }
    let value = 0;
    const left = t[i + m - 1] - t[i];
    const right = t[i + m] - t[i + 1];
    if (left > 0) value += ((x - t[i]) / left) * coxDeBoor(i, m - 1, t, x, last);
    if (right > 0) value += ((t[i + m] - x) / right) * coxDeBoor(i + 1, m - 1, t, x, last);
    return value;
}

const CUBIC_SPLINE: Basis = {
    id: "cubic",
    label: "cubic spline (truncated powers)",
    uses_range: true,
    // 1, u, u², u³, then one (u − κⱼ)³₊ per interior knot κⱼ = j / (k − 3)
    terms(k, a, b) {
        const L = b - a;
        return Array.from({ length: k }, (_, i) => {
            if (i < 4) {
                return {
                    name: `c${subscript(i)}`,
                    label: i === 0 ? "1" : i === 1 ? "u" : `u${superscript(i)}`,
                    f: (x: number) => ((x - a) / L) ** i,
                };
            }
            const j = i - 3;
            const kappa = j / (k - 3);
            return {
                name: `d${subscript(j)}`,
                label: `(u − κ${subscript(j)})³₊`,
                f: (x: number) => Math.max(0, (x - a) / L - kappa) ** 3,
            };
        });
    },
    formula(terms) {
        const knots = Math.max(0, terms.length - 4);
        return `f(x) = Σ cᵢuⁱ (i ≤ 3) + Σ dⱼ (u − κⱼ)³₊\nu = ξ/L, ${knots} interior knots κⱼ = j/${knots + 1}`;
    },
};

// Natural cubic spline: cubic splines with f'' = 0 at both ends (so linear
// beyond them). With K = k knots κ₁ = 0 … κ_K = 1 in u = ξ/L, a basis is
// (Hastie, Tibshirani & Friedman, eq. 5.4-5.5)
//     N₁ = 1, N₂ = u, N_{j+2} = d_j − d_{K−1},
//     d_j(u) = [(u − κ_j)³₊ − (u − κ_K)³₊] / (κ_K − κ_j)
// The second term of d_j vanishes on the range, and every d_j'' equals 6 at
// u = 1, so the differences N_{j+2} have zero curvature there.
const NATURAL_SPLINE: Basis = {
    id: "natural",
    label: "natural cubic spline",
    uses_range: true,
    terms(k, a, b) {
        const L = b - a;
        const K = k;
        const kappa = (j: number) => (j - 1) / (K - 1); // j = 1 … K
        const d = (j: number, u: number) => Math.max(0, u - kappa(j)) ** 3 / (1 - kappa(j));
        return Array.from({ length: k }, (_, i) => {
            if (i === 0) return { name: "c₀", label: "1", f: () => 1 };
            if (i === 1) return { name: "c₁", label: "u", f: (x: number) => (x - a) / L };
            const j = i - 1;
            return {
                name: `c${subscript(i)}`,
                label: `d${subscript(j)} − d${subscript(K - 1)}`,
                f: (x: number) => d(j, (x - a) / L) - d(K - 1, (x - a) / L),
            };
        });
    },
    formula(terms) {
        const K = terms.length;
        return `f(x) = c₀ + c₁u + Σ cⱼ₊₁ (dⱼ − d${subscript(Math.max(1, K - 1))})\n`
            + `f'' = 0 at a and b; u = ξ/L, ${K} knots κⱼ = (j − 1)/${Math.max(1, K - 1)}`;
    },
};

// Catmull-Rom: the cubic Hermite spline through control values c_i at k
// evenly spaced knots x_i, with tangent (c_{i+1} − c_{i−1}) / 2h at each.
// f is linear in the c_i, so f = Σ c_i φ_i with φ_i the cardinal kernel
// centred on knot i (Keys' cubic convolution, a = −1/2). The phantom values
// beyond each end are linear extrapolations (c₋₁ = 2c₀ − c₁), which folds
// the phantom kernels into the first two and last two φ. C¹, not C².
function catmullRomKernel(t: number): number {
    const s = Math.abs(t);
    if (s < 1) return 1.5 * s ** 3 - 2.5 * s ** 2 + 1;
    if (s < 2) return -0.5 * s ** 3 + 2.5 * s ** 2 - 4 * s + 2;
    return 0;
}

const CATMULL_ROM: Basis = {
    id: "catmull",
    label: "Catmull-Rom spline",
    uses_range: true,
    terms(k, a, b) {
        if (k === 1) return [{ name: "c₀", label: "1", f: () => 1 }];
        const h = (b - a) / (k - 1);
        const kernel = (j: number) => (x: number) => catmullRomKernel((x - a) / h - j); // centred on x_j, j may be −1 or k
        return Array.from({ length: k }, (_, i) => {
            const own = kernel(i);
            // Phantom c₋₁ = 2c₀ − c₁ and c_k = 2c_{k−1} − c_{k−2}
            const extra: [number, (x: number) => number][] = [];
            if (i === 0) extra.push([2, kernel(-1)]);
            if (i === 1) extra.push([-1, kernel(-1)]);
            if (i === k - 1) extra.push([2, kernel(k)]);
            if (i === k - 2) extra.push([-1, kernel(k)]);
            return {
                name: `c${subscript(i)}`,
                label: `φ${subscript(i)}`,
                f: (x: number) => extra.reduce((sum, [w, g]) => sum + w * g(x), own(x)),
            };
        });
    },
    formula(terms) {
        const k = terms.length;
        return `f(x) = Σ cᵢ φᵢ(x),  cᵢ = f(xᵢ)\n${k} knots xᵢ = a + iL/${Math.max(1, k - 1)}; C¹ cubic Hermite, tangents (cᵢ₊₁ − cᵢ₋₁)/2h`;
    },
};

const EXPONENTIALS: Basis = {
    id: "exp",
    label: "exponentials eⁿˣ",
    uses_range: false,
    terms(k) {
        return Array.from({ length: k }, (_, n) => ({
            name: `c${subscript(n)}`,
            label: n === 0 ? "1" : n === 1 ? "eˣ" : `e${superscript(n)}ˣ`,
            f: (x: number) => Math.exp(n * x),
        }));
    },
    formula(terms) {
        return `f(x) = Σ cₙ eⁿˣ,  n = 0 … ${terms.length - 1}\na polynomial in t = eˣ`;
    },
    // e^(nx) = t^n: raw exponentials are as ill-conditioned as raw powers, so
    // reuse taylor.ts's rescaled solver in t
    fit(xs, ys, terms) {
        return fitPolynomial(xs.map(Math.exp), ys, terms.length);
    },
};

export const BASES: Basis[] = [
    POWERS, LEGENDRE, FOURIER, SINE, COSINE,
    bsplineBasis(2, "linear"), bsplineBasis(3, "quadratic"), bsplineBasis(4, "cubic"),
    CUBIC_SPLINE, NATURAL_SPLINE, CATMULL_ROM, EXPONENTIALS,
];

// ----------------------------------------------------------------------------
// Fitting
// ----------------------------------------------------------------------------

/** Least-squares fit of the samples by the first k functions of `basis` on [a, b]. */
export function fitBasis(basis: Basis, xs: number[], ys: number[], k: number, a: number, b: number): Fit {
    const terms = basis.terms(k, a, b);
    const coeffs = basis.fit ? basis.fit(xs, ys, terms) : fitGeneric(xs, ys, terms);
    return {
        basis,
        terms,
        coeffs,
        evaluate(x) {
            let y = 0;
            for (let i = 0; i < terms.length; i++) y += coeffs[i] * terms[i].f(x);
            return y;
        },
    };
}

function fitGeneric(xs: number[], ys: number[], terms: BasisTerm[]): number[] {
    const m = Math.min(xs.length, ys.length);
    const columns = terms.map(term => Float64Array.from(xs.slice(0, m), term.f));
    return leastSquares(columns, Float64Array.from(ys.slice(0, m)));
}
