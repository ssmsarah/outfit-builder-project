// Cosine Similarity (S6.6).
//
//   cos(q, d) = (q · d) / (||q|| * ||d||)
//
// TF-IDF vectors (S6.5) are already L2 normalized, so both norms are 1 and
// the cosine is just the dot product over the terms the two vectors share.
// The loop walks the smaller vector and looks terms up in the larger one,
// so a short query against a long document costs O(query terms).
import { clamp01 } from "../utils/math.js";

// Sparse dot product; a and b are Maps term -> weight.
export function dot(a, b) {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let sum = 0;

  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other !== undefined) sum += weight * other;
  }

  return sum;
}

// For L2-normalized vectors. Clamped to [0, 1] because TF-IDF weights are
// never negative, so any excursion is floating-point rounding (e.g.
// 1.0000000000000002 for identical vectors).
export function cosine(q, d) {
  return clamp01(dot(q, d));
}
