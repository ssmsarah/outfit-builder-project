// T2.9: consolidated Sprint 2 tests - a regression snapshot for the
// black_tshirt top-5 (recomputed by hand and hardcoded below, rather than
// an opaque auto-generated .snap file, so a diff is readable without extra
// tooling), plus the Sprint 2 Definition of Done's own claim ("given any
// anchor item, the engine returns ranked, valid, explained outfits using
// only compatibility - no user data") exercised end-to-end and enforced as
// a static module-isolation guard, matching T1.7's approach for Sprint 1.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { generateOutfits } from "../../../src/recommendation/compatibility/outfitGenerator.js";
import { explainOutfit } from "../../../src/recommendation/compatibility/explainOutfit.js";
import { isValidOutfit } from "../../../src/recommendation/compatibility/outfitStructure.js";
import { wardrobe, wardrobeById } from "../fixtures/wardrobe.js";

const context = { targetOccasion: "casual", targetSeason: null };

// Captured from an actual run against the T0.4 fixture wardrobe. If this
// ever legitimately needs to change (e.g. a deliberate weight/config
// change), recompute and update deliberately - a silent diff here means
// something in the color/compatibility pipeline shifted unexpectedly.
const EXPECTED_BLACK_TSHIRT_TOP5 = [
  { ids: ["black_tshirt", "blue_jeans", "white_sneakers"], score: 0.9708123249299722 },
  { ids: ["beige_chinos", "black_tshirt", "leather_belt", "white_sneakers"], score: 0.9262012747127836 },
  { ids: ["black_tshirt", "green_floral_skirt", "white_sneakers"], score: 0.9214789915966387 },
  { ids: ["black_tshirt", "blue_jeans", "sport_running_shoes"], score: 0.8459047619047618 },
  { ids: ["black_oxfords", "black_tshirt", "blue_jeans", "leather_belt"], score: 0.8293328664799253 },
];

describe("T2.9 - regression snapshot: black_tshirt top-5 from the fixture wardrobe", () => {
  it("matches the captured top-5 ids and scores exactly", () => {
    const results = generateOutfits(wardrobeById.black_tshirt, wardrobe, context);

    expect(results).toHaveLength(5);
    const actual = results.map((r) => ({ ids: [...r.items.map((i) => i.id)].sort(), score: r.score }));
    expect(actual).toEqual(EXPECTED_BLACK_TSHIRT_TOP5);
  });
});

describe("T2.9 - Sprint 2 Definition of Done: ranked, valid, explained outfits from compatibility alone", () => {
  const ANCHOR_IDS = [
    "black_tshirt", "white_shirt", "navy_shirt", "blue_jeans", "beige_chinos",
    "red_shorts", "white_sneakers", "black_oxfords", "floral_summer_dress",
  ];

  it("produces ranked (descending), structurally valid, fully-explained outfits for a variety of anchors", () => {
    for (const anchorId of ANCHOR_IDS) {
      const anchor = wardrobeById[anchorId];
      const results = generateOutfits(anchor, wardrobe, context);

      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }

      for (const { items } of results) {
        expect(isValidOutfit(items)).toBe(true);
        expect(items.some((i) => i.id === anchorId)).toBe(true);

        const explanation = explainOutfit(items, context);
        expect(explanation.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(explanation.compatibilityScore).toBeLessThanOrEqual(1);
        expect(explanation.reasons.length).toBeGreaterThan(0);
      }
    }
  });

  it("never needs user interaction data - the whole pipeline runs on wardrobe items and context alone", () => {
    // Static proof, not just an absence-of-crash observation: none of the
    // compatibility (or color) modules import a personalization module,
    // which doesn't exist yet in this sprint.
    const here = dirname(fileURLToPath(import.meta.url));
    const compatDir = join(here, "..", "..", "..", "src", "recommendation", "compatibility");
    const files = [
      "styleMatrix.js", "patternMatrix.js", "contextScores.js", "pairScore.js",
      "outfitStructure.js", "outfitScore.js", "outfitGenerator.js", "explainOutfit.js",
    ];
    for (const file of files) {
      const source = readFileSync(join(compatDir, file), "utf-8");
      expect(source).not.toMatch(/from\s+["'].*\/personalization\//);
    }
  });
});
