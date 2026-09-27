# Outfit Builder: Algorithm Implementation Plan

This file is the single source of truth for implementing three algorithms in the outfit builder:

1. **Color Harmony Algorithm** (supporting math layer)
2. **Outfit Compatibility Scoring Algorithm** (core engine)
3. **Personalized Recommendation Algorithm** (personalization layer)

Build order is Color, then Compatibility, then Personalization, because each one depends on the one before it.

---

## Instructions for Claude (read before starting)

1. Read this entire file before writing any code.
2. Work **one ticket at a time, in order**. Do not start a ticket until every ticket it depends on is `DONE`.
3. Before Sprint 0, inspect the repository. Adapt file paths, naming, and language to the existing stack. The paths in this file are suggestions, not requirements.
4. After finishing each ticket:
   - Run the ticket's tests and the full existing test suite. All must pass.
   - Update the ticket's status in the **Progress Tracker** below (`TODO` → `DONE`).
   - Add any assumption or deviation to the **Decision Log** at the bottom.
5. Do not modify unrelated code. Do not delete the existing rule-based recommender until ticket T4.1 explicitly says to.
6. All scores must be floats in the range `[0, 1]`. Clamp every intermediate score.
7. All weights and thresholds must live in one config file (T0.3), never hardcoded inside algorithm logic.
8. Every scoring function must be a pure function (no DB/network calls inside), so it is unit-testable.
9. If a ticket is ambiguous, choose the simplest option that satisfies the acceptance criteria and record it in the Decision Log. Do not stop to ask unless a choice would break existing functionality.

---

## Progress Tracker

| Ticket | Title | Depends on | Status |
|---|---|---|---|
| T0.1 | Repository audit | - | DONE |
| T0.2 | Clothing item data model | T0.1 | DONE |
| T0.3 | Central scoring config | T0.1 | DONE |
| T0.4 | Test fixtures / seed wardrobe | T0.2 | DONE |
| T0.5 | Shared math utilities | T0.1 | DONE |
| T0.6 | Product-to-item adapter (real data compatibility) | T0.2 | DONE |
| T1.1 | HEX to HSV conversion | T0.5 | DONE |
| T1.2 | Neutral color detection | T1.1 | DONE |
| T1.3 | Hue relationship classifier | T1.2 | DONE |
| T1.4 | Saturation and brightness scores | T1.1 | DONE |
| T1.5 | Pairwise color score | T1.3, T1.4 | DONE |
| T1.6 | Outfit-level color score | T1.5 | DONE |
| T1.7 | Color harmony test suite | T1.6 | DONE |
| T2.1 | Style compatibility matrix | T0.3 | DONE |
| T2.2 | Pattern compatibility matrix | T0.3 | DONE |
| T2.3 | Occasion and season scores | T0.3 | DONE |
| T2.4 | Pairwise compatibility C(A,B) | T1.5, T2.1-T2.3 | DONE |
| T2.5 | Outfit structure rules | T0.2 | DONE |
| T2.6 | Full outfit score | T2.4, T2.5, T1.6 | DONE |
| T2.7 | Outfit generation (beam search) | T2.6 | DONE |
| T2.8 | Score explanation breakdown | T2.6 | DONE |
| T2.9 | Compatibility test suite | T2.7, T2.8 | DONE |
| T3.1 | Interaction tracking | T0.2 | DONE |
| T3.2 | Signal normalization and time decay | T3.1 | DONE |
| T3.3 | Item preference score R_i | T3.2 | DONE |
| T3.4 | Attribute affinity profile | T3.3 | DONE |
| T3.5 | Outfit preference score P | T3.4 | DONE |
| T3.6 | Cold start and adaptive alpha | T3.5 | DONE |
| T3.7 | Final score and re-ranking | T2.7, T3.6 | DONE |
| T3.8 | Personalization test suite | T3.7 | DONE |
| T4.1 | Integrate into recommendation flow | T3.7 | DONE |
| T4.2 | API contract | T4.1 | DONE |
| T4.3 | UI score display | T4.2 | DONE |
| T4.4 | Evaluation script and metrics | T4.1 | DONE |
| T4.5 | Performance check | T4.1 | DONE |
| T4.6 | Algorithm documentation for report | T4.4 | DONE |

---

## Suggested Module Layout

Adapt to the existing project structure.

```
recommendation/
  config/scoring_config.(json|ts|py)
  color/
    color_convert
    color_harmony
  compatibility/
    style_matrix
    pattern_matrix
    context_scores        (occasion, season)
    pair_score
    outfit_score
    outfit_generator
  personalization/
    interaction_tracker
    preference_score
    attribute_profile
    final_ranker
  utils/math
tests/recommendation/
  fixtures/wardrobe
  color/  compatibility/  personalization/  integration/
scripts/evaluate_recommender
docs/ALGORITHMS.md
```

---

# Sprint 0: Foundation

### T0.1 Repository audit
**Task:** Inspect the repo and write findings to `docs/algorithms/AUDIT.md`:
- Language, framework, database/ORM, test framework.
- Current clothing item model and its fields.
- Current rule-based recommendation logic: file location, inputs, outputs, where it is called.
- Existing user/auth model (needed for Sprint 3).

**Acceptance criteria:**
- AUDIT.md exists and lists the files that later tickets will touch.
- A mapping of existing item fields to the fields required in T0.2.

### T0.2 Clothing item data model
**Task:** Extend (do not replace) the item model so every item has:

| Field | Type | Values |
|---|---|---|
| `id` | string/int | unique |
| `category` | enum | `top`, `bottom`, `shoes`, `accessory`, `outerwear`, `dress` |
| `colorHex` | string | `#RRGGBB` |
| `isNeutralOverride` | bool, optional | forces neutral classification (for navy, beige, denim) |
| `style` | enum | `casual`, `formal`, `smart_casual`, `streetwear`, `sporty` |
| `pattern` | enum | `solid`, `striped`, `checked`, `graphic`, `floral` |
| `seasons` | list of enum | `spring`, `summer`, `autumn`, `winter` |
| `occasions` | list of enum | `casual`, `work`, `formal`, `party`, `sport` |

Add a migration if the project uses a database. Existing items without values get defaults: `style=casual`, `pattern=solid`, all seasons, `occasions=[casual]`.

**Acceptance criteria:**
- Model validates enum values and hex format.
- Migration runs forward and backward without data loss.

### T0.3 Central scoring config
**Task:** Create one config with every weight and threshold used in this plan. Initial values:

```json
{
  "compatibilityWeights": { "color": 0.30, "style": 0.25, "pattern": 0.15, "occasion": 0.20, "season": 0.10 },
  "colorSubWeights": { "hue": 0.60, "saturation": 0.20, "brightness": 0.20 },
  "neutral": { "maxSaturation": 0.20, "minValueForDark": 0.20 },
  "brightnessTargetContrast": 0.30,
  "preferenceWeights": { "like": 0.35, "view": 0.10, "save": 0.25, "purchase": 0.30 },
  "preferenceBlend": { "itemDirect": 0.5, "attributeAffinity": 0.5 },
  "decayHalfLifeDays": 30,
  "alpha": { "default": 0.7, "coldStart": 1.0, "minInteractions": 5 },
  "generation": { "beamWidth": 10, "topN": 5, "accessoryPairWeight": 0.5 }
}
```

**Acceptance criteria:**
- Loader validates that `compatibilityWeights`, `colorSubWeights`, and `preferenceWeights` each sum to 1.0 (tolerance 1e-6) and throws a clear error otherwise.
- Unit test for valid and invalid configs.

### T0.4 Test fixtures / seed wardrobe
**Task:** Create a fixture wardrobe of at least 20 items covering every category, style, and pattern. Must include these items (used in later tests):
- `black_tshirt`: top, `#000000`, casual, solid
- `white_shirt`: top, `#FFFFFF`, formal, solid
- `navy_shirt`: top, `#1F2A44`, smart_casual, solid, `isNeutralOverride=true`
- `blue_jeans`: bottom, `#3B5B92`, casual, solid, `isNeutralOverride=true`
- `beige_chinos`: bottom, `#D8C8A8`, smart_casual, solid
- `black_trousers`: bottom, `#111111`, formal, solid
- `red_shorts`: bottom, `#CC2222`, sporty, solid
- `green_floral_skirt`: bottom, `#2E8B57`, casual, floral
- `white_sneakers`: shoes, `#F5F5F5`, casual, solid
- `black_oxfords`: shoes, `#0A0A0A`, formal, solid
- `orange_graphic_tee`: top, `#E67E22`, streetwear, graphic
- `purple_striped_shirt`: top, `#7D3C98`, casual, striped

