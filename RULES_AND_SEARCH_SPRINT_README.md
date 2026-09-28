# Outfit Builder: Rule-Based Matching and Fuzzy Search Implementation Plan

This file covers two algorithms added to the existing outfit builder:

1. **Rule-Based Attribute Matching Algorithm**: declarative rules that filter, match, and adjust items and outfits by their attributes.
2. **Fuzzy Search using TF-IDF and Cosine Similarity**: typo-tolerant text search over wardrobe items.

It extends the system built in `ALGORITHMS_SPRINT_README.md` (color harmony, compatibility scoring, personalization). Sprints are numbered 5 to 7 to continue from that plan.

---

## Instructions for Claude (read before starting)

1. Read this entire file before writing any code. Also read `ALGORITHMS_SPRINT_README.md` and `docs/algorithms/AUDIT.md` if they exist.
2. Prerequisite: tickets T0.2 (item model), T0.3 (scoring config), T0.4 (fixtures), and T2.7 (outfit generation) from the previous plan must be `DONE`. If they are not, stop and report which ones are missing.
3. Work **one ticket at a time, in order**. Do not start a ticket until all its dependencies are `DONE`.
4. After each ticket:
   - Run the ticket's tests and the full test suite. All must pass.
   - Update the **Progress Tracker** (`TODO` → `DONE`).
   - Record assumptions or deviations in the **Decision Log**.
5. Reuse existing modules (item model, config loader, math utils, HSV conversion). Do not duplicate them.
6. All scores are floats in `[0, 1]`. All weights, thresholds, and rule definitions live in config files, never hardcoded in logic.
7. Scoring, matching, and search functions must be pure (no DB/network access inside) so they are unit-testable. Data loading happens in service layers.
8. Do not use an external search engine or ML library for TF-IDF. Implement it directly so it can be explained in the university report.
9. If a ticket is ambiguous, choose the simplest option that meets its acceptance criteria and log it. Do not break existing features.

---

## Agile Structure

Each sprint has a **Sprint Goal**, **User Stories**, **Tickets** (with acceptance criteria), and a **Definition of Done**. At the end of each sprint, Claude writes a short sprint review to `docs/algorithms/SPRINT_REVIEWS.md`: what was completed, what was deferred, and any risks found.

---

## Progress Tracker

| Ticket | Title | Depends on | Status |
|---|---|---|---|
| R5.1 | Rule schema and config file | T0.3 | DONE |
| R5.2 | Condition evaluator | R5.1 | DONE |
| R5.3 | Item-level rules | R5.2 | DONE |
| R5.4 | Pair-level rules | R5.2 | DONE |
| R5.5 | Outfit-level rules | R5.2 | DONE |
| R5.6 | Rule engine and conflict resolution | R5.3-R5.5 | DONE |
| R5.7 | Attribute match score | R5.2 | DONE |
| R5.8 | Rule explanation output | R5.6 | DONE |
| R5.9 | Rule engine test suite | R5.6-R5.8 | DONE |
| S6.1 | Color name mapping | T0.2 | DONE |
| S6.2 | Searchable document builder | S6.1 | DONE |
| S6.3 | Text normalization and synonyms | S6.2 | DONE |
| S6.4 | Word and character n-gram tokenizer | S6.3 | DONE |
| S6.5 | TF-IDF vectorizer | S6.4 | DONE |
| S6.6 | Cosine similarity | S6.5 | DONE |
| S6.7 | Inverted index | S6.5 | DONE |
| S6.8 | Search function and ranking | S6.6, S6.7 | DONE |
| S6.9 | Incremental index updates | S6.7 | DONE |
| S6.10 | Fuzzy search test suite | S6.8, S6.9 | DONE |
| I7.1 | Query attribute extraction | R5.7, S6.8 | DONE |
| I7.2 | Hybrid search ranking | I7.1 | DONE |
| I7.3 | Rules inside outfit generation | R5.6, T2.7 | DONE |
| I7.4 | API endpoints | I7.2, I7.3 | DONE |
| I7.5 | UI integration | I7.4 | DONE |
| I7.6 | Evaluation script and metrics | I7.2, I7.3 | DONE |
| I7.7 | Performance check | I7.4 | DONE |
| I7.8 | Algorithm documentation | I7.6 | DONE |
---

## Suggested Module Layout

Adapt to the existing structure.

```
recommendation/
  config/
    rules_config.(json|yaml)
    search_config.(json|yaml)
  rules/
    rule_schema
    condition_evaluator
    rule_engine
    attribute_matcher
  search/
    color_names
    document_builder
    normalizer
    tokenizer
    tfidf_vectorizer
    cosine
    inverted_index
    search_service
    query_parser
tests/recommendation/rules/
tests/recommendation/search/
tests/fixtures/search_queries
scripts/evaluate_rules_and_search
```

---

# Sprint 5: Rule-Based Attribute Matching Algorithm

**Sprint Goal:** A configurable rule engine that enforces fashion constraints, adjusts outfit scores, and matches items against requested attributes, with a human-readable reason for every rule applied.

**User Stories**
- As a user, I never want to see a recommended outfit that breaks basic dress rules (for example, sporty shoes at a formal event).
- As a user, I want to filter my wardrobe by attributes (black, casual, top) and see the closest matches even when nothing matches exactly.
- As a developer, I want to add or change rules in config without editing code.

### R5.1 Rule schema and config file
**Task:** Define a rule format and create `rules_config` with the initial rules below.

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

- `hard` rules use `effect: "reject"`.
- `soft` rules use `effect: "boost"` or `"penalty"` with a `value` in `[0, 0.3]`.
- `when` is optional; it gates the rule on request context (occasion, season).

**Initial rules (minimum set):**

| id | scope | type | Rule |
|---|---|---|---|
| `formal_no_sporty` | item | hard | Formal occasion rejects sporty/streetwear items |
| `sport_requires_sporty_shoes` | item | hard | Sport occasion: shoes must be sporty or casual |
| `winter_no_summer_only` | item | hard | Winter season rejects items whose seasons are only `[summer]` |
| `summer_no_winter_only` | item | hard | Summer season rejects items whose seasons are only `[winter]` |
| `max_one_bold_pattern` | outfit | hard | Reject outfits with more than one of `graphic`, `floral`, `checked` |
| `pattern_on_pattern` | pair | soft | Two non-solid patterns: penalty 0.10 |
| `formal_leather_shoes` | pair | soft | Formal top + formal shoes: boost 0.05 |
| `matching_style_set` | outfit | soft | All items share one style: boost 0.05 |
| `double_clash_color` | pair | soft | Color relation `clash`: penalty 0.10 |

**Acceptance criteria:**
- Schema validator rejects rules with missing fields, unknown operators, unknown attributes, or soft values outside `[0, 0.3]`.
- Rule ids are unique (validator enforces this).

### R5.2 Condition evaluator
**Task:** `evaluate(condition, target) -> bool`. Supported operators: `eq`, `neq`, `in`, `notIn`, `contains` (list attribute contains value), `containsAny`, `onlyContains`, `gte`, `lte`. Support `all` (AND) and `any` (OR) nesting, and `not`. Attribute paths use dot notation: `item.style`, `a.category`, `b.pattern`, `context.season`, `pair.colorRelation`, `outfit.patternCount`.

**Acceptance criteria:** One test per operator plus nested `all`/`any`/`not`. Unknown path throws a clear error.

### R5.3 Item-level rules
**Task:** `applyItemRules(item, context) -> { allowed, adjustments[], messages[] }` using rules with `scope: item`.

