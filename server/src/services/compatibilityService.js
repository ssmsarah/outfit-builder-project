import { listProducts } from './productService.js';
import { calculateCompatibilityScore as scoreOutfit } from '../utils/outfitEngine.js';

export async function calculateCompatibilityScore(selectedIds, products = null) {
  const catalog = products ?? (await listProducts());
  return scoreOutfit(catalog, selectedIds);
}
