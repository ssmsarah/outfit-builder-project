import api from "./axios";

// T4.1/T4.2: the scored-recommender endpoint. Auth is optional - api.js
// already attaches a Bearer token when one exists (logged-in -> personalized
// results; anonymous -> cold-start/compatibility-only results).
export const recommendOutfits = async (anchorItemId, { occasion, season, limit } = {}) => {
  const { data } = await api.post("/outfits/recommend", {
    anchorItemId,
    ...(occasion ? { occasion } : {}),
    ...(season ? { season } : {}),
    ...(limit ? { limit } : {}),
  });
  return data.outfits;
};

// I7.3/I7.4: the full response, including ruleMessages - non-empty when the
// anchor itself breaks a rule for the requested occasion/season (then
// outfits is empty). Resolves to { outfits, ruleMessages }.
export const getOutfitRecommendations = async (anchorItemId, { occasion, season, limit } = {}) => {
  const { data } = await api.post("/outfits/recommend", {
    anchorItemId,
    ...(occasion ? { occasion } : {}),
    ...(season ? { season } : {}),
    ...(limit ? { limit } : {}),
  });
  return { outfits: data.outfits ?? [], ruleMessages: data.ruleMessages ?? [] };
};

// T4.3's Save button: logs a "save" interaction for every item in the
// outfit. Requires login (same as the existing wishlist/like endpoints).
export const saveOutfitItems = async (itemIds) => {
  const { data } = await api.post("/interactions/save", { itemIds });
  return data;
};
