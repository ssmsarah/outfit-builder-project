import { CATEGORY_FLOW } from '../data/demoCatalog.js';

const COLOR_MATCHES = {
  neutral: ['neutral', 'light', 'dark', 'earth'],
  light: ['neutral', 'light', 'earth', 'warm'],
  dark: ['neutral', 'dark', 'light'],
  earth: ['neutral', 'earth', 'light', 'warm'],
  warm: ['neutral', 'earth', 'warm', 'light']
};

function arraysIntersect(a = [], b = []) {
  return a.some((item) => b.includes(item));
}

function getProductById(products, id) {
  return products.find((product) => product.id === id) ?? null;
}

function pairScore(a, b) {
  if (!a || !b) {
    return { score: 0, reasons: [] };
  }

  const reasons = [];
  let score = 0;

  if (a.colorFamily === b.colorFamily || (COLOR_MATCHES[a.colorFamily] ?? []).includes(b.colorFamily)) {
    score += 25;
    reasons.push('color matched');
  }

  if (arraysIntersect(a.styleTags, b.styleTags)) {
    score += 25;
    reasons.push('style aligned');
  }

  if (arraysIntersect(a.occasion, b.occasion)) {
    score += 20;
    reasons.push('occasion compatible');
  }

  if (arraysIntersect(a.season, b.season)) {
    score += 15;
    reasons.push('season compatible');
  }

  if (Math.abs(a.price - b.price) <= 40) {
    score += 10;
    reasons.push('price band matched');
  }

  if (a.fitType && b.fitType) {
    const fitHarmony =
      (a.fitType === 'fitted' && ['straight', 'wide', 'balanced'].includes(b.fitType)) ||
      (a.fitType === 'relaxed' && ['straight', 'balanced', 'light'].includes(b.fitType)) ||
      (a.fitType === 'flowy' && ['structured', 'balanced', 'light'].includes(b.fitType)) ||
      a.fitType === b.fitType;

    if (fitHarmony) {
      score += 5;
      reasons.push('fit balance matched');
    }
  }

  return { score: Math.min(100, score), reasons };
}

function getSelectedProducts(products, selectedIds) {
  return {
    top: getProductById(products, selectedIds.top),
    bottom: getProductById(products, selectedIds.bottom),
    shoes: getProductById(products, selectedIds.shoes),
    accessories: selectedIds.accessories.map((id) => getProductById(products, id)).filter(Boolean)
  };
}

export function calculateTotalPrice(selectedProducts) {
  return selectedProducts.filter(Boolean).reduce((sum, product) => sum + product.price, 0);
}

export function calculateCompatibilityScore(products, selectedIds) {
  const selected = getSelectedProducts(products, selectedIds);
  const pairings = [
    [selected.top, selected.bottom],
    [selected.bottom, selected.shoes],
    [selected.top, selected.shoes],
    ...selected.accessories.map((accessory) => [selected.top, accessory]),
    ...selected.accessories.map((accessory) => [selected.bottom, accessory]),
    ...selected.accessories.map((accessory) => [selected.shoes, accessory])
  ];

  const pairResults = pairings.map(([a, b]) => pairScore(a, b)).filter((result) => result.score > 0);
  const baseScore = pairResults.length
    ? pairResults.reduce((sum, result) => sum + result.score, 0) / pairResults.length
    : 0;
  const completionBonus = selected.top && selected.bottom && selected.shoes ? 10 : 0;

  return {
    score: Math.max(0, Math.min(100, Math.round(baseScore + completionBonus))),
    breakdown: pairResults.flatMap((result) => result.reasons),
    warnings: selected.bottom && !selected.top ? ['Choose a Top first to unlock recommendations.'] : []
  };
}

export function getNextCategory(selectedIds) {
  if (!selectedIds.top) {
    return 'top';
  }

  if (!selectedIds.bottom) {
    return 'bottom';
  }

  if (!selectedIds.shoes) {
    return 'shoes';
  }

  if (selectedIds.accessories.length === 0) {
    return 'accessories';
  }

  return 'review';
}

export function getRecommendations(products, selectedIds, targetCategory, limit = 4) {
  const selected = getSelectedProducts(products, selectedIds);
  const candidatePool = products.filter((product) => product.category === targetCategory || CATEGORY_FLOW.includes(product.category));

  return candidatePool
    .map((candidate) => {
      const pairings = [selected.top, selected.bottom, selected.shoes, ...selected.accessories]
        .filter(Boolean)
        .map((item) => pairScore(item, candidate));

      const recommendationScore = pairings.length
        ? Math.round(pairings.reduce((sum, result) => sum + result.score, 0) / pairings.length)
        : 0;

      return {
        ...candidate,
        recommendationScore,
        reasonCodes: pairings.flatMap((result) => result.reasons).slice(0, 4)
      };
    })
    .filter((candidate) => candidate.category === targetCategory)
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

export function buildSelectedProducts(products, selectedIds) {
  const selected = getSelectedProducts(products, selectedIds);
  return [selected.top, selected.bottom, selected.shoes, ...selected.accessories].filter(Boolean);
}