**Acceptance criteria:** With the fixture wardrobe, formal context rejects `orange_graphic_tee` and `red_shorts`; casual context allows both.

### R5.4 Pair-level rules
**Task:** `applyPairRules(a, b, context)`. Expose derived pair fields: `pair.colorRelation` (from T1.3), `pair.bothPatterned`, `pair.sameStyle`, `pair.categories`.

**Acceptance criteria:** `purple_striped_shirt + green_floral_skirt` triggers `pattern_on_pattern`.

### R5.5 Outfit-level rules
**Task:** `applyOutfitRules(items, context)`. Expose derived outfit fields: `outfit.patternCount`, `outfit.boldPatternCount`, `outfit.styles` (set), `outfit.nonNeutralColorCount`.

**Acceptance criteria:** An outfit with graphic tee + floral skirt is rejected by `max_one_bold_pattern`.

### R5.6 Rule engine and conflict resolution
**Task:** `ruleEngine.evaluateOutfit(items, context) -> RuleResult`:
1. Run item rules on every item, pair rules on every pair, outfit rules once.
2. Any hard reject: `allowed = false`, stop and return reasons.
3. Soft adjustments: each rule applies at most once per outfit (even if multiple pairs trigger it).
4. `ruleAdjustment = clamp(sum(boosts) - sum(penalties), -0.3, +0.3)`.
5. Rules evaluated in descending `priority`; ties broken by id for determinism.
6. Rules can be disabled via `enabled: false` in config.

Also expose `ruleEngine.filterItems(items, context)` returning only items allowed by item-level hard rules (used as a pre-filter).

**Acceptance criteria:**
- Same input always produces the same output.
- Disabling a rule in config removes its effect without code changes.
- Adjustment never exceeds the +/-0.3 cap.

### R5.7 Attribute match score
**Task:** `attributeMatch(item, requested) -> { score, matched[], missed[] }` for user-requested attributes (for example `{ category: "top", color: "black", style: "casual" }`).

Per-attribute scores:

| Attribute | Exact | Partial | None |
|---|---|---|---|
| category | 1.0 | - | 0.0 |
| style | 1.0 | style matrix value (T2.1) if >= 0.7 | 0.0 |
| pattern | 1.0 | 0.5 if requested `solid` and item pattern is low-contrast `striped` | 0.0 |
| color | 1.0 same color name (S6.1) | 0.6 same hue family, 0.4 both neutral | 0.0 |
| season / occasion | 1.0 if list contains value | - | 0.0 |

Attribute weights (config): category 0.30, color 0.25, style 0.20, pattern 0.10, occasion 0.10, season 0.05. Only requested attributes count; renormalize weights over requested ones.

```
MatchScore = sum(w_k * s_k) / sum(w_k)    over requested attributes k
```

`category` is a hard filter when requested (score 0 → excluded).

**Acceptance criteria:**
- Request `{category: top, color: black, style: casual}`: `black_tshirt` scores 1.0; `navy_shirt` scores above 0.5; `black_trousers` is excluded.
- Weight renormalization tested with a single-attribute request.

Note: the color name part depends on S6.1. Implement R5.7 with a hue-family fallback first, then wire in color names after S6.1 and re-run tests.

### R5.8 Rule explanation output
**Task:** Every rule evaluation returns entries `{ ruleId, type, effect, value, message }`. Messages are merged into the existing outfit `reasons` list from T2.8.

**Acceptance criteria:** A rejected outfit includes the message of every hard rule that rejected it.

### R5.9 Rule engine test suite
**Task:** Consolidate tests. Add a config-driven test that loads every rule in `rules_config` and asserts each fires on at least one fixture case (prevents dead rules).

**Sprint 5 Definition of Done:** Rules load from config, reject invalid outfits, adjust scores within the cap, match items by attributes, and explain every decision. Sprint review written.

---

# Sprint 6: Fuzzy Search using TF-IDF and Cosine Similarity

**Sprint Goal:** Users can search their wardrobe by free text, including typos and synonyms (`"blak casul tee"` finds the black casual t-shirt), with ranked results.

**User Stories**
- As a user, I want to type a rough description and find the item even if I misspell it.
- As a user, I want words like "tee", "t-shirt", and "tshirt" to mean the same thing.
- As a developer, I want the search index to stay correct when items are added, edited, or deleted.

### S6.1 Color name mapping
**Task:** Items store `colorHex`, but users search with words. Create a palette in config (minimum 20 names: black, white, grey, navy, blue, light blue, red, maroon, pink, orange, yellow, beige, cream, brown, green, olive, purple, lavender, teal, khaki). `colorName(hex)` returns the nearest palette entry using Euclidean distance in HSV space with hue as circular (reuse `circularHueDistance`), and `colorFamily(hex)` returns a coarse group (neutral, blue, red, green, yellow, purple, brown, orange, pink).

**Acceptance criteria:** `#000000 → black`, `#1F2A44 → navy`, `#D8C8A8 → beige`, `#3B5B92 → blue`.

### S6.2 Searchable document builder
**Task:** `buildDocument(item) -> { id, fields }` with weighted fields:

| Field | Source | Field weight (repetition) |
|---|---|---|
| name | item name | 3 |
| category | category | 2 |
| color | colorName + colorFamily | 2 |
| style | style | 2 |
| pattern | pattern | 1 |
| occasions, seasons | lists joined | 1 |
| description / tags | if present | 1 |

Field weight is applied by repeating the field's tokens that many times before TF computation.

**Acceptance criteria:** Document for `black_tshirt` contains tokens for "black", "tshirt", "top", "casual", "solid".

### S6.3 Text normalization and synonyms
**Task:** `normalize(text)`: lowercase, strip accents, replace `-` and `_` with spaces, remove other punctuation, collapse spaces. Then apply a synonym map from config, applied identically to documents and queries:

```
tee, t-shirt, t shirt, tshirt -> tshirt
pants, trousers -> trousers
sneakers, trainers, kicks -> sneakers
jeans, denim -> jeans
grey, gray -> grey
formalwear, formal wear -> formal
```

Remove a small stopword list (a, an, the, for, with, and, my, some).

**Acceptance criteria:** `normalize("Grey T-Shirt for the Gym")` → `"grey tshirt gym"`.

### S6.4 Word and character n-gram tokenizer
**Task:** Two token streams per text:
- **Word tokens:** split normalized text on spaces.
- **Character n-grams:** for each word, pad as `#word#`, then produce all 3-grams (config `ngramSize = 3`). Example: `black` → `#bl, bla, lac, ack, ck#`.

Character n-grams give typo tolerance: `blak` shares `#bl, bla` with `black`.

**Acceptance criteria:** n-gram output for `black` matches the example exactly; words shorter than 3 characters still produce at least one n-gram.

### S6.5 TF-IDF vectorizer
**Task:** Build two separate vector spaces (word and char). For each:

```
tf(t, d)  = 1 + ln(count(t, d))                if count > 0, else 0      (sublinear TF)
idf(t)    = ln((1 + N) / (1 + df(t))) + 1                                  (smoothed IDF)
w(t, d)   = tf(t, d) * idf(t)
vector(d) = w(., d) / ||w(., d)||_2                                        (L2 normalized)
```

`N` = number of documents, `df(t)` = documents containing `t`. Vectors are sparse maps `{term: weight}`. Queries are vectorized with the same IDF; query terms not in the vocabulary are ignored.

**Acceptance criteria:**
- Hand-computed test on a 3-document corpus matches to 1e-6.
- Every document vector has L2 norm 1.0 (or is empty).
- A term in every document has the minimum IDF.

