import api from "./axios";

// I7.4: fuzzy + attribute search over the storefront catalog.
// Resolves to { results, parsedAttributes, total }.
export const searchItems = async (q, { limit, offset, signal } = {}) => {
  const { data } = await api.get("/items/search", {
    params: { q, ...(limit ? { limit } : {}), ...(offset ? { offset } : {}) },
    signal,
  });
  return data;
};

// I7.4: rank items by requested attributes, e.g. { category: "top" }.
export const matchItems = async (attributes, { limit } = {}) => {
  const { data } = await api.post("/items/match", { attributes, ...(limit ? { limit } : {}) });
  return data.results;
};