**Acceptance criteria:** Fixture loads in tests without a database.

### T0.5 Shared math utilities
**Task:** Implement `clamp01(x)`, `mean(list)`, `weightedSum(values, weights)`, `circularHueDistance(h1, h2)` returning degrees in `[0, 180]`.

**Acceptance criteria:** Tests including `circularHueDistance(350, 10) == 20` and `circularHueDistance(0, 180) == 180`.

---

# Sprint 1: Color Harmony Algorithm

### T1.1 HEX to HSV conversion
**Task:** `hexToHsv(hex) -> { h: 0-360, s: 0-1, v: 0-1 }`. Cache HSV on the item after first computation.

**Acceptance criteria:**
- `#FF0000 -> (0, 1, 1)`, `#00FF00 -> (120, 1, 1)`, `#0000FF -> (240, 1, 1)`, `#FFFFFF -> (h any, 0, 1)`, `#000000 -> (h any, s any, 0)`.
- Invalid hex throws.

### T1.2 Neutral color detection
**Task:** `isNeutral(item)` returns true if any of:
- `isNeutralOverride == true`
- `s <= neutral.maxSaturation` (white, grey, beige-ish)
- `v <= neutral.minValueForDark` (black, near-black)

**Acceptance criteria:** black, white, grey, and override items are neutral; `#CC2222` and `#2E8B57` are not.

### T1.3 Hue relationship classifier
**Task:** `classifyHueRelation(a, b)` using `d = circularHueDistance(h_a, h_b)`:

| Condition | Relation | Hue score |
|---|---|---|
| both neutral | `neutral_pair` | 1.00 |
| exactly one neutral | `neutral_accent` | 0.95 |
| d <= 15 | `monochromatic` | 0.90 |
| 15 < d <= 45 | `analogous` | 0.85 |
| 165 <= d <= 180 | `complementary` | 0.80 |
| 135 <= d < 165 | `split_complementary` | 0.75 |
| 105 <= d < 135 | `triadic` | 0.70 |
| anything else | `clash` | 0.40 |

Scores come from config. Return both `relation` and `hueScore`.

**Acceptance criteria:** One unit test per row.

### T1.4 Saturation and brightness scores
**Task:**
```
C_saturation = 1 - |s_a - s_b|
C_brightness = 1 - min(1, | |v_a - v_b| - targetContrast | / (1 - targetContrast))
```
Brightness rewards moderate contrast (a light top with darker bottoms) rather than identical brightness. If either item is neutral, set `C_saturation = 1` (neutrals do not compete on saturation).

**Acceptance criteria:** Outputs in `[0,1]`; `|v_a - v_b| == 0.30` gives `C_brightness == 1`.

### T1.5 Pairwise color score
**Task:**
```
C_color(A,B) = w_hue * hueScore + w_sat * C_saturation + w_bright * C_brightness
```
Return `{ score, relation, components }`.

**Acceptance criteria:**
- `black_tshirt + blue_jeans` >= 0.85.
- `red_shorts + green_floral_skirt` hue relation is complementary or split_complementary.
- `orange_graphic_tee + purple_striped_shirt` scores lower than `black_tshirt + beige_chinos`.

### T1.6 Outfit-level color score
**Task:** `outfitColorScore(items)`:
1. Mean of `C_color` over all item pairs.
2. Count distinct non-neutral hue groups (items within 30 degrees = same group). If more than 3 groups, multiply by 0.85.

**Acceptance criteria:** An all-neutral outfit scores >= 0.9; a 4-bright-color outfit receives the penalty.

### T1.7 Color harmony test suite
**Task:** Consolidate tests for T1.1 to T1.6 and add property tests: symmetry `C(A,B) == C(B,A)`, range `[0,1]`.

**Sprint 1 Definition of Done:** All color tests pass; color module has no dependency on compatibility or personalization modules.

---

# Sprint 2: Outfit Compatibility Scoring Algorithm (Core)

### T2.1 Style compatibility matrix
**Task:** Symmetric lookup `C_style(a, b)`:

| | casual | smart_casual | formal | streetwear | sporty |
|---|---|---|---|---|---|
| casual | 1.0 | 0.8 | 0.3 | 0.8 | 0.7 |
| smart_casual | 0.8 | 1.0 | 0.7 | 0.5 | 0.3 |
| formal | 0.3 | 0.7 | 1.0 | 0.2 | 0.1 |
| streetwear | 0.8 | 0.5 | 0.2 | 1.0 | 0.7 |
| sporty | 0.7 | 0.3 | 0.1 | 0.7 | 1.0 |

**Acceptance criteria:** Matrix is symmetric (test asserts this); unknown style throws.

### T2.2 Pattern compatibility matrix
**Task:** Symmetric lookup `C_pattern(a, b)`:

| | solid | striped | checked | graphic | floral |
|---|---|---|---|---|---|
| solid | 1.0 | 0.9 | 0.9 | 0.9 | 0.9 |
| striped | 0.9 | 0.5 | 0.3 | 0.3 | 0.3 |
| checked | 0.9 | 0.3 | 0.4 | 0.3 | 0.2 |
| graphic | 0.9 | 0.3 | 0.3 | 0.3 | 0.2 |
| floral | 0.9 | 0.3 | 0.2 | 0.2 | 0.4 |

**Acceptance criteria:** Symmetric; solid pairs with anything >= 0.9.

### T2.3 Occasion and season scores
**Task:**
- If a target occasion is given: `C_occasion = 1.0` if both items include it, `0.5` if one does, `0.0` if neither.
- If no target occasion: `C_occasion = Jaccard(occasions_A, occasions_B)`.
- Season uses the same logic with target = current season (derive from date if not provided; make hemisphere configurable, default northern).

**Acceptance criteria:** Tests for all three target cases and the Jaccard case.

### T2.4 Pairwise compatibility C(A,B)
**Task:**
```
C(A,B) = w_c*C_color + w_s*C_style + w_p*C_pattern + w_o*C_occasion + w_se*C_season
```
Weights from config (0.30, 0.25, 0.15, 0.20, 0.10).

**Acceptance criteria:** Reproduce the worked example: with component scores color 0.8, style 1.0, pattern 0.8, occasion 1.0, season 1.0, result is exactly `0.30*0.8 + 0.25*1 + 0.15*0.8 + 0.20*1 + 0.10*1 = 0.91`. Test by injecting component values.

### T2.5 Outfit structure rules
**Task:** `isValidOutfit(items)` returns true only if:
- Exactly 1 `shoes`, AND
- Either (exactly 1 `top` and exactly 1 `bottom`) or (exactly 1 `dress` and no top/bottom), AND
- 0 or 1 `outerwear`, 0 to 2 `accessory`.

**Acceptance criteria:** Tests for valid, missing shoes, two tops, dress plus top.

### T2.6 Full outfit score
**Task:** `outfitScore(items, context)`:
1. Compute `C(A,B)` for every pair of items.
2. Pairs involving an accessory get weight `accessoryPairWeight` (0.5); all other pairs weight 1.0.
3. Base score = weighted mean of pair scores.
4. Replace the color contribution with the outfit-level color score from T1.6:
   `score = base - w_c * meanPairColor + w_c * outfitColorScore`
5. Invalid outfits (T2.5) return 0.

**Acceptance criteria:** `black_tshirt + blue_jeans + white_sneakers` (casual context) scores higher than `black_tshirt + black_trousers + black_oxfords` in casual context, and lower in formal context.

### T2.7 Outfit generation (beam search)
**Task:** `generateOutfits(anchorItem, wardrobe, context, topN)`:
1. Determine missing slots from the anchor's category (anchor top: need bottom + shoes; anchor shoes: need top + bottom; anchor dress: need shoes).
2. For the first missing slot, score each candidate against the anchor with `C(A,B)`; keep the best `beamWidth` (10).
3. For each partial outfit, add each candidate for the next slot, score with `outfitScore`, keep best `beamWidth`.
4. Optionally add up to 1 accessory only if it increases the score.
5. Return top `topN` (5) outfits sorted descending. Tie-break by concatenated item ids for determinism.
6. Never return duplicate outfits or the same item twice in one outfit.

