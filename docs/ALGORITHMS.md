# Outfit Builder: Algorithm Documentation

This document describes the three algorithms implemented under `server/src/recommendation/**`, built in the order they depend on each other:

1. **Color Harmony Algorithm** — scores how well two garments' colors work together.
2. **Outfit Compatibility Scoring Algorithm** — combines color with style, pattern, occasion, and season into a full outfit score, and generates complete outfits via beam search.
3. **Personalized Recommendation Algorithm** — learns a user's preferences from their interactions and blends that into the compatibility ranking.

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
- `generateOutfits(anchorItem, wardrobe, context, topN) -> [{ items, score }]`, sorted descending, deterministic.
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

**Outfit generation** (`generateOutfits`, beam search): the required slots to fill are determined by the anchor's category (`top → [bottom, shoes]`, `bottom → [top, shoes]`, `shoes → [top, bottom]`, `dress → [shoes]`). The first slot's candidates are ranked directly against the anchor via `C(A,B)` (the outfit isn't complete yet); the best `generation.beamWidth` survive. The second slot (if any) is filled and scored with the full `outfitScore` once the outfit is complete, again keeping the best `beamWidth`. Up to 1 accessory is then added per surviving outfit, only if it strictly increases the score. Results are sorted by score descending, tie-broken by sorted item ids (for determinism), and trimmed to `topN`.

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
- `generatePersonalizedOutfits(anchor, wardrobe, context, {profile, preferenceScores, alpha}, topN) -> [outfit]`, each outfit = Section 2's `explainOutfit` shape plus `preferenceScore`, `finalScore`, `alpha`.

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
FinalScore = alpha * C + (1 - alpha) * P_outfit
```
filters out any outfit with `C < minCompatibility` (a hard floor — regardless of how high `P_outfit` is), re-sorts by `FinalScore` (same deterministic tie-break as Section 2), and returns the top `topN`.

### Config values used

`preferenceWeights`: `like: 0.35`, `view: 0.10`, `save: 0.25`, `purchase: 0.30`. `preferenceBlend`: `itemDirect: 0.5`, `attributeAffinity: 0.5`. `decayHalfLifeDays: 30`. `alpha`: `default: 0.7`, `coldStart: 1.0`, `minInteractions: 5`. `minCompatibility: 0.5`.

### Worked example

A 60-day-old view: `decay(60) = 0.5^(60/30) = 0.25` — a 60-day-old view counts a quarter of a fresh one.

A liked-and-purchased item with no view/save history: `R_i = 0.35(1) + 0.10(0) + 0.25(0) + 0.30(1) = 0.65`.

From T3.4's acceptance-criterion scenario: a user who liked+purchased 3 black casual tops (`R_i = 0.65` each) gets, for an **unseen** black casual top, `attributeAffinity = mean(0.65, 0.65, 0.65, 0.65) = 0.65` (all 4 attribute buckets seen) → since it's unseen, `P_item = 0.65`. For an unseen floral formal top (3 of 4 attributes never seen), `attributeAffinity = mean(0.5, 0.5, 0.5, 0.65) = 0.5375` (only `category = "top"` was seen). `0.65 > 0.5375`, matching the intended direction: familiar attributes score higher than unfamiliar ones.

At `alpha = 1.0` (cold start), `FinalScore = 1.0 * C + 0 * P = C` exactly — identical to Section 2's output alone, satisfying the "new user results are identical to Sprint 2" requirement algebraically, not just approximately.

### Complexity

`computeUserItemSignals` / `computeUserItemPreferenceScores` are `O(interactions)`. `buildAttributeProfile` is `O(interactedItems)`. `generatePersonalizedOutfits` is dominated by Section 2's beam search over a `4x` larger pool: `O(slots * beamWidth * n)` for the generation pass, plus `O(topN * 4 * outfitSize)` for computing `P_outfit` per candidate and re-sorting.

### Limitations

- `alpha` has only two discrete values (`1.0` or `0.7`) — personalization's influence on ranking doesn't scale continuously with how much interaction history a user has past the `minInteractions` threshold. Measured empirically (see the Decision Log for T3.7/T3.8): with the fixture wardrobe's typical compatibility-score gaps, a moderate/realistic interaction history often isn't enough to change the top-5 *at all* — only a strongly one-sided preference profile reliably does.
- `colorGroup` uses fixed 30° buckets; two colors 31° apart land in different buckets and share no attribute-affinity signal, even though they'd likely still look related.
- An item the user has explicitly disliked (only ever viewed, never liked/saved/purchased) is indistinguishable in this model from one they've simply never seen — there's no negative signal, only an absence of positive signal.
- `buildAttributeProfile`/`buildUserAffinityContext` silently skip any interacted item missing from the caller's `itemsById` lookup (e.g. a discontinued product), which can under-count that user's true signal without any error or warning.

---

## See also

- **[EVALUATION.md](algorithms/EVALUATION.md)** — Precision@5 vs. random baseline, personalization hit rate, score spread by category, weight sensitivity, and the performance benchmark, generated by `npm run evaluate`.
- **[AUDIT.md](algorithms/AUDIT.md)** — the T0.1 repository audit this whole implementation was built against.
- **`ALGORITHMS_SPRINT_README.md`** (repo root) — the full ticket-by-ticket build log and Decision Log, with the reasoning behind every design choice referenced above.
