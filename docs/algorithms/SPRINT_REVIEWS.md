# Sprint Reviews: Rule-Based Matching and Fuzzy Search

Sprint reviews for `RULES_AND_SEARCH_SPRINT_README.md`, written at the end of each
sprint: what was completed, what was deferred, and any risks found.

---

## Sprint 5: Rule-Based Attribute Matching Algorithm

**Sprint goal:** A configurable rule engine that enforces fashion constraints,
adjusts outfit scores, and matches items against requested attributes, with a
human-readable reason for every rule applied.

**Outcome: goal met.** All nine tickets (R5.1 to R5.9) are `DONE`. The full server
suite passes (432 tests, up from 296 before the sprint).

### Completed

| Ticket | Delivered |
|---|---|
| R5.1 | `server/src/config/rulesConfig.js` (9 rules, caps, bold-pattern list, attribute-match weights), validated at import by `rules/ruleSchema.js`: missing fields, unknown operators/attributes/scopes, out-of-range soft values and duplicate ids are rejected. |
| R5.2 | `rules/conditionEvaluator.js`: 9 operators, `all`/`any`/`not` nesting, clear errors on unknown paths. |
| R5.3 | `applyItemRules`: formal context rejects `orange_graphic_tee` and `red_shorts`; casual allows both. |
| R5.4 | `applyPairRules` with derived `pair.colorRelation` (reusing T1.3), `bothPatterned`, `sameStyle`, `categories`. |
| R5.5 | `applyOutfitRules` with derived `outfit.patternCount`, `boldPatternCount`, `styles`, `styleCount`, `nonNeutralColorCount`, `categories`, `itemCount`. |
| R5.6 | `evaluateOutfit`: hard rejects, each soft rule applied once per outfit, adjustment capped at ±0.3, deterministic priority/id ordering, `enabled: false` support; `filterItems` pre-filter. |
| R5.7 | `rules/attributeMatcher.js`: `attributeMatch` (renormalized weighted MatchScore, category hard filter) and `matchItems`. |
| R5.8 | `rules/ruleExplanation.js`: rule entries `{ ruleId, type, effect, value, message }` merged into T2.8's `reasons`. |
| R5.9 | `rules.suite.test.js`: config-driven dead-rule check over every rule, Sprint 5 DoD checks, module-isolation guard. |

### Deferred

- **R5.7 color names.** Color matching currently uses the README's hue-family
  fallback (requested color name → hex via the T0.2 name table, then hue distance).
  It is wired to S6.1's `colorName`/`colorFamily` in Sprint 6, as the README plans.
- **Rules are not yet used by outfit generation.** That is I7.3 (Sprint 7). Until
  then, `POST /api/outfits/recommend` behaves exactly as before.

### Risks found

- **Fixture gaps.** The T0.4 wardrobe has no summer-only item, so
  `winter_no_summer_only` could not be tested against it. A rule-only fixture item was
  added in a separate file rather than editing the shared wardrobe. (This review
  originally also claimed the wardrobe had no clashing color pair; that was wrong,
  it has 8, and was corrected in Sprint 7 / I7.6.)
- **Real catalog data is thin on rule attributes.** Real products get `style`,
  `pattern`, `seasons` and `occasions` from defaults (`casual`, `solid`, all seasons,
  `["casual"]`) unless a seller sets them. Most rules will rarely fire on real data
  until products are tagged properly. This is a data-quality issue, not an engine bug.
- **Low-contrast stripes.** Items have no contrast attribute, so the pattern partial
  score (requested `solid`, item `striped` = 0.5) applies to all striped items.
- **Flaky timing test.** The existing T4.5 benchmark test (max < 200 ms) failed once
  under full parallel load before the sprint started and passes on its own. It was
  left unchanged, but the new I7.7 benchmarks should avoid tight wall-clock limits
  inside the parallel suite.

---

## Sprint 6: Fuzzy Search using TF-IDF and Cosine Similarity

**Sprint goal:** Users can search by free text, including typos and synonyms
(`"blak casul tee"` finds the black casual t-shirt), with ranked results.

**Outcome: goal met.** All ten tickets (S6.1 to S6.10) are `DONE`. The full server
suite passes (649 tests, up from 432 at the end of Sprint 5).

### Completed

| Ticket | Delivered |
|---|---|
| S6.1 | `search/colorNames.js`: 21-color palette in `config/searchConfig.js`; `colorName`/`colorFamily` by circular-hue HSV distance. R5.7 re-wired to color names, as planned. |
| S6.2 | `search/documentBuilder.js`: weighted fields (name 3, category/color/style 2, pattern/occasions/seasons/description 1). The product adapter now carries `name`/`description`. |
| S6.3 | `search/normalizer.js`: lowercase, accents, punctuation, phrase-aware synonyms, stopwords, all from config. |
| S6.4 | `search/tokenizer.js`: word tokens and padded char 3-grams. |
| S6.5 | `search/tfidfVectorizer.js`: sublinear TF, smoothed IDF, L2 normalization, implemented from scratch; matches a hand-computed corpus to 1e-6. |
| S6.6 | `search/cosine.js`: sparse dot product over the smaller vector. |
| S6.7 | `search/invertedIndex.js`: posting lists per space, term-at-a-time scoring; identical to brute force. |
| S6.8 | `search/searchIndex.js`: `SearchScore = 0.6 * S_char + 0.4 * S_word`, minScore 0.15, paging, `matchedTerms` explanations. |
| S6.9 | `services/searchService.js`: cached catalog index, incremental add/update/remove hooked into seller and admin product routes, rebuild on seller approval changes. |
| S6.10 | 41-query fixture set (6 query types) and `search.suite.test.js`; all pass. |