### S6.6 Cosine similarity
**Task:** `cosine(q, d) = sum over shared terms of q[t] * d[t]` (vectors already normalized). Iterate over the smaller vector.

```
cos(q, d) = (q · d) / (||q|| * ||d||)
```

**Acceptance criteria:** Identical vectors → 1.0; no shared terms → 0.0; symmetric.

### S6.7 Inverted index
**Task:** `index[term] -> list of (docId, weight)` for both spaces. Search only scores documents that share at least one term with the query (avoid scanning the full wardrobe).

**Acceptance criteria:** Candidate set for a query equals the union of posting lists of its terms; results match a brute-force cosine over all docs (test both).

### S6.8 Search function and ranking
**Task:** `search(query, userId, options) -> results[]`:

```
S_word = cosine(q_word, d_word)
S_char = cosine(q_char, d_char)
SearchScore = beta * S_char + (1 - beta) * S_word          (beta = 0.6, config)
```

- Drop results below `minScore` (config, default 0.15).
- Sort descending; tie-break by item id.
- Support `limit` and `offset`.
- Search scope is the user's own wardrobe (and catalog, if the project has one; confirm in the audit).
- Return `{ itemId, score, sWord, sChar, matchedTerms[] }`.

**Acceptance criteria (fixture wardrobe):**
- `"black tshirt"` → `black_tshirt` ranked first.
- `"blak tshrt"` → `black_tshirt` in top 3.
- `"white sneakrs"` → `white_sneakers` ranked first.
- `"floral skirt"` → `green_floral_skirt` ranked first.
- `"zzzz"` → empty list.

### S6.9 Incremental index updates
**Task:** Service functions `addItem`, `updateItem`, `removeItem` update the index when wardrobe items change. Because IDF depends on `N`, store raw term counts and document frequencies, and recompute IDF lazily (mark index dirty, rebuild weights on next search). Hook these into the existing item create/edit/delete flows. Build per-user indexes on first search and cache them in memory.

**Acceptance criteria:** After adding a new item, a search immediately finds it; after deleting, it never appears. Incremental result equals a full rebuild (test).

### S6.10 Fuzzy search test suite
**Task:** Create `tests/fixtures/search_queries` with at least 30 queries: exact, one-typo, two-typo, synonym, multi-attribute, and no-match, each with expected relevant item ids. Test that each passes the S6.8 criteria style checks.

**Sprint 6 Definition of Done:** Typo- and synonym-tolerant search returns ranked, explained results from an index that stays consistent with the wardrobe. Sprint review written.

---

# Sprint 7: Integration, Evaluation, Documentation

**Sprint Goal:** Both algorithms work together with the existing recommendation pipeline, are exposed in the API and UI, and are measured for the report.

**User Stories**
- As a user, I want to search "black casual top", pick a result, and immediately get outfit suggestions built around it.
- As a user, I want recommendations to respect dress rules for the occasion I choose.

### I7.1 Query attribute extraction
**Task:** `parseQuery(query) -> { attributes, freeText }`. After normalization, detect tokens matching known values of category, color names, style, pattern, occasion, season (use exact match, and fuzzy match via char-trigram cosine >= 0.7 against the attribute vocabulary so `"casul"` → `casual`). Example: `"blak casul tee"` → `{ color: black, style: casual, category: top }`. Synonym `tshirt` maps to category `top`.

**Acceptance criteria:** 10 unit tests including typos; unknown words stay in `freeText`.

### I7.2 Hybrid search ranking
**Task:** Combine text relevance and rule-based attribute matching:

```
HybridScore = gamma * SearchScore + (1 - gamma) * MatchScore      (gamma = 0.6, config)
```

- `MatchScore` from R5.7 using attributes from I7.1. If no attributes were extracted, `HybridScore = SearchScore`.
- If a category was extracted, apply it as a hard filter.
- Return per-result breakdown: `searchScore`, `matchScore`, `matched`, `missed`.

**Acceptance criteria:** `"black casual top"` ranks `black_tshirt` above `black_trousers`, and `black_trousers` is filtered out by category.

### I7.3 Rules inside outfit generation
**Task:** Integrate the rule engine into `generateOutfits` (T2.7) and final ranking (T3.7):
1. Before beam search: `ruleEngine.filterItems(wardrobe, context)` removes items failing item-level hard rules.
2. During beam expansion: drop partial outfits rejected by pair/outfit hard rules.
3. After scoring: `C_adjusted = clamp01(C + ruleAdjustment)`, then `FinalScore = alpha * C_adjusted + (1 - alpha) * P`.
4. Rule messages merged into `reasons`; output gains `ruleAdjustment` and `appliedRules[]`.
5. If the anchor item itself fails a hard rule for the context, return an empty list with the rule message (do not throw).

**Acceptance criteria:**
- No outfit returned in formal context contains a sporty item.
- Previous regression snapshot (T2.9) updated intentionally and the diff recorded in the Decision Log.

### I7.4 API endpoints
**Task:**
```
GET  /api/items/search?q=...&limit=10&offset=0
  -> { results: [{ item, hybridScore, searchScore, matchScore, matched, missed }], parsedAttributes }

POST /api/outfits/recommend        (existing, from T4.2)
  now includes ruleAdjustment and appliedRules per outfit

POST /api/items/match
  { "attributes": { "category": "top", "color": "black" }, "limit": 10 }
  -> { results: [{ item, matchScore, matched, missed }] }
```
Validate input (400 on empty query or invalid attribute values).

**Acceptance criteria:** Integration tests for success and validation errors on all three endpoints.

### I7.5 UI integration
**Task:** Only if the project has a frontend.
- Search bar with debounced (250 ms) calls to the search endpoint, showing results and detected attribute chips.
- "Build outfit" button on each result, which calls recommend with that item as anchor.
- Outfit cards show rule messages (rejections are never shown, only applied boosts/penalties).

**Acceptance criteria:** Manual check: typing `"blak casul tee"` shows the black t-shirt and chips `black`, `casual`, `top`.

### I7.6 Evaluation script and metrics
**Task:** `scripts/evaluate_rules_and_search` writes `docs/algorithms/EVALUATION_RULES_SEARCH.md` with:
1. **Search Precision@5, Recall@10, and MRR** over the S6.10 query set, grouped by query type (exact, typo, synonym, multi-attribute).
2. **Ablation:** word-only TF-IDF vs char-only vs combined (beta sweep 0.0, 0.3, 0.6, 1.0) vs hybrid with attribute matching (gamma sweep).
3. **Rule impact:** percentage of candidate outfits rejected per rule, and Precision@5 on the labeled outfits set (from T4.4) with rules on vs off.
4. **Latency:** mean and p95 search time.

**Acceptance criteria:** One-command run; combined char+word beats word-only on the typo query group; rules-on Precision@5 is greater than or equal to rules-off.

### I7.7 Performance check
**Task:** Benchmark with a synthetic wardrobe of 1,000 items.

**Acceptance criteria:** Search under 50 ms, full index build under 500 ms, outfit recommendation with rules under 200 ms. If slower, cache per-user indexes and precompute derived item fields (color name, family, HSV).

### I7.8 Algorithm documentation
**Task:** Add two sections to `docs/ALGORITHMS.md`:
- **Rule-Based Attribute Matching:** rule schema, operators, hard vs soft rules, conflict resolution, adjustment cap, MatchScore formula, worked example.
- **Fuzzy Search (TF-IDF + Cosine):** normalization, synonyms, word and char n-grams, TF/IDF/L2 formulas, cosine formula, inverted index, hybrid formula, worked numeric example for the query `"blak tee"`, complexity, limitations (no semantic understanding beyond synonyms).

