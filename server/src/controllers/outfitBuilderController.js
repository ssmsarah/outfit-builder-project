import { buildSelectedProducts, getNextCategory } from '../utils/outfitEngine.js';
import { calculateCompatibilityScore } from '../services/compatibilityService.js';
import { calculateOutfitPrice } from '../services/pricingService.js';
import { getRankedRecommendations } from '../services/recommendationService.js';
import { listSavedOutfits, persistOrder, persistSavedOutfit } from '../services/outfitStore.js';
import { validateOutfitPayload } from '../validators/outfitBuilderValidator.js';
import { listProducts } from '../services/productService.js';

function buildSelectedIds(body = {}) {
  return {
    top: body.topId ?? null,
    bottom: body.bottomId ?? null,
    shoes: body.shoesId ?? null,
    accessories: Array.isArray(body.accessoryIds) ? body.accessoryIds : []
  };
}

async function buildPreview(selectedIds, products = null) {
  const catalog = products ?? (await listProducts());
  const selectedProducts = buildSelectedProducts(catalog, selectedIds);
  const compatibility = await calculateCompatibilityScore(selectedIds, catalog);
  const pricing = await calculateOutfitPrice(selectedIds, catalog);
  const activeCategory = getNextCategory(selectedIds);
  const recommendationCategory = activeCategory === 'review' ? 'accessories' : activeCategory;

  return {
    selectedItems: selectedProducts,
    totalPrice: pricing.finalTotal,
    compatibilityScore: compatibility.score,
    ruleBreakdown: compatibility.breakdown,
    warnings: compatibility.warnings,
    nextRecommendations: await getRankedRecommendations({ selectedIds, category: recommendationCategory, limit: 4, products: catalog }),
    activeCategory
  };
}

export const getRecommendations = async (req, res) => {
  const selectedIds = buildSelectedIds(req.query);
  const category = req.query.category ?? getNextCategory(selectedIds);
  const catalog = await listProducts();
  const candidates = await getRankedRecommendations({ selectedIds, category, limit: Number(req.query.limit ?? 4), products: catalog });

  res.json({
    step: category,
    candidates,
    reasonCodes: candidates.flatMap((candidate) => candidate.reasonCodes),
    compatibilityContext: await calculateCompatibilityScore(selectedIds, catalog)
  });
};

export const previewOutfit = async (req, res) => {
  const selectedIds = buildSelectedIds(req.body);

  res.json(await buildPreview(selectedIds));
};

export const saveOutfit = async (req, res) => {
  const validation = validateOutfitPayload(req.body);

  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  const selectedIds = buildSelectedIds(req.body);
  const snapshot = await buildPreview(selectedIds);
  const saved = await persistSavedOutfit({
    userId: req.user.id,
    name: req.body.name ?? 'Saved Outfit',
    notes: req.body.notes ?? '',
    selectedIds,
    selectedTopId: selectedIds.top,
    selectedBottomId: selectedIds.bottom,
    selectedShoesId: selectedIds.shoes,
    selectedAccessoryIds: selectedIds.accessories,
    ...snapshot,
    status: 'saved'
  }, req.user.id);

  return res.status(201).json({ outfitId: saved._id, snapshot: saved, createdAt: saved.createdAt ?? new Date().toISOString() });
};

export const listOutfits = async (req, res) => {
  const outfits = await listSavedOutfits(req.user.id);
  res.json(outfits);
};

export const replaceItem = async (req, res) => {
  const { itemType, productId } = req.body;
  const allowedTypes = ['top', 'bottom', 'shoes', 'accessory'];

  if (!allowedTypes.includes(itemType)) {
    return res.status(400).json({ message: 'Invalid item type.' });
  }

  const selectedIds = buildSelectedIds(req.body);

  if (itemType === 'top') {
    selectedIds.top = productId;
  }

  if (itemType === 'bottom') {
    selectedIds.bottom = productId;
  }

  if (itemType === 'shoes') {
    selectedIds.shoes = productId;
  }

  if (itemType === 'accessory' && !selectedIds.accessories.includes(productId)) {
    selectedIds.accessories = [...selectedIds.accessories, productId];
  }

  return res.json(await buildPreview(selectedIds));
};

export const buyOutfit = async (req, res) => {
  const validation = validateOutfitPayload(req.body);

  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  const selectedIds = buildSelectedIds(req.body);
  const snapshot = await buildPreview(selectedIds);
  const order = await persistOrder({
    userId: req.user.id,
    selectedIds,
    selectedTopId: selectedIds.top,
    selectedBottomId: selectedIds.bottom,
    selectedShoesId: selectedIds.shoes,
    selectedAccessoryIds: selectedIds.accessories,
    ...snapshot,
    status: 'ordered'
  }, req.user.id);

  return res.status(201).json({ orderId: order._id, pricing: { finalTotal: snapshot.totalPrice }, stockValidation: 'ok' });
};

export const getOutfitRules = (_req, res) => {
  res.json([
    {
      ruleType: 'color',
      sourceCategory: 'top',
      targetCategory: 'bottom',
      weight: 25
    },
    {
      ruleType: 'style',
      sourceCategory: 'bottom',
      targetCategory: 'shoes',
      weight: 25
    }
  ]);
};
