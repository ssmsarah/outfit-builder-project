import { listProducts } from './productService.js';
import { getRecommendations as rankRecommendations } from '../utils/outfitEngine.js';

export async function getRankedRecommendations({ selectedIds, category, limit = 4, products = null }) {
  const catalog = products ?? (await listProducts());
  return rankRecommendations(catalog, selectedIds, category, limit);
}
