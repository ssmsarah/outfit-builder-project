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

// T4.3's Save button: logs a "save" interaction for every item in the
// outfit. Requires login (same as the existing wishlist/like endpoints).
export const saveOutfitItems = async (itemIds) => {
  const { data } = await api.post("/interactions/save", { itemIds });
  return data;
};
