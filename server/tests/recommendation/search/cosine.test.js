import { describe, it, expect } from "vitest";
import { cosine, dot } from "../../../src/recommendation/search/cosine.js";
import { buildVectorSpace, documentVector, weightVector } from "../../../src/recommendation/search/tfidfVectorizer.js";
import { tokenize } from "../../../src/recommendation/search/tokenizer.js";
import { buildDocument, documentText } from "../../../src/recommendation/search/documentBuilder.js";
import { wardrobe } from "../fixtures/wardrobe.js";

// Normalizes a plain object into a unit-length Map (all idf = 1).
function unit(obj) {
  const counts = new Map(Object.entries(obj));
  const idf = new Map([...counts.keys()].map((t) => [t, 1]));
  return weightVector(counts, idf);
}

const charSpace = buildVectorSpace(
  wardrobe.map((item) => ({ id: item.id, tokens: tokenize(documentText(buildDocument(item))).chars }))
);

describe("cosine - README acceptance criteria", () => {
  it("identical vectors -> 1.0", () => {
    const v = documentVector(charSpace, "black_tshirt");
    expect(cosine(v, v)).toBeCloseTo(1, 12);
    expect(cosine(unit({ a: 2, b: 5 }), unit({ a: 2, b: 5 }))).toBeCloseTo(1, 12);
  });

  it("no shared terms -> 0.0", () => {
    expect(cosine(unit({ a: 1, b: 1 }), unit({ c: 1, d: 1 }))).toBe(0);
    expect(cosine(new Map(), unit({ a: 1 }))).toBe(0);
  });

  it("is symmetric", () => {
    for (let i = 0; i < wardrobe.length - 1; i++) {
      const a = documentVector(charSpace, wardrobe[i].id);
      const b = documentVector(charSpace, wardrobe[i + 1].id);
      expect(cosine(a, b)).toBe(cosine(b, a));
    }
  });
});

describe("cosine - values", () => {
  it("equals the textbook formula (q·d)/(|q||d|) for normalized vectors", () => {
    // q = (1, 1, 0)/sqrt2, d = (1, 0, 1)/sqrt2 -> cos = 1/2
    expect(cosine(unit({ a: 1, b: 1 }), unit({ a: 1, c: 1 }))).toBeCloseTo(0.5, 12);
  });

  it("always lies in [0, 1] across the fixture wardrobe", () => {
    for (const a of wardrobe) {
      for (const b of wardrobe) {
        const value = cosine(documentVector(charSpace, a.id), documentVector(charSpace, b.id));
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("dot iterates over the smaller vector but gives the same result either way", () => {
    const small = unit({ a: 1 });
    const large = unit({ a: 1, b: 2, c: 3, d: 4 });
    expect(dot(small, large)).toBe(dot(large, small));
  });
});
