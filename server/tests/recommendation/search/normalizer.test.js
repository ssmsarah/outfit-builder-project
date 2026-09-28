import { describe, it, expect } from "vitest";
import { normalize, normalizeTokens, cleanText, applySynonyms } from "../../../src/recommendation/search/normalizer.js";
import { searchConfig } from "../../../src/config/searchConfig.js";
import { loadSearchConfig } from "../../../src/config/loadSearchConfig.js";

describe("normalize - README acceptance criteria", () => {
  it('normalize("Grey T-Shirt for the Gym") -> "grey tshirt gym"', () => {
    expect(normalize("Grey T-Shirt for the Gym")).toBe("grey tshirt gym");
  });
});

describe("cleanText", () => {
  it("lowercases", () => {
    expect(cleanText("BLACK Tee")).toBe("black tee");
  });

  it("strips accents", () => {
    expect(cleanText("Café Crème Blazer")).toBe("cafe creme blazer");
  });

  it("replaces - and _ with spaces", () => {
    expect(cleanText("smart_casual t-shirt")).toBe("smart casual t shirt");
  });

  it("removes apostrophes and other punctuation, collapses spaces", () => {
    expect(cleanText("Men's   black/white, (slim-fit)!")).toBe("mens black white slim fit");
  });

  it("handles empty and missing input", () => {
    expect(cleanText("")).toBe("");
    expect(cleanText(undefined)).toBe("");
    expect(normalize("   ")).toBe("");
  });
});

describe("synonyms", () => {
  it.each([
    ["tee", "tshirt"],
    ["t-shirt", "tshirt"],
    ["t shirt", "tshirt"],
    ["tshirt", "tshirt"],
    ["T-SHIRT", "tshirt"],
    ["pants", "trousers"],
    ["trousers", "trousers"],
    ["trainers", "sneakers"],
    ["kicks", "sneakers"],
    ["denim", "jeans"],
    ["gray", "grey"],
    ["formalwear", "formal"],
    ["formal wear", "formal"],
  ])("%s -> %s", (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it("matches the longest phrase first and keeps surrounding words", () => {
    expect(normalize("gray t shirt and denim pants")).toBe("grey tshirt jeans trousers");
  });

  it("does not replace partial words", () => {
    // "tees" and "teeth" are not the variant "tee".
    expect(normalize("teeth")).toBe("teeth");
    expect(applySynonyms(["t"])).toEqual(["t"]);
  });

  it("applies identically to document and query text", () => {
    expect(normalize("Black_T-Shirt")).toBe(normalize("black tee"));
  });
});

describe("stopwords", () => {
  it("removes every configured stopword", () => {
    expect(normalizeTokens("a an the for with and my some shirt")).toEqual(["shirt"]);
  });

  it("removes stopwords after synonyms", () => {
    expect(normalize("the tee")).toBe("tshirt");
  });

  it("keeps words that only contain a stopword", () => {
    expect(normalize("andy theme")).toBe("andy theme");
  });
});

describe("loadSearchConfig - synonyms and stopwords", () => {
  // A mutable copy of the full real config.
  const base = () => structuredClone(searchConfig);

  it("accepts the real config", () => {
    expect(() => loadSearchConfig(base())).not.toThrow();
  });

  it("rejects a variant mapped to two canonical terms", () => {
    const config = base();
    config.synonyms.sneakers = [...config.synonyms.sneakers, "pants"];
    expect(() => loadSearchConfig(config)).toThrow(/maps to both/);
  });

  it("rejects a multi-word or empty canonical term", () => {
    const config = base();
    config.synonyms["t shirt"] = ["tee"];
    expect(() => loadSearchConfig(config)).toThrow(/one lowercase word/);

    const empty = base();
    empty.synonyms.hat = [];
    expect(() => loadSearchConfig(empty)).toThrow(/non-empty list/);
  });

  it("rejects non-string stopwords", () => {
    expect(() => loadSearchConfig({ ...base(), stopwords: ["the", 3] })).toThrow(/stopwords/);
  });
});
