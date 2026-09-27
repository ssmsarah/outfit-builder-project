// Input validation for POST /api/outfits/recommend (T4.2). Returns an error
// message string if the request body is invalid, or null if it's fine -
// kept as a plain function (no Express req/res) so it's independently
// testable and reusable.
import { OCCASIONS, SEASONS } from "../recommendation/itemEnums.js";

export function validateRecommendRequest({ anchorItemId, occasion, season, limit } = {}) {
  if (!anchorItemId) {
    return "anchorItemId is required";
  }

  if (occasion !== undefined && !OCCASIONS.includes(occasion)) {
    return `Invalid occasion "${occasion}" (expected one of: ${OCCASIONS.join(", ")})`;
  }

  if (season !== undefined && !SEASONS.includes(season)) {
    return `Invalid season "${season}" (expected one of: ${SEASONS.join(", ")})`;
  }

  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    return "limit must be a positive integer";
  }

  return null;
}
