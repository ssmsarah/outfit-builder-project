// Outfit Generation / Beam Search (T2.7).
//
// Slot plan by anchor category, from the README's own examples (top->
// need bottom+shoes; shoes->need top+bottom; dress->need shoes), plus the
// natural symmetric case for a bottom anchor. Deliberately does NOT support
// an outerwear/accessory anchor: those would need 3 missing slots filled
// before the outfit is structurally complete, but outfitScore returns 0 for
// any structurally-incomplete outfit (T2.5's isValidOutfit gate), which is
// exactly what step 3 of this ticket relies on to rank partial outfits -
// that only works because every case the README specifies needs at most one
// "restSlots" fill after the first. See Decision Log T2.7.
import { pairwiseCompatibilityScore } from "./pairScore.js";
import { outfitScore } from "./outfitScore.js";
import { scoringConfig } from "../../config/scoringConfig.js";

const REQUIRED_SLOTS_BY_ANCHOR_CATEGORY = {
  top: ["bottom", "shoes"],
  bottom: ["top", "shoes"],
  shoes: ["top", "bottom"],
  dress: ["shoes"],
};

// Exported for reuse by T3.7's final ranker, which needs the same
// deterministic tie-break when re-sorting by FinalScore.
export function outfitKey(items) {
  return items.map((i) => i.id).slice().sort().join(",");
}

export function compareByKey(itemsA, itemsB) {
  const a = outfitKey(itemsA);
  const b = outfitKey(itemsB);
  return a < b ? -1 : a > b ? 1 : 0;
}

function rankAndTrim(entries, beamWidth) {
  return [...entries]
    .sort((a, b) => b.score - a.score || compareByKey(a.items, b.items))
    .slice(0, beamWidth);
}

function dedupeOutfits(entries) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    const key = outfitKey(entry.items);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

export function generateOutfits(
  anchorItem,
  wardrobe,
  context = {},
  topN = scoringConfig.generation.topN
) {
  const missingSlots = REQUIRED_SLOTS_BY_ANCHOR_CATEGORY[anchorItem.category];
  if (!missingSlots) {
    throw new Error(
      `generateOutfits: unsupported anchor category "${anchorItem.category}" (only top/bottom/shoes/dress can anchor a generated outfit)`
    );
  }

  const { beamWidth } = scoringConfig.generation;
  const [firstSlot, secondSlot] = missingSlots;

  // Step 2: rank first-slot candidates directly against the anchor with
  // C(A,B) - the outfit isn't structurally complete yet, so outfitScore
  // would just return 0 for all of them.
  let beam = wardrobe
    .filter((c) => c.category === firstSlot && c.id !== anchorItem.id)
    .map((c) => ({
      items: [anchorItem, c],
      score: pairwiseCompatibilityScore(anchorItem, c, context).score,
    }));
  beam = rankAndTrim(beam, beamWidth);

  // Step 3: fill the remaining required slot (if any) and score the now
  // structurally-complete outfit with outfitScore.
  if (secondSlot) {
    const expanded = [];
    for (const partial of beam) {
      const usedIds = new Set(partial.items.map((i) => i.id));
      for (const c of wardrobe) {
        if (c.category !== secondSlot || usedIds.has(c.id)) continue;
        const items = [...partial.items, c];
        expanded.push({ items, score: outfitScore(items, context) });
      }
    }
    beam = rankAndTrim(dedupeOutfits(expanded), beamWidth);
  } else {
    // Dress anchor: already complete after the first slot. Recompute with
    // outfitScore (not the pairwise score used to rank it) so every path
    // reaches step 4 with a real, comparable outfit score.
    beam = beam.map((entry) => ({ items: entry.items, score: outfitScore(entry.items, context) }));
  }

  // Step 4: optionally add exactly 1 accessory, only if it strictly
  // improves the score - ties keep the no-accessory version.
  beam = beam.map((entry) => {
    const usedIds = new Set(entry.items.map((i) => i.id));
    let best = entry;
    for (const c of wardrobe) {
      if (c.category !== "accessory" || usedIds.has(c.id)) continue;
      const items = [...entry.items, c];
      const score = outfitScore(items, context);
      if (score > best.score) {
        best = { items, score };
      }
    }
    return best;
  });

  beam = dedupeOutfits(beam);
  beam.sort((a, b) => b.score - a.score || compareByKey(a.items, b.items));

  return beam.slice(0, topN).map(({ items, score }) => ({ items, score }));
}
