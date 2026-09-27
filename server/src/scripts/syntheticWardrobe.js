// Deterministic synthetic wardrobe generator for T4.5's performance
// benchmark (and reusable anywhere else a large, realistic-shaped item
// pool is needed without touching the DB or the small T0.4 fixture).
import { CATEGORIES, STYLES, PATTERNS, SEASONS, OCCASIONS } from "../recommendation/itemEnums.js";

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSyntheticWardrobe(size = 500, seed = 42) {
  const rand = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const randomHex = () => {
    const byte = () => Math.floor(rand() * 256).toString(16).padStart(2, "0");
    return `#${byte()}${byte()}${byte()}`.toUpperCase();
  };
  const randomSubset = (arr) => {
    const n = 1 + Math.floor(rand() * arr.length);
    return [...arr].sort(() => rand() - 0.5).slice(0, n);
  };

  return Array.from({ length: size }, (_, i) => ({
    id: `synthetic-${i}`,
    category: pick(CATEGORIES),
    colorHex: randomHex(),
    style: pick(STYLES),
    pattern: pick(PATTERNS),
    seasons: randomSubset(SEASONS),
    occasions: randomSubset(OCCASIONS),
  }));
}
