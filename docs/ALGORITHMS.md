# Outfit Builder: Algorithm Documentation

This document describes the five algorithms implemented under `server/src/recommendation/**`, built in the order they depend on each other:

1. **Color Harmony Algorithm** — scores how well two garments' colors work together.
2. **Outfit Compatibility Scoring Algorithm** — combines color with style, pattern, occasion, and season into a full outfit score, and generates complete outfits via beam search.
3. **Personalized Recommendation Algorithm** — learns a user's preferences from their interactions and blends that into the compatibility ranking.
4. **Rule-Based Attribute Matching Algorithm** — declarative dress rules that reject or adjust outfits, and a score for how well an item matches requested attributes.
5. **Fuzzy Search (TF-IDF and Cosine Similarity)** — typo- and synonym-tolerant text search over the catalog, combined with attribute matching.

Sections 1-3 come from `ALGORITHMS_SPRINT_README.md`; Sections 4-5 and the full pipeline come from `RULES_AND_SEARCH_SPRINT_README.md`. Their values live in `server/src/config/rulesConfig.js` and `server/src/config/searchConfig.js`.

All formulas below are transcribed directly from the implementation (`server/src/recommendation/**`) and the single config source (`server/src/config/scoringConfig.js`) as of this writing; every weight cited here is read from that file, never hardcoded in the algorithm code. Measured results (precision, hit rate, weight sensitivity, performance) are in **[EVALUATION.md](algorithms/EVALUATION.md)**.

Every worked example below uses real items from the fixture wardrobe (`server/tests/recommendation/fixtures/wardrobe.js`) and real numbers produced by running the actual code, not hand-approximated.

---

## 1. Color Harmony Algorithm

### Purpose

Scores how well the colors of two garments work together, and aggregates that across a full outfit. This is the color component that feeds into the Compatibility Scoring Algorithm (Section 2) — it never runs standalone in the app, but it's independently testable and has no dependency on the other two algorithms.

### Inputs

An **item**: a plain object with (at minimum) `colorHex` (`#RRGGBB`) and optionally `isNeutralOverride` (boolean). `outfitColorScore` takes an array of items (a candidate outfit).

### Outputs

- `hexToHsv(hex) -> { h, s, v }` — `h` in `[0, 360)`, `s`/`v` in `[0, 1]`.
- `pairwiseColorScore(a, b) -> { score, relation, components }` — `score` in `[0, 1]`.
- `outfitColorScore(items) -> number` in `[0, 1]`.

### Formulas

**HSV conversion** (`hexToHsv`): standard RGB→HSV. For pure black or white, saturation/hue are degenerate (any hue is valid) — the implementation returns `h = 0` in the `delta === 0` case rather than leaving it undefined, so downstream hue math always has a number to work with.

**Neutral detection** (`isNeutral`):
```
isNeutral(item) = true if isNeutralOverride === true
                  OR s <= neutral.maxSaturation
                  OR v <= neutral.minValueForDark
```

**Hue relationship** (`classifyHueRelation`), using `d = circularHueDistance(h_a, h_b)` (shortest angular distance, `[0, 180]`):

| Condition | Relation | Score (config key) |
|---|---|---|
| both neutral | `neutral_pair` | `hueRelationScores.neutral_pair` |
| exactly one neutral | `neutral_accent` | `hueRelationScores.neutral_accent` |
| `d <= 15` | `monochromatic` | `hueRelationScores.monochromatic` |
| `15 < d <= 45` | `analogous` | `hueRelationScores.analogous` |
| `165 <= d <= 180` | `complementary` | `hueRelationScores.complementary` |
| `135 <= d < 165` | `split_complementary` | `hueRelationScores.split_complementary` |
| `105 <= d < 135` | `triadic` | `hueRelationScores.triadic` |
| otherwise (`45 < d < 105`) | `clash` | `hueRelationScores.clash` |

**Saturation and brightness** (`computeSaturationBrightnessScore`):
```
C_saturation = 1                              if either item is neutral
             = 1 - |s_a - s_b|                otherwise

C_brightness = 1 - min(1, | |v_a - v_b| - brightnessTargetContrast | / (1 - brightnessTargetContrast))
```
Every result is clamped to `[0, 1]`.

**Pairwise color score** (`pairwiseColorScore`):
```
C_color(A, B) = colorSubWeights.hue * hueScore
              + colorSubWeights.saturation * C_saturation
              + colorSubWeights.brightness * C_brightness
```

**Outfit-level color score** (`outfitColorScore`):
```
base = mean(C_color(A, B) for every pair (A, B) in the outfit)
groups = number of distinct non-neutral "hue groups" (items within 30° of each
         other, transitively - connected components, not just adjacent pairs)
outfitColorScore = base * 0.85   if groups > 3
                  = base         otherwise
```

### Config values used

From `scoringConfig`: `neutral.maxSaturation = 0.20`, `neutral.minValueForDark = 0.20`, `hueRelationScores` (`neutral_pair: 1.00`, `neutral_accent: 0.95`, `monochromatic: 0.90`, `analogous: 0.85`, `complementary: 0.80`, `split_complementary: 0.75`, `triadic: 0.70`, `clash: 0.40`), `brightnessTargetContrast = 0.30`, `colorSubWeights` (`hue: 0.60`, `saturation: 0.20`, `brightness: 0.20`).

