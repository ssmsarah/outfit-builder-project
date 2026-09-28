// Search Function and Ranking (S6.8).
//
//   S_word      = cosine(q_word, d_word)
//   S_char      = cosine(q_char, d_char)
//   SearchScore = beta * S_char + (1 - beta) * S_word      (beta from config)
//
// Results below minScore are dropped, the rest sorted by score (ties by
// item id) and paged with limit/offset. Each result explains itself with
// its two component scores and the document terms the query matched.
//
// A search index holds the items plus one TF-IDF space per token stream.
// indexItem/removeItem keep it current (S6.9); every read recomputes
// weights lazily. No DB access here - the service layer loads items.
import { buildDocument, documentText } from "./documentBuilder.js";
import { tokenize } from "./tokenizer.js";
import { createVectorSpace, addDocument, removeDocument, vectorizeQuery } from "./tfidfVectorizer.js";
import { getPostings, scoreWithIndex } from "./invertedIndex.js";
import { bestMatch } from "./fuzzyMatch.js";
import { searchConfig } from "../../config/searchConfig.js";

export function createSearchIndex(items = []) {
  const index = { items: new Map(), word: createVectorSpace(), char: createVectorSpace() };
  for (const item of items) indexItem(index, item);
  return index;
}

// Adds or replaces one item.
export function indexItem(index, item) {
  const id = String(item.id);
  const { words, chars } = tokenize(documentText(buildDocument(item)));

  index.items.set(id, item);
  addDocument(index.word, id, words);
  addDocument(index.char, id, chars);
}

export function removeItem(index, id) {
  const key = String(id);
  const existed = index.items.delete(key);
  removeDocument(index.word, key);
  removeDocument(index.char, key);
  return existed;
}

// For each query word, the document term it matched: the word itself if
// the document contains it, otherwise the closest document word by n-gram
// similarity ("blak" -> "black").
export function matchedTerms(index, docId, queryWords) {
  const docWords = [...(index.word.counts.get(docId)?.keys() ?? [])];
  const matched = [];

  for (const word of queryWords) {
    const term = docWords.includes(word)
      ? word
      : bestMatch(word, docWords, searchConfig.matchedTermMinSimilarity)?.term;
    if (term && !matched.includes(term)) matched.push(term);
  }

  return matched;
}

function compareResults(a, b) {
  return b.score - a.score || (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0);
}

// Every result above minScore, sorted - before paging. Exposed for I7.2,
// which re-ranks the full list. With explain: false the (relatively costly)
// matchedTerms explanation is skipped; I7.2 computes it for the returned
// page only (I7.7).
export function rankAll(
  index,
  query,
  { beta = searchConfig.beta, minScore = searchConfig.minScore, explain = true } = {}
) {
  const { words, chars } = tokenize(query);
  if (words.length === 0) return [];

  const sWord = scoreWithIndex(getPostings(index.word), vectorizeQuery(index.word, words));
  const sChar = scoreWithIndex(getPostings(index.char), vectorizeQuery(index.char, chars));

  const results = [];
  for (const itemId of new Set([...sWord.keys(), ...sChar.keys()])) {
    const word = sWord.get(itemId) ?? 0;
    const char = sChar.get(itemId) ?? 0;
    const score = beta * char + (1 - beta) * word;

    if (score >= minScore) {
      const result = { itemId, score, sWord: word, sChar: char };
      if (explain) result.matchedTerms = matchedTerms(index, itemId, words);
      results.push(result);
    }
  }

  return results.sort(compareResults);
}

export function searchIndex(index, query, options = {}) {
  const { limit = searchConfig.defaultLimit, offset = 0 } = options;
  return rankAll(index, query, options).slice(offset, offset + limit);
}
