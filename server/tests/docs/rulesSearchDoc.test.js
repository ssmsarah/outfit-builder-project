// I7.8 acceptance criterion: "Every formula matches code and config values."
// Re-derives every number quoted in Sections 4 and 5 of docs/ALGORITHMS.md
// from the running code, and checks the config values transcribed into the
// doc against the real config objects - same approach as algorithmsDoc.test.js (T4.6).
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

import { rulesConfig } from "../../src/config/rulesConfig.js";
import { searchConfig } from "../../src/config/searchConfig.js";
import { evaluateOutfit } from "../../src/recommendation/rules/ruleEngine.js";
import { attributeMatch } from "../../src/recommendation/rules/attributeMatcher.js";
import { outfitScore } from "../../src/recommendation/compatibility/outfitScore.js";
import { createSearchIndex, rankAll } from "../../src/recommendation/search/searchIndex.js";
import { hybridSearch } from "../../src/recommendation/search/hybridSearch.js";
import { parseQuery } from "../../src/recommendation/search/queryParser.js";
import { tokenize, wordNgrams } from "../../src/recommendation/search/tokenizer.js";
import { normalize } from "../../src/recommendation/search/normalizer.js";
import { wordSimilarity } from "../../src/recommendation/search/fuzzyMatch.js";
import { vectorizeQuery, documentVector } from "../../src/recommendation/search/tfidfVectorizer.js";
import { paletteColorNames } from "../../src/recommendation/search/colorNames.js";
import { wardrobe, wardrobeById as w } from "../recommendation/fixtures/wardrobe.js";

const doc = fs.readFileSync(path.resolve(__dirname, "../../../docs/ALGORITHMS.md"), "utf-8");

function section(heading) {
  const start = doc.indexOf(heading);
  const end = doc.indexOf("\n---\n", start);
  return doc.slice(start, end === -1 ? undefined : end);
}

describe("docs/ALGORITHMS.md covers Sections 4 and 5 and the pipeline", () => {
  it.each(["## 4. Rule-Based Attribute Matching Algorithm", "## 5. Fuzzy Search (TF-IDF and Cosine Similarity)"])(
    "%s has purpose/inputs/outputs/formulas/config/worked example/complexity/limitations",
    (heading) => {
      const text = section(heading);
      expect(text.length).toBeGreaterThan(500);
      for (const required of ["Purpose", "Inputs", "Outputs", "Formulas", "Config values", "Worked example", "Complexity", "Limitations"]) {
        expect(text, `${heading}: ${required}`).toContain(`### ${required}`);
      }
    }
  );

  it("includes the full pipeline diagram and links to the new evaluation", () => {
    const pipeline = section("## Full pipeline");
    for (const step of ["normalize", "parse attributes", "TF-IDF search", "hybrid rank", "rule pre-filter", "beam search", "rule adjustments", "personalization", "final ranking", "top outfits with reasons"]) {
      expect(pipeline).toContain(step);
    }
    expect(doc).toContain("EVALUATION_RULES_SEARCH.md");
  });

  it("documents every operator and the formulas the code implements", () => {
    const text = section("## 4. Rule-Based");
    for (const op of ["eq", "neq", "in", "notIn", "contains", "containsAny", "onlyContains", "gte", "lte"]) {
      expect(text).toContain(`\`${op}\``);
    }
    expect(text).toContain("C_adjusted = clamp01(C + ruleAdjustment)");
    expect(text).toContain("MatchScore = sum(w_k * s_k) / sum(w_k)");

    const search = section("## 5. Fuzzy Search");
    for (const formula of [
      "tf(t, d)  = 1 + ln(count(t, d))",
      "idf(t)    = ln((1 + N) / (1 + df(t))) + 1",
      "SearchScore = beta * S_char + (1 - beta) * S_word",
      "HybridScore = gamma * SearchScore + (1 - gamma) * MatchScore",
    ]) {
      expect(search).toContain(formula);
    }
  });
});

