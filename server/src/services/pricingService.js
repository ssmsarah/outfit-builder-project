import { buildSelectedProducts, calculateTotalPrice } from '../utils/outfitEngine.js';
import { listProducts } from './productService.js';

export async function calculateOutfitPrice(selectedIds, products = null) {
  const catalog = products ?? (await listProducts());
  const selectedProducts = buildSelectedProducts(catalog, selectedIds);
  const subtotal = calculateTotalPrice(selectedProducts);

  return {
    subtotal,
    discountAmount: 0,
    finalTotal: subtotal
  };
}
