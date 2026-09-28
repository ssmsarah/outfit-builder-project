import { hybridSearch, matchCatalog } from "../services/searchService.js";
import { validateSearchRequest, validateMatchRequest, parseIntParam } from "../validators/itemSearchValidator.js";

// GET /api/items/search?q=...&limit=10&offset=0 (I7.4)
export const searchItems = async (req, res) => {
  try {
    const q = req.query.q;
    const limit = parseIntParam(req.query.limit);
    const offset = parseIntParam(req.query.offset);

    const validationError = validateSearchRequest({ q, limit, offset });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { results, parsedAttributes, total } = await hybridSearch(q, req.user?.userId, { limit, offset });

    res.status(200).json({
      results: results.map(({ item, hybridScore, searchScore, matchScore, matched, missed, matchedTerms }) => ({
        item,
        hybridScore,
        searchScore,
        matchScore,
        matched,
        missed,
        matchedTerms,
      })),
      parsedAttributes,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to search items", error: error.message });
  }
};

// POST /api/items/match { attributes, limit } (I7.4)
export const matchItemsByAttributes = async (req, res) => {
  try {
    const { attributes, limit } = req.body ?? {};

    const validationError = validateMatchRequest({ attributes, limit });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const results = await matchCatalog(attributes, { limit });
    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ message: "Failed to match items", error: error.message });
  }
};
