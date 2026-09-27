// Outfit Structure Rules (T2.5). Pure slot-counting validation, independent
// of any scoring - an invalid outfit never reaches T2.6's scoring at all.
import { CATEGORIES } from "../itemEnums.js";

export function isValidOutfit(items) {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));

  for (const item of items) {
    if (!CATEGORIES.includes(item.category)) {
      throw new Error(`isValidOutfit: unknown category "${item.category}"`);
    }
    counts[item.category] += 1;
  }

  if (counts.shoes !== 1) {
    return false;
  }

  const hasTopAndBottom = counts.top === 1 && counts.bottom === 1 && counts.dress === 0;
  const hasDressAlone = counts.dress === 1 && counts.top === 0 && counts.bottom === 0;
  if (!hasTopAndBottom && !hasDressAlone) {
    return false;
  }

  if (counts.outerwear > 1) {
    return false;
  }

  if (counts.accessory > 2) {
    return false;
  }

  return true;
}
