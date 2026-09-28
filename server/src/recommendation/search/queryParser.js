// Query Attribute Extraction (I7.1): parseQuery(query) -> { attributes,
// freeText, matches }.
//
// After normalization (S6.3, so synonyms like tee -> tshirt already apply),
// each word is compared with the known values of category, color, style,
// pattern, occasion and season (plus configured aliases, e.g. tshirt -> top):
//   1. exact match (two-word values like "light blue" or "smart casual"
//      are matched as phrases first)
//   2. otherwise fuzzy match: char n-gram cosine >= minSimilarity against
//      the whole vocabulary, so "casul" -> casual, "blak" -> black
// Words that match nothing, or name an attribute that is already set, stay
// in freeText. Example: "blak casul tee" -> { color: black, style: casual,
// category: top }. Pure function.
import { normalizeTokens } from "./normalizer.js";
import { bestMatch } from "./fuzzyMatch.js";
import { paletteColorNames } from "./colorNames.js";
import { CATEGORIES, STYLES, PATTERNS, OCCASIONS, SEASONS } from "../itemEnums.js";
import { searchConfig } from "../../config/searchConfig.js";

// When a word names values of several attributes ("casual" is a style and an
// occasion), the first attribute in this order wins.
export const ATTRIBUTE_ORDER = ["category", "color", "style", "pattern", "occasion", "season"];

// vocabulary text (normalized, may be two words) -> { attribute, value }
function buildVocabulary() {
  const { aliases } = searchConfig.queryParsing;
  const vocabulary = new Map();

  const add = (attribute, text, value) => {
    const key = normalizeTokens(text).join(" ");
    if (key && !vocabulary.has(key)) vocabulary.set(key, { attribute, value });
  };

  const values = {
    category: CATEGORIES,
    color: paletteColorNames(),
    style: STYLES,
    pattern: PATTERNS,
    occasion: OCCASIONS,
    season: SEASONS,
  };

  for (const attribute of ATTRIBUTE_ORDER) {
    for (const value of values[attribute]) add(attribute, value, value);
    for (const [word, value] of Object.entries(aliases[attribute] ?? {})) add(attribute, word, value);
  }

  return vocabulary;
}

const VOCABULARY = buildVocabulary();
const SINGLE_WORDS = [...VOCABULARY.keys()].filter((key) => !key.includes(" "));

function fuzzyLookup(token) {
  const { ngramSize, minSimilarity, minFuzzyLength } = searchConfig.queryParsing;
  if (token.length < minFuzzyLength) return null;

  const match = bestMatch(token, SINGLE_WORDS, minSimilarity, ngramSize);
  return match ? { ...VOCABULARY.get(match.term), similarity: match.similarity } : null;
}

export function parseQuery(query) {
  const tokens = normalizeTokens(query);
  const attributes = {};
  const matches = [];
  const freeText = [];

  // Category words later in the query override earlier ones ("denim
  // jacket" is a jacket), because in English the last noun is the head.
  // Every other attribute keeps its first value.
  const assign = (match, token) => {
    const { attribute, value } = match;
    const taken = attribute in attributes;

    // Another word for the same value ("oxford shoes") is still a match.
    if (taken && attributes[attribute] === value) {
      matches.push({ token, ...match });
      return;
    }

    if (taken && attribute !== "category") {
      freeText.push(token);
      return;
    }

    if (taken) {
      for (const previous of matches.filter((m) => m.attribute === "category")) {
        freeText.push(previous.token);
        matches.splice(matches.indexOf(previous), 1);
      }
    }

    attributes[attribute] = value;
    matches.push({ token, ...match });
  };

  for (let i = 0; i < tokens.length; i++) {
    const phrase = i + 1 < tokens.length ? `${tokens[i]} ${tokens[i + 1]}` : null;

    if (phrase && VOCABULARY.has(phrase)) {
      assign({ ...VOCABULARY.get(phrase), similarity: 1 }, phrase);
      i += 1;
      continue;
    }

    const token = tokens[i];
    const match = VOCABULARY.has(token) ? { ...VOCABULARY.get(token), similarity: 1 } : fuzzyLookup(token);

    if (match) assign(match, token);
    else freeText.push(token);
  }

  return { attributes, freeText: freeText.join(" "), matches };
}
