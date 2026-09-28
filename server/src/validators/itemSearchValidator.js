// Input validation for the item search/match endpoints (I7.4). Like
// recommendOutfitsValidator.js (T4.2): plain functions that return an error
// message, or null when the input is fine, so they are testable without
// Express.
import { CATEGORIES, STYLES, PATTERNS, OCCASIONS, SEASONS } from "../recommendation/itemEnums.js";
import { MATCH_ATTRIBUTES } from "../recommendation/rules/ruleSchema.js";
import { paletteColorNames } from "../recommendation/search/colorNames.js";

export const MAX_LIMIT = 100;

const ALLOWED_VALUES = {
  category: CATEGORIES,
  color: paletteColorNames(),
  style: STYLES,
  pattern: PATTERNS,
  occasion: OCCASIONS,
  season: SEASONS,
};

// Query-string numbers arrive as strings. Returns the parsed integer, or
// NaN when the value is present but not a whole number.
export function parseIntParam(value) {
  if (value === undefined) return undefined;
  return /^\d+$/.test(String(value)) ? Number(value) : NaN;
}

function limitError(limit) {
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT)) {
    return `limit must be an integer between 1 and ${MAX_LIMIT}`;
  }
  return null;
}

// GET /api/items/search?q=&limit=&offset=
export function validateSearchRequest({ q, limit, offset } = {}) {
  if (typeof q !== "string" || q.trim() === "") {
    return "q (the search query) is required";
  }

  if (q.length > 200) {
    return "q must be at most 200 characters";
  }

  const limitProblem = limitError(limit);
  if (limitProblem) return limitProblem;

  if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
    return "offset must be a non-negative integer";
  }

  return null;
}

// POST /api/items/match { attributes, limit }
export function validateMatchRequest({ attributes, limit } = {}) {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return "attributes must be an object, e.g. { \"category\": \"top\", \"color\": \"black\" }";
  }

  const keys = Object.keys(attributes);
  if (keys.length === 0) {
    return "attributes must contain at least one attribute";
  }

  for (const key of keys) {
    if (!MATCH_ATTRIBUTES.includes(key)) {
      return `Unknown attribute "${key}" (expected one of: ${MATCH_ATTRIBUTES.join(", ")})`;
    }

    const value = attributes[key];
    if (!ALLOWED_VALUES[key].includes(value)) {
      return `Invalid ${key} "${value}" (expected one of: ${ALLOWED_VALUES[key].join(", ")})`;
    }
  }

  return limitError(limit);
}
