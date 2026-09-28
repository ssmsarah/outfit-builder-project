import { describe, it, expect } from "vitest";
import { tokenize, wordNgrams, charNgrams, wordTokens } from "../../../src/recommendation/search/tokenizer.js";
import { searchConfig } from "../../../src/config/searchConfig.js";
import { loadSearchConfig } from "../../../src/config/loadSearchConfig.js";

describe("tokenizer - README acceptance criteria", () => {
  it("n-grams for `black` are exactly #bl, bla, lac, ack, ck#", () => {
    expect(wordNgrams("black")).toEqual(["#bl", "bla", "lac", "ack", "ck#"]);
  });

  it("words shorter than 3 characters still produce at least one n-gram", () => {
    expect(wordNgrams("xs")).toEqual(["#xs", "xs#"]);
    expect(wordNgrams("m")).toEqual(["#m#"]);
  });
});

describe("wordNgrams", () => {
  it("uses the configured n-gram size", () => {
    expect(searchConfig.ngramSize).toBe(3);
    expect(wordNgrams("tee")).toHaveLength("#tee#".length - 3 + 1);
  });

  it("config rejects an n-gram size below 2 or non-integer", () => {
    expect(() => loadSearchConfig({ ...structuredClone(searchConfig), ngramSize: 1 })).toThrow(/ngramSize/);
    expect(() => loadSearchConfig({ ...structuredClone(searchConfig), ngramSize: 2.5 })).toThrow(/ngramSize/);
  });

  it("supports other sizes, keeping short words whole", () => {
    expect(wordNgrams("black", 4)).toEqual(["#bla", "blac", "lack", "ack#"]);
    expect(wordNgrams("m", 4)).toEqual(["#m#"]);
  });

  it("a one-letter typo still shares n-grams with the correct word", () => {
    const shared = wordNgrams("blak").filter((g) => wordNgrams("black").includes(g));
    expect(shared).toEqual(expect.arrayContaining(["#bl", "bla"]));
  });
});

describe("tokenize", () => {
  it("produces word tokens from the normalized text", () => {
    expect(tokenize("Grey T-Shirt for the Gym").words).toEqual(["grey", "tshirt", "gym"]);
  });

  it("produces char n-grams for every word, keeping duplicates for TF", () => {
    const { chars } = tokenize("tee tee");
    // "tee" -> tshirt (synonym), twice.
    expect(chars).toEqual([...wordNgrams("tshirt"), ...wordNgrams("tshirt")]);
  });

  it("does not create n-grams across word boundaries", () => {
    const { chars } = tokenize("red top");
    expect(chars).toEqual(["#re", "red", "ed#", "#to", "top", "op#"]);
    expect(chars).not.toContain("d t");
  });

  it("returns empty streams for empty or stopword-only text", () => {
    expect(tokenize("")).toEqual({ words: [], chars: [] });
    expect(tokenize("the and for")).toEqual({ words: [], chars: [] });
  });

  it("charNgrams and wordTokens compose to tokenize", () => {
    const text = "blak casul tee";
    expect(tokenize(text)).toEqual({ words: wordTokens(text), chars: charNgrams(wordTokens(text)) });
  });
});
