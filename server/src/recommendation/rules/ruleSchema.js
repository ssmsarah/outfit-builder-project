// Rule Schema (R5.1). Defines what a valid rule looks like and validates a
// raw rules config against it. Kept free of any rule *values* (those live in
// config/rulesConfig.js) so the validator can be unit-tested against
// deliberately broken configs, the same split as loadScoringConfig.js (T0.3).
import { PATTERNS } from "../itemEnums.js";

export const SCOPES = ["item", "pair", "outfit"];
export const RULE_TYPES = ["hard", "soft"];
export const HARD_EFFECTS = ["reject"];
export const SOFT_EFFECTS = ["boost", "penalty"];

// Every operator the condition evaluator (R5.2) implements. The evaluator's
// test suite asserts each one here has an implementation.
export const OPERATORS = [
  "eq",
  "neq",
  "in",
  "notIn",
  "contains",
  "containsAny",
  "onlyContains",
  "gte",
  "lte",
];

// Operators whose operand must be an array (a set of candidate values).
export const ARRAY_OPERAND_OPERATORS = ["in", "notIn", "containsAny", "onlyContains"];

export const LOGICAL_KEYS = ["all", "any", "not"];

const ITEM_FIELDS = [
  "id",
  "name",
  "category",
  "colorHex",
  "isNeutralOverride",
  "style",
  "pattern",
  "seasons",
  "occasions",
];

const CONTEXT_FIELDS = ["occasion", "season"];

// Derived fields computed by the rule engine (R5.4 / R5.5), never stored.
const PAIR_FIELDS = ["colorRelation", "bothPatterned", "sameStyle", "categories"];

const OUTFIT_FIELDS = [
  "patternCount",
  "boldPatternCount",
  "styles",
  "styleCount",
  "nonNeutralColorCount",
  "categories",
  "itemCount",
];

// Known attribute paths per root object (the part before the dot).
export const ATTRIBUTE_FIELDS = {
  item: ITEM_FIELDS,
  a: ITEM_FIELDS,
  b: ITEM_FIELDS,
  context: CONTEXT_FIELDS,
  pair: PAIR_FIELDS,
  outfit: OUTFIT_FIELDS,
};

// Which roots a rule's `condition` may reference, per scope. `when` may
// only ever reference `context`.
export const ROOTS_BY_SCOPE = {
  item: ["item", "context"],
  pair: ["a", "b", "pair", "context"],
  outfit: ["outfit", "context"],
};

const REQUIRED_FIELDS = [
  "id",
  "description",
  "scope",
  "type",
  "priority",
  "condition",
  "action",
  "message",
];

export function isKnownPath(path) {
  if (typeof path !== "string") return false;
  const [root, field, ...rest] = path.split(".");
  return rest.length === 0 && Boolean(ATTRIBUTE_FIELDS[root]?.includes(field));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Recursively checks a condition tree: logical nodes (all/any/not) and
// attribute nodes ({ "root.field": { operator: operand } }).
function validateCondition(condition, allowedRoots, where) {
  if (!isPlainObject(condition) || Object.keys(condition).length === 0) {
    throw new Error(`${where}: condition must be a non-empty object`);
  }

  for (const [key, value] of Object.entries(condition)) {
    if (key === "all" || key === "any") {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error(`${where}: "${key}" must be a non-empty array of conditions`);
      }
      value.forEach((child, i) => validateCondition(child, allowedRoots, `${where}.${key}[${i}]`));
      continue;
    }

    if (key === "not") {
      validateCondition(value, allowedRoots, `${where}.not`);
      continue;
    }

    if (!isKnownPath(key)) {
      throw new Error(`${where}: unknown attribute "${key}"`);
    }

    const root = key.split(".")[0];
    if (!allowedRoots.includes(root)) {
      throw new Error(
        `${where}: attribute "${key}" is not available here (allowed roots: ${allowedRoots.join(", ")})`
      );
    }

    if (!isPlainObject(value) || Object.keys(value).length === 0) {
      throw new Error(`${where}: "${key}" must map to an { operator: value } object`);
    }

    for (const [operator, operand] of Object.entries(value)) {
      if (!OPERATORS.includes(operator)) {
        throw new Error(`${where}: unknown operator "${operator}" on "${key}"`);
      }
      if (ARRAY_OPERAND_OPERATORS.includes(operator) && !Array.isArray(operand)) {
        throw new Error(`${where}: operator "${operator}" on "${key}" needs an array value`);
      }
      if ((operator === "gte" || operator === "lte") && typeof operand !== "number") {
        throw new Error(`${where}: operator "${operator}" on "${key}" needs a numeric value`);
      }
    }
  }
}

