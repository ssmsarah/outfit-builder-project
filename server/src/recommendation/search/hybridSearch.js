// Hybrid Search Ranking (I7.2): text relevance (S6.8) combined with
// rule-based attribute matching (R5.7) on the attributes parsed from the
// query (I7.1):
//
//   HybridScore = gamma * SearchScore + (1 - gamma) * MatchScore
//
// - No attributes parsed -> HybridScore = SearchScore.
// - A parsed category is a hard filter (attributeMatch excludes misses).
// - Every result carries its breakdown: searchScore, matchScore, matched,
//   missed (plus the S6.8 sWord/sChar/matchedTerms).
// Pure function over a search index.
import { rankAll, matchedTerms } from "./searchIndex.js";
import { wordTokens } from "./tokenizer.js";
import { parseQuery } from "./queryParser.js";
import { attributeMatch } from "../rules/attributeMatcher.js";
import { searchConfig } from "../../config/searchConfig.js";

function compareResults(a, b) {
  return b.hybridScore - a.hybridScore || (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0);
}

export function hybridSearch(index, query, options = {}) {
  const {
    limit = searchConfig.defaultLimit,
    offset = 0,
    gamma = searchConfig.gamma,
    minScore = searchConfig.minScore,
    beta,
  } = options;

  const { attributes } = parseQuery(query);
  const hasAttributes = Object.keys(attributes).length > 0;

  // Every text match is a candidate (minScore 0): an item with a weak text
  // score but a strong attribute match may still clear minScore overall.
  const results = [];

  for (const result of rankAll(index, query, { minScore: 0, beta, explain: false })) {
    const item = index.items.get(result.itemId);
    const match = hasAttributes
      ? attributeMatch(item, attributes)
      : { score: 0, matched: [], missed: [], excluded: false };

    if (match.excluded) continue;

    const hybridScore = hasAttributes ? gamma * result.score + (1 - gamma) * match.score : result.score;
    if (hybridScore < minScore) continue;

    results.push({
      itemId: result.itemId,
      hybridScore,
      searchScore: result.score,
      matchScore: hasAttributes ? match.score : null,
      matched: match.matched,
      missed: match.missed,
      sWord: result.sWord,
      sChar: result.sChar,
    });
  }

  results.sort(compareResults);

  // Explain only the page being returned (I7.7): fuzzy term matching for
  // every candidate was the most expensive step on large catalogs.
  const words = wordTokens(query);
  const page = results
    .slice(offset, offset + limit)
    .map((result) => ({ ...result, matchedTerms: matchedTerms(index, result.itemId, words) }));

  return { results: page, parsedAttributes: attributes, total: results.length };
}