### Worked example

`black_tshirt` (`#000000`) and `blue_jeans` (`#3B5B92`, `isNeutralOverride: true`):

- `hexToHsv("#3B5B92") = { h: 217.93°, s: 0.596, v: 0.573 }`
- Both items are neutral (`black_tshirt` via `v = 0 <= 0.20`; `blue_jeans` via its override) → `relation = "neutral_pair"`, `hueScore = 1.00`.
- `C_saturation = 1` (neutral short-circuit).
- `C_brightness = 1 - min(1, |0.573 - 0.30| / 0.70) = 1 - 0.3894 = 0.6106`.
- `C_color = 0.60(1.00) + 0.20(1) + 0.20(0.6106) = 0.9221`.

Adding `white_sneakers` and computing the full outfit: `outfitColorScore([black_tshirt, blue_jeans, white_sneakers]) = 0.9027` (all three pairs are `neutral_pair`, 0 non-neutral hue groups → no penalty).

### Complexity

`pairwiseColorScore` is `O(1)`. `outfitColorScore` is `O(n²)` for hue-group clustering (union-find over all pairs) plus `O(n²)` for the pairwise mean — `O(n²)` overall for an `n`-item outfit, where `n` is small (typically 3-6 items per outfit, not the wardrobe size).

### Limitations

