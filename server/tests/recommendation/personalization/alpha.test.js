import { describe, it, expect } from "vitest";
import { resolveAlpha, resolveAlphaFromInteractions } from "../../../src/recommendation/personalization/alpha.js";
import { scoringConfig } from "../../../src/config/scoringConfig.js";
import { outfitScore } from "../../../src/recommendation/compatibility/outfitScore.js";
import { wardrobeById } from "../fixtures/wardrobe.js";

const { coldStart, default: defaultAlpha, minInteractions } = scoringConfig.alpha;

describe("resolveAlpha", () => {
  it("anonymous users always get cold-start alpha, regardless of interaction count", () => {
    expect(resolveAlpha({ isAnonymous: true, interactionCount: 0 })).toBe(coldStart);
    expect(resolveAlpha({ isAnonymous: true, interactionCount: 100 })).toBe(coldStart);
  });

  it("a logged-in user with fewer than minInteractions gets cold-start alpha", () => {
    expect(resolveAlpha({ interactionCount: 0 })).toBe(coldStart);
    expect(resolveAlpha({ interactionCount: minInteractions - 1 })).toBe(coldStart);
  });

  it("a logged-in user with at least minInteractions gets the default alpha", () => {
    expect(resolveAlpha({ interactionCount: minInteractions })).toBe(defaultAlpha);
    expect(resolveAlpha({ interactionCount: minInteractions + 50 })).toBe(defaultAlpha);
  });

  it("resolveAlphaFromInteractions counts the interaction list length", () => {
    const fewInteractions = Array.from({ length: minInteractions - 1 }, () => ({}));
    const manyInteractions = Array.from({ length: minInteractions + 10 }, () => ({}));

    expect(resolveAlphaFromInteractions(fewInteractions)).toBe(coldStart);
    expect(resolveAlphaFromInteractions(manyInteractions)).toBe(defaultAlpha);
    expect(resolveAlphaFromInteractions(manyInteractions, { isAnonymous: true })).toBe(coldStart);
  });
});

describe("resolveAlpha - README acceptance criterion: new user results identical to Sprint 2", () => {
  it("alpha=coldStart makes the FinalScore formula collapse to compatibility (C) alone", () => {
    const alpha = resolveAlpha({ interactionCount: 0 });
    expect(alpha).toBe(1.0);

    const context = { targetOccasion: "casual", targetSeason: null };
    const items = [wardrobeById.black_tshirt, wardrobeById.blue_jeans, wardrobeById.white_sneakers];
    const C = outfitScore(items, context);
    const P = 0.1; // an arbitrary personalization score - should be fully ignored

    const finalScore = alpha * C + (1 - alpha) * P;
    expect(finalScore).toBe(C);
  });
});
