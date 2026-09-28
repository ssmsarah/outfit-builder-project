import { describe, it, expect } from "vitest";
import { parseQuery } from "../../../src/recommendation/search/queryParser.js";
import { wordSimilarity } from "../../../src/recommendation/search/fuzzyMatch.js";
import { searchConfig } from "../../../src/config/searchConfig.js";
import { loadSearchConfig } from "../../../src/config/loadSearchConfig.js";

const attrs = (query) => parseQuery(query).attributes;

describe("parseQuery - README acceptance criteria", () => {
  it('"blak casul tee" -> { color: black, style: casual, category: top }', () => {
    const result = parseQuery("blak casul tee");
    expect(result.attributes).toEqual({ color: "black", style: "casual", category: "top" });
    expect(result.freeText).toBe("");
  });

  it("the synonym tshirt maps to category top", () => {
    expect(attrs("tshirt")).toEqual({ category: "top" });
    expect(attrs("t-shirt")).toEqual({ category: "top" });
  });

  it("unknown words stay in freeText", () => {
    expect(parseQuery("velvet blazer")).toMatchObject({ attributes: { category: "outerwear" }, freeText: "velvet" });
    expect(parseQuery("zzzz")).toEqual({ attributes: {}, freeText: "zzzz", matches: [] });
  });
});

describe("parseQuery - exact matches", () => {
  it("1. every attribute type", () => {
    expect(attrs("black casual striped top for work in winter")).toEqual({
      color: "black",
      style: "casual",
      pattern: "striped",
      category: "top",
      occasion: "work",
      season: "winter",
    });
  });

  it("2. two-word values are matched as phrases", () => {
    expect(attrs("smart casual beige chinos")).toEqual({ style: "smart_casual", color: "beige", category: "bottom" });
    expect(attrs("light blue shirt")).toEqual({ color: "light blue", category: "top" });
  });

  it("3. a word that is both a style and an occasion becomes the style", () => {
    expect(attrs("formal")).toEqual({ style: "formal" });
    expect(attrs("casual")).toEqual({ style: "casual" });
    // "sport" is only an occasion, "sporty" only a style.
    expect(attrs("sport")).toEqual({ occasion: "sport" });
    expect(attrs("sporty")).toEqual({ style: "sporty" });
  });

  it("4. synonyms from S6.3 apply before matching", () => {
    expect(attrs("gray trainers")).toEqual({ color: "grey", category: "shoes" });
    expect(attrs("black pants")).toEqual({ color: "black", category: "bottom" });
  });

  it("5. aliases map to attribute values", () => {
    expect(attrs("plaid shirt")).toEqual({ pattern: "checked", category: "top" });
    expect(attrs("fall coat")).toEqual({ season: "autumn", category: "outerwear" });
  });
});

describe("parseQuery - typos (fuzzy)", () => {
  it("6. one typo per word", () => {
    expect(attrs("florl summr dress")).toEqual({ pattern: "floral", season: "summer", category: "dress" });
    expect(attrs("wintr coat")).toEqual({ season: "winter", category: "outerwear" });
  });

  it("7. typos in colors and categories", () => {
    expect(attrs("whte sneakrs")).toEqual({ color: "white", category: "shoes" });
    expect(attrs("purpl shrt")).toEqual({ color: "purple", category: "top" });
  });

  it("letter swaps are a known weak spot: 'purpel' is not matched to purple", () => {
    // Bigram cosine("purpel", "purple") = 4/7 = 0.571 < 0.7 - see Decision Log I7.1.
    const { ngramSize } = searchConfig.queryParsing;
    expect(wordSimilarity("purpel", "purple", ngramSize)).toBeCloseTo(4 / 7, 12);
    expect(attrs("purpel")).toEqual({});
  });

  it("8. every fuzzy match meets the configured similarity", () => {
    const { minSimilarity, ngramSize } = searchConfig.queryParsing;
    const fuzzy = parseQuery("blak casul florl wintr").matches;
    expect(fuzzy).toHaveLength(4);
    for (const { token, value, similarity } of fuzzy) {
      expect(similarity).toBeGreaterThanOrEqual(minSimilarity);
      expect(similarity).toBeLessThan(1);
      expect(wordSimilarity(token, value, ngramSize)).toBe(similarity);
    }
  });

  it("9. words that are not close enough stay free text", () => {
    // "gym" is short and unrelated; "velvet" resembles nothing in the vocabulary.
    expect(parseQuery("velvet gym bag")).toMatchObject({ attributes: { category: "accessory" }, freeText: "velvet gym" });
    expect(parseQuery("xs").freeText).toBe("xs");
  });
});

describe("parseQuery - conflicts", () => {
  it("10. the later category word wins (head noun), the earlier one becomes free text", () => {
    expect(parseQuery("denim jacket")).toMatchObject({ attributes: { category: "outerwear" }, freeText: "jeans" });
  });

  it("11. a second value for a non-category attribute stays free text", () => {
    expect(parseQuery("black white shirt")).toMatchObject({ attributes: { color: "black", category: "top" }, freeText: "white" });
  });

  it("12. another word for the same value is still a match", () => {
    expect(parseQuery("oxfords shoes")).toMatchObject({ attributes: { category: "shoes" }, freeText: "" });
  });

  it("empty input", () => {
    expect(parseQuery("")).toEqual({ attributes: {}, freeText: "", matches: [] });
  });

  it("reports every match with its token, attribute, value and similarity", () => {
    expect(parseQuery("blak tee").matches).toEqual([
      { token: "blak", attribute: "color", value: "black", similarity: expect.any(Number) },
      { token: "tshirt", attribute: "category", value: "top", similarity: 1 },
    ]);
  });
});

describe("loadSearchConfig - queryParsing", () => {
  const withParsing = (patch) => {
    const config = structuredClone(searchConfig);
    Object.assign(config.queryParsing, patch);
    return config;
  };

  it("rejects aliases pointing at unknown values or attributes", () => {
    expect(() => loadSearchConfig(withParsing({ aliases: { category: { tunic: "shirt" } } }))).toThrow(/unknown category "shirt"/);
    expect(() => loadSearchConfig(withParsing({ aliases: { fabric: { silk: "silk" } } }))).toThrow(/unsupported attribute/);
  });

  it("rejects an invalid threshold or n-gram size", () => {
    expect(() => loadSearchConfig(withParsing({ minSimilarity: 2 }))).toThrow(/minSimilarity/);
    expect(() => loadSearchConfig(withParsing({ ngramSize: 1 }))).toThrow(/ngramSize/);
  });
});
