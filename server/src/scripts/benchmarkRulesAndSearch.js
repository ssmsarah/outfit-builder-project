// I7.7: performance check on a synthetic 1,000-item wardrobe.
//   - full search index build  < 500 ms
//   - one search (hybrid)      <  50 ms
//   - outfit recommendation with rules < 200 ms
// Pure in-memory; used by the I7.6 report (section 5) and its test.
import { generateSyntheticWardrobe } from "./syntheticWardrobe.js";
import { createSearchIndex } from "../recommendation/search/searchIndex.js";
import { hybridSearch } from "../recommendation/search/hybridSearch.js";
import { colorName } from "../recommendation/search/colorNames.js";
import { generatePersonalizedOutfits } from "../recommendation/personalization/finalRanker.js";
import { buildAttributeProfile } from "../recommendation/personalization/attributeProfile.js";
import { mean } from "../recommendation/utils/math.js";

export const TARGETS_MS = { indexBuild: 500, search: 50, recommendation: 200 };

const GARMENT_WORDS = {
  top: ["tshirt", "shirt", "blouse", "hoodie", "sweater"],
  bottom: ["jeans", "trousers", "chinos", "skirt", "shorts"],
  shoes: ["sneakers", "boots", "loafers", "oxfords", "sandals"],
  accessory: ["belt", "necklace", "scarf", "watch", "bag"],
  outerwear: ["jacket", "coat", "blazer", "parka", "overcoat"],
  dress: ["dress", "gown", "sundress", "maxi dress", "shift dress"],
};

// The T4.5 synthetic items plus realistic names, so search has real text
// to work on. Names are derived from each item's own fields and index
// (no extra randomness), so the wardrobe stays deterministic.
export function namedSyntheticWardrobe(size = 1000, seed = 42) {
  return generateSyntheticWardrobe(size, seed).map((item, i) => {
    const words = GARMENT_WORDS[item.category];
    return {
      ...item,
      name: `${colorName(item.colorHex)} ${item.style.replace("_", " ")} ${words[i % words.length]}`,
    };
  });
}

// A mix of exact, typo, synonym and attribute queries.
export const BENCHMARK_QUERIES = [
  "black casual tshirt", "blak casul tee", "navy formal blazer", "white sneakrs", "red floral dress",
  "grey hoodie", "brown leather belt", "blue jeans", "olive streetwear jacket", "smart casual chinos",
  "pink summer dress", "sporty shorts", "yellow scarf", "formal black oxfords", "teal knit sweater",
  "zzzz", "summer", "striped shirt for work", "lavender blouse", "maroon boots",
];

function stats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  return {
    samples: sorted.length,
    meanMs: mean(sorted),
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    maxMs: sorted[sorted.length - 1],
  };
}

function time(fn) {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

export function runPerformanceChecks({ size = 1000, buildTrials = 5, searchRepeats = 5, anchors = 10 } = {}) {
  const items = namedSyntheticWardrobe(size);

  // Warm-up (JIT, color caches), not timed.
  const warm = createSearchIndex(items);
  for (const q of BENCHMARK_QUERIES) hybridSearch(warm, q);

  const indexBuild = stats(
    Array.from({ length: buildTrials }, () =>
      time(() => {
        const index = createSearchIndex(items);
        hybridSearch(index, "warm"); // include the lazy IDF/vector/postings computation
      })
    )
  );

  const index = createSearchIndex(items);
  hybridSearch(index, "warm");
  const searchTimes = [];
  for (let r = 0; r < searchRepeats; r++) {
    for (const q of BENCHMARK_QUERIES) searchTimes.push(time(() => hybridSearch(index, q)));
  }
  const search = stats(searchTimes);

  const personalization = { profile: buildAttributeProfile([]), preferenceScores: new Map(), alpha: 1.0 };
  const context = { targetOccasion: "casual", targetSeason: "summer" };
  const anchorItems = items.filter((i) => ["top", "bottom", "shoes", "dress"].includes(i.category)).slice(0, anchors);
  generatePersonalizedOutfits(anchorItems[0], items, context, personalization); // warm-up
  const recommendation = stats(
    anchorItems.map((anchor) => time(() => generatePersonalizedOutfits(anchor, items, context, personalization)))
  );

  return {
    size,
    indexBuild: { ...indexBuild, targetMs: TARGETS_MS.indexBuild },
    search: { ...search, targetMs: TARGETS_MS.search },
    recommendation: { ...recommendation, targetMs: TARGETS_MS.recommendation },
  };
}
