// Inverted Index (S6.7): index[term] -> [{ docId, weight }], one per vector
// space (words, char n-grams). Search walks only the posting lists of the
// query's terms, so it only ever scores documents that share at least one
// term with the query instead of scanning the whole wardrobe.
//
// Scoring is term-at-a-time: for each query term t, add q[t] * w(t, d) to
// every document d in t's posting list. Summed over all query terms that is
// exactly the dot product, i.e. the cosine (S6.6) of normalized vectors.
import { refreshWeights } from "./tfidfVectorizer.js";
import { cosine } from "./cosine.js";
import { clamp01 } from "../utils/math.js";

export function buildPostings(space) {
  refreshWeights(space);
  const postings = new Map();

  for (const [docId, vector] of space.vectors) {
    for (const [term, weight] of vector) {
      if (!postings.has(term)) postings.set(term, []);
      postings.get(term).push({ docId, weight });
    }
  }

  return postings;
}

// Postings are derived from the space's weights, so they are cached on the
// space and rebuilt only when the space's version changes.
export function getPostings(space) {
  refreshWeights(space);

  if (!space.postingsCache || space.postingsCache.version !== space.version) {
    space.postingsCache = { version: space.version, postings: buildPostings(space) };
  }

  return space.postingsCache.postings;
}

// Union of the posting lists of the query's terms.
export function candidateIds(postings, queryVector) {
  const ids = new Set();
  for (const term of queryVector.keys()) {
    for (const { docId } of postings.get(term) ?? []) ids.add(docId);
  }
  return ids;
}

// docId -> cosine, for candidate documents only.
export function scoreWithIndex(postings, queryVector) {
  const scores = new Map();

  for (const [term, queryWeight] of queryVector) {
    for (const { docId, weight } of postings.get(term) ?? []) {
      scores.set(docId, (scores.get(docId) ?? 0) + queryWeight * weight);
    }
  }

  for (const [docId, score] of scores) scores.set(docId, clamp01(score));
  return scores;
}

// Reference implementation: cosine against every document. Used by tests to
// prove the index gives identical results.
export function scoreBruteForce(space, queryVector) {
  refreshWeights(space);
  const scores = new Map();
  for (const [docId, vector] of space.vectors) {
    scores.set(docId, cosine(queryVector, vector));
  }
  return scores;
}