Include a diagram of the full pipeline:
```
Query → normalize → parse attributes → TF-IDF search → hybrid rank → user picks anchor
      → rule pre-filter → beam search with color + compatibility → rule adjustments
      → personalization → final ranking → top outfits with reasons
```

**Acceptance criteria:** Every formula matches code and config values.

**Sprint 7 Definition of Done:** Search, rule matching, and outfit recommendation run end to end, are tested, measured, and documented. Sprint review written.

---

## Global Definition of Done

- All tickets `DONE` in the Progress Tracker.
- Full test suite passes, including previous plan's tests.
- Rules, synonyms, color palette, and all weights live in config only.
- Every API result includes a score breakdown that explains its ranking.
- `docs/ALGORITHMS.md`, `docs/algorithms/EVALUATION_RULES_SEARCH.md`, and `docs/algorithms/SPRINT_REVIEWS.md` are current.

---

## Decision Log

| Ticket | Decision | Reason |
|---|---|---|
| R5.1 | Prerequisites T0.2, T0.3, T0.4, T2.7 confirmed DONE in ALGORITHMS_SPRINT_README.md before starting. | Instruction 2. |
| R5.1 | Rules config is a JS module `server/src/config/rulesConfig.js` (raw object validated at import by `loadRulesConfig` and deep-frozen), not a JSON/YAML file. The validator lives in `server/src/recommendation/rules/ruleSchema.js`. | Mirrors the existing `scoringConfig.js` + `loadScoringConfig.js` split (T0.3), so the validator is testable against broken configs and consumers always get a validated, tamper-proof object. |
| R5.1 | Condition syntax: an object whose keys are either attribute paths (`"item.style": { in: [...] }`, several keys = AND) or the logical keys `all`, `any`, `not`. The set of known paths is fixed per root (`item`/`a`/`b` item fields, `context.occasion\|season`, derived `pair.*`, derived `outfit.*`) and each scope may only reference its own roots; `when` may only reference `context`. | Gives the validator a closed vocabulary so it can reject unknown attributes (acceptance criterion) and catches rules that reference data their scope never provides. |
| R5.1 | Added two derived outfit fields beyond the README's list: `outfit.styleCount` and `outfit.itemCount` (plus `outfit.categories`). `matching_style_set` is expressed as `outfit.styleCount eq 1`. | "All items share one style" cannot be written with the listed operators against a set of unknown value; a count is the simplest expression. |
| R5.1 | `formal_leather_shoes` is written as an `any` of both orderings (formal top + formal shoes, or formal shoes + formal top). | Pair rules see an ordered (a, b) pair, and the rule must fire regardless of which item comes first. |
| R5.1 | `adjustmentCap` (0.3, R5.6) and `maxSoftValue` (0.3) live in the same config alongside the rules. | Instruction 6: every threshold in config. |
| R5.1 | Full suite baseline before Sprint 5: the existing T4.5 timing test (`runPerformanceBenchmark` max < 200 ms) failed once when all 37 files ran in parallel, and passes in isolation and on re-run. Not modified. | CPU contention between parallel vitest workers, not a regression; recorded so a future flaky run is not mistaken for a Sprint 5 break. |
| R5.2 | Operator semantics: `contains`/`containsAny`/`onlyContains` are false when the attribute is not a list; `onlyContains` is false for an empty list; `gte`/`lte` are false for non-numbers; a Set (e.g. `outfit.styles`) is treated as a list. | Makes list rules safe against missing data (an item with no seasons is never treated as "summer-only"). |
| R5.2 | An unknown path throws; so does a known path whose root (e.g. `pair`) is missing from the evaluation target. A known path whose value is simply undefined (e.g. `context.occasion` when no occasion was requested) evaluates normally, so `eq` is false. | Separates configuration bugs (throw loudly) from legitimately absent request context (rule just does not fire). |
| R5.3 | Rules read `context.occasion`/`context.season`; `buildRuleContext` maps the recommender's existing `targetOccasion`/`targetSeason` (T2.3) onto them. Unlike T2.3's season score, rules never derive the current season from the date: season-gated rules only fire when a season was explicitly requested. | A winter-only coat silently disappearing from results in summer, without the user asking for a season, would be surprising; hard rejections should follow explicit user intent. |
| R5.3 | All rule-engine entry points take an optional `rules` argument defaulting to `rulesConfig.rules`. | Lets tests exercise a disabled or modified rule (R5.6 acceptance) while production code still reads config only. |
| R5.3 | Item-rule results already return full explanation entries `{ ruleId, type, effect, value, message }` (the R5.8 shape) in `entries`, alongside `allowed`, `adjustments`, and `messages`. | One entry shape from the start avoids reworking every scope when R5.8 lands. |
| R5.4 | `pair.colorRelation` reuses T1.3's `classifyHueRelation`; `pair.bothPatterned` = both patterns are not `solid`; `pair.categories` = `[a.category, b.category]` in pair order. | Instruction 5: reuse existing modules rather than re-deriving color relations. |
| R5.4 | ~~No fixture pair has the `clash` color relation, so the `double_clash_color` test builds one from fixture copies.~~ **Corrected in I7.6:** that was wrong - the fixture has 8 clashing pairs (e.g. `red_shorts` + `purple_striped_shirt`). The test now uses that real pair. | The original claim was not checked against the whole wardrobe; the I7.6 rule-impact numbers exposed it. |
| R5.5 | The set of "bold" patterns (`graphic`, `floral`, `checked`) counted by `outfit.boldPatternCount` is config (`rulesConfig.boldPatterns`, validated against the pattern enum), not a constant in the engine. `striped` counts toward `patternCount` but is not bold. | Instruction 6: definitions used by rules live in config. Matches the README's wording for `max_one_bold_pattern`. |
| R5.5 | `outfit.nonNeutralColorCount` reuses T1.2's `isNeutral`, so `isNeutralOverride` items (navy, denim) count as neutral. | Instruction 5: reuse existing modules; keeps rule neutrality consistent with color-harmony neutrality. |
| R5.6 | `evaluateOutfit` always runs every scope (it does not short-circuit after the first hard reject) and returns every hard rule that fired. When rejected, `ruleAdjustment` is 0 and `appliedRules` lists only the rejections. | R5.8 requires a rejected outfit to carry the message of *every* hard rule that rejected it; with at most ~4 items the extra evaluations cost microseconds. |
| R5.6 | Entries are merged per rule id: a rule that fires on several items/pairs appears once, with an extra `itemIds` field listing every item that triggered it. This is how "each soft rule applies at most once per outfit" is enforced. | Deduplicating by rule id is exactly the README's constraint; `itemIds` keeps the explanation useful (which pieces caused it) at no cost. |
| R5.6 | Result shape: `{ allowed, ruleAdjustment, appliedRules[], rejections[], messages[] }`. Entries across all scopes are sorted by descending priority, then id. | One deterministic ordering regardless of config order (tested by evaluating with the rules list reversed). |
| R5.6 | `filterItems` applies item-level *hard* rules only; item-level soft rules (none exist yet) never remove items. | The README defines it as a pre-filter on hard rules. |
| R5.7 | Attribute-match weights and partial-credit tables live in `rulesConfig.attributeMatch` (weights validated: all six keys present, positive, sum to 1.0). | Instruction 6. |
| R5.7 | Color scoring was first implemented with the README's hue-family fallback: the requested color name is converted to hex with the existing T0.2 `deriveColorHex` table; exact = same hex, same family = both non-neutral and within `hueFamilyMaxDistance` (30 degrees), both neutral = 0.4. To be replaced by S6.1 color names. | The README says to implement the fallback first and wire in color names after S6.1; reusing `deriveColorHex` avoids a second name table. |
| R5.7 | "Same hue family" (0.6) only applies between non-neutral colors; two neutrals always get the "both neutral" score (0.4). | Otherwise the 0.4 tier could never be reached (neutrals would always share a family). |
| R5.7 | Items have no contrast attribute, so the pattern partial "requested `solid`, item low-contrast `striped`" gives 0.5 to every `striped` item (`patternPartial: { solid: { striped: 0.5 } }` in config). | Simplest reading given the data model; recorded because it is more generous than the README intends for high-contrast stripes. |
| R5.7 | `attributeMatch` returns `{ score, matched[], missed[], scores, excluded }`: `matched` = requested attributes with any credit (exact or partial), `missed` = those scoring 0, `scores` = per-attribute s_k, `excluded` = category miss. Added `matchItems(items, requested)` which drops excluded/zero-score items and sorts by score then id. | `scores` makes the ranking explainable (global DoD); `matchItems` is what I7.4's /api/items/match needs. |
| R5.8 | Rule messages are appended after T2.8's compatibility reasons (deduplicated), via `mergeRuleExplanation(explanation, ruleResult)` in `rules/ruleExplanation.js`; the merged object also gains `allowed`, `ruleAdjustment`, and `appliedRules`. `explainOutfit` (T2.8) itself is unchanged. | Additive, so every existing T2.8 caller and snapshot keeps its exact output; I7.3 opts in where rules apply. |
| R5.8 | Hard-rule entries report `value: null`; soft entries report their configured value. | Keeps the `{ ruleId, type, effect, value, message }` shape uniform across rule types. |
| R5.9 | Added `tests/recommendation/fixtures/ruleFixtures.js` with one item (`linen_summer_top`, summer-only) used only by the rule suite. The T0.4 wardrobe is unchanged. (Originally also `lime_shorts` for a clashing pair; removed in I7.6 once it turned out the wardrobe already has clashing pairs.) | The T0.4 wardrobe has no summer-only item, so `winter_no_summer_only` could never fire on it; editing the shared wardrobe would shift earlier sprints' snapshot tests. |
| R5.9 | The dead-rule check searches every scope-appropriate fixture case (each item, each pair, each top/bottom/shoes and dress/shoes outfit) under every context (none, each occasion, each season), evaluating one rule at a time. A self-test confirms it reports a deliberately impossible rule as dead. | Evaluating each rule in isolation means a rule cannot "pass" only because another rule fired. |
| R5.9 | Added a module-isolation guard: no file in `src/recommendation/rules/` may import models, services, or mongoose. | Enforces instruction 7 (pure functions) the same way T1.7/T2.9 do for earlier sprints. |
| S6.1 | Search config is `server/src/config/searchConfig.js`, validated at import by `config/loadSearchConfig.js` (palette: at least 20 entries, lowercase unique names, valid hex, known family). Palette has 21 entries: the README's 20 plus `silver`, with each entry's family set explicitly in config. | Same config pattern as T0.3/R5.1. `silver` was added because the fixture's silver necklace (#C0C0C0) sits exactly between grey and white. |
| S6.1 | HSV distance scales the hue term by the lower of the two saturations: `dH = circularHueDistance/180 * min(s1, s2)`, `d = sqrt(dH^2 + dS^2 + dV^2)`. Ties keep the earlier palette entry. Results are cached per hex. | Hue is undefined for greys (#000000 and #FF0000 both have h = 0), so an unscaled hue term makes near-greys snap to arbitrary hues. The README's "Euclidean in HSV with circular hue" is kept; only the hue axis is weighted. |
| S6.1 | Navy's family is `blue` (search for "blue" should find navy), while R5.7's "both neutral" check still treats navy items as neutral when they carry `isNeutralOverride` (T1.2). | Keeps the search and the fashion-neutral semantics both correct. |
| S6.1 | R5.7 re-wired as the README planned: color exact = same `colorName`, same family = same non-neutral `colorFamily` (0.6), both neutral = neutral request + item neutral by family or `isNeutral` (0.4). Unknown requested color names now throw. The hue-family fallback and its `hueFamilyMaxDistance` config key were removed. R5.7 and R5.9 tests re-run and pass. | `checked_flannel_shirt` (#8B3A3A) is named `brown`, not `red`, so the two tests that used it as a red-family example were changed to `red_shorts` vs `maroon` and to a `blue` request (navy ranks first). |
| S6.2 | `mapProductToItem` now also copies `name` and `description` onto the algorithm item when present (non-empty). Scoring code ignores them, and untagged records keep the old shape. | The adapter previously dropped all text, so real products would be unsearchable; copying only when present keeps every existing adapter test and snapshot unchanged. |
| S6.2 | Items without a `name` (the T0.4 fixtures) use their id as the name field (e.g. `black_tshirt`, which S6.3 normalizes to `black tshirt`). | Fixture ids are already descriptive, and adding names to the shared fixture would touch earlier sprints' data. |
| S6.2 | `buildDocument(item)` returns `{ id, fields: [{ field, text, weight }] }` with raw text, and `documentText(doc)` produces the weighted string (each field repeated `weight` times). Field weights are in `searchConfig.fieldWeights` and must be positive integers. `occasions` and `seasons` are separate fields, each weight 1. | Keeps normalization (S6.3) and tokenization (S6.4) as separate, testable steps; repetition is the README's weighting method, so weights must be whole numbers. |
| S6.2 | The color field is `colorName + colorFamily` (e.g. `navy blue`, `black neutral`). | README field table; the family word lets "blue" match navy items. |
| S6.3 | Apostrophes are removed ("men's" -> "mens"), but other punctuation is replaced by a space rather than deleted ("black/white" -> "black white"). | Deleting a slash or comma would glue two words into one unsearchable token; the README example is unaffected. |
| S6.3 | Synonyms are stored as canonical -> variants in `searchConfig.synonyms`, cleaned with the same steps as the text, and matched on whole tokens, longest phrase first (so "t shirt" becomes `tshirt` before "t" could match anything). Validator: canonical terms are single lowercase words and no variant may map to two canonicals. | Phrase matching is needed for "t shirt" and "formal wear"; whole-token matching prevents "tee" from rewriting "teeth". |
| S6.3 | Order is clean -> synonyms -> stopwords. | Stopword removal must not break a multi-word synonym phrase; none of the current phrases contain a stopword, but the order keeps that safe. |
| S6.3 | Only the README's synonym list is configured (no plurals such as "tees" or "pant"). | Character n-grams (S6.4) already give partial credit for plural/singular forms; more synonyms can be added in config without code changes. |
| S6.4 | N-grams are generated per word (padding each word separately), never across word boundaries, and duplicates are kept so term frequency counts them. `ngramSize` lives in config (integer >= 2). | Per-word padding is the README's definition; cross-word grams would add noise tied to word order. |
| S6.4 | With n = 3 every word already yields at least one n-gram ("#m#"); for larger n, a padded word shorter than n is kept whole as a single gram. | Satisfies the "words shorter than 3 characters still produce at least one n-gram" criterion for any configured size. |
| S6.5 | Vectors are JS `Map`s (term -> weight) rather than plain objects. | Terms are arbitrary strings (char n-grams like `#to`), and Maps avoid prototype-key collisions and are faster to iterate. |
| S6.5 | A "vector space" stores raw per-document term counts and document frequencies, and derives IDF and normalized vectors lazily (`dirty` flag, `refreshWeights`). Built once per token stream (words, char n-grams). | S6.9 requires raw counts + df with lazy IDF recomputation; building the storage that way from the start avoids a rewrite. |
| S6.5 | The hand-computed test values were computed independently in Python from the README formulas, not by running the JS implementation. | A test whose expected numbers come from the code under test would not catch a formula mistake. |
| S6.6 | `cosine(q, d)` is the sparse dot product over the smaller vector (both vectors are already L2 normalized, so the norms in the textbook formula are 1), clamped to [0, 1]. | TF-IDF weights are never negative, so values outside [0, 1] can only be rounding error; clamping keeps every score in range (instruction 6). |
| S6.7 | Search scores through the index term-at-a-time (accumulating q[t] * w(t, d) along each query term's posting list), which equals the cosine for normalized vectors. Postings are cached on the vector space and rebuilt only when the space's `version` changes (bumped by every weight refresh). | Only documents sharing a term are touched; the version check keeps the cache correct under S6.9's incremental updates without explicit invalidation calls. |
| S6.7 | Equivalence with brute force is tested on 8 queries (exact, typo, synonym, no-match, empty) in both spaces, to 1e-12. | Acceptance criterion: index results must equal a full cosine scan. |
| S6.7 | The pre-existing T4.5 timing test failed once more under parallel load during this ticket's full run, then passed on an immediate re-run and in isolation (559/559). | Same flakiness recorded at R5.1; unrelated to search code. |
| S6.8 | The pure search is `searchIndex(index, query, { limit, offset, beta, minScore })` in `search/searchIndex.js`, over an index built by `createSearchIndex(items)`. The README's `search(query, userId, options)` signature is provided by the service layer in S6.9, which loads data and caches indexes. | Instruction 7: search functions stay pure; data loading happens in services. |
| S6.8 | Search scope: this project is a marketplace with no per-user wardrobe, so the searchable set is the storefront catalog (available products from approved sellers, the same set the recommender uses). `userId` does not narrow the scope. | The README asks to confirm scope against the audit; AUDIT.md shows no wardrobe model, only the Product catalog. |
| S6.8 | `matchedTerms` lists, for each query word, the document term it matched: the word itself if present, otherwise the closest document word by char n-gram cosine (`fuzzyMatch.js`) at or above `matchedTermMinSimilarity` = 0.4. So "blak casul tee" reports `black`, `casual`, `tshirt`. | Explains typo matches, not just exact ones. 0.4 is needed because short one-letter typos score around 0.45 ("blak" vs "black" = 2 shared grams / sqrt(4*5)). |
| S6.8 | `beta` (0.6), `minScore` (0.15), `defaultLimit` (10) and `matchedTermMinSimilarity` (0.4) are validated config values. `rankAll` (all results above minScore, before paging) is exported for I7.2's re-ranking. | Instruction 6; hybrid ranking must re-rank the full list, not one page. |
| S6.8 | Fixture results: "black tshirt" -> black_tshirt 0.81; "blak tshrt" -> black_tshirt only result (0.33); "white sneakrs" -> white_sneakers 0.70 over white_shirt 0.54; "floral skirt" -> green_floral_skirt 0.65; "zzzz" -> []. | Recorded for the report. |
| S6.9 | One shared catalog index instead of per-user indexes: `services/searchService.js` builds it from `getStorefrontProducts()` on the first search and caches it in memory. Concurrent first searches share one build; changes arriving mid-build are queued and replayed on the new index. | Every shopper searches the same catalog (see S6.8 scope decision), so per-user indexes would be identical copies. The README's "build on first search and cache" behavior is kept. |
| S6.9 | Hooks: seller create (`addItem`), seller edit (`updateItem`), seller delete and admin delete (`removeItem`) in `productController.js`. `addItem`/`updateItem` remove the item instead when it is no longer on the storefront (unavailable, or seller not approved). Seller approve/reject in `adminController.js` calls `invalidateSearchIndex()`, so the next search rebuilds. | Approval changes can move many products in or out of the storefront at once; a rebuild is simpler and safer than tracking them individually. |
| S6.9 | Index updates are awaited but wrapped in `syncSearchIndex`, which never fails the HTTP request; if an incremental update throws, the cache is invalidated so the next search rebuilds a correct index from the DB. | A search-index problem must not block a seller from saving a product, and the fallback keeps the index correct. |
| S6.9 | The storefront query (`available` + approved seller) moved from `recommendationService.js` into `productService.getStorefrontProducts()`, used by both the recommender and search; added `isStorefrontProduct(product)`. | Instruction 5: one definition of "visible product" instead of two copies. Recommender behavior is unchanged (its tests pass). |
| S6.9 | The service's `search(query, userId, options)` returns the pure results plus the indexed `item` for each. | I7.4 needs the item to build the API response. |
| S6.9 | Running the full suite rewrites `docs/algorithms/EVALUATION.md` (the existing `evaluateRecommender` test runs `npm run evaluate`), changing only its timestamp, Monte Carlo baseline, and latency figures. | Pre-existing behavior noted so the diff is not mistaken for a change made by this sprint. |
| S6.10 | `tests/fixtures/search_queries.js` has 41 queries: 12 exact, 7 one-typo, 5 two-typo, 7 synonym, 7 multi-attribute, 3 no-match. Relevance was judged by reading each query against the fixture item descriptions, not by copying search output. The same file feeds I7.6's metrics. | Avoids a circular evaluation; the README asks for at least 30 across these types. |
| S6.10 | Checks per type: exact/synonym/multi-attribute must rank a relevant item first (and a multi-relevant query must rank all its relevant items at the top); typo queries must put a relevant item in the top 3; no-match must return []. All 41 pass on the first run, with no tuning of weights to fit them. | Mirrors the S6.8 acceptance style. Two-typo queries pass with lower absolute scores (about 0.31-0.36 vs 0.7-0.8 for exact), which I7.6 will quantify. |
| S6.10 | Module-isolation guard for `src/recommendation/search/`: no models/services imports, and only relative imports at all (so no external search or ML library). | Enforces instructions 7 and 8 mechanically. |
| I7.1 | Fuzzy attribute matching uses char **bigrams** (`queryParsing.ngramSize = 2`), not trigrams, with the README's threshold of 0.7 kept. | With padded trigrams, the README's own example cannot pass: cosine("casul", "casual") = 3/sqrt(30) = 0.548 < 0.7. With bigrams it is 5/sqrt(42) = 0.772, and "blak" -> "black" is 0.730. The threshold stays at 0.7 so the matcher remains strict; only the gram size changed. Search itself (S6.4/S6.8) still uses trigrams. |
| I7.1 | Known limitation: swapped letters score low with n-grams ("purpel" vs "purple" = 0.571), so they are not turned into attributes. Such words stay in free text and are still found by the TF-IDF search. Covered by a test. | Recorded honestly rather than lowering the threshold, which would create false attribute matches. |
| I7.1 | Vocabulary = the enum values of each attribute, the S6.1 palette names, and configured aliases (`queryParsing.aliases`, e.g. tshirt/shirt/hoodie -> top, jacket/coat -> outerwear, plaid -> checked, fall -> autumn), validated against the enums. Two-word values (`light blue`, `smart casual`) are matched as phrases before single words. Fuzzy matching is skipped for words shorter than 3 letters. | Instruction 6 (vocabulary in config); "tshirt -> top" is the README's own example of a synonym mapping to a category. |
| I7.1 | Conflicts: a word that is both a style and an occasion (`casual`, `formal`) becomes the style (attribute order category, color, style, pattern, occasion, season). For category, the *last* category word wins and earlier ones go to free text ("denim jacket" -> outerwear); for every other attribute the first value wins. A second word naming the same value ("oxfords shoes") still counts as matched. | In English the last noun is the head of the phrase; picking the first would turn "denim jacket" into a bottom and I7.2's hard category filter would hide the jacket. |
| I7.1 | `parseQuery` also returns `matches[]` (`{ token, attribute, value, similarity }`) alongside `attributes` and `freeText`. | Lets the API and UI show why each attribute chip appeared. |
| I7.2 | Candidates are every item with any text match (S6.8 `rankAll` with minScore 0); the hybrid score is computed for each and `minScore` (0.15) is applied to the *hybrid* score, then results are sorted (ties by id) and paged. | Applying minScore to the text score first would drop items with a weak text match but a strong attribute match, which is the case hybrid ranking exists for. Items with no text match at all are not considered, so search still requires some textual relevance. |
| I7.2 | `gamma` = 0.6 lives in `searchConfig` (validated to [0, 1]). With no parsed attributes, `hybridScore = searchScore` and `matchScore` is `null` (not 0), so the UI can tell "not applicable" from "no match". | Instruction 6; clearer breakdown. |
| I7.2 | Response shape: `{ results: [{ itemId, hybridScore, searchScore, matchScore, matched, missed, sWord, sChar, matchedTerms }], parsedAttributes, total }`, where `total` is the count before paging. | The README's breakdown plus S6.8's explanation fields; `total` lets the API/UI page. |
| I7.2 | Fixture check: "black casual top" -> black_tshirt 0.83 first; black_trousers matches the text but is removed by the category filter. | Acceptance criterion, recorded for the report. |
| I7.3 | `generateOutfits` now: returns [] if the anchor fails an item hard rule; pre-filters the wardrobe with `filterItems`; drops anchor pairs rejected by hard rules before they enter the beam; skips complete outfits rejected by hard rules; ranks complete outfits (including the accessory step) by `C_adjusted = clamp01(C + ruleAdjustment)`. Entries gain `baseScore` (raw C), `ruleAdjustment`, `appliedRules`; `score` is C_adjusted. An optional 5th argument `{ rules }` selects the rule list (`[]` = rules off). | Follows the README's steps 1-3; using C_adjusted in the beam and accessory comparison keeps ranking consistent with the final score. The `rules` option gives I7.6 its rules-on vs rules-off comparison. |
| I7.3 | Final ranker: `FinalScore = alpha * C_adjusted + (1 - alpha) * P`; the `minCompatibility` floor applies to C_adjusted. Output keeps T2.8's `compatibilityScore` (raw) and adds `adjustedCompatibilityScore`, `ruleAdjustment`, `appliedRules`; rule messages are merged into `reasons` via R5.8's `mergeRuleExplanation`. | Raw compatibility keeps T2.8's breakdown/recombination meaning; the adjusted score is shown alongside, so nothing is overwritten. |
| I7.3 | Anchor rejection: `getOutfitRecommendations` now returns `{ outfits, ruleMessages }`; if the anchor fails a hard rule it returns `outfits: []` with the rule messages, and `POST /api/outfits/recommend` responds 200 `{ outfits: [], ruleMessages }`. The four service-test call sites were updated to destructure. | README step 5: return an empty list with the rule message, do not throw. |
| I7.3 | Regression snapshot (T2.9) updated intentionally. Diff for black_tshirt top-5 (casual): #1 black_tshirt+blue_jeans+white_sneakers 0.97081 -> 1.0 (matching_style_set +0.05, clamped); black_tshirt+green_floral_skirt+white_sneakers moves #3 -> #2, 0.92148 -> 0.97148 (matching_style_set); beige_chinos+leather_belt outfit moves #2 -> #3 (unchanged 0.92620); #4 and #5 unchanged. The old snapshot is kept as a new test and is reproduced exactly with `{ rules: [] }`. | README acceptance criterion: update the snapshot on purpose and record the diff. The rules-off check proves the refactor itself changed nothing. |
| I7.3 | Two existing assertions were changed on purpose: "at alpha 1.0, finalScore equals compatibilityScore" now compares with `adjustedCompatibilityScore` (finalRanker test and recommendationService test). | Direct consequence of the README's new FinalScore formula. |
| I7.3 | Performance fix: the first version added ~110 ms per 500-item request (132 ms vs 23 ms without rules) and broke the T4.5 200 ms benchmark. Added `createRuleCache()` (per-request memo of item- and pair-rule results by id, passed to `evaluateOutfit`) and cached the sorted active-rule lists and rule priorities per rules array (WeakMap). Rule overhead is now ~20 ms; the T4.5 benchmark runs at mean 36 ms / max 53 ms in isolation (was 47 / 77 before rules), and the full suite passed twice in a row. | Beam search re-checks the same items and pairs in many candidate outfits; memoizing them gives identical results (the cache is only reused within one context + rules list). |
| I7.4 | New router `routes/itemSearchRoutes.js` mounted at `/api/items` with `GET /search` and `POST /match` (controller `itemSearchController.js`, validators `validators/itemSearchValidator.js`). Both are public (`optionalAuth`), like product browsing. | Same layering as T4.2's recommend endpoint; search is part of the public storefront. |
| I7.4 | Responses: search returns `{ results: [{ item, hybridScore, searchScore, matchScore, matched, missed, matchedTerms }], parsedAttributes, total }`; match returns `{ results: [{ item, matchScore, matched, missed }] }`. `item` = display fields (`_id`, `name`, `image`, `price` (discounted `finalPrice`), `originalPrice`, `store`, `category`, `colors`) plus the attributes the ranking used (`outfitCategory`, `colorName`, `style`, `pattern`, `seasons`, `occasions`). | README contract plus `matchedTerms`/`total` for explanation and paging; the client needs image/price to render results, and the attributes explain the score. |
| I7.4 | To serve display fields without a DB round-trip, each indexed item carries a `product` summary alongside the algorithm fields. The algorithms ignore it. | Keeps search a single in-memory lookup. |
| I7.4 | Validation (400): search needs a non-empty `q` (max 200 chars), `limit` 1-100, `offset` >= 0 (query-string integers parsed strictly: "1.5", "-1", "abc" are rejected). Match needs a non-empty `attributes` object whose keys are known attributes and whose values are valid enum values or palette color names; `limit` 1-100. A stopword-only query (e.g. "the") is valid and returns 200 with no results. | README: 400 on empty query or invalid attribute values; the upper limit prevents unbounded responses. |
| I7.4 | `POST /api/outfits/recommend` now returns `{ outfits, ruleMessages }` with `ruleAdjustment`, `appliedRules` and `adjustedCompatibilityScore` per outfit (from I7.3); its integration tests assert these fields and the rejected-anchor case. | README I7.4 contract for the existing endpoint. |
| I7.5 | The UI lives on the existing site search page (`/search`, reached from the navbar search box) instead of the Outfit Builder page. It keeps the old "browse all products" view when the query is empty. | The user asked earlier in this session to remove the suggested-outfits section from the Outfit Builder page, and the search page is where a search bar belongs. The Outfit Builder page is unchanged. |
| I7.5 | Search box with a 250 ms debounce, which also cancels the previous request (AbortController) so results never arrive out of order. The URL `?q=` stays in sync. Detected-attribute chips come from `parsedAttributes`. Each result shows its hybrid match %, price, which attributes it matched, and a "Build outfit" button. The button is disabled for accessories/outerwear, which can't anchor an outfit (T2.7). | README I7.5 requirements; disabling rather than hiding keeps the grid consistent and explains why. |
| I7.5 | "Build outfit" calls `POST /api/outfits/recommend` with the result as anchor (passing any occasion/season detected in the query). Outfit cards show applied boosts/penalties with their value, then the remaining compatibility reasons. If the anchor breaks a rule, the rule message is shown instead of cards. | Rejected outfits are never returned by the API, so only boosts/penalties can appear, as the README requires. |
| I7.5 | Manual check done in a real browser (headless Chrome driven by playwright-core installed in a scratch folder, not the project), against the real Express app on an in-memory MongoDB seeded with 10 products, never Atlas. Typing "blak casul tee" showed Black Cotton T-Shirt first with chips Color: black, Style: casual, Category: top. 14 keystrokes produced 1 search request. "Build outfit" showed 4 outfits with the matching_style_set +5% boost. The belt's button was disabled. Found and fixed one layout bug: a tall photo stretched its card. | Acceptance criterion is a manual check; recorded how it was done. |
| I7.5 | Pre-existing, not changed: at phone width (390 px) the site-wide navbar search box overflows horizontally on every page (also /new-arrivals, /outfit-builder). | Outside this ticket's scope; reported to the user. |
| I7.6 | `server/src/scripts/evaluateRulesAndSearch.js`, run with `npm run evaluate:rules-search` (one command, no DB), writes `docs/algorithms/EVALUATION_RULES_SEARCH.md`. Its test writes the report to a temp directory instead of `docs/`. | The existing T4.4 test rewrites EVALUATION.md on every test run (timestamps/timings churn in git); the new test avoids that. |
| I7.6 | Metrics use standard definitions: P@5 = relevant in top 5 / 5 (so a one-relevant-item query tops out at 0.2; the report shows the best achievable value next to it), R@10, and MRR. Query groups: exact, typo (one- and two-typo together), synonym, multi-attribute; no-match queries are reported as the share that correctly returned nothing. | Standard, explainable metrics; showing the ceiling stops a reader misreading P@5 = 0.2 as poor. |
| I7.6 | Rule impact: all 111 valid top+bottom+shoes and dress+shoes fixture outfits x 10 contexts (none, 5 occasions, 4 seasons) = 1,110 evaluations. Labeled-outfit Precision@5 with rules on drops rejected outfits and ranks the rest by C_adjusted. | README section 3; mirrors T4.4's labeled-outfit Precision@5. |
| I7.6 | Results: hybrid search MRR 1.000 on every group; combined (beta 0.6) vs word-only on typos MRR 1.000 vs 0.521 (acceptance met); rules-on P@5 100% = rules-off 100% (acceptance met); rules reject 1 of 14 bad and 0 of 18 good labeled outfits; 14.2% of candidate outfit evaluations are rejected; mean search latency ~0.2 ms. | Recorded for the report. |
| I7.6 | Findings reported rather than hidden: (1) the gamma sweep shows no difference because text search already reaches MRR 1.0 on this query set (ceiling effect); (2) the query "denim" is parsed as category bottom, so `denim_jacket` is filtered out (synonym R@10 0.929), a real limitation of the category hard filter on material words; (3) the season-only rules never fire on the fixture outfits (no single-season top/bottom/shoes/dress). | An honest evaluation for the university report. |
| I7.6 | Correction found by this ticket: R5.4/R5.9 claimed the T0.4 wardrobe had no clashing color pair. It has 8 (e.g. red_shorts + purple_striped_shirt). The pair-rule test now uses that real pair, the unneeded `lime_shorts` rule fixture was removed, and the R5.4/R5.9 log entries and the Sprint 5 review were corrected in place, with strike-through or a note. | The earlier claim was never checked against the full wardrobe. |
| I7.6 | Added `server/vitest.config.js` with two projects run in sequence: "unit" (everything except `tests/scripts`, fully parallel) then "benchmarks" (`tests/scripts`, one file at a time). The T4.5 200 ms test itself is unchanged. | With the new integration tests (each starting an in-memory MongoDB) and CPU-heavy evaluation tests, the wall-clock T4.5 test failed repeatedly under parallel load (2.2 s) while taking ~50 ms in isolation. Running timing checks after the parallel group made the full suite pass 3 times in a row (731/731) with no tests dropped. |
| I7.7 | Benchmark: `server/src/scripts/benchmarkRulesAndSearch.js` on 1,000 items from the existing T4.5 synthetic generator, with names added inside the benchmark (color name + style + a garment word, derived deterministically) so search has realistic text. The T4.5 generator and its data are unchanged. Timings are taken after a warm-up; the index-build time includes the first IDF/vector/postings computation (which is lazy). | Synthetic items have no names, and search works mostly on names; leaving the shared generator untouched keeps T4.5 comparable. |
| I7.7 | Results (max): index build ~81-135 ms (< 500), one hybrid search ~6-21 ms (< 50), recommendation with rules ~78-98 ms (< 200). All targets met; enforced by `tests/scripts/benchmarkRulesAndSearch.test.js` in the sequential benchmarks group, and reported in section 5 of EVALUATION_RULES_SEARCH.md. | Acceptance criteria; ranges cover the runs made during this ticket. |
| I7.7 | Optimization: hybrid search computed the `matchedTerms` explanation (fuzzy word matching) for every text candidate, including ones never returned. `rankAll` gained `explain: false`, and `hybridSearch` now explains only the returned page. Mean search time on 1,000 items fell from 11.2 ms to 2.8 ms; responses are unchanged. | Targets were already met, but it was the dominant search cost and the change is small and output-preserving. |
| I7.7 | The README's fallback optimizations (cache per-user indexes, precompute color name/family/HSV) were already in place: one cached catalog index (S6.9), cached color names (S6.1), cached HSV (T1.1), plus rule memoization (I7.3). | Recorded so the report can list them. |
| I7.8 | Added Section 4 (Rule-Based Attribute Matching), Section 5 (Fuzzy Search) and a "Full pipeline" diagram to `docs/ALGORITHMS.md`, each section with the same Purpose/Inputs/Outputs/Formulas/Config/Worked example/Complexity/Limitations structure as Sections 1-3. The diagram is plain text, so it renders in any Markdown viewer and in the printed report. | README I7.8 content list; consistency with the existing document. |
| I7.8 | Sections 2 and 3 were updated where Sprint 7 changed them: `generateOutfits` output and rule steps, and `FinalScore = alpha * C_adjusted + (1 - alpha) * P` with the minCompatibility floor on C_adjusted. The intro now lists five algorithms and "See also" links the new evaluation and sprint reviews. | "Every formula matches code": leaving the old FinalScore formula would have made the doc wrong. |
| I7.8 | New `tests/docs/rulesSearchDoc.test.js` (same approach as T4.6's doc test) re-derives every number in the Section 4/5 worked examples from live code ("blak tee": idf 2.9924, S_word 0.5778, S_char 0.6443, SearchScore 0.6177, HybridScore 0.7706, etc.) and checks every transcribed config value (rules table, caps, weights, search values, synonyms, stopwords) against the real config. | Acceptance: every formula matches code and config values, checked mechanically. |
| I7.8 | The doc test caught a rounding error: the bigram similarity of "casul"/"casual" is 5/sqrt(42) = 0.77152, which rounds to 0.772, not the 0.771 previously written in the I7.1 Decision Log entry, the searchConfig comment and the doc. All three were corrected. | Recorded so the change to an earlier log entry is traceable. |
| I7.8 | `docs/algorithms/EVALUATION.md` (T4.4) was regenerated with `npm run evaluate` and kept. Its score-spread table changed because generation now applies rules (e.g. top max 0.955 -> 1.000 from matching_style_set); Precision@5 and hit rate are unchanged. | Restoring the old file would have left pre-rules numbers in the report. |