describe("Section 4 worked example matches live code", () => {
  it("[white_shirt, black_trousers, black_oxfords], formal: C = 0.9552, adjustment 0.10, C_adjusted 1.0", () => {
    const outfit = [w.white_shirt, w.black_trousers, w.black_oxfords];
    const context = { targetOccasion: "formal", targetSeason: null };
    const C = outfitScore(outfit, context);
    const rules = evaluateOutfit(outfit, context);

    expect(C).toBeCloseTo(0.9552, 4);
    expect(rules.ruleAdjustment).toBeCloseTo(0.1, 12);
    expect(rules.appliedRules.map((r) => r.ruleId)).toEqual(["formal_leather_shoes", "matching_style_set"]);
    expect(Math.min(1, C + rules.ruleAdjustment)).toBe(1);
  });

  it("[orange_graphic_tee, green_floral_skirt, white_sneakers] is rejected by max_one_bold_pattern (and formal_no_sporty when formal)", () => {
    const outfit = [w.orange_graphic_tee, w.green_floral_skirt, w.white_sneakers];
    expect(evaluateOutfit(outfit).rejections.map((r) => r.ruleId)).toEqual(["max_one_bold_pattern"]);
    expect(evaluateOutfit(outfit, { occasion: "formal" }).rejections.map((r) => r.ruleId)).toEqual([
      "formal_no_sporty",
      "max_one_bold_pattern",
    ]);
  });

  it("attribute match for { top, black, casual }: black_tshirt 1.0, navy_shirt 0.7467, black_trousers excluded", () => {
    const request = { category: "top", color: "black", style: "casual" };
    expect(attributeMatch(w.black_tshirt, request).score).toBeCloseTo(1, 12);
    const navy = attributeMatch(w.navy_shirt, request);
    expect(navy.scores).toEqual({ category: 1, color: 0.4, style: 0.8 });
    expect(navy.score).toBeCloseTo(0.7467, 4);
    expect(attributeMatch(w.black_trousers, request).excluded).toBe(true);
  });
});

describe("Section 5 worked example (\"blak tee\") matches live code", () => {
  const index = createSearchIndex(wardrobe);
  const query = "blak tee";

  it("normalizes to 'blak tshirt' and yields the documented char n-grams", () => {
    expect(normalize(query)).toBe("blak tshirt");
    expect(tokenize(query).chars).toEqual(["#bl", "bla", "lak", "ak#", "#ts", "tsh", "shi", "hir", "irt", "rt#"]);
  });

  it("q_word = { tshirt: 1.0 } and idf(tshirt) = 2.9924 with N = 21, df = 2", () => {
    const qWord = vectorizeQuery(index.word, tokenize(query).words);
    expect([...qWord]).toEqual([["tshirt", 1]]);
    expect(index.word.counts.size).toBe(21);
    expect(index.word.df.get("tshirt")).toBe(2);
    expect(index.word.idf.get("tshirt")).toBeCloseTo(Math.log(22 / 3) + 1, 12);
    expect(index.word.idf.get("tshirt")).toBeCloseTo(2.9924, 4);
  });

  it("8 n-grams survive in q_char (lak, ak# are not in the vocabulary)", () => {
    const qChar = vectorizeQuery(index.char, tokenize(query).chars);
    expect(qChar.size).toBe(8);
    expect(qChar.has("lak")).toBe(false);
    expect(qChar.has("ak#")).toBe(false);
  });

  it("black_tshirt: d_word[tshirt] 0.5778, S_word 0.5778, S_char 0.6443, SearchScore 0.6177", () => {
    expect(index.word.counts.get("black_tshirt").get("tshirt")).toBe(3);
    expect(documentVector(index.word, "black_tshirt").get("tshirt")).toBeCloseTo(0.5778, 4);

    const top = rankAll(index, query)[0];
    expect(top.itemId).toBe("black_tshirt");
    expect(top.sWord).toBeCloseTo(0.5778, 4);
    expect(top.sChar).toBeCloseTo(0.6443, 4);
    expect(top.score).toBeCloseTo(0.6177, 4);
  });

  it("parsed attributes, hybrid scores and matchedTerms", () => {
    const parsed = parseQuery(query);
    expect(parsed.attributes).toEqual({ color: "black", category: "top" });
    expect(parsed.matches[0].similarity).toBeCloseTo(0.73, 3);

    const [first, second] = hybridSearch(index, query).results;
    expect(first).toMatchObject({ itemId: "black_tshirt", matchScore: 1, matchedTerms: ["black", "tshirt"] });
    expect(first.hybridScore).toBeCloseTo(0.7706, 4);
    expect(second.itemId).toBe("orange_graphic_tee");
    expect(second.searchScore).toBeCloseTo(0.3273, 4);
    expect(second.matchScore).toBeCloseTo(0.5455, 4);
    expect(second.hybridScore).toBeCloseTo(0.4146, 4);
  });

  it("bigram similarities quoted in the doc (0.772, 0.730; trigram 0.548; letter swap 0.571)", () => {
    expect(wordSimilarity("casul", "casual", 2)).toBeCloseTo(0.772, 3);
    expect(wordSimilarity("blak", "black", 2)).toBeCloseTo(0.730, 3);
    expect(wordSimilarity("casul", "casual", 3)).toBeCloseTo(0.548, 3);
    expect(wordSimilarity("purpel", "purple", 2)).toBeCloseTo(0.571, 3);
  });

  it("n-gram and normalization examples", () => {
    expect(wordNgrams("black")).toEqual(["#bl", "bla", "lac", "ack", "ck#"]);
    expect(normalize("Grey T-Shirt for the Gym")).toBe("grey tshirt gym");
  });

  it("the 'denim' limitation is real: parsed as bottom, so the denim jacket is filtered out", () => {
    expect(parseQuery("denim").attributes).toEqual({ category: "bottom" });
    expect(hybridSearch(index, "denim").results.map((r) => r.itemId)).not.toContain("denim_jacket");
  });
});

