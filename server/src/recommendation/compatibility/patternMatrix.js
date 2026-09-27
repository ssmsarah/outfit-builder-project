// Pattern Compatibility Matrix (T2.2). Same shape as styleMatrix.js: a
// direct enum->enum lookup taking the two pattern values.
import { scoringConfig } from "../../config/scoringConfig.js";
import { PATTERNS } from "../itemEnums.js";

export function patternCompatibility(patternA, patternB) {
  if (!PATTERNS.includes(patternA) || !PATTERNS.includes(patternB)) {
    const bad = !PATTERNS.includes(patternA) ? patternA : patternB;
    throw new Error(`patternCompatibility: unknown pattern "${bad}"`);
  }

  return scoringConfig.patternCompatibilityMatrix[patternA][patternB];
}
