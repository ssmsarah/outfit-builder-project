// Text Normalization and Synonyms (S6.3). Documents and queries go through
// exactly the same steps, so they always meet in one vocabulary:
//   1. lowercase
//   2. strip accents                      "café" -> "cafe"
//   3. "-" and "_" -> space               "t-shirt" -> "t shirt"
//   4. drop apostrophes, other punctuation -> space, collapse spaces
//   5. synonyms (longest phrase first)    "t shirt" -> "tshirt"
//   6. remove stopwords                   "for", "the", ...
// Synonyms and stopwords come from searchConfig. Pure functions.
import { searchConfig } from "../../config/searchConfig.js";

// Steps 1-4.
export function cleanText(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Variant phrases as token arrays -> canonical term. Variants are cleaned
// with the same steps as the text they will be matched against.
function buildSynonymPhrases(synonyms) {
  const phrases = new Map();
  let longest = 1;

  for (const [canonical, variants] of Object.entries(synonyms)) {
    for (const variant of variants) {
      const tokens = cleanText(variant).split(" ");
      phrases.set(tokens.join(" "), canonical);
      longest = Math.max(longest, tokens.length);
    }
  }

  return { phrases, longest };
}

const { phrases: SYNONYM_PHRASES, longest: LONGEST_PHRASE } = buildSynonymPhrases(searchConfig.synonyms);
const STOPWORDS = new Set(searchConfig.stopwords.map((word) => cleanText(word)));

// Step 5: at each position, replace the longest matching variant phrase.
export function applySynonyms(tokens) {
  const result = [];
  let i = 0;

  while (i < tokens.length) {
    let replaced = false;

    for (let length = Math.min(LONGEST_PHRASE, tokens.length - i); length >= 1; length--) {
      const canonical = SYNONYM_PHRASES.get(tokens.slice(i, i + length).join(" "));
      if (canonical) {
        result.push(canonical);
        i += length;
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      result.push(tokens[i]);
      i += 1;
    }
  }

  return result;
}

export function normalizeTokens(text) {
  const cleaned = cleanText(text);
  if (!cleaned) return [];
  return applySynonyms(cleaned.split(" ")).filter((token) => !STOPWORDS.has(token));
}

export function normalize(text) {
  return normalizeTokens(text).join(" ");
}
