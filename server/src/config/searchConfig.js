// Single source of truth for the Fuzzy Search algorithm (Sprint 6): color
// palette, and (added ticket by ticket) field weights, synonyms, stopwords,
// n-gram size and ranking weights. Validated once at import time.
import { loadSearchConfig } from "./loadSearchConfig.js";

const rawSearchConfig = {
  // S6.1: named colors that items' colorHex values are snapped to. `family`
  // is the coarse group used for partial color matches.
  colorPalette: [
    { name: "black", hex: "#000000", family: "neutral" },
    { name: "white", hex: "#FFFFFF", family: "neutral" },
    { name: "grey", hex: "#808080", family: "neutral" },
    { name: "silver", hex: "#C0C0C0", family: "neutral" },
    { name: "beige", hex: "#D8C8A8", family: "neutral" },
    { name: "cream", hex: "#FFFDD0", family: "neutral" },
    { name: "khaki", hex: "#C3B091", family: "neutral" },
    { name: "navy", hex: "#1F2A44", family: "blue" },
    { name: "blue", hex: "#3B5B92", family: "blue" },
    { name: "light blue", hex: "#ADD8E6", family: "blue" },
    { name: "teal", hex: "#008080", family: "blue" },
    { name: "red", hex: "#CC2222", family: "red" },
    { name: "maroon", hex: "#800000", family: "red" },
    { name: "pink", hex: "#FFC0CB", family: "pink" },
    { name: "orange", hex: "#E67E22", family: "orange" },
    { name: "yellow", hex: "#F1C40F", family: "yellow" },
    { name: "brown", hex: "#6B4423", family: "brown" },
    { name: "green", hex: "#2E8B57", family: "green" },
    { name: "olive", hex: "#808000", family: "green" },
    { name: "purple", hex: "#7D3C98", family: "purple" },
    { name: "lavender", hex: "#C3B1E1", family: "purple" },
  ],

  // S6.2: each field's tokens are repeated this many times before TF is
  // computed, so a name match counts more than an occasion match.
  fieldWeights: {
    name: 3,
    category: 2,
    color: 2,
    style: 2,
    pattern: 1,
    occasions: 1,
    seasons: 1,
    description: 1,
  },

  // S6.3: canonical term -> variants. Applied identically to documents and
  // queries, after punctuation normalization (so "t-shirt" arrives here as
  // "t shirt"). Multi-word variants are matched as phrases.
  synonyms: {
    tshirt: ["tee", "t-shirt", "t shirt", "tshirt"],
    trousers: ["pants", "trousers"],
    sneakers: ["sneakers", "trainers", "kicks"],
    jeans: ["jeans", "denim"],
    grey: ["grey", "gray"],
    formal: ["formalwear", "formal wear"],
  },

  // S6.3: removed after synonyms are applied.
  stopwords: ["a", "an", "the", "for", "with", "and", "my", "some"],

  // S6.4: character n-gram length. Each word is padded as "#word#" first.
  ngramSize: 3,

  // S6.8: SearchScore = beta * S_char + (1 - beta) * S_word
  beta: 0.6,
  // Results scoring below this are dropped.
  minScore: 0.15,
  defaultLimit: 10,
  // A query word "matched" a document term (for the matchedTerms
  // explanation) if their n-gram similarity is at least this. 0.4 admits
  // one-letter typos of short words ("blak" vs "black" = 0.447).
  matchedTermMinSimilarity: 0.4,

  // I7.2: HybridScore = gamma * SearchScore + (1 - gamma) * MatchScore
  gamma: 0.6,

  // I7.1: detecting attribute values (category, color, style, pattern,
  // occasion, season) in a query. Words are matched exactly first, then
  // fuzzily by char n-gram cosine against the attribute vocabulary.
  queryParsing: {
    // Bigrams, not the search's trigrams: with trigrams "casul" vs "casual"
    // is only 0.548, below the README's 0.7 threshold for its own example;
    // with bigrams it is 0.772 ("blak" vs "black" 0.730).
    ngramSize: 2,
    minSimilarity: 0.7,
    // Shorter words are only matched exactly (too little signal to fuzz).
    minFuzzyLength: 3,
    // Extra words (after normalization/synonyms) that name an attribute value.
    aliases: {
      category: {
        tshirt: "top", shirt: "top", blouse: "top", hoodie: "top", sweater: "top", tops: "top",
        jeans: "bottom", trousers: "bottom", chinos: "bottom", skirt: "bottom", shorts: "bottom", bottoms: "bottom",
        shoe: "shoes", sneakers: "shoes", boots: "shoes", oxfords: "shoes", heels: "shoes", sandals: "shoes", loafers: "shoes",
        belt: "accessory", necklace: "accessory", bag: "accessory", hat: "accessory", scarf: "accessory", watch: "accessory",
        jewelry: "accessory", accessories: "accessory",
        jacket: "outerwear", coat: "outerwear", overcoat: "outerwear", blazer: "outerwear",
        dresses: "dress", gown: "dress",
      },
      pattern: { stripes: "striped", stripe: "striped", plaid: "checked", check: "checked", flowers: "floral", plain: "solid" },
      season: { fall: "autumn" },
    },
  },
};

export const searchConfig = loadSearchConfig(rawSearchConfig);
export default searchConfig;