**Acceptance criteria:**
- Anchor `black_tshirt` returns 5 valid outfits in descending score order.
- Same input always gives the same output.
- Returns fewer than `topN` without error if the wardrobe is too small.

### T2.8 Score explanation breakdown
**Task:** Each generated outfit returns:
```json
{
  "items": ["black_tshirt", "blue_jeans", "white_sneakers"],
  "compatibilityScore": 0.91,
  "breakdown": { "color": 0.93, "style": 0.93, "pattern": 1.0, "occasion": 1.0, "season": 1.0 },
  "colorRelations": [{ "pair": ["black_tshirt", "blue_jeans"], "relation": "neutral_pair" }],
  "reasons": ["Neutral colors pair cleanly", "All items share casual style"]
}
```
`reasons` are generated from the strongest and weakest factors (template strings, no AI).

**Acceptance criteria:** Breakdown values are the averages that produced the final score (recomputing from breakdown and weights matches within 0.01, excluding the accessory weighting).

### T2.9 Compatibility test suite
**Task:** Consolidate tests. Add a regression test that snapshots the top-5 for `black_tshirt` from the fixture wardrobe.

**Sprint 2 Definition of Done:** Given any anchor item, the engine returns ranked, valid, explained outfits using only compatibility (no user data).

---

# Sprint 3: Personalized Recommendation Algorithm

### T3.1 Interaction tracking
**Task:** Store user interactions: `{ userId, itemId, outfitId?, type: like|view|save|purchase, timestamp }`. Add a table/model and a service function `logInteraction(...)`. Hook it into the existing like/view/save/purchase actions found in the audit. Saving an outfit logs a `save` for every item in it.

**Acceptance criteria:** Interactions persist and can be queried per user. Duplicate likes on the same item do not double-count (like is a toggle).

### T3.2 Signal normalization and time decay
**Task:** Per user, per item:
```
decay(t)  = 0.5 ^ (ageDays / halfLifeDays)
L_i = 1 if currently liked else 0
V_i = log(1 + decayedViews_i) / log(1 + max decayedViews over user's items)
S_i = decayedSaves_i / max decayedSaves
P_i = decayedPurchases_i / max decayedPurchases
```
Division by zero returns 0.

**Acceptance criteria:** All values in `[0,1]`; a 60-day-old view counts 0.25 of a fresh view.

### T3.3 Item preference score R_i
**Task:**
```
R_i = w1*L_i + w2*V_i + w3*S_i + w4*P_i      (0.35, 0.10, 0.25, 0.30)
```

**Acceptance criteria:** Liked + purchased item outranks an item that was only viewed many times.

### T3.4 Attribute affinity profile
**Task:** Generalize to items the user has not interacted with.
1. For each attribute (color hue group or "neutral", style, pattern, category), compute the mean `R_i` of the user's interacted items having each value.
2. `attributeAffinity(item) = mean` of the affinities for the item's attribute values; unseen attribute values get 0.5.
3. `P_item = 0.5 * R_i + 0.5 * attributeAffinity` if the user interacted with the item, else `attributeAffinity`.

**Acceptance criteria:** A user who liked several black casual items gets higher `P_item` for an unseen black casual item than for an unseen floral formal item.

### T3.5 Outfit preference score P
**Task:** `P_outfit = mean(P_item for items in outfit)`.

**Acceptance criteria:** Range `[0,1]`; unit test with fixed profile.

### T3.6 Cold start and adaptive alpha
**Task:**
- If the user has fewer than `minInteractions` (5), `alpha = coldStart` (1.0), meaning pure compatibility.
- Otherwise `alpha = default` (0.7).
- Anonymous users always use cold start.

**Acceptance criteria:** New user results are identical to Sprint 2 output.

### T3.7 Final score and re-ranking
**Task:**
```
FinalScore = alpha * C + (1 - alpha) * P
```
1. Run `generateOutfits` with a larger pool (`topN * 4`).
2. Compute `FinalScore` for each, re-sort, return top `topN`.
3. Add `preferenceScore`, `finalScore`, and `alpha` to the output from T2.8.

**Acceptance criteria:** For a user with a strong preference profile, at least one outfit in the top 5 differs from the cold-start top 5, and no outfit with compatibility below 0.5 enters the top 5 (add this as a hard floor in config: `minCompatibility = 0.5`).

### T3.8 Personalization test suite
**Task:** Tests with two synthetic users (casual-lover, formal-lover) on the same anchor item. Their top-5 lists must differ in the expected direction.

**Sprint 3 Definition of Done:** Recommendations change with user behavior while staying above the compatibility floor.

---

# Sprint 4: Integration, Evaluation, Documentation

### T4.1 Integrate into recommendation flow
**Task:** Replace the call site of the old rule-based recommender (from the audit) with the new pipeline. Keep the old implementation behind a config flag `recommender: "legacy" | "scored"` defaulting to `scored`.

**Acceptance criteria:** Existing features that used recommendations still work; switching the flag restores old behavior.

### T4.2 API contract
**Task:** Expose (or update) an endpoint:
```
POST /api/outfits/recommend
{ "anchorItemId": "...", "occasion": "casual"?, "season": "summer"?, "limit": 5 }
-> { "outfits": [ ...T2.8 + T3.7 output... ] }
```
User is taken from the auth session. Validate input and return 400 on invalid enums, 404 on unknown item.

**Acceptance criteria:** Integration tests for success, 400, 404.

### T4.3 UI score display
**Task:** Only if the project has a frontend. On each recommended outfit show: final score as a percentage, the five-factor breakdown (bars), color relation label, and the `reasons` list. Add like/save buttons that call `logInteraction`.

**Acceptance criteria:** Manual check that liking items changes recommendations after 5+ interactions.

### T4.4 Evaluation script and metrics
**Task:** Script `scripts/evaluate_recommender` producing a table for the university report:
1. **Compatibility Precision@5:** Create `tests/fixtures/labeled_outfits` with at least 30 hand-labeled outfits (good/bad). Measure the share of top-5 outfits labeled good. Compare against a random baseline.
2. **Personalization Hit Rate@5:** For synthetic users, hide one liked item (leave-one-out) and check if it appears in the top 5.
3. **Mean score and score spread** per anchor category.
4. **Weight sensitivity:** Re-run Precision@5 with each compatibility weight shifted +/-0.05 (renormalized) and report the change.

**Acceptance criteria:** Script runs with one command and writes `docs/algorithms/EVALUATION.md` containing the result tables. Scored recommender beats the random baseline on Precision@5.

### T4.5 Performance check
**Task:** Benchmark `generateOutfits` + re-ranking on a synthetic wardrobe of 500 items.

**Acceptance criteria:** Under 200 ms per request on a normal dev machine. If slower, pre-filter candidates by hard season/occasion mismatch before scoring and cache HSV values.

### T4.6 Algorithm documentation for report
**Task:** Write `docs/ALGORITHMS.md` containing, for each of the three algorithms: purpose, inputs, outputs, formulas, config values, a worked numeric example using fixture items, complexity (beam search is `O(slots * beamWidth * n)`), and limitations. Link to EVALUATION.md.

**Acceptance criteria:** Every formula in the document matches the implemented code and config.

**Sprint 4 Definition of Done:** Recommender runs end-to-end in the app, is measured, and is documented.

---

## Global Definition of Done

- All tickets marked `DONE` in the Progress Tracker.
- Full test suite passes.
- No hardcoded weights outside the config.
- Every score in API output is in `[0,1]` and explainable through its breakdown.
- `docs/ALGORITHMS.md` and `docs/algorithms/EVALUATION.md` exist and are current.

---

## Decision Log

Record assumptions and deviations here, one line each, with ticket id.

