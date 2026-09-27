// Attribute Affinity Profile (T3.4): generalizes preference to items the
// user hasn't interacted with, by averaging R_i across shared attribute
// values (color hue group or "neutral", style, pattern, category).
import { getItemHsv } from "../color/colorConvert.js";
import { isNeutral } from "../color/colorHarmony.js";
import { computeUserItemPreferenceScores } from "./preferenceScore.js";
import { scoringConfig } from "../../config/scoringConfig.js";
import { mean, clamp01 } from "../utils/math.js";

// Fixed 30-degree hue buckets (matching T1.6's "within 30 degrees" grouping
// width) rather than T1.6's dynamic per-outfit clustering - a stable,
// per-item classification is what a profile aggregated over many
// interactions over time needs, not an outfit-relative one.
const HUE_GROUP_WIDTH_DEGREES = 30;

export function colorGroupOf(item) {
  if (isNeutral(item)) return "neutral";
  return `hue-${Math.floor(getItemHsv(item).h / HUE_GROUP_WIDTH_DEGREES)}`;
}

const ATTRIBUTE_TYPES = ["colorGroup", "style", "pattern", "category"];

function attributeValuesOf(item) {
  return {
    colorGroup: colorGroupOf(item),
    style: item.style,
    pattern: item.pattern,
    category: item.category,
  };
}

// interactedItemsWithScores: [{ item, R }] - the join between T3.3's R_i
// values (keyed by itemId) and the actual item objects (interaction
// records alone don't carry attributes, only itemId).
export function buildAttributeProfile(interactedItemsWithScores) {
  const scoresByAttributeValue = Object.fromEntries(ATTRIBUTE_TYPES.map((t) => [t, new Map()]));

  for (const { item, R } of interactedItemsWithScores) {
    const values = attributeValuesOf(item);
    for (const type of ATTRIBUTE_TYPES) {
      const value = values[type];
      if (!scoresByAttributeValue[type].has(value)) {
        scoresByAttributeValue[type].set(value, []);
      }
      scoresByAttributeValue[type].get(value).push(R);
    }
  }

  const profile = {};
  for (const type of ATTRIBUTE_TYPES) {
    profile[type] = new Map();
    for (const [value, scores] of scoresByAttributeValue[type]) {
      profile[type].set(value, mean(scores));
    }
  }
  return profile;
}

// attributeAffinity(item) = mean of the affinities for the item's attribute
// values; an attribute value never seen in the profile defaults to 0.5
// (neutral - neither a signal for nor against).
export function attributeAffinity(item, profile) {
  const values = attributeValuesOf(item);
  const affinities = ATTRIBUTE_TYPES.map((type) =>
    profile[type].has(values[type]) ? profile[type].get(values[type]) : 0.5
  );
  return clamp01(mean(affinities));
}

// P_item = 0.5*R_i + 0.5*attributeAffinity if the user interacted with the
// item (has a known R_i), else attributeAffinity alone.
export function computeItemAffinity(item, { profile, preferenceScores }) {
  const affinity = attributeAffinity(item, profile);
  const R = preferenceScores.get(item.id);

  if (R === undefined) {
    return affinity;
  }

  const { itemDirect, attributeAffinity: wAttr } = scoringConfig.preferenceBlend;
  return clamp01(itemDirect * R + wAttr * affinity);
}

// Convenience: raw interactions + an item lookup -> { profile, preferenceScores },
// everything computeItemAffinity needs. Interaction records only carry
// itemId, so a lookup is required to read the interacted items' attributes.
export function buildUserAffinityContext(interactions, itemsById, options = {}) {
  const preferenceScores = computeUserItemPreferenceScores(interactions, options);

  const interactedItemsWithScores = [];
  for (const [itemId, R] of preferenceScores) {
    const item = itemsById[itemId];
    if (item) interactedItemsWithScores.push({ item, R });
  }

  return { profile: buildAttributeProfile(interactedItemsWithScores), preferenceScores };
}
