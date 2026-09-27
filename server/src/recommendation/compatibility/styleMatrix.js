// Style Compatibility Matrix (T2.1). A direct enum->enum lookup, not an
// item-based scorer like the color harmony functions (style compatibility
// doesn't need any derived data - it's a plain table), so this takes the
// two style values directly. T2.4's C(A,B) calls this with a.style/b.style.
import { scoringConfig } from "../../config/scoringConfig.js";
import { STYLES } from "../itemEnums.js";

export function styleCompatibility(styleA, styleB) {
  if (!STYLES.includes(styleA) || !STYLES.includes(styleB)) {
    const bad = !STYLES.includes(styleA) ? styleA : styleB;
    throw new Error(`styleCompatibility: unknown style "${bad}"`);
  }

  return scoringConfig.styleCompatibilityMatrix[styleA][styleB];
}
