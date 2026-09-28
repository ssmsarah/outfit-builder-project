// Validates the raw search config (Sprint 6) and returns a frozen copy,
// mirroring loadScoringConfig (T0.3) and loadRulesConfig (R5.1). Kept apart
// from the values in searchConfig.js so it can be tested against broken
// configs.
import { CATEGORIES, PATTERNS, SEASONS } from "../recommendation/itemEnums.js";

export const COLOR_FAMILIES = ["neutral", "blue", "red", "green", "yellow", "purple", "brown", "orange", "pink"];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const MIN_PALETTE_SIZE = 20;

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function validatePalette(palette) {
  if (!Array.isArray(palette) || palette.length < MIN_PALETTE_SIZE) {
    throw new Error(`Invalid search config: colorPalette needs at least ${MIN_PALETTE_SIZE} entries`);
  }

  const names = new Set();
  for (const entry of palette) {
    const { name, hex, family } = entry ?? {};

    if (typeof name !== "string" || name.trim() === "" || name !== name.toLowerCase()) {
      throw new Error(`Invalid search config: palette name "${name}" must be a non-empty lowercase string`);
    }
    if (names.has(name)) {
      throw new Error(`Invalid search config: duplicate palette name "${name}"`);
    }
    names.add(name);

    if (typeof hex !== "string" || !HEX_RE.test(hex)) {
      throw new Error(`Invalid search config: palette "${name}" has invalid hex "${hex}"`);
    }
    if (!COLOR_FAMILIES.includes(family)) {
      throw new Error(`Invalid search config: palette "${name}" has unknown family "${family}"`);
    }
  }
}

export const DOCUMENT_FIELDS = ["name", "category", "color", "style", "pattern", "occasions", "seasons", "description"];

// Field weights are repetition counts, so they must be positive integers.
function validateFieldWeights(fieldWeights) {
  if (!fieldWeights || typeof fieldWeights !== "object") {
    throw new Error("Invalid search config: fieldWeights must be an object");
  }

  for (const key of Object.keys(fieldWeights)) {
    if (!DOCUMENT_FIELDS.includes(key)) {
      throw new Error(`Invalid search config: unknown document field "${key}"`);
    }
  }

  for (const field of DOCUMENT_FIELDS) {
    const weight = fieldWeights[field];
    if (!Number.isInteger(weight) || weight < 1) {
      throw new Error(`Invalid search config: fieldWeights.${field} must be a positive integer (got ${weight})`);
    }
  }
}

const SINGLE_WORD_RE = /^[a-z0-9]+$/;

function isStringList(value) {
  return Array.isArray(value) && value.every((v) => typeof v === "string" && v.trim() !== "");
}

// Canonical terms must be single lowercase words (they become index terms),
// and no variant may map to two different canonical terms.
function validateSynonyms(synonyms) {
  if (!synonyms || typeof synonyms !== "object" || Array.isArray(synonyms)) {
    throw new Error("Invalid search config: synonyms must be an object");
  }

  const owner = new Map();
  for (const [canonical, variants] of Object.entries(synonyms)) {
    if (!SINGLE_WORD_RE.test(canonical)) {
      throw new Error(`Invalid search config: synonym target "${canonical}" must be one lowercase word`);
    }
    if (!isStringList(variants) || variants.length === 0) {
      throw new Error(`Invalid search config: synonyms.${canonical} must be a non-empty list of strings`);
    }
    for (const variant of variants) {
      const key = variant.toLowerCase();
      if (owner.has(key) && owner.get(key) !== canonical) {
        throw new Error(
          `Invalid search config: synonym "${variant}" maps to both "${owner.get(key)}" and "${canonical}"`
        );
      }
      owner.set(key, canonical);
    }
  }
}

function validateStopwords(stopwords) {
  if (!isStringList(stopwords)) {
    throw new Error("Invalid search config: stopwords must be a list of strings");
  }
}

const ALIAS_TARGETS = { category: CATEGORIES, pattern: PATTERNS, season: SEASONS };

function validateQueryParsing(queryParsing) {
  if (!queryParsing || typeof queryParsing !== "object") {
    throw new Error("Invalid search config: queryParsing must be an object");
  }

  const { ngramSize, minSimilarity, minFuzzyLength, aliases } = queryParsing;

  if (!Number.isInteger(ngramSize) || ngramSize < 2) {
    throw new Error("Invalid search config: queryParsing.ngramSize must be an integer >= 2");
  }
  if (typeof minSimilarity !== "number" || minSimilarity < 0 || minSimilarity > 1) {
    throw new Error("Invalid search config: queryParsing.minSimilarity must be in [0, 1]");
  }
  if (!Number.isInteger(minFuzzyLength) || minFuzzyLength < 1) {
    throw new Error("Invalid search config: queryParsing.minFuzzyLength must be a positive integer");
  }

  for (const [attribute, map] of Object.entries(aliases ?? {})) {
    const targets = ALIAS_TARGETS[attribute];
    if (!targets) {
      throw new Error(`Invalid search config: aliases for unsupported attribute "${attribute}"`);
    }
    for (const [word, value] of Object.entries(map)) {
      if (!SINGLE_WORD_RE.test(word)) {
        throw new Error(`Invalid search config: alias "${word}" must be one lowercase word`);
      }
      if (!targets.includes(value)) {
        throw new Error(`Invalid search config: alias "${word}" -> unknown ${attribute} "${value}"`);
      }
    }
  }
}

export function loadSearchConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== "object") {
    throw new Error("Invalid search config: config must be an object");
  }

  validatePalette(rawConfig.colorPalette);
  validateFieldWeights(rawConfig.fieldWeights);
  validateSynonyms(rawConfig.synonyms);
  validateStopwords(rawConfig.stopwords);

  if (!Number.isInteger(rawConfig.ngramSize) || rawConfig.ngramSize < 2) {
    throw new Error(`Invalid search config: ngramSize must be an integer >= 2 (got ${rawConfig.ngramSize})`);
  }

  for (const key of ["beta", "gamma", "minScore", "matchedTermMinSimilarity"]) {
    const value = rawConfig[key];
    if (typeof value !== "number" || value < 0 || value > 1) {
      throw new Error(`Invalid search config: ${key} must be a number in [0, 1] (got ${value})`);
    }
  }

  if (!Number.isInteger(rawConfig.defaultLimit) || rawConfig.defaultLimit < 1) {
    throw new Error(`Invalid search config: defaultLimit must be a positive integer (got ${rawConfig.defaultLimit})`);
  }

  validateQueryParsing(rawConfig.queryParsing);

  return deepFreeze(structuredClone(rawConfig));
}
