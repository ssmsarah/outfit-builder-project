// Score Explanation Breakdown (T2.8).
//
// breakdown.color is outfitColorScore(items) directly - the exact value
// T2.6's formula already substitutes in for the color term, so it matches
// the final score's color contribution precisely. breakdown.style/pattern/
// occasion/season are the *plain* (unweighted) mean of that component
// across every pair - not the accessory-adjusted weighted mean outfitScore
// actually uses internally. That's a deliberate simplification for
// explainability (a plain average is what a person expects "style: 93%" to
// mean), and it's exactly why the acceptance criteria only asks for the
// recombination to match within 0.01 rather than exactly - see Decision Log.
import { outfitScore } from "./outfitScore.js";
import { outfitColorScore, classifyHueRelation } from "../color/colorHarmony.js";
import { styleCompatibility } from "./styleMatrix.js";
import { patternCompatibility } from "./patternMatrix.js";
import { occasionScore, seasonScore } from "./contextScores.js";
import { mean } from "../utils/math.js";

function everyPair(items) {
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push([items[i], items[j]]);
    }
  }
  return pairs;
}

function dominantColorRelation(colorRelations) {
  const counts = {};
  for (const { relation } of colorRelations) {
    counts[relation] = (counts[relation] || 0) + 1;
  }
  return Object.keys(counts).reduce(
    (best, relation) => (counts[relation] > (counts[best] ?? -1) ? relation : best),
    null
  );
}

const POSITIVE_COLOR_REASON = {
  neutral_pair: "Neutral colors pair cleanly",
  neutral_accent: "Neutral colors pair cleanly",
  monochromatic: "Colors blend smoothly together",
  analogous: "Colors blend smoothly together",
  complementary: "Colors create a striking contrast",
  split_complementary: "Colors create a striking contrast",
  triadic: "Colors create a striking contrast",
  clash: "Colors are bold and eclectic",
};

const FACTORS = ["color", "style", "pattern", "occasion", "season"];
const WEAK_THRESHOLD = 0.7;

function positiveReason(factor, { items, colorRelations, context }) {
  switch (factor) {
    case "color":
      return POSITIVE_COLOR_REASON[dominantColorRelation(colorRelations)] ?? "Colors work well together";
    case "style": {
      const styles = new Set(items.map((i) => i.style));
      return styles.size === 1
        ? `All items share ${[...styles][0]} style`
        : "Styles complement each other well";
    }
    case "pattern":
      return "Patterns work well together";
    case "occasion":
      return context.targetOccasion
        ? `Great fit for a ${context.targetOccasion} occasion`
        : "Occasions align well across items";
    case "season":
      return context.targetSeason
        ? `Well suited to ${context.targetSeason}`
        : "Seasons align well across items";
    default:
      return "";
  }
}

function cautionReason(factor) {
  switch (factor) {
    case "color":
      return "Some colors clash and pull the score down";
    case "style":
      return "Styles don't fully align across items";
    case "pattern":
      return "Patterns compete rather than complement";
    case "occasion":
      return "Not all items fit the intended occasion";
    case "season":
      return "Not all items suit the intended season";
    default:
      return "";
  }
}

function generateReasons(breakdown, ctx) {
  const strongest = FACTORS.reduce((best, f) => (breakdown[f] > breakdown[best] ? f : best), FACTORS[0]);
  const weakest = FACTORS.reduce((worst, f) => (breakdown[f] < breakdown[worst] ? f : worst), FACTORS[0]);

  const reasons = [positiveReason(strongest, ctx)];
  if (weakest !== strongest) {
    reasons.push(breakdown[weakest] < WEAK_THRESHOLD ? cautionReason(weakest) : positiveReason(weakest, ctx));
  }
  return reasons;
}

export function explainOutfit(items, context = {}) {
  const pairs = everyPair(items);

  const breakdown = {
    color: outfitColorScore(items),
    style: mean(pairs.map(([a, b]) => styleCompatibility(a.style, b.style))),
    pattern: mean(pairs.map(([a, b]) => patternCompatibility(a.pattern, b.pattern))),
    occasion: mean(pairs.map(([a, b]) => occasionScore(a, b, context.targetOccasion))),
    season: mean(
      pairs.map(([a, b]) =>
        seasonScore(a, b, {
          targetSeason: context.targetSeason,
          date: context.date,
          hemisphere: context.hemisphere,
        })
      )
    ),
  };

  const colorRelations = pairs.map(([a, b]) => ({
    pair: [a.id, b.id],
    relation: classifyHueRelation(a, b).relation,
  }));

  return {
    items: items.map((i) => i.id),
    compatibilityScore: outfitScore(items, context),
    breakdown,
    colorRelations,
    reasons: generateReasons(breakdown, { items, colorRelations, context }),
  };
}