- The neutral thresholds (`maxSaturation`/`minValueForDark` both `0.20`) are a single global cutoff; colors just outside it (e.g. a saturation of `0.22`) are treated as fully non-neutral with no graduated transition — see the Decision Log's note on `beige_chinos` sitting right on this boundary.
- The hue-relation table's boundaries are hard cutoffs (e.g. `d = 45.01°` scores as `clash` at `0.40` instead of `analogous` at `0.85`) with no smoothing between bands.
- `isNeutral`/`isNeutralOverride` is a boolean per item, not a continuous "how neutral" measure — an item can't be "somewhat neutral."
- 30° hue-group bucketing (both in the outfit-level penalty and, with a *fixed* grid, in the personalization layer's attribute profile — Section 3) doesn't account for hue-wheel edge effects beyond simple wraparound.

---

## 2. Outfit Compatibility Scoring Algorithm

### Purpose

The core engine: scores a candidate outfit's overall compatibility (color + style + pattern + occasion + season), validates outfit structure, and generates ranked, complete outfits from a wardrobe given a single anchor item — using only compatibility, no personalization data.

### Inputs

- Two items, for pairwise scoring: `{ category, colorHex, style, pattern, seasons, occasions, ...}`.
- A full outfit (array of items) plus an optional `context: { targetOccasion?, targetSeason?, date?, hemisphere? }`, for outfit-level scoring.
- An anchor item + a wardrobe (array of items) + `context` + `topN`, for generation.

### Outputs

- `styleCompatibility(styleA, styleB) -> number`, `patternCompatibility(patternA, patternB) -> number` — direct config lookups.
- `occasionScore(a, b, targetOccasion?) -> number`, `seasonScore(a, b, options?) -> number`.
- `pairwiseCompatibilityScore(a, b, context) -> { score, components }`.
- `isValidOutfit(items) -> boolean`.
- `outfitScore(items, context) -> number` in `[0, 1]` (`0` for a structurally invalid outfit).
- `generateOutfits(anchorItem, wardrobe, context, topN, { rules }?) -> [{ items, score, baseScore, ruleAdjustment, appliedRules }]`, sorted descending, deterministic. Since Sprint 7 (I7.3) `score` is the rule-adjusted `C_adjusted` and `baseScore` the raw `outfitScore`; see Section 4.
- `explainOutfit(items, context) -> { items, compatibilityScore, breakdown, colorRelations, reasons }`.

### Formulas

**Style and pattern compatibility**: direct symmetric matrix lookups (`styleCompatibilityMatrix[a][b]`, `patternCompatibilityMatrix[a][b]`) — see the config values table below for the full matrices.

**Occasion and season** (`occasionScore` / `seasonScore`), sharing one tiered-or-Jaccard rule:
```
score(A, B, target) = 1.0   if both A and B include `target`
                     = 0.5   if exactly one includes `target`
                     = 0.0   if neither includes `target`
                     = Jaccard(valuesA, valuesB)   if target is null (no target)
```
For occasion, omitting `targetOccasion` means "no target" → Jaccard. For season, omitting `targetSeason` means "use the current season" (derived from `date`/`hemisphere`, meteorological month boundaries) as the target; passing `targetSeason: null` explicitly forces Jaccard mode instead.

**Pairwise compatibility** (`pairwiseCompatibilityScore` / `combineCompatibilityComponents`):
```
C(A, B) = compatibilityWeights.color    * C_color(A, B)
        + compatibilityWeights.style    * C_style(A, B)
        + compatibilityWeights.pattern  * C_pattern(A, B)
        + compatibilityWeights.occasion * C_occasion(A, B)
        + compatibilityWeights.season   * C_season(A, B)
```

**Outfit structure** (`isValidOutfit`): valid only if exactly 1 `shoes`, AND (exactly 1 `top` + exactly 1 `bottom` + 0 `dress`) OR (exactly 1 `dress` + 0 `top` + 0 `bottom`), AND 0-1 `outerwear`, AND 0-2 `accessory`.

**Full outfit score** (`outfitScore`), for a structurally valid outfit:
```
base = weightedMean(C(A,B) for every item pair, weighted 0.5 if the pair
       involves an accessory, else 1.0)
meanPairColor = weightedMean(C_color(A,B) for every pair, same weights as base)
outfitScore = base - compatibilityWeights.color * meanPairColor
                    + compatibilityWeights.color * outfitColorScore(items)
```
This replaces the mean pairwise color contribution with the outfit-level color score from Section 1 (which additionally applies the >3-hue-group penalty), while leaving the style/pattern/occasion/season contributions as their pairwise weighted means. Invalid outfits score `0`.

**Outfit generation** (`generateOutfits`, beam search): the required slots to fill are determined by the anchor's category (`top → [bottom, shoes]`, `bottom → [top, shoes]`, `shoes → [top, bottom]`, `dress → [shoes]`). The first slot's candidates are ranked directly against the anchor via `C(A,B)` (the outfit isn't complete yet); the best `generation.beamWidth` survive. The second slot (if any) is filled and scored with the full `outfitScore` once the outfit is complete, again keeping the best `beamWidth`. Up to 1 accessory is then added per surviving outfit, only if it strictly increases the score. Since I7.3, the rule engine (Section 4) takes part at every step: items failing item-level hard rules are removed first, pairs and outfits rejected by hard rules are dropped, and complete outfits are ranked by `C_adjusted = clamp01(outfitScore + ruleAdjustment)`; an anchor that itself fails a hard rule yields no outfits. Results are sorted by score descending, tie-broken by sorted item ids (for determinism), and trimmed to `topN`.

### Config values used

`compatibilityWeights`: `color: 0.30`, `style: 0.25`, `pattern: 0.15`, `occasion: 0.20`, `season: 0.10`.

`styleCompatibilityMatrix`:

| | casual | smart_casual | formal | streetwear | sporty |
|---|---|---|---|---|---|
| casual | 1.0 | 0.8 | 0.3 | 0.8 | 0.7 |
| smart_casual | 0.8 | 1.0 | 0.7 | 0.5 | 0.3 |
| formal | 0.3 | 0.7 | 1.0 | 0.2 | 0.1 |
| streetwear | 0.8 | 0.5 | 0.2 | 1.0 | 0.7 |
| sporty | 0.7 | 0.3 | 0.1 | 0.7 | 1.0 |

`patternCompatibilityMatrix`:

| | solid | striped | checked | graphic | floral |
|---|---|---|---|---|---|
| solid | 1.0 | 0.9 | 0.9 | 0.9 | 0.9 |
| striped | 0.9 | 0.5 | 0.3 | 0.3 | 0.3 |
| checked | 0.9 | 0.3 | 0.4 | 0.3 | 0.2 |
| graphic | 0.9 | 0.3 | 0.3 | 0.3 | 0.2 |
| floral | 0.9 | 0.3 | 0.2 | 0.2 | 0.4 |

`generation`: `beamWidth: 10`, `topN: 5`, `accessoryPairWeight: 0.5`.

### Worked example

With component scores color `0.8`, style `1.0`, pattern `0.8`, occasion `1.0`, season `1.0` (the README's own worked example):
```
C = 0.30(0.8) + 0.25(1) + 0.15(0.8) + 0.20(1) + 0.10(1) = 0.91
```

From the real fixture wardrobe, `pairwiseCompatibilityScore(black_tshirt, blue_jeans, {targetOccasion: "casual"})`:
```
components = { color: 0.9221, style: 1, pattern: 1, occasion: 1, season: 1 }
score = 0.30(0.9221) + 0.25(1) + 0.15(1) + 0.20(1) + 0.10(1) = 0.9766
```

The full outfit `[black_tshirt, blue_jeans, white_sneakers]` (casual context): `outfitScore = 0.9708`, `outfitColorScore = 0.9027` (used in place of the pairwise color mean), all other components at `1.0`. `explainOutfit` on this outfit reports `breakdown = { color: 0.9027, style: 1, pattern: 1, occasion: 1, season: 1 }` and `reasons = ["All items share casual style", "Neutral colors pair cleanly"]`.

### Complexity

Beam search is `O(slots * beamWidth * n)`, where `n` is the wardrobe size and `slots` is at most 2 (the number of required slots after the anchor) — each slot expansion scores up to `beamWidth * n` candidates. The accessory step adds another `O(beamWidth * n)` pass. `isValidOutfit` and `outfitScore` are `O(n²)` in the *outfit's own* item count (small, not the wardrobe).

### Limitations

- `generateOutfits` only supports `top`/`bottom`/`shoes`/`dress` anchors (see the Decision Log for why `outerwear`/`accessory` anchors were explicitly rejected rather than approximated).
- The accessory step only ever adds **one** accessory, even though `isValidOutfit` permits up to two — a second accessory can only enter an outfit if the anchor itself was already an accessory (which, per the point above, isn't a supported anchor).
- Beam width (`10`) and pool size are fixed; a wardrobe with far more than 10 strong candidates for a slot could have some good combinations pruned before the second slot is explored.
- `occasionScore`/`seasonScore`'s tiered logic treats "does this item cover the target" as a boolean per item — an item tagged with 5 occasions and one tagged with exactly 1 (the target) score identically at that step.

---

## 3. Personalized Recommendation Algorithm

### Purpose

Learns a user's taste from their logged interactions (likes, views, saves, purchases) and blends it into the Compatibility Scoring Algorithm's ranking, generalizing to items the user has never interacted with via shared attributes. Falls back to pure compatibility for anonymous users or users with too little history.

### Inputs

- A list of one user's interactions: `{ itemId, type: "like"|"view"|"save"|"purchase", timestamp }` (real Mongoose `Interaction` documents or plain objects both work).
- An item lookup (`itemsById`) to join interactions back to the items' attributes.
- `{ isAnonymous?, interactionCount? }`, for alpha resolution.
- An anchor item, wardrobe, context, `{ profile, preferenceScores, alpha }`, and `topN`, for final ranking.

### Outputs

- `computeUserItemSignals(interactions, options) -> Map<itemId, {L, V, S, P}>`.
- `itemPreferenceScore(signals) -> R_i` in `[0, 1]`; `computeUserItemPreferenceScores(interactions) -> Map<itemId, R_i>`.
- `buildAttributeProfile(...) -> profile`; `attributeAffinity(item, profile) -> number`; `computeItemAffinity(item, {profile, preferenceScores}) -> P_item`.
- `outfitPreferenceScore(items, {profile, preferenceScores}) -> P_outfit`.
- `resolveAlpha({isAnonymous, interactionCount}) -> alpha`.
- `generatePersonalizedOutfits(anchor, wardrobe, context, {profile, preferenceScores, alpha}, topN) -> [outfit]`, each outfit = Section 2's `explainOutfit` shape (with rule messages merged into `reasons`) plus `adjustedCompatibilityScore`, `ruleAdjustment`, `appliedRules`, `preferenceScore`, `finalScore`, `alpha`.

### Formulas

**Time decay**: `decay(ageDays) = 0.5 ^ (ageDays / decayHalfLifeDays)`.

**Signal normalization** (`computeUserItemSignals`), per user per item, with `decayedX_i = sum of decay(ageDays) over every interaction of type X on item i`:
```
L_i = 1 if a "like" interaction exists for item i, else 0
V_i = log(1 + decayedViews_i) / log(1 + max decayedViews over the user's items)
S_i = decayedSaves_i / max decayedSaves over the user's items
P_i = decayedPurchases_i / max decayedPurchases over the user's items
```
(Division by zero → `0`, not `NaN`.) "Like" is a toggle (one record per user+item, no duplicates on repeat likes); view/save/purchase are append-only event logs.

**Item preference score**:
```
R_i = preferenceWeights.like * L_i + preferenceWeights.view * V_i
    + preferenceWeights.save * S_i + preferenceWeights.purchase * P_i
```

**Attribute affinity profile**: for each of 4 attribute types (`colorGroup` — `"neutral"` or a fixed 30°-wide hue bucket; `style`; `pattern`; `category`), compute the mean `R_i` of the user's interacted items sharing that attribute value.
```
attributeAffinity(item) = mean(profile[type].get(item's value in type) for each of the 4 types;
                                0.5 for any type/value never seen in the profile)

P_item = preferenceBlend.itemDirect * R_i + preferenceBlend.attributeAffinity * attributeAffinity(item)
             if the user has interacted with item (has a known R_i)
       = attributeAffinity(item)   otherwise
```

**Outfit preference score**: `P_outfit = mean(P_item for every item in the outfit)`.

**Cold start / adaptive alpha**:
```
alpha = alpha.coldStart        if isAnonymous OR interactionCount < alpha.minInteractions
      = alpha.default          otherwise
```

**Final score and re-ranking** (`generatePersonalizedOutfits`): runs Section 2's `generateOutfits` over a pool of `topN * 4` candidates, then for each:
```
C_adjusted = clamp01(C + ruleAdjustment)          (Section 4; since I7.3)
FinalScore = alpha * C_adjusted + (1 - alpha) * P_outfit
```
filters out any outfit with `C_adjusted < minCompatibility` (a hard floor — regardless of how high `P_outfit` is), re-sorts by `FinalScore` (same deterministic tie-break as Section 2), and returns the top `topN`.

### Config values used

`preferenceWeights`: `like: 0.35`, `view: 0.10`, `save: 0.25`, `purchase: 0.30`. `preferenceBlend`: `itemDirect: 0.5`, `attributeAffinity: 0.5`. `decayHalfLifeDays: 30`. `alpha`: `default: 0.7`, `coldStart: 1.0`, `minInteractions: 5`. `minCompatibility: 0.5`.

### Worked example

A 60-day-old view: `decay(60) = 0.5^(60/30) = 0.25` — a 60-day-old view counts a quarter of a fresh one.

A liked-and-purchased item with no view/save history: `R_i = 0.35(1) + 0.10(0) + 0.25(0) + 0.30(1) = 0.65`.

From T3.4's acceptance-criterion scenario: a user who liked+purchased 3 black casual tops (`R_i = 0.65` each) gets, for an **unseen** black casual top, `attributeAffinity = mean(0.65, 0.65, 0.65, 0.65) = 0.65` (all 4 attribute buckets seen) → since it's unseen, `P_item = 0.65`. For an unseen floral formal top (3 of 4 attributes never seen), `attributeAffinity = mean(0.5, 0.5, 0.5, 0.65) = 0.5375` (only `category = "top"` was seen). `0.65 > 0.5375`, matching the intended direction: familiar attributes score higher than unfamiliar ones.

At `alpha = 1.0` (cold start), `FinalScore = 1.0 * C_adjusted + 0 * P = C_adjusted` exactly — identical to Section 2's (rule-adjusted) output alone, satisfying the "new user results are identical to Sprint 2" requirement algebraically, not just approximately.

### Complexity

`computeUserItemSignals` / `computeUserItemPreferenceScores` are `O(interactions)`. `buildAttributeProfile` is `O(interactedItems)`. `generatePersonalizedOutfits` is dominated by Section 2's beam search over a `4x` larger pool: `O(slots * beamWidth * n)` for the generation pass, plus `O(topN * 4 * outfitSize)` for computing `P_outfit` per candidate and re-sorting.

### Limitations

- `alpha` has only two discrete values (`1.0` or `0.7`) — personalization's influence on ranking doesn't scale continuously with how much interaction history a user has past the `minInteractions` threshold. Measured empirically (see the Decision Log for T3.7/T3.8): with the fixture wardrobe's typical compatibility-score gaps, a moderate/realistic interaction history often isn't enough to change the top-5 *at all* — only a strongly one-sided preference profile reliably does.
- `colorGroup` uses fixed 30° buckets; two colors 31° apart land in different buckets and share no attribute-affinity signal, even though they'd likely still look related.
- An item the user has explicitly disliked (only ever viewed, never liked/saved/purchased) is indistinguishable in this model from one they've simply never seen — there's no negative signal, only an absence of positive signal.
- `buildAttributeProfile`/`buildUserAffinityContext` silently skip any interacted item missing from the caller's `itemsById` lookup (e.g. a discontinued product), which can under-count that user's true signal without any error or warning.

---

## 4. Rule-Based Attribute Matching Algorithm

### Purpose

Enforces basic dress rules on generated outfits (for example, no sporty items at a formal occasion), nudges scores up or down for combinations that stylists favor or avoid, and scores how well a single item matches attributes a shopper asks for ("black casual top"), with a readable reason for every rule applied. Added in Sprint 5; wired into outfit generation in Sprint 7 (I7.3).

### Inputs

- Declarative rules from `server/src/config/rulesConfig.js`, validated at startup by `rules/ruleSchema.js`.
- An item, a pair of items, or a whole outfit, plus a request `context: { occasion?, season? }` (the recommender's `targetOccasion`/`targetSeason` are accepted too). A season only counts when it was explicitly requested.
- For attribute matching: an item and a request such as `{ category: "top", color: "black", style: "casual" }`.

### Outputs

- `applyItemRules(item, context)`, `applyPairRules(a, b, context)`, `applyOutfitRules(items, context)` -> `{ allowed, adjustments, messages, entries }`.
- `evaluateOutfit(items, context) -> { allowed, ruleAdjustment, appliedRules, rejections, messages }`; `filterItems(items, context)` -> the items passing every item-level hard rule.
- Every applied rule is reported as `{ ruleId, type, effect, value, message, itemIds }`; `mergeRuleExplanation` appends the messages to Section 2's `reasons`.
- `attributeMatch(item, requested) -> { score, matched, missed, scores, excluded }`; `matchItems(items, requested)` ranks by it (served by `POST /api/items/match`).

### Formulas

**Rule schema.** Each rule is:
```json
{
  "id": "formal_no_sporty",
  "description": "Formal outfits cannot contain sporty items",
  "scope": "item | pair | outfit",
  "type": "hard | soft",
  "priority": 100,
  "when": { "context.occasion": { "eq": "formal" } },
  "condition": { "item.style": { "in": ["sporty", "streetwear"] } },
  "action": { "effect": "reject" },
  "message": "Sporty or streetwear items are not suitable for formal occasions"
}
```
Hard rules use `effect: "reject"`; soft rules use `"boost"` or `"penalty"` with a `value` in `[0, maxSoftValue]`. `when` (optional) may only read `context.*`. `enabled: false` switches a rule off without code changes.

**Conditions** (`rules/conditionEvaluator.js`). Keys are attribute paths (several keys = AND) or `all` / `any` / `not`. Operators:

| Operator | True when |
|---|---|
| `eq` / `neq` | the value equals / differs from the operand |
| `in` / `notIn` | the value is / is not one of the operand list |
| `contains` | a list attribute contains the operand |
| `containsAny` | a list attribute contains at least one operand value |
| `onlyContains` | a list attribute is non-empty and every element is in the operand list |
| `gte` / `lte` | a numeric value is >= / <= the operand |

Paths by scope: item rules read `item.*` (category, style, pattern, seasons, occasions, colorHex, ...); pair rules read `a.*`, `b.*` and the derived `pair.colorRelation` (Section 1's hue relation), `pair.bothPatterned`, `pair.sameStyle`, `pair.categories`; outfit rules read the derived `outfit.patternCount`, `outfit.boldPatternCount`, `outfit.styles`, `outfit.styleCount`, `outfit.nonNeutralColorCount`, `outfit.categories`, `outfit.itemCount`. Unknown paths or operators are rejected when the config loads.

**Conflict resolution** (`evaluateOutfit`):
1. Item rules run on every item, pair rules on every pair, outfit rules once.
2. If any hard rule fires, the outfit is rejected: `allowed = false`, every rejecting rule is reported, and no soft adjustment is applied.
3. Each soft rule applies at most once per outfit, however many pairs trigger it.
4. The adjustment is capped:
```
ruleAdjustment = clamp( sum(boost values) - sum(penalty values), -adjustmentCap, +adjustmentCap )
```
5. Rules are evaluated and reported in descending `priority`, ties broken by id, so the result never depends on config order.

**In outfit generation** (I7.3; see Sections 2 and 3):
```
C_adjusted = clamp01(C + ruleAdjustment)
FinalScore = alpha * C_adjusted + (1 - alpha) * P_outfit
```

**Attribute match score** (`rules/attributeMatcher.js`), over the requested attributes `k` only, so the weights are renormalized:
```
MatchScore = sum(w_k * s_k) / sum(w_k)
```

| Attribute | Exact | Partial | None |
|---|---|---|---|
| category | 1.0 | - | 0.0, and the item is excluded |
| style | 1.0 | the style matrix value (Section 2) if >= 0.7 | 0.0 |
| pattern | 1.0 | 0.5 if `solid` was requested and the item is `striped` | 0.0 |
| color | 1.0 for the same color name (Section 5) | 0.6 for the same non-neutral color family; 0.4 if both are neutral | 0.0 |
| occasion / season | 1.0 if the item's list contains it | - | 0.0 |

### Config values used

`maxSoftValue: 0.3`, `adjustmentCap: 0.3`, `boldPatterns: graphic, floral, checked`.

| Rule | Scope | Type | Priority | Effect |
|---|---|---|---|---|
| `formal_no_sporty` | item | hard | 100 | formal occasion rejects `sporty`/`streetwear` items |
| `sport_requires_sporty_shoes` | item | hard | 100 | sport occasion rejects shoes that are not `sporty`/`casual` |
| `winter_no_summer_only` | item | hard | 90 | winter rejects items whose seasons are only `summer` |
| `summer_no_winter_only` | item | hard | 90 | summer rejects items whose seasons are only `winter` |
| `max_one_bold_pattern` | outfit | hard | 80 | rejects `boldPatternCount >= 2` |
| `pattern_on_pattern` | pair | soft | 50 | penalty 0.10 when both items are patterned |
| `double_clash_color` | pair | soft | 50 | penalty 0.10 when the color relation is `clash` |
| `formal_leather_shoes` | pair | soft | 40 | boost 0.05 for a formal top with formal shoes |
| `matching_style_set` | outfit | soft | 40 | boost 0.05 when every item shares one style |

`attributeMatch.weights`: `category: 0.30`, `color: 0.25`, `style: 0.20`, `pattern: 0.10`, `occasion: 0.10`, `season: 0.05`. `stylePartialMin: 0.7`. `patternPartial: solid -> striped 0.5`. `colorScores`: `exact: 1.0`, `sameFamily: 0.6`, `bothNeutral: 0.4`.

### Worked example

**Soft rules.** `[white_shirt, black_trousers, black_oxfords]` for a formal occasion has raw `C = outfitScore = 0.9552`. `formal_leather_shoes` fires (formal top + formal shoes, +0.05) and `matching_style_set` fires (all three are `formal`, +0.05), so `ruleAdjustment = 0.10` and `C_adjusted = clamp01(0.9552 + 0.10) = 1.0`.

**Hard rules.** `[orange_graphic_tee, green_floral_skirt, white_sneakers]` has `outfit.boldPatternCount = 2` (graphic + floral), so `max_one_bold_pattern` rejects it with "More than one bold pattern (graphic, floral, checked) makes the outfit too busy". For a formal occasion, `formal_no_sporty` also rejects the streetwear tee, and both messages are reported.

**Attribute match.** For the request `{ category: top, color: black, style: casual }`:
- `black_tshirt`: `s = (1, 1, 1)`, so `MatchScore = 1.0`.
- `navy_shirt`: category 1.0; color 0.4 (black is neutral and the navy shirt is flagged neutral); style 0.8 (smart_casual vs casual). `MatchScore = (0.30*1 + 0.25*0.4 + 0.20*0.8) / (0.30 + 0.25 + 0.20) = 0.56 / 0.75 = 0.7467`.
- `black_trousers`: its category is `bottom`, so it is excluded.

### Complexity

For an outfit of `k` items and `R` rules, `evaluateOutfit` makes `O((k + k^2 + 1) * R)` condition checks, with `k <= 5`. During beam search the same items and pairs recur in many candidate outfits, so item and pair results are memoized per request (`createRuleCache`) and sorted rule lists are cached; this cut the rule overhead on a 500-item wardrobe from about 110 ms to about 20 ms. `attributeMatch` is `O(requested attributes)`.

### Limitations

- Rules are only as good as the item tags. Real products get default `style`/`pattern`/`seasons`/`occasions` unless sellers set them, so most rules rarely fire on untagged catalog data.
- Items have no contrast attribute, so every `striped` item gets the "low-contrast stripes" partial credit.
- Rules are boolean: an item either triggers a rule or does not. There is no graded "slightly too sporty".
- Season rules only fire for an explicitly requested season, never for the current date.
- On the fixture wardrobe the labeled-outfit Precision@5 was already 100% without rules, so the evaluation cannot show a precision gain; it shows that rules reject 1 of 14 "bad" and 0 of 18 "good" labeled outfits (see [EVALUATION_RULES_SEARCH.md](algorithms/EVALUATION_RULES_SEARCH.md)).

---

## 5. Fuzzy Search (TF-IDF and Cosine Similarity)

### Purpose

Lets shoppers search the catalog with free text, tolerating typos and synonyms (`"blak casul tee"` finds the black casual t-shirt), ranks results by text relevance combined with attribute matching (Section 4), and explains each result. TF-IDF is implemented from scratch, with no search engine or ML library. Added in Sprint 6; hybrid ranking, API and UI in Sprint 7.

### Inputs

- A query string, plus optional `limit` and `offset`.
- The searchable catalog: every available product from an approved seller, mapped to items with `name`, `description`, category, color, style, pattern, occasions and seasons.

### Outputs

- `searchIndex(index, query, options) -> [{ itemId, score, sWord, sChar, matchedTerms }]` (text relevance only).
- `parseQuery(query) -> { attributes, freeText, matches }`.
- `hybridSearch(index, query, options) -> { results: [{ itemId, hybridScore, searchScore, matchScore, matched, missed, sWord, sChar, matchedTerms }], parsedAttributes, total }`, served by `GET /api/items/search`.

### Formulas

**Documents** (`search/documentBuilder.js`). Each item becomes weighted text; a field's weight is applied by repeating its tokens that many times before term frequency is computed:

| Field | Source | Weight |
|---|---|---|
| name | item name | 3 |
| category | category | 2 |
| color | `colorName` + `colorFamily` | 2 |
| style | style | 2 |
| pattern | pattern | 1 |
| occasions, seasons | lists joined | 1 each |
| description | if present | 1 |

**Color names** (`search/colorNames.js`): a hex is named after the nearest palette entry by distance in HSV space, with hue treated as an angle:
```
dH = circularHueDistance(h1, h2) / 180 * min(s1, s2)
d  = sqrt(dH^2 + (s1 - s2)^2 + (v1 - v2)^2)
```
Hue is scaled by the lower saturation because hue is meaningless for greys. `colorFamily` is the matched entry's family.

**Normalization** (`search/normalizer.js`), identical for documents and queries: lowercase, strip accents, turn `-` and `_` into spaces, drop apostrophes, turn other punctuation into spaces, collapse spaces, replace synonyms (longest phrase first), remove stopwords. Example: `"Grey T-Shirt for the Gym" -> "grey tshirt gym"`.

**Tokens** (`search/tokenizer.js`): word tokens, and character n-grams of each word padded as `#word#` (`n = 3`): `black -> #bl, bla, lac, ack, ck#`. A typo still shares n-grams with the right word (`blak` shares `#bl` and `bla`).

**TF-IDF** (`search/tfidfVectorizer.js`), with one vector space for words and one for n-grams. `N` is the number of documents and `df(t)` the number containing `t`:
```
tf(t, d)  = 1 + ln(count(t, d))   if count > 0, else 0      (sublinear TF)
idf(t)    = ln((1 + N) / (1 + df(t))) + 1                   (smoothed IDF)
w(t, d)   = tf(t, d) * idf(t)
vector(d) = w(., d) / ||w(., d)||_2                          (L2 normalized)
```
Queries use the same IDF; query terms not in the vocabulary are ignored.

**Cosine** (`search/cosine.js`): with L2-normalized vectors both norms are 1, so
```
cos(q, d) = (q · d) / (||q|| * ||d||) = sum over shared terms t of q[t] * d[t]
```

**Inverted index** (`search/invertedIndex.js`): `index[term] -> [(docId, weight)]` for each space. Only documents sharing a term with the query are scored, by adding `q[t] * w(t, d)` along each query term's posting list. Tests prove this equals a brute-force cosine over every document.

**Search score** (`search/searchIndex.js`):
```
S_word      = cos(q_word, d_word)
S_char      = cos(q_char, d_char)
SearchScore = beta * S_char + (1 - beta) * S_word
```

**Query attributes** (`search/queryParser.js`): each normalized query word is matched to a known value of category, color, style, pattern, occasion or season (plus aliases such as `tshirt -> top`), exactly first, otherwise by char-bigram cosine >= 0.7 against that vocabulary (`casul -> casual` = 0.772, `blak -> black` = 0.730). Bigrams are used here because with trigrams `casul` vs `casual` is only 0.548.

**Hybrid score** (`search/hybridSearch.js`), using Section 4's `MatchScore` on the parsed attributes:
```
HybridScore = gamma * SearchScore + (1 - gamma) * MatchScore
            = SearchScore                  if no attributes were parsed
```
A parsed category is a hard filter. Results below `minScore` are dropped, and the rest are sorted by score (ties by item id) and paged.

**Keeping the index current** (`services/searchService.js`): one catalog index is built on the first search and cached. Product create, edit and delete update it item by item; the index keeps raw counts and document frequencies and recomputes IDF and vectors lazily on the next search. Seller approval changes clear it, so the next search rebuilds it.

### Config values used

From `server/src/config/searchConfig.js`: `ngramSize: 3`, `beta: 0.6`, `gamma: 0.6`, `minScore: 0.15`, `defaultLimit: 10`, `matchedTermMinSimilarity: 0.4`; the field weights in the table above; synonyms `tee, t-shirt, t shirt, tshirt -> tshirt`, `pants, trousers -> trousers`, `sneakers, trainers, kicks -> sneakers`, `jeans, denim -> jeans`, `grey, gray -> grey`, `formalwear, formal wear -> formal`; stopwords `a, an, the, for, with, and, my, some`; `queryParsing`: `ngramSize: 2`, `minSimilarity: 0.7`, `minFuzzyLength: 3`; and a 21-color palette (the README's 20 plus `silver`), each color with an explicit family.

### Worked example: `"blak tee"` on the fixture wardrobe (N = 21)

1. **Normalize:** `"blak tee" -> "blak tshirt"` (synonym `tee -> tshirt`).
2. **Word vector:** `blak` is not in the word vocabulary, so it is ignored. `tshirt` appears in 2 documents (`black_tshirt`, `orange_graphic_tee`), so `idf(tshirt) = ln((1 + 21) / (1 + 2)) + 1 = 2.9924`. The query has one known term, so `q_word = { tshirt: 1.0 }`.
3. **Char vector:** the n-grams are `#bl bla lak ak# #ts tsh shi hir irt rt#`; `lak` and `ak#` occur in no document and drop out, leaving 8 weighted n-grams.
4. **Scores for `black_tshirt`:** its document repeats `tshirt` 3 times (name weight 3); after TF-IDF and L2 normalization `d_word[tshirt] = 0.5778`, so `S_word = 1.0 * 0.5778 = 0.5778`. Summing over the shared n-grams gives `S_char = 0.6443`. `SearchScore = 0.6 * 0.6443 + 0.4 * 0.5778 = 0.6177`.
5. **Attributes:** `parseQuery` finds `blak -> color: black` (bigram cosine 0.730) and `tshirt -> category: top`. For `black_tshirt`, `MatchScore = 1.0`, so `HybridScore = 0.6 * 0.6177 + 0.4 * 1.0 = 0.7706`, with `matchedTerms = ["black", "tshirt"]`.
6. **Runner-up `orange_graphic_tee`:** `SearchScore = 0.3273`; `MatchScore = (0.30 * 1 + 0.25 * 0) / (0.30 + 0.25) = 0.5455`; `HybridScore = 0.6 * 0.3273 + 0.4 * 0.5455 = 0.4146`. Items that are not tops are removed by the category filter.

### Complexity

Building the index is linear in the total number of tokens, and the first search after a change recomputes the weights in the same time. A search costs `O(sum of posting-list lengths for the query terms)` to score plus `O(m log m)` to sort the `m` candidates; `matchedTerms` explanations are computed only for the returned page. Query parsing is `O(query words * attribute vocabulary)`. Measured on a synthetic 1,000-item catalog: an index build takes about 80-135 ms and a search about 2-6 ms on average, far under the 500 ms and 50 ms targets (see [EVALUATION_RULES_SEARCH.md](algorithms/EVALUATION_RULES_SEARCH.md)).

### Limitations

- There is no semantic understanding beyond the configured synonyms: "jumper" does not find "sweater" unless it is added to the synonym list.
- Swapped letters score low with n-grams (`purpel` vs `purple` = 0.571), so they are not turned into attributes, although the text search still finds the item.
- A query that names a material rather than a garment can mislead the category filter: `"denim"` is parsed as category `bottom`, which hides the denim jacket.
- English only, with a small stopword list.
- The index lives in one server process's memory; several server processes would each keep their own copy.

---

## Full pipeline

How the five algorithms fit together, from a shopper's query to ranked outfits:

```
Query ("blak casul tee")
  -> normalize (lowercase, synonyms, stopwords)                          Section 5
  -> parse attributes (black, casual, top)                               Section 5
  -> TF-IDF search (word + char n-grams, inverted index)                 Section 5
  -> hybrid rank (text score + attribute MatchScore, category filter)    Sections 4 + 5
  -> shopper picks an anchor item ("Build outfit")
  -> rule pre-filter (item-level hard rules)                             Section 4
  -> beam search with color + compatibility scoring                      Sections 1 + 2
       (pair/outfit hard rules drop candidates as they are built)        Section 4
  -> rule adjustments: C_adjusted = clamp01(C + ruleAdjustment)          Section 4
  -> personalization: FinalScore = alpha * C_adjusted + (1 - alpha) * P  Section 3
  -> final ranking
  -> top outfits with reasons (compatibility reasons + rule messages)
```

---

## See also

- **[EVALUATION.md](algorithms/EVALUATION.md)** — Precision@5 vs. random baseline, personalization hit rate, score spread by category, weight sensitivity, and the performance benchmark, generated by `npm run evaluate`.
- **[EVALUATION_RULES_SEARCH.md](algorithms/EVALUATION_RULES_SEARCH.md)** — search Precision@5/Recall@10/MRR, word vs char vs hybrid ablation, rule impact, latency and the 1,000-item performance check, generated by `npm run evaluate:rules-search`.
- **[SPRINT_REVIEWS.md](algorithms/SPRINT_REVIEWS.md)** — sprint reviews for Sprints 5-7.
- **[AUDIT.md](algorithms/AUDIT.md)** — the T0.1 repository audit this whole implementation was built against.
- **`ALGORITHMS_SPRINT_README.md`** (repo root) — the full ticket-by-ticket build log and Decision Log, with the reasoning behind every design choice referenced above.
