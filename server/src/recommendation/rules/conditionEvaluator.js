// Condition Evaluator (R5.2): evaluate(condition, target) -> boolean.
//
// `condition` uses the R5.1 schema: attribute nodes
// ({ "root.field": { operator: operand } }, several keys = AND) and the
// logical nodes all / any / not. `target` is a plain object keyed by root,
// e.g. { item, context } or { a, b, pair, context }. Pure function.
import { isKnownPath } from "./ruleSchema.js";

// Sets (e.g. outfit.styles) are compared like arrays.
function asList(value) {
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return [...value];
  return null;
}

export const OPERATOR_IMPLEMENTATIONS = {
  eq: (actual, operand) => actual === operand,
  neq: (actual, operand) => actual !== operand,
  in: (actual, operand) => operand.includes(actual),
  notIn: (actual, operand) => !operand.includes(actual),
  // List attribute contains the single value.
  contains: (actual, operand) => Boolean(asList(actual)?.includes(operand)),
  // List attribute contains at least one of the values.
  containsAny: (actual, operand) => {
    const list = asList(actual);
    return Boolean(list) && operand.some((value) => list.includes(value));
  },
  // List attribute is non-empty and every element is one of the values,
  // e.g. seasons ["summer"] onlyContains ["summer"] -> true.
  onlyContains: (actual, operand) => {
    const list = asList(actual);
    return Boolean(list) && list.length > 0 && list.every((value) => operand.includes(value));
  },
  gte: (actual, operand) => typeof actual === "number" && actual >= operand,
  lte: (actual, operand) => typeof actual === "number" && actual <= operand,
};

export function resolvePath(path, target) {
  if (!isKnownPath(path)) {
    throw new Error(`evaluate: unknown attribute path "${path}"`);
  }

  const [root, field] = path.split(".");

  if (!target || target[root] === undefined || target[root] === null) {
    throw new Error(`evaluate: attribute path "${path}" needs "${root}", which is missing from the evaluation target`);
  }

  return target[root][field];
}

function evaluateAttribute(path, operators, target) {
  const actual = resolvePath(path, target);

  return Object.entries(operators).every(([operator, operand]) => {
    const implementation = OPERATOR_IMPLEMENTATIONS[operator];
    if (!implementation) {
      throw new Error(`evaluate: unknown operator "${operator}" on "${path}"`);
    }
    return implementation(actual, operand);
  });
}

export function evaluate(condition, target) {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) {
    throw new Error("evaluate: condition must be an object");
  }

  return Object.entries(condition).every(([key, value]) => {
    if (key === "all") return value.every((child) => evaluate(child, target));
    if (key === "any") return value.some((child) => evaluate(child, target));
    if (key === "not") return !evaluate(value, target);
    return evaluateAttribute(key, value, target);
  });
}
