import { describe, it, expect } from "vitest";
import {
  buildPostings,
  getPostings,
  candidateIds,
  scoreWithIndex,
  scoreBruteForce,
} from "../../../src/recommendation/search/invertedIndex.js";
import {
  buildVectorSpace,
  addDocument,
  documentVector,
  vectorizeQuery,
} from "../../../src/recommendation/search/tfidfVectorizer.js";
import { tokenize } from "../../../src/recommendation/search/tokenizer.js";
import { buildDocument, documentText } from "../../../src/recommendation/search/documentBuilder.js";
import { wardrobe } from "../fixtures/wardrobe.js";

const tokenized = wardrobe.map((item) => ({ id: item.id, ...tokenize(documentText(buildDocument(item))) }));
const wordSpace = () => buildVectorSpace(tokenized.map(({ id, words }) => ({ id, tokens: words })));
const charSpace = () => buildVectorSpace(tokenized.map(({ id, chars }) => ({ id, tokens: chars })));

const QUERIES = ["black tshirt", "blak tshrt", "white sneakrs", "floral skirt", "formal", "grey hoodie", "zzzz", ""];

describe("inverted index - README acceptance criteria", () => {
  it.each(QUERIES)("candidate set for %j equals the union of its terms' posting lists", (query) => {
    for (const [space, stream] of [
      [wordSpace(), "words"],
      [charSpace(), "chars"],
    ]) {
      const q = vectorizeQuery(space, tokenize(query)[stream]);
      const postings = getPostings(space);

      const union = new Set();
      for (const term of q.keys()) for (const { docId } of postings.get(term)) union.add(docId);

      expect(candidateIds(postings, q)).toEqual(union);
    }
  });

  it.each(QUERIES)("results for %j match a brute-force cosine over all documents", (query) => {
    for (const [space, stream] of [
      [wordSpace(), "words"],
      [charSpace(), "chars"],
    ]) {
      const q = vectorizeQuery(space, tokenize(query)[stream]);
      const indexed = scoreWithIndex(getPostings(space), q);
      const brute = scoreBruteForce(space, q);

      // Every non-zero brute-force score is found by the index, with the same value...
      for (const [docId, score] of brute) {
        if (score > 0) expect(indexed.get(docId)).toBeCloseTo(score, 12);
      }
      // ...and the index scores nothing that brute force scores 0.
      for (const [docId, score] of indexed) {
        expect(brute.get(docId)).toBeCloseTo(score, 12);
      }
    }
  });
});

describe("inverted index - behavior", () => {
  it("only scores documents sharing a term with the query", () => {
    const space = wordSpace();
    const q = vectorizeQuery(space, tokenize("floral")["words"]);
    const scored = [...scoreWithIndex(getPostings(space), q).keys()].sort();
    expect(scored).toEqual(["floral_summer_dress", "green_floral_skirt"]);
  });

  it("a query with no known terms has no candidates", () => {
    const space = charSpace();
    const q = vectorizeQuery(space, tokenize("zzzz").chars);
    expect(candidateIds(getPostings(space), q).size).toBe(0);
  });

  it("each posting carries the document's normalized weight for that term", () => {
    const space = wordSpace();
    const postings = buildPostings(space);
    for (const { docId, weight } of postings.get("black")) {
      expect(weight).toBe(documentVector(space, docId).get("black"));
    }
  });

  it("rebuilds cached postings after the space changes", () => {
    const space = wordSpace();
    const before = getPostings(space);
    expect(getPostings(space)).toBe(before); // cached

    addDocument(space, "velvet_blazer", ["velvet", "blazer"]);
    const after = getPostings(space);
    expect(after).not.toBe(before);
    expect(after.get("velvet")).toEqual([{ docId: "velvet_blazer", weight: expect.any(Number) }]);
  });
});
