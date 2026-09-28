import { describe, it, expect } from "vitest";
import { buildDocument, documentText } from "../../../src/recommendation/search/documentBuilder.js";
import { searchConfig } from "../../../src/config/searchConfig.js";
import { loadSearchConfig } from "../../../src/config/loadSearchConfig.js";
import { wardrobe, wardrobeById as w } from "../fixtures/wardrobe.js";

// Plain lowercase/space split - normalization proper is S6.3.
const words = (text) => text.toLowerCase().split(/[\s_]+/).filter(Boolean);

describe("buildDocument - README acceptance criteria", () => {
  it('black_tshirt contains tokens for "black", "tshirt", "top", "casual", "solid"', () => {
    const tokens = words(documentText(buildDocument(w.black_tshirt)));
    for (const token of ["black", "tshirt", "top", "casual", "solid"]) {
      expect(tokens).toContain(token);
    }
  });
});

describe("buildDocument - fields", () => {
  it("builds every field from the item", () => {
    const doc = buildDocument(w.black_tshirt);
    expect(doc.id).toBe("black_tshirt");
    expect(Object.fromEntries(doc.fields.map((f) => [f.field, f.text]))).toEqual({
      name: "black_tshirt",
      category: "top",
      color: "black neutral",
      style: "casual",
      pattern: "solid",
      occasions: "casual",
      seasons: "spring summer autumn winter",
    });
  });

  it("uses the item name when present, and includes the description", () => {
    const item = { ...w.black_tshirt, id: "p1", name: "Classic Crew Tee", description: "Soft cotton" };
    const byField = Object.fromEntries(buildDocument(item).fields.map((f) => [f.field, f.text]));
    expect(byField.name).toBe("Classic Crew Tee");
    expect(byField.description).toBe("Soft cotton");
  });

  it("names the color from colorHex (S6.1), not the raw hex", () => {
    const color = buildDocument(w.navy_shirt).fields.find((f) => f.field === "color");
    expect(color.text).toBe("navy blue");
  });

  it("skips empty fields", () => {
    const doc = buildDocument({ id: "x", category: "top", colorHex: "#000000", occasions: [], seasons: [] });
    expect(doc.fields.map((f) => f.field)).toEqual(["name", "category", "color"]);
  });

  it("carries the configured weight on each field", () => {
    for (const { field, weight } of buildDocument(w.black_tshirt).fields) {
      expect(weight).toBe(searchConfig.fieldWeights[field]);
    }
  });

  it("builds a document for every fixture item", () => {
    for (const item of wardrobe) {
      expect(buildDocument(item).fields.length).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("documentText - field weights by repetition", () => {
  it("repeats each field's tokens `weight` times", () => {
    const tokens = words(documentText(buildDocument(w.black_tshirt)));
    const count = (t) => tokens.filter((x) => x === t).length;

    expect(count("tshirt")).toBe(3); // name x3
    expect(count("top")).toBe(2); // category x2
    expect(count("black")).toBe(3 + 2); // name x3 + color x2
    expect(count("solid")).toBe(1); // pattern x1
    expect(count("casual")).toBe(2 + 1); // style x2 + occasions x1
  });
});

describe("loadSearchConfig - field weights", () => {
  const base = { colorPalette: searchConfig.colorPalette.map((e) => ({ ...e })) };
  const weights = { ...searchConfig.fieldWeights };

  it("rejects non-integer, zero, missing or unknown field weights", () => {
    expect(() => loadSearchConfig({ ...base, fieldWeights: { ...weights, name: 1.5 } })).toThrow(/positive integer/);
    expect(() => loadSearchConfig({ ...base, fieldWeights: { ...weights, name: 0 } })).toThrow(/positive integer/);
    expect(() => loadSearchConfig({ ...base, fieldWeights: { ...weights, style: undefined } })).toThrow(/style/);
    expect(() => loadSearchConfig({ ...base, fieldWeights: { ...weights, brand: 1 } })).toThrow(/unknown document field/);
  });
});