export function validateRule(rule, { maxSoftValue }) {
  if (!isPlainObject(rule)) {
    throw new Error("Invalid rule: each rule must be an object");
  }

  const label = `Invalid rule "${rule.id ?? "<missing id>"}"`;

  for (const field of REQUIRED_FIELDS) {
    if (rule[field] === undefined || rule[field] === null || rule[field] === "") {
      throw new Error(`${label}: missing required field "${field}"`);
    }
  }

  if (!SCOPES.includes(rule.scope)) {
    throw new Error(`${label}: unknown scope "${rule.scope}" (expected ${SCOPES.join(" | ")})`);
  }

  if (!RULE_TYPES.includes(rule.type)) {
    throw new Error(`${label}: unknown type "${rule.type}" (expected ${RULE_TYPES.join(" | ")})`);
  }

  if (typeof rule.priority !== "number" || !Number.isFinite(rule.priority)) {
    throw new Error(`${label}: priority must be a finite number`);
  }

  if (rule.enabled !== undefined && typeof rule.enabled !== "boolean") {
    throw new Error(`${label}: enabled must be a boolean when present`);
  }

  if (rule.when !== undefined) {
    validateCondition(rule.when, ["context"], `${label} when`);
  }

  validateCondition(rule.condition, ROOTS_BY_SCOPE[rule.scope], `${label} condition`);

  const { effect, value } = rule.action;

  if (rule.type === "hard") {
    if (!HARD_EFFECTS.includes(effect)) {
      throw new Error(`${label}: hard rules must use effect "reject" (got "${effect}")`);
    }
    if (value !== undefined) {
      throw new Error(`${label}: hard rules must not have an action value`);
    }
  } else {
    if (!SOFT_EFFECTS.includes(effect)) {
      throw new Error(`${label}: soft rules must use effect "boost" or "penalty" (got "${effect}")`);
    }
    if (typeof value !== "number" || value < 0 || value > maxSoftValue) {
      throw new Error(`${label}: soft rule value must be a number in [0, ${maxSoftValue}] (got ${value})`);
    }
  }
}

export const MATCH_ATTRIBUTES = ["category", "color", "style", "pattern", "occasion", "season"];

const SUM_TOLERANCE = 1e-6;

function validateAttributeMatch(attributeMatch) {
  const { weights } = attributeMatch ?? {};

  if (!isPlainObject(weights)) {
    throw new Error("Invalid rules config: attributeMatch.weights must be an object");
  }

  for (const key of Object.keys(weights)) {
    if (!MATCH_ATTRIBUTES.includes(key)) {
      throw new Error(`Invalid rules config: unknown attributeMatch weight "${key}"`);
    }
  }

  for (const key of MATCH_ATTRIBUTES) {
    if (typeof weights[key] !== "number" || weights[key] <= 0) {
      throw new Error(`Invalid rules config: attributeMatch.weights.${key} must be a positive number`);
    }
  }

  const sum = Object.values(weights).reduce((total, w) => total + w, 0);
  if (Math.abs(sum - 1) > SUM_TOLERANCE) {
    throw new Error(`Invalid rules config: attributeMatch.weights must sum to 1.0 (got ${sum})`);
  }
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

// Validates the whole rules config and returns a frozen copy, mirroring
// loadScoringConfig (T0.3).
export function loadRulesConfig(rawConfig) {
  if (!isPlainObject(rawConfig)) {
    throw new Error("Invalid rules config: config must be an object");
  }

  const { rules, maxSoftValue, adjustmentCap, boldPatterns } = rawConfig;

  if (!Array.isArray(boldPatterns) || boldPatterns.some((p) => !PATTERNS.includes(p))) {
    throw new Error(`Invalid rules config: boldPatterns must be a list of known patterns (${PATTERNS.join(", ")})`);
  }

  if (rawConfig.attributeMatch !== undefined) {
    validateAttributeMatch(rawConfig.attributeMatch);
  }

  if (typeof maxSoftValue !== "number" || maxSoftValue <= 0) {
    throw new Error("Invalid rules config: maxSoftValue must be a positive number");
  }

  if (typeof adjustmentCap !== "number" || adjustmentCap <= 0) {
    throw new Error("Invalid rules config: adjustmentCap must be a positive number");
  }

  if (!Array.isArray(rules)) {
    throw new Error("Invalid rules config: rules must be an array");
  }

  const seenIds = new Set();
  for (const rule of rules) {
    validateRule(rule, { maxSoftValue });
    if (seenIds.has(rule.id)) {
      throw new Error(`Invalid rules config: duplicate rule id "${rule.id}"`);
    }
    seenIds.add(rule.id);
  }

  return deepFreeze(structuredClone(rawConfig));
}