describe("Config values transcribed into Sections 4 and 5 match the real config", () => {
  it("rules table: id, scope, type, priority, effect value", () => {
    const table = Object.fromEntries(
      rulesConfig.rules.map((r) => [r.id, [r.scope, r.type, r.priority, r.action.effect, r.action.value ?? null]])
    );
    expect(table).toEqual({
      formal_no_sporty: ["item", "hard", 100, "reject", null],
      sport_requires_sporty_shoes: ["item", "hard", 100, "reject", null],
      winter_no_summer_only: ["item", "hard", 90, "reject", null],
      summer_no_winter_only: ["item", "hard", 90, "reject", null],
      max_one_bold_pattern: ["outfit", "hard", 80, "reject", null],
      pattern_on_pattern: ["pair", "soft", 50, "penalty", 0.1],
      double_clash_color: ["pair", "soft", 50, "penalty", 0.1],
      formal_leather_shoes: ["pair", "soft", 40, "boost", 0.05],
      matching_style_set: ["outfit", "soft", 40, "boost", 0.05],
    });
  });

  it("rule caps, bold patterns and attribute-match values", () => {
    expect(rulesConfig.maxSoftValue).toBe(0.3);
    expect(rulesConfig.adjustmentCap).toBe(0.3);
    expect(rulesConfig.boldPatterns).toEqual(["graphic", "floral", "checked"]);
    expect(rulesConfig.attributeMatch).toEqual({
      weights: { category: 0.3, color: 0.25, style: 0.2, pattern: 0.1, occasion: 0.1, season: 0.05 },
      stylePartialMin: 0.7,
      patternPartial: { solid: { striped: 0.5 } },
      colorScores: { exact: 1.0, sameFamily: 0.6, bothNeutral: 0.4 },
    });
  });

  it("search values, field weights, synonyms, stopwords and query parsing", () => {
    expect(searchConfig.ngramSize).toBe(3);
    expect(searchConfig.beta).toBe(0.6);
    expect(searchConfig.gamma).toBe(0.6);
    expect(searchConfig.minScore).toBe(0.15);
    expect(searchConfig.defaultLimit).toBe(10);
    expect(searchConfig.matchedTermMinSimilarity).toBe(0.4);
    expect(searchConfig.fieldWeights).toEqual({
      name: 3, category: 2, color: 2, style: 2, pattern: 1, occasions: 1, seasons: 1, description: 1,
    });
    expect(searchConfig.synonyms).toEqual({
      tshirt: ["tee", "t-shirt", "t shirt", "tshirt"],
      trousers: ["pants", "trousers"],
      sneakers: ["sneakers", "trainers", "kicks"],
      jeans: ["jeans", "denim"],
      grey: ["grey", "gray"],
      formal: ["formalwear", "formal wear"],
    });
    expect(searchConfig.stopwords).toEqual(["a", "an", "the", "for", "with", "and", "my", "some"]);
    expect(searchConfig.queryParsing).toMatchObject({ ngramSize: 2, minSimilarity: 0.7, minFuzzyLength: 3 });
    expect(paletteColorNames()).toHaveLength(21);
    expect(paletteColorNames()).toContain("silver");
  });
});