| Ticket | Decision | Reason |
|---|---|---|
| T0.1 | Adopted `server/` (Node/Express/Mongoose, ESM) as the home for all algorithm code; module layout follows `server/src/recommendation/**` instead of the README's top-level `recommendation/` suggestion. | Matches the existing layered `server/src/{controllers,models,routes,services}` structure; keeps algorithm code inside the workspace that already owns `Product`/`User` models and auth. |
| T0.1 | No test framework existed in the repo (no jest/vitest/mocha, no test files). Added `vitest` as a devDependency of `server` and wired `npm test` (root) → `npm run test --workspace server` → `vitest run`. | Every ticket in this plan requires running tests after completion; a runner had to exist before Sprint 0 could proceed. Vitest chosen over Jest for native ESM support with no extra flags/config, matching `"type": "module"` in `server/package.json`. |
| T0.1 | T0.2's item-model fields will be added **additively** to `server/src/models/Product.js` (new fields alongside existing `category`/`colors`), not by renaming/replacing existing fields. | Existing `category` (array, different enum) and `colors` (free-text names) are already used by storefront filtering, cart, wishlist, and the client outfit builder; renaming would break unrelated functionality, which the README instructions forbid. |
| T0.1 | The "existing rule-based recommender" the README says not to delete before T4.1 is `ruleBasedCompatibility`/`calculateWeightedScore`/`recommendations` inside `client/src/features/outfitBuilder/pages/OutfitBuilder.jsx` — there is no server-side recommender. | `docs/outfit-builder/architecture.md` and `api-contract.md` describe a `RecommendationService`/`CompatibilityService` design that was never implemented; the only working compatibility logic found in the repo is this client-side code, confirmed via full read of `server/src` and `client/src/features/outfitBuilder`. |
| T0.2 | New fields added directly on `server/src/models/Product.js` (`outfitCategory`, `colorHex`, `isNeutralOverride`, `style`, `pattern`, `seasons`, `occasions`), all additive alongside the existing `category`/`colors` fields, not replacing them. | Matches the T0.1 decision to keep this non-breaking for storefront filtering, cart, and wishlist, which read the old fields. |
| T0.2 | `outfitCategory` and `colorHex` are derived automatically via a `pre("validate")` hook (`deriveOutfitCategory`/`deriveColorHex` in `server/src/utils/outfitAttributeDefaults.js`) whenever a document is created/saved without them, instead of being made `required`. | Making them Mongoose-`required` would break the existing seller "create product" flow (`productController.createProduct`), which doesn't collect these fields and isn't in scope to change. Deriving them keeps every item populated per the ticket's "every item has" requirement without touching unrelated controllers. |
| T0.2 | Legacy `category: "formals"` has no direct equivalent in the new slot enum (`top/bottom/shoes/accessory/outerwear/dress`) since it describes a style, not a garment slot. Mapped to `outfitCategory: "top"` (most formal-wear listings are shirts/blazers), same as the final fallback when no legacy category matches at all. | Simplest option satisfying acceptance criteria per README instruction 9; recorded here since it's a lossy, debatable mapping rather than a clean 1:1 translation. No legacy category maps to `outerwear` - it's only reachable by explicitly tagging new items. |
| T0.2 | `colorHex` for legacy items is derived from a small hardcoded color-name→hex table (`COLOR_NAME_TO_HEX`); any color name not in the table falls back to neutral gray `#808080` rather than guessing. | There's no reliable way to turn an arbitrary free-text color name (e.g. "chartreuse-glow") into an accurate hex value. Falling back to a neutral gray is a safe default: `#808080` already satisfies the T1.2 neutral-detection thresholds on its own, so it won't skew later color-harmony scoring. |
| T0.2 | Since MongoDB/Mongoose has no migration tool in this project, "migration" is implemented as an idempotent, reversible script: `server/src/scripts/backfillOutfitAttributes.js` (`npm run migrate:outfit-attrs` for up, `-- down` arg for rollback). `down` only `$unset`s the seven new fields, never touching original data. | Satisfies "runs forward and backward without data loss" without introducing a new migration framework dependency, consistent with the T0.1 finding that none exists. |
| T0.2 | Tests use `await product.validate()` rather than `product.validateSync()`. | Empirically confirmed (via a failing test run) that this Mongoose version does not execute `pre("validate")` hooks through `validateSync()`, only through the promise-based `validate()` - which still requires no DB connection, so T0.4's "fixtures load without a database" requirement still holds. |
| T0.3 | Config split into `server/src/config/scoringConfig.js` (the actual weight/threshold values, matching the README's JSON exactly) and `server/src/config/loadScoringConfig.js` (a pure, standalone validator function). | Keeps the validator unit-testable against arbitrary valid/invalid configs (acceptance criteria) without needing to construct alternate real config files; the real config is validated once at import time via `loadScoringConfig(rawScoringConfig)`, so any consumer importing `scoringConfig` gets an already-validated, frozen object. |
| T0.3 | `loadScoringConfig` deep-freezes and `structuredClone`s its return value. | Not explicitly required, but supports instruction 7 ("never hardcoded inside algorithm logic") by making the shared config tamper-proof - no algorithm module can accidentally mutate a shared weight at runtime and affect other callers. |
| T0.4 | Fixture items use field name `category` (per the README's own T0.2 spec table and every later ticket's pseudocode - e.g. T2.5 "isValidOutfit", T2.7 "anchor's category"), **not** `outfitCategory` (the Mongoose `Product` field name from T0.2). Introduced `server/src/recommendation/itemEnums.js` as the single canonical source for the category/style/pattern/season/occasion enums, imported by both `Product.js` and the fixtures/tests. | The algorithm layer (Sprints 1-3) is required to be pure functions with no DB access (instruction 8), so its "item" is a plain domain object, deliberately decoupled from the Mongoose document. Mapping `product.outfitCategory → item.category` (plus the other fields) becomes the integration boundary at T4.1, when the recommender is wired to real `Product` documents. Centralizing the enums prevents the two representations' allowed values from silently drifting apart. |
| T0.4 | The 12 README-mandated fixture items' `seasons`/`occasions` (not specified by the README) were assigned per-item based on their `style` (e.g. `formal` → `["work","formal"]`, `sporty` → `["sport"]`, season-specific items like `red_shorts`/`green_floral_skirt` → `["spring","summer"]`) rather than defaulting all of them uniformly. | Simplest option satisfying acceptance criteria (README instruction 9), while giving Sprint 2's occasion/season scoring tests (T2.3 onward) realistic, non-degenerate fixture data to work with instead of every item sharing identical `["casual"]` occasions. |
| T0.4 | Added 9 extra fixture items beyond the 12 required, to reach 21 total and guarantee every `category` (incl. `accessory`, `outerwear`, `dress` - absent from the required 12) and every `pattern` (incl. `checked` - also absent from the required 12) appears at least once, per the acceptance criteria "covering every category, style, and pattern." | The 12 mandated items alone are missing 3 of 6 categories and 1 of 5 patterns; the ticket's own acceptance criteria requires full coverage. |
| T0.5 | `mean([])` returns `0` instead of `NaN`. `weightedSum` throws if `values`/`weights` lengths differ instead of summing over the shorter length. Placed at `server/src/recommendation/utils/math.js`. | Not specified by the README; documented since it's a real behavioral choice later tickets depend on (e.g. T1.6 outfit color score over a possibly-empty pair list). A length mismatch between values and weights almost always indicates a wiring bug against `scoringConfig`, so failing loudly beats silently truncating. |
| T0.6 (added, not in original tracker) | Added `server/src/recommendation/mapProductToItem.js`: converts a real `Product` record (hydrated Mongoose doc, `.lean()` plain object, or pre-T0.2 legacy document) into the algorithm layer's `item` shape, re-deriving `outfitCategory`/`colorHex`/`isNeutralOverride` itself rather than trusting the `Product` pre-validate hook already ran. | User directive: algorithm code must be verified against real, user-fed data, not only the T0.4 fixture wardrobe. The hook only backfills fields on write; `.lean()` reads skip Mongoose hooks entirely, and any document created before T0.2 and never re-saved/migrated would otherwise reach the algorithm layer with missing fields. The adapter is self-sufficient against all of those cases. From T1.1 onward, each color/compatibility/personalization ticket adds a test that feeds it a realistic messy/legacy `Product`-shaped record (via this adapter), in addition to the fixture-based tests, per [[feedback-real-data-not-just-fixtures]] in memory. |
| T1.1 | `hexToHsv` is a pure function with no caching; a separate `getItemHsv(item)` wrapper caches the result on `item.hsv`. Placed at `server/src/recommendation/color/colorConvert.js`. | Keeps `hexToHsv` trivially pure/testable (instruction 8) while still satisfying the ticket's "cache HSV on the item after first computation" as an explicit opt-in, used by later pairwise-comparison code (T1.5+) to avoid re-parsing the same hex repeatedly during beam search (T2.7). |
| T1.1 | Only strict 6-digit `#RRGGBB` (case-insensitive) is accepted; 3-digit shorthand, missing `#`, and non-hex characters all throw. | Matches the `colorHex` validator already added to the `Product` schema in T0.2, so the two validation rules can't diverge. |
| T1.3 | Added a new `hueRelationScores` group to `scoringConfig.js` (`neutral_pair: 1.00` ... `clash: 0.40`, exactly the README's table values), not present in T0.3's original JSON blob. | T1.3 explicitly states "scores come from config" - the initial T0.3 config didn't anticipate this table, so it was added rather than hardcoding the 8 values inside `colorHarmony.js`, keeping instruction 7 ("never hardcoded") satisfied. Not included in `loadScoringConfig`'s sum-to-1 validation since these are independent category scores, not weights that partition a whole. |
| T1.3 | `classifyHueRelation`'s branches are ordered and each one assumes all earlier ranges are already ruled out (e.g. checking `d <= 45` for "analogous" without re-checking `d > 15`, since the `d <= 15` branch already returned). | Directly mirrors the table's own reading order; also correctly routes the table's one unnamed gap (`45 < d < 105`, between "analogous" and "triadic") to `clash`, which matches "anything else" in the spec. |
| T1.4 | Named the function `computeSaturationBrightnessScore(a, b)`, returning `{ saturationScore, brightnessScore }` - the README describes the two formulas but doesn't name a function. | Simplest option per instruction 9; keeps both sub-scores from one pair computed together since they're always needed together by T1.5. |
| T1.5 | Verified the three README acceptance criteria by hand against the actual fixture hex values before implementing, not just after: `black_tshirt+blue_jeans≈0.922` (neutral pair, both forced saturation=1); `red_shorts+green_floral_skirt` hue distance≈146.5° → `split_complementary`; `orange_graphic_tee+purple_striped_shirt≈0.769` (triadic, d≈105.8°) vs. `black_tshirt+beige_chinos≈0.814` (neutral_accent - beige's saturation is 0.222, just 0.02 above the 0.20 neutral threshold, so it narrowly counts as non-neutral). | Confirms the formula composition (T1.3+T1.4 weighted by `colorSubWeights`) produces the exact orderings the README expects on real fixture data, not just on synthetic test inputs - the beige_chinos case in particular is a near-boundary case worth knowing about if the neutral threshold ever changes. |
| T1.6 | "Items within 30 degrees = same group" implemented as connected components (union-find) over a proximity graph, not adjacent-pair/sorted-gap bucketing. | The README's phrasing is ambiguous about transitivity (item A near B, B near C, but A not near C). Connected components is the standard reading of "within X = same group" and is transitive by construction, matching how a human would eyeball a cluster of nearby hues as "one group" even if the two extremes of that cluster are more than 30° apart. Recorded per instruction 9 since it's a real interpretive choice, not a spec-mandated algorithm. |
| T1.6 | Empty or single-item outfits return `0` (via `mean([])` from T0.5) rather than throwing. | Not specified by the README; keeps `outfitColorScore` total and safe to call from T2.6's full outfit score even on a not-yet-complete outfit during beam search (T2.7), instead of requiring every caller to special-case small outfits. |
| T1.7 | Property tests use a seeded deterministic PRNG (mulberry32), not `Math.random()`, run over 300 random pairs per property (symmetry/range for `pairwiseColorScore`, `classifyHueRelation`, `computeSaturationBrightnessScore`, `hexToHsv`; order-invariance for `outfitColorScore`), plus a static source-text check that `colorConvert.js`/`colorHarmony.js` never import from `compatibility/` or `personalization/`. | Ensures the property tests are reproducible (no CI flakiness from an unseeded RNG) while still covering far more of the input space than the fixture-based ticket tests. The isolation check directly encodes Sprint 1's own Definition of Done ("color module has no dependency on compatibility or personalization modules") as a regression guard, not just a claim. |
| T2.1 | `styleCompatibilityMatrix` added to `scoringConfig.js` (same precedent as `hueRelationScores` in T1.3), and `styleCompatibility(styleA, styleB)` takes the two style **values** directly rather than full items. | T2.1's acceptance criteria test symmetry/unknown-style directly against style labels, and unlike color harmony (which needs derived HSV/neutral data per item), style compatibility is a pure label->label lookup - no per-item derivation is needed, so taking items here would just add an unnecessary indirection. T2.4's `C(A,B)` will call this with `a.style`/`b.style`. |
| T2.3 | Read "three target cases and the Jaccard case" as the 3 tiers of the target-given branch (both/one/neither -> 1.0/0.5/0.0) plus the no-target Jaccard branch - 4 scenarios total - rather than 3 separate "target given" scenarios plus a 4th unrelated Jaccard one. | The tiered logic only has 3 possible outcomes by construction; reading it any other way doesn't map onto the formula the README itself gives. |
| T2.3 | `occasionScore(a, b, targetOccasion)` and `seasonScore(a, b, { targetSeason, date, hemisphere })` share one internal `tieredOrJaccardScore` primitive, but resolve their "no target" case differently: occasion treats an **omitted** target as Jaccard (matching the README exactly: "if no target occasion is given"), while season treats an omitted target as "use `deriveCurrentSeason(date, hemisphere)`" and only falls back to Jaccard if the caller explicitly passes `targetSeason: null`. | Directly reflects the README's own asymmetry: occasion has no implicit default target, but season's stated target is explicitly "current season... derive from date if not provided" - season is arguably *always* in target-given mode in practice, with Jaccard reachable only by deliberate opt-in, which is why the ticket doesn't ask for a season-Jaccard acceptance test the way it does for occasion. |
| T2.3 | `deriveCurrentSeason` uses fixed meteorological (calendar-month) season boundaries - Dec/Jan/Feb = winter, Mar/Apr/May = spring, etc. - not astronomical (solstice/equinox) dates. | Not specified by the README beyond "derive from date"; meteorological boundaries are the simpler, calendar-month-aligned option and avoid needing solstice/equinox date tables that shift year to year. |
| T2.4 | Split into `combineCompatibilityComponents({color,style,pattern,occasion,season})` (pure weighted sum, no items) and `pairwiseCompatibilityScore(itemA, itemB, context)` (computes each component from real items, then calls the combiner). | The ticket explicitly says "Test by injecting component values" for the worked-example acceptance criterion - the combiner is exactly the injectable unit that test needs, decoupled from having to construct two items whose five components happen to equal 0.8/1.0/0.8/1.0/1.0 exactly. |
| T2.5 | "Either (exactly 1 top and 1 bottom) or (exactly 1 dress and no top/bottom)" is enforced as mutually exclusive: the top+bottom branch additionally requires `dress === 0`. `isValidOutfit` throws on an unrecognized `category` value (consistent with T2.1/T2.2/T2.3's unknown-enum handling) rather than silently returning `false`. | Without the explicit `dress === 0` check, an outfit with 1 top + 1 bottom + 1 dress would pass the first branch despite clearly violating "dress plus top" being invalid per the ticket's own acceptance criteria. Throwing on a malformed item's category surfaces a data bug distinctly from a genuinely invalid outfit composition, rather than conflating the two. |
| T2.6 | `meanPairColor` in `score = base - w_c*meanPairColor + w_c*outfitColorScore` uses the exact same accessory-adjusted weights as `base`'s weighted mean, not a plain unweighted mean. Added `weightedMean(values, weights)` to `math.js` (T0.5's module) to support this - `weightedSum` alone wasn't normalized. | Algebraically, `base` is a weighted mean of pair scores that are each a *fixed* linear combination of the 5 components with the same weights across all pairs; by linearity, `base = w_c * weightedMean(color) + (other weighted component means)`. Only subtracting the identically-weighted `meanPairColor` cleanly cancels color's contribution to `base` before the outfit-level color score replaces it - an unweighted `mean(color)` would leave a residual, inconsistent term whenever the outfit has accessories. Not spelled out in the README at this level of detail; verified by writing an exact-formula test that recomputes the expected score independently and asserting it matches within floating-point tolerance. |
| T2.7 | `generateOutfits` only supports anchors of category `top`, `bottom`, `shoes`, `dress` (throws a clear error for `outerwear`/`accessory` anchors). | The README gives 3 example slot plans (top->bottom+shoes, shoes->top+bottom, dress->shoes), each needing at most 1 "next slot" fill after the first - matching step 3's "score with outfitScore," which only produces a non-zero score once the outfit is structurally complete (T2.5's `isValidOutfit` gate returns 0 for anything incomplete). An outerwear/accessory anchor would need 3 missing slots (top+bottom+shoes) filled before the outfit is ever valid, so intermediate partial outfits would all score exactly 0 and beam search would have nothing to rank on - the ticket's own design doesn't extend to that case, so it's rejected explicitly rather than silently producing meaningless rankings. Added a symmetric `bottom -> [top, shoes]` slot plan (not in the README, but the natural 4th case alongside the 3 given examples). |
| T2.7 | Step 4's "add up to 1 accessory only if it increases the score" requires a **strict** improvement (`score > best.score`); an exact tie keeps the no-accessory version. Final beam trimming and the final top-N sort both tie-break by `items.map(id).sort().join(",")` ascending. | "Increases" reads naturally as strict, not "does not decrease" - a tie means the accessory added no value, so the simpler outfit (fewer items) is preferable. The sorted-id tie-break (rather than e.g. insertion order) makes the result fully independent of any JS engine's sort-stability behavior, directly satisfying the "same input always gives the same output" acceptance criterion regardless of runtime. |
| T2.8 | `breakdown.color` is `outfitColorScore(items)` directly (exact, matches what T2.6 actually substitutes into the score); `breakdown.style/pattern/occasion/season` are the **plain, unweighted** mean of that component across all pairs - not the accessory-adjusted weighted mean `outfitScore` actually uses internally. | The README's own acceptance criterion only requires recombination to match "within 0.01," not exactly - which only makes sense if breakdown intentionally uses a simpler (unweighted) average than the real formula. An unweighted average is also more intuitive to show a user ("style: 93%" should mean a plain average, not a down-weighted one they can't see). Verified empirically with both a no-accessory outfit (near-exact match) and a 1-accessory outfit (still comfortably under 0.01). |
| T2.8 | `reasons` are generated from the *actual computed* strongest/weakest breakdown factors (by value, ties broken by fixed factor order `color>style>pattern>occasion>season`), not written to match the README's own illustrative JSON example. | The README's example breakdown has `pattern/occasion/season` tied at the true maximum (1.0) while `color/style` are the actual minimum (0.93 each) - yet its example `reasons` text describes color and style positively, which only makes sense if that example was hand-written for plausibility rather than computed from the shown numbers. Implementing the literal rule ("generated from the strongest and weakest factors") against real data was judged more valuable than reproducing a non-representative example's specific wording; confirmed with a precisely-constructed all-tied-at-1.0 fixture (2 neutral items with brightness difference exactly equal to `targetContrast`) that correctly collapses to a single reason. |
| T2.8 | A weakest factor scoring `>= 0.7` gets a second *positive* (softer) reason instead of a caution/negative one; caution phrasing only appears below that threshold. | Not specified by the README; avoids implying something is wrong with an outfit whose "weakest" factor is still objectively good (e.g. 0.93 in the README's own example) - a plain strongest/weakest split without this would produce a mixed-tone explanation for outfits that are strong across the board. |
| T2.9 | "Snapshot" implemented as a hardcoded expected array (ids + exact scores, captured from an actual run) asserted with `toEqual`, not Vitest's `toMatchSnapshot()`/auto-generated `.snap` file. | An opaque snapshot file wouldn't be visible or reviewable in the format this sprint is being reported back in; a hardcoded, readable expected value makes a future diff (and the reason to update it) legible directly in the test file. |
| T3.1 | Added `mongodb-memory-server` as a server devDependency and a shared `tests/setup/memoryDb.js` harness, so interaction-tracking tests run against a real (ephemeral, local, in-memory) Mongo engine instead of mocked model calls. | T3.1's acceptance criteria ("interactions persist and can be queried per user") is inherently about real persistence/query behavior, which a mock can't actually verify - only that the mock was called. This is also the standing "test against real data, not just fixtures" preference from earlier in this sprint, applied to the DB layer. Adds ~1.3s to the full suite (mongod startup), which is an acceptable one-time cost since the binary is now cached locally after the first run. |
| T3.1 | `like` is modeled as a toggle: one `Interaction` document per (user, item, "like"), created on first like and left untouched by repeat likes (no-op), deleted entirely by `removeLike` on unlike - there's no separate "unlike" interaction type. `view`/`save`/`purchase` are append-only: every call creates a new timestamped document. | Directly matches the acceptance criterion ("duplicate likes... do not double-count, like is a toggle") and T3.2's later formulas, which need per-event timestamps for views/saves/purchases (`decayedViews_i`, etc.) but only a current boolean state for likes (`L_i = 1 if currently liked`). |
| T3.1 | Hooked into the 3 existing user actions the audit found: `wishlistController.addToWishlist`/`removeFromWishlist` -> `like`/unlike (there's no separate "like" feature in this codebase - wishlist *is* the like/save-for-later mechanism), `orderController.placeOrder` -> `purchase` (one interaction per distinct item per order, not scaled by quantity), and `productController.getProduct` -> `view`. Added a new `optionalAuth` middleware (decodes a bearer token if present but never rejects the request) and applied it only to `GET /api/products/:id`, so view tracking works for logged-in users without breaking the route's existing anonymous access. | `getProduct` has no `protect` middleware today - forcing auth on it to track views would break anonymous browsing, which the README's global instructions explicitly forbid touching. `optionalAuth` is additive (a new export alongside `protect`, not a change to it) and applied to exactly one route. |
| T3.1 | Did **not** hook "save" into any existing endpoint or build a new outfit-save route/controller. `logOutfitSave({userId, outfitId, itemIds})` exists and is tested, but nothing calls it yet. | T0.1's audit found no outfit-save feature anywhere in the codebase - `Outfit.js` is an empty stub and no `outfit-builder` routes are mounted in `app.js` (only described in `docs/outfit-builder/api-contract.md`, never implemented). Building a full outfit-save CRUD flow is a distinct feature outside this sprint's algorithm scope; wiring `logOutfitSave` into a real save action is deferred to T4.1 (integration), where the outfit-recommendation flow itself gets wired into the app for the first time. |
| T3.2 | `computeUserItemSignals` is a pure function taking an already-fetched interaction list (plain objects or real Mongoose `Interaction` documents both work), not a DB-querying function itself - the DB round trip (`interactionService.getUserInteractions`) happens at the call site. | Instruction 8 requires every scoring function to be pure with no DB/network calls inside; keeping the fetch separate from the math also makes it trivially testable with synthetic data while still being verified once against real persisted documents (Mongoose `ObjectId`s stringified as map keys, real `Date` timestamps) in a dedicated real-data test. |
| T3.2 | Items with zero interactions get no entry in the returned `Map` at all (rather than an explicit all-zero entry) - callers are expected to treat a missing key as all-zero signals. | Not specified by the README; avoids materializing an entry for every item in the wardrobe (which this function doesn't even have access to - it only sees interactions) just to fill it with zeros, keeping the function's contract scoped to exactly what it was given. |
| T3.3 | Split into `itemPreferenceScore(signals)` (pure weighted sum over an already-computed `{L,V,S,P}`) and `computeUserItemPreferenceScores(interactions, options)` (chains T3.2's `computeUserItemSignals` + the combiner into one call, returning `Map<itemId, R_i>`). | Same injectability rationale as T2.4/T2.8's split - keeps the formula itself trivially unit-testable in isolation, while the chained convenience function is what T3.4 (attribute affinity, which needs every interacted item's `R_i`) will actually call. |
| T3.4 | "Color hue group" for the attribute profile uses **fixed** 30-degree buckets (`floor(hue/30)`), unlike T1.6's dynamic per-outfit connected-components clustering. `preferenceBlend` from T0.3 (`itemDirect: 0.5, attributeAffinity: 0.5`) turned out to already match this ticket's `P_item` formula exactly - no new config needed. | T1.6's clustering is relative to one specific outfit's items and wouldn't even make sense applied across a user's entire interaction history (there's no fixed "outfit" to cluster within); a stable, item-independent bucket is what a profile aggregated over time requires. The `preferenceBlend` match was a genuinely happy coincidence worth calling out - the T0.3 config values were written before this ticket was reached, and its naming/values happened to already fit. |
| T3.4 | `buildUserAffinityContext(interactions, itemsById, options)` requires the caller to supply an item lookup (`itemsById`), and silently skips any interacted item not found in it. | `Interaction` records only carry `itemId`, not the item's attributes (category/color/style/pattern) - building the profile requires joining R_i values against real item objects from somewhere. Skipping missing lookups (rather than throwing) tolerates catalog items that were removed/discontinued since the interaction was logged, without failing the whole profile build over one stale reference. |
| T3.5 | Caught and fixed during test-writing, not left in: an early version of the "fixed profile" unit test used 3 items sharing `style="casual"`/`pattern="solid"`/`colorGroup="neutral"`, intending each item to be its bucket's only data point so `P_item = R` would hold exactly. It doesn't when buckets are shared across items - verified via a throwaway script that `P_item(top)` came out to `0.675`, not `0.6`. The outfit *mean* still landed on the expected `0.8` by coincidence, which would have let a wrong per-item claim hide inside a passing test. Rewrote the fixture items with fully distinct category/style/pattern/color per item so every bucket genuinely is a singleton, and reverified the exact per-item values (`0.6`/`0.8`/`1.0`) before trusting the test. | Worth recording as a concrete example of why "the aggregate assertion passed" isn't sufficient - the reasoning behind a hand-derived expected value has to actually hold, not just coincidentally produce the same number. |
| T3.6 | `interactionCount` is a raw count of interaction **events** (array length from `getUserInteractions`), not distinct items interacted with. | Simplest literal reading of "fewer than minInteractions" per instruction 9; the README doesn't distinguish events from distinct items, and event count is what a direct `interactions.length` naturally gives without extra grouping logic. |
| T3.6 | Verified the "new user results are identical to Sprint 2" acceptance criterion algebraically now (`alpha=1.0` makes `alpha*C + (1-alpha)*P` collapse to exactly `C`, tested against a real `outfitScore` value with an arbitrary nonzero `P` to prove `P` is fully ignored), rather than waiting for T3.7's `FinalScore` formula to exist. | T3.6 itself has no `FinalScore` function yet - that's T3.7 - but the acceptance criterion is really a claim about how alpha interacts with the (not-yet-built) blend formula, so it's checked here at the algebra level to catch a wiring mistake (e.g. reversed weights) as early as possible rather than only at T3.7. |
| T3.7 | Added `minCompatibility: 0.5` to `scoringConfig.js` - not in the README's original T0.3 JSON, but this ticket explicitly instructs "add this as a hard floor in config." | Direct instruction from the ticket itself; keeps instruction 7 ("never hardcoded") intact for the one new threshold this ticket introduces. |
| T3.7 | `generatePersonalizedOutfits(anchorItem, wardrobe, context, personalization, topN)` takes `personalization` as `{ profile, preferenceScores, alpha }` with `alpha` already resolved (via T3.6's `resolveAlpha`) rather than deriving it internally from `{isAnonymous, interactionCount}`. | Keeps this function focused purely on ranking given an already-decided alpha, consistent with T3.6 being built as an independent, reusable piece; also makes tests simpler (inject a fixed alpha for cold-start vs. default scenarios without fabricating exactly-N interactions). |
| T3.7 | Exported `outfitKey`/`compareByKey` from `outfitGenerator.js` (previously private) for reuse in `finalRanker.js`'s re-sort, instead of duplicating the tie-break logic. | The same deterministic-tie-break need (sorted-ids ascending) applies to both re-sorts; duplicating it would risk the two implementations silently drifting apart. |
| T3.7 | The "personalization changes the top-5" acceptance test uses a hand-constructed, strongly-opinionated profile (`R=1.0` for one item, `R=0.0` for three specific others) rather than a moderate, "organic-looking" interaction history. | Tried a realistic scenario first (a handful of likes/purchases/views concentrated on one item, just clearing `minInteractions`) and verified empirically it did **not** change the top-5 set for this anchor/wardrobe - the compatibility gaps between the pool's candidates (often 5-15 points) were too large for alpha=0.7's 0.3 weight on P to overcome. This is a real, useful finding about the system's actual sensitivity, not a test-authoring shortcut: with only two alpha tiers (0.7 default, 1.0 cold start) and a compatibility-heavy `compatibilityWeights.color=0.30` etc., personalization's influence on ranking is real but modest unless preferences are quite strong or pinned. Confirmed via an empirical diagnostic script before finalizing the test's expected values (which shoe moves from rank 4 to rank 2; which outfit drops out of the top 5 entirely). |
| T3.8 | The casual-lover/formal-lover test asserts a specific, empirically-verified directional signal (formal-lover's top-5 contains more `black_oxfords` outfits than casual-lover's; the casual-lover ranks their own liked combo at least as favorably as the formal-lover does) rather than a broad claim like "casual-lover's list is more casual overall." | A precise, individually verifiable claim is falsifiable and meaningful; a vague "more casual overall" claim isn't checkable without inventing an ad hoc casual-ness scoring function that duplicates what the algorithm itself is supposed to produce. Verified via the same empirical-diagnostic-first approach as T3.7 before writing assertions - both users' top-5 outputs were inspected directly rather than guessed at. |
| T3.8 | The compatibility-floor property check runs across 3 anchors (top/shoes/dress) x 3 user contexts (cold start, casual-lover, formal-lover) = 9 combinations, all asserting every returned outfit stays at or above `minCompatibility`. | Broader than a single anchor/context check per instruction to consolidate Sprint 3's tests; exercises the floor under a realistic mix of anchor categories (which take different beam-search slot plans, per T2.7) and personalization strengths, not just the one scenario T3.7 already covered in depth. |
| T4.1 | **Scope, decided with the user via AskUserQuestion before implementing:** server-only integration. Built the real `POST /api/outfits/recommend` endpoint (config-flagged, wired to real Product/User/Interaction data end-to-end) but left `client/src/features/outfitBuilder/pages/OutfitBuilder.jsx` completely untouched. | A genuine architectural mismatch exists between the old client flow (incremental: score candidates against whatever's already selected, one category at a time) and the new algorithm (single-anchor, full-outfit beam search in one shot) - reconciling them is a real product/UX decision, not an implementation detail, so it was surfaced rather than decided unilaterally. The user chose the server-only option; full client rewiring (or a lesser dual-run option) was explicitly declined for this ticket. |
| T4.1 | Since there was never a server-side "legacy" recommender to preserve (T0.1's audit: the only rule-based recommender is 100% client-side), `RECOMMENDER=legacy` makes the new endpoint respond `503` ("scored recommender is disabled") rather than porting/reimplementing the client's algorithm server-side. | Porting `OutfitBuilder.jsx`'s `ruleBasedCompatibility`/`calculateWeightedScore` server-side would mean maintaining two independent implementations of the same logic that could silently drift apart - riskier than simply disabling the new path. Because the client was intentionally left untouched (see above), it keeps using its real, unmodified local algorithm regardless of the server flag - "switching the flag restores old behavior" holds trivially and exactly, since that behavior was never replaced in the first place. |
| T4.1 | Extracted `getApprovedSellerIds` out of `productController.js` (where it was private/duplicated across `getProducts`/`getNewArrivals`/`getProductsByCategory`) into `productService.js` as an exported function, then had both `productController.js` and the new `recommendationService.js` import it. | The new recommendation service needs the exact same "only approved-seller, available products are visible" rule the storefront already enforces - duplicating the query risked the two filters drifting apart. This is a small, behavior-preserving refactor (same query, same result), not a redesign. |
| T4.1 | `recommendationService.getOutfitRecommendations` enriches each returned outfit with a `products` array (`{id, name, image, price}` per item) alongside the T3.7 outfit shape. | The algorithm layer's items only ever carry category/color/style/pattern/etc (T0.4's decision) - never display metadata - so the API response needs an explicit join back to the real `Product` documents for a client to render anything recognizable. |
| T4.2 | Fixed a real gap left by T4.1: `occasion`/`season` values were passed straight through to the service with no validation - an invalid one (e.g. `occasion: "brunch"`) would reach `occasionScore`'s internal enum check deep inside the algorithm layer, throw a generic `Error`, and fall into the controller's catch-all, producing a `500` instead of a `400`. Added `validators/recommendOutfitsValidator.js` (`server/src/validators/`, matching the folder `docs/outfit-builder/architecture.md` already specifies) and wired it in before the service call. | T4.2 explicitly requires "400 on invalid enums" - this was the one input-validation gap actually present in the T4.1 wiring, now closed and covered by an HTTP-level integration test proving invalid `occasion`/`season` return 400 rather than 500. |
| T4.2 | Added `limit` validation (must be a positive integer) even though the README's acceptance criteria only explicitly calls out "invalid enums." | A non-integer or non-positive `limit` (e.g. `-1`, `"5"`, `2.5`) would otherwise reach `Array.prototype.slice` inside `generatePersonalizedOutfits` with unpredictable results rather than a clear error; simplest option per instruction 9 given "validate input" is the ticket's stated task, not just the two enum fields. |
| T4.2 | Installed `supertest` and added real HTTP-level integration tests (`tests/integration/outfitRecommend.test.js`) that hit the actual Express `app` (routing, JSON body parsing, `optionalAuth` middleware, a real signed JWT) rather than calling the controller function directly as T4.1's tests did. | T4.2 explicitly asks for "integration tests for success, 400, 404" - exercising the real HTTP layer (not just the handler) is what actually proves the route wiring itself is correct, which T4.1's lighter mock-req/res controller tests didn't fully cover (they could pass even if the route path or middleware order were wrong). |
| T4.3 | **Scope, decided with the user via AskUserQuestion:** (1) the new UI is a purely additive "Suggested Complete Outfits" section inserted into `OutfitBuilder.jsx`, anchored on the first selected item - the existing per-category incremental recommendation flow underneath it is completely untouched. (2) "Save" logs per-item `save` interactions via one small new endpoint, with no `outfitId` and no persisted "saved outfit" record. | Two real product/scope decisions, not implementation details: T4.3 is unavoidably where the client wiring deferred by T4.1 finally has to happen (you can't display a final score/breakdown without fetching them from somewhere), and the Save button's backing behavior directly extends the T3.1 boundary against building outfit persistence. Both chosen options were the ones explicitly marked lowest-risk/most-consistent-with-prior-decisions. |
| T4.3 | Added `POST /api/interactions/save` (`protect`-gated, mirrors the existing wishlist/like endpoints' auth requirement) calling `logOutfitSave({userId, itemIds})` with no `outfitId`. "Like" needed no new endpoint at all - reused the existing `POST/DELETE /api/wishlist/:productId` (which already logs `like`/removes it per T3.1) via the client's existing `WishlistContext`. | Minimizes new surface area: only genuinely new behavior (logging a save signal with no anchoring outfit) gets a new endpoint; behavior that already exists (liking a product) is reused exactly as-is rather than reimplemented. |
| T4.3 | Verified the new UI in a real browser (Playwright), not just a production build - the sandboxed environment has no network access to the real Atlas cluster in `server/.env`, so a standalone local `mongodb-memory-server` instance was started and seeded (seller + 5 products) purely for this manual check, with the server pointed at it via inline env vars (`.env` itself untouched). Confirmed the new section renders correctly alongside the unmodified existing recommendations, and that anonymous Like/Save clicks show friendly "log in" toasts rather than crashing. All scratch verification files/processes were deleted/stopped afterward. | Matches the project's standing instruction to actually test UI changes in a browser rather than trusting a build success; using a disposable local DB (the same tool already used for the server-side test suite) avoids any risk of touching the real production-configured cluster while still testing against a real MongoDB engine end-to-end, not mocks. |
| T4.4 | **Labeling approach, decided with the user via AskUserQuestion:** the 32 labeled outfits in `tests/fixtures/labeled_outfits.js` were produced by Claude using general fashion-styling judgment (formality/color/pattern coherence) - explicitly disclosed as algorithmically-assisted, not independently human-reviewed, in both the fixture file's header and the generated report itself. Labels were assigned WITHOUT running the scoring algorithm to check them first, to avoid a circular evaluation (testing whether the algorithm agrees with itself). | The evaluation feeds "the university report" per the ticket's own wording - presenting AI-generated labels as if they were independently hand-labeled would misrepresent the evaluation's actual methodology to whoever reads that report, which the user should decide on rather than have decided for them silently. |
| T4.4 | **Reported, rather than concealed or "fixed":** the initial run produced Precision@5 = 100%, Hit Rate@5 = 100%, and exactly 0.0pp change across all 10 weight-sensitivity variants. Added an explicit "Notes and limitations" section to the generated report explaining why: the labeled set was constructed with clearly-good vs. clearly-bad combinations, producing a wide score gap between groups - so these results demonstrate the algorithm avoids gross errors on unambiguous cases, not that it makes fine-grained distinctions on borderline outfits, and a harder/more borderline dataset would be needed to show real weight sensitivity. | A misleadingly "perfect-looking" evaluation is worse than an honestly-caveated one, especially for a report a human will present as evidence of quality. No outfit or label was altered to manufacture a different result - the caveats explain the actual result instead. |
| T4.4 | Weight sensitivity reuses each labeled outfit's T2.8 `explainOutfit(...).breakdown` (already verified within 0.01 of the true `outfitScore`) and cheaply recomputes `weightedSum(breakdown, shiftedWeights)` per variant, rather than mutating `scoringConfig` (frozen and validated - literally cannot be reassigned) or refactoring `outfitScore`/`pairwiseCompatibilityScore` to thread an optional weights override through several already-shipped, tested layers. | Avoids invasive changes to production scoring code for the sake of a standalone analysis script; the 0.01 tolerance this relies on was already an explicit, tested guarantee from T2.8, not a new assumption. |
| T4.4 | Personalization Hit Rate@5 uses 3 synthetic users (`neutral_minimalist`, `formal_professional`, `athleisure_fan`) built from real fixture wardrobe items with 3 interaction events each (like+purchase+view), leave-one-out over each user's liked items (11 trials total), entirely in-memory - no DB connection needed, keeping the whole script runnable with one command per the acceptance criteria. | Padding to 3 events per item (not just like+purchase) keeps every leave-one-out trial's remaining interaction count at or above `minInteractions` (5) even for 3-item users, so alpha stays at the default (non-cold-start) value across all trials rather than silently degrading to cold start whenever an item is held out from a small profile. |
| T4.5 | Verified performance empirically (via a throwaway probe script) before writing any production code: `generateOutfits`+re-ranking on a synthetic 500-item wardrobe ran in 7.5-16.1ms across 20 trials - roughly 12x under the 200ms target with real headroom to spare. No pre-filtering or new caching was added; T1.1's existing per-item `getItemHsv` cache already covers the ticket's named fallback ("cache HSV values"), and the season/occasion pre-filter fallback was correspondingly not needed. | The ticket's optimizations ("pre-filter by hard season/occasion mismatch... cache HSV values") are explicitly conditional on "if slower" - adding either preemptively would be unrequested, untested complexity with no problem to solve, contrary to the instruction against premature abstraction. |
| T4.5 | Folded the benchmark into the same `evaluateRecommender.js` script/report as T4.4 (new "## 5. Performance benchmark" section in `docs/algorithms/EVALUATION.md`) rather than a separate script/file. Added a reusable, seeded `generateSyntheticWardrobe(size, seed)` (`src/scripts/syntheticWardrobe.js`) - deterministic like T1.7's property-test PRNG, for reproducible benchmark runs. | The ticket doesn't name a separate script (unlike T4.4's explicit `scripts/evaluate_recommender`), and "producing a table for the university report" (T4.4's phrasing) reads naturally as one cohesive report rather than several separate files/commands to run and cross-reference. |
| T4.6 | Wrote a dedicated Vitest suite (`tests/docs/algorithmsDoc.test.js`, 18 tests) that re-derives every numeric worked-example claim in `docs/ALGORITHMS.md` from the live code, and separately asserts every config table transcribed into the doc (both compatibility matrices, all weight groups) against the real `scoringConfig` object - rather than treating "every formula matches the implemented code and config" as something to satisfy by careful manual proofreading alone. | The doc was written by hand from a fresh re-read of every module plus one script run for numeric values - exactly the kind of transcription step where a single mistyped digit could silently violate this ticket's specific, checkable acceptance criterion. A test that recomputes the claims catches that class of error the same way the rest of this sprint caught bugs empirically rather than by inspection (e.g. T3.7's `validateSync()` hook discovery, T3.5's shared-bucket miscalculation). |
| T4.6 | Documented in each algorithm's own "Limitations" subsection rather than only in the sprint's Decision Log: the fixed neutral-saturation cutoff's boundary sensitivity (T1.5), hard hue-relation-table cutoffs with no smoothing, `generateOutfits`' restriction to 4 anchor categories (T2.7), the accessory step's 1-item-only limit even though structure allows 2, the two-tier-only `alpha` and its empirically-observed weak effect on ranking for this wardrobe (T3.7/T3.8), and silently-skipped missing items in `buildUserAffinityContext` (T3.4). | T4.6 is explicitly "for the report" - a reader of `docs/ALGORITHMS.md` alone (without also reading the 1000+-line sprint Decision Log) should still learn these are real, known constraints of the current implementation, not undiscovered bugs. |
