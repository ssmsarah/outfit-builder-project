import { describe, it, expect } from "vitest";
import {
  tf,
  idf,
  l2Norm,
  termCounts,
  buildVectorSpace,
  createVectorSpace,
  addDocument,
  removeDocument,
  documentVector,
  vectorizeQuery,
} from "../../../src/recommendation/search/tfidfVectorizer.js";
import { buildDocument, documentText } from "../../../src/recommendation/search/documentBuilder.js";
import { tokenize } from "../../../src/recommendation/search/tokenizer.js";
import { wardrobe } from "../fixtures/wardrobe.js";

const TOLERANCE = 6; // toBeCloseTo digits: |diff| < 0.5e-6

// 3-document corpus, N = 3.
//   df: red 2, shirt 2, dress 1, blue 1
//   idf(red) = idf(shirt) = ln(4/3) + 1 = 1.287682072
//   idf(dress) = idf(blue) = ln(4/2) + 1 = 1.693147181
// d2 = red x2, dress x1:
//   w(red)   = (1 + ln 2) * 1.287682072 = 2.180217...
//   w(dress) = 1 * 1.693147181
//   norm = sqrt(2.180217^2 + 1.693147^2) = 2.760452...
//   -> red 0.789806929, dress 0.613355537
// d3 = blue x1, shirt x3:
//   w(blue) = 1.693147181, w(shirt) = (1 + ln 3) * 1.287682072
//   -> blue 0.530941484, shirt 0.847408485
// Values computed independently (Python) from the README formulas.
const corpus = [
  { id: "d1", tokens: ["red", "shirt"] },
  { id: "d2", tokens: ["red", "red", "dress"] },
  { id: "d3", tokens: ["blue", "shirt", "shirt", "shirt"] },
];

const EXPECTED = {
  idf: { red: 1.287682072, shirt: 1.287682072, dress: 1.693147181, blue: 1.693147181 },
  vectors: {
    d1: { red: 0.707106781, shirt: 0.707106781 },
    d2: { red: 0.789806929, dress: 0.613355537 },
    d3: { blue: 0.530941484, shirt: 0.847408485 },
  },
};

function expectVectorClose(actual, expected) {
  expect([...actual.keys()].sort()).toEqual(Object.keys(expected).sort());
  for (const [term, weight] of Object.entries(expected)) {
    expect(actual.get(term)).toBeCloseTo(weight, TOLERANCE);
  }
}

describe("TF-IDF - README acceptance criteria", () => {
  it("hand-computed 3-document corpus matches to 1e-6", () => {
    const space = buildVectorSpace(corpus);

    for (const [term, value] of Object.entries(EXPECTED.idf)) {
      expect(space.idf.get(term)).toBeCloseTo(value, TOLERANCE);
    }
    for (const [id, vector] of Object.entries(EXPECTED.vectors)) {
      expectVectorClose(documentVector(space, id), vector);
    }
  });

  it("every document vector has L2 norm 1.0 (or is empty)", () => {
    const docs = wardrobe.map((item) => ({ id: item.id, tokens: tokenize(documentText(buildDocument(item))).chars }));
    const space = buildVectorSpace([...docs, { id: "empty", tokens: [] }]);

    for (const [id, vector] of space.vectors) {
      if (id === "empty") {
        expect(vector.size).toBe(0);
      } else {
        expect(l2Norm(vector)).toBeCloseTo(1, 12);
      }
    }
  });

  it("a term in every document has the minimum IDF", () => {
    const space = buildVectorSpace([
      { id: "a", tokens: ["top", "black"] },
      { id: "b", tokens: ["top", "white", "white"] },
      { id: "c", tokens: ["top", "red"] },
    ]);

    const minIdf = Math.min(...space.idf.values());
    expect(space.idf.get("top")).toBe(minIdf);
    expect(space.idf.get("top")).toBe(1); // ln((1+N)/(1+N)) + 1
    for (const [term, value] of space.idf) {
      if (term !== "top") expect(value).toBeGreaterThan(minIdf);
    }
  });
});

describe("TF and IDF formulas", () => {
  it("tf is sublinear and 0 for absent terms", () => {
    expect(tf(0)).toBe(0);
    expect(tf(1)).toBe(1);
    expect(tf(2)).toBeCloseTo(1 + Math.log(2), 12);
    expect(tf(10)).toBeLessThan(10 * tf(1));
  });

  it("idf is smoothed: a term in no document stays finite", () => {
    expect(idf(0, 3)).toBeCloseTo(Math.log(4) + 1, 12);
    expect(Number.isFinite(idf(0, 0))).toBe(true);
  });

  it("termCounts counts repeated tokens", () => {
    expect(termCounts(["a", "b", "a"])).toEqual(new Map([["a", 2], ["b", 1]]));
  });
});

describe("query vectorization", () => {
  it("uses the corpus IDF and is L2 normalized", () => {
    const space = buildVectorSpace(corpus);
    const query = vectorizeQuery(space, ["red", "dress"]);
    // Same terms, equal counts: weights proportional to idf.
    const r = 1.287682072;
    const d = 1.693147181;
    const norm = Math.sqrt(r * r + d * d);
    expectVectorClose(query, { red: r / norm, dress: d / norm });
  });

  it("ignores query terms that are not in the vocabulary", () => {
    const space = buildVectorSpace(corpus);
    expectVectorClose(vectorizeQuery(space, ["red", "zzzz"]), { red: 1 });
    expect(vectorizeQuery(space, ["zzzz"]).size).toBe(0);
  });
});

describe("vector space bookkeeping (used by S6.9)", () => {
  it("keeps raw counts and document frequencies", () => {
    const space = buildVectorSpace(corpus);
    expect(space.counts.get("d2")).toEqual(new Map([["red", 2], ["dress", 1]]));
    expect(space.df).toEqual(new Map([["red", 2], ["shirt", 2], ["dress", 1], ["blue", 1]]));
  });

  it("recomputes weights lazily after changes", () => {
    const space = buildVectorSpace(corpus);
    addDocument(space, "d4", ["red"]);
    expect(space.dirty).toBe(true);

    documentVector(space, "d1");
    expect(space.dirty).toBe(false);
    // N = 4, df(red) = 3 now.
    expect(space.idf.get("red")).toBeCloseTo(Math.log(5 / 4) + 1, 12);
  });

  it("re-adding an id replaces the old document, and removing drops unused terms", () => {
    const space = createVectorSpace();
    addDocument(space, "x", ["red", "shirt"]);
    addDocument(space, "x", ["blue"]);
    expect(space.counts.size).toBe(1);
    expect(space.df).toEqual(new Map([["blue", 1]]));

    expect(removeDocument(space, "x")).toBe(true);
    expect(removeDocument(space, "x")).toBe(false);
    expect(space.df.size).toBe(0);
  });
});
