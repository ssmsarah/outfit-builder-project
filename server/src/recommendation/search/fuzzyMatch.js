// Word-to-word fuzzy matching on character n-grams (S6.4). Used to explain
// which document terms a (possibly misspelled) query word matched (S6.8),
// and to map query words onto attribute values (I7.1: "casul" -> casual).
//
//   similarity(a, b) = cosine of the two words' L2-normalized n-gram count
//                      vectors (no IDF - there is no corpus here)
import { wordNgrams } from "./tokenizer.js";
import { termCounts, weightVector } from "./tfidfVectorizer.js";
import { cosine } from "./cosine.js";

const vectorCache = new Map();

// n defaults to the search n-gram size (S6.4); the query parser (I7.1)
// passes its own.
function ngramVector(word, n) {
  const key = `${n ?? ""}|${word}`;
  let vector = vectorCache.get(key);
  if (!vector) {
    const counts = termCounts(wordNgrams(word, n));
    vector = weightVector(counts, new Map([...counts.keys()].map((gram) => [gram, 1])));
    vectorCache.set(key, vector);
  }
  return vector;
}

export function wordSimilarity(a, b, n) {
  if (a === b) return 1;
  return cosine(ngramVector(a, n), ngramVector(b, n));
}

// Best vocabulary match at or above minSimilarity, or null. Ties keep the
// alphabetically first term, so the result never depends on input order.
export function bestMatch(word, vocabulary, minSimilarity, n) {
  let best = null;

  for (const term of vocabulary) {
    const similarity = wordSimilarity(word, term, n);
    if (similarity < minSimilarity) continue;
    if (!best || similarity > best.similarity || (similarity === best.similarity && term < best.term)) {
      best = { term, similarity };
    }
  }

  return best;
}