### Deferred

- **No HTTP search endpoint yet.** `GET /api/items/search` is I7.4; until then search
  is reachable only from code and tests.
- **Query attribute parsing and hybrid ranking** (I7.1, I7.2) are Sprint 7.

### Risks found

- **Search scope differs from the README's wording.** There is no per-user wardrobe
  in this marketplace, so search covers the shared storefront catalog and one index
  is cached for everyone instead of one per user. `userId` is accepted but does not
  change results.
- **Real product text is thinner than fixture text.** Real products get default
  `style`/`pattern`/`occasions` unless sellers set them, so for most real items the
  name, description, category and color carry the search.
- **In-memory index per server process.** If the server is ever run as several
  processes, each keeps its own index and only sees updates made through its own
  routes. A rebuild on restart or seller approval corrects this, but it is not shared.
- **Two-typo queries work but score low** (about 0.31-0.36 vs 0.7-0.8 for exact
  matches), close to the 0.15 cut-off. I7.6 measures this properly.
- **Test side effect.** A full test run rewrites `docs/algorithms/EVALUATION.md`
  (existing Sprint 4 behavior). Only its timestamp and timing figures change.

---

## Sprint 7: Integration, Evaluation, Documentation

**Sprint goal:** Both algorithms work together with the existing recommendation
pipeline, are exposed in the API and UI, and are measured for the report.

**Outcome: goal met.** All eight tickets (I7.1 to I7.8) are `DONE`, which completes
the plan (27 of 27 tickets). The full server suite passes: 753 tests, up from 649 at
the end of Sprint 6 and 296 before Sprint 5.

### Completed

| Ticket | Delivered |
|---|---|
| I7.1 | `search/queryParser.js`: attributes from free text, exact then fuzzy (bigram cosine >= 0.7), with aliases and conflict rules. |
| I7.2 | `search/hybridSearch.js`: `HybridScore = 0.6 * SearchScore + 0.4 * MatchScore`, category hard filter, full breakdown. |
| I7.3 | Rules inside beam search and final ranking (`C_adjusted`, pre-filter, rejected-anchor handling); T2.9 snapshot updated on purpose, old snapshot still reproduced with rules off. |
| I7.4 | `GET /api/items/search`, `POST /api/items/match`; recommend response gains `ruleAdjustment`, `appliedRules`, `ruleMessages`. |
| I7.5 | The site search page (`/search`) now uses fuzzy search with attribute chips and "Build outfit" suggestions; checked in a real browser. |
| I7.6 | `npm run evaluate:rules-search` -> `EVALUATION_RULES_SEARCH.md`. |
| I7.7 | 1,000-item benchmark: index build ~80 ms, search ~2 ms mean, recommendation ~50 ms mean, all far under target. |
| I7.8 | Sections 4 and 5 plus the full pipeline in `docs/ALGORITHMS.md`, with a doc test re-deriving every number. |

### Deferred

Nothing from the plan. Items found along the way and left for the team:

- **Phone layout:** at 390 px wide, the site-wide navbar search box overflows the
  screen on every page. It predates this work and was not changed.
- **Outfit Builder images:** the Outfit Builder page uses product image paths
  directly, while the rest of the site passes them through `getImageUrl`. Relative
  upload paths may not load there.

### Risks found

- **Rules first made generation 6x slower** (about 110 ms extra per 500-item request)
  and broke the T4.5 benchmark. Fixed with per-request memoization; rules now add
  about 20 ms.
- **Timing tests were flaky under parallel load.** The integration tests start
  several in-memory MongoDB servers at once. `server/vitest.config.js` now runs the
  `tests/scripts` benchmarks after the parallel group; the T4.5 threshold is
  unchanged.
- **The evaluation is at its ceiling.** Text search already scores MRR 1.0 on the
  41-query set, so the gamma sweep cannot show what attribute matching adds to
  ordering. A larger, harder query set is needed for that.
- **Category filter on material words.** The query "denim" is read as category
  `bottom`, which hides the denim jacket.
- **Two corrections to earlier sprint records.** The R5.4/R5.9 claim that the wardrobe
  had no clashing color pair was wrong (it has 8), and one similarity was misrounded
  (0.771 should be 0.772). Both were found by Sprint 7's evaluation and doc tests and
  corrected, with the corrections noted in the Decision Log.
- **Real data.** Most real products carry default style/pattern/season/occasion tags,
  so on the live catalog the rules and attribute matching do far less than on the
  fixtures until sellers tag their products.
