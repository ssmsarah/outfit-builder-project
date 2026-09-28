// Recommendation Service (T4.1): the integration point between real
// MongoDB data (Product, User, Interaction) and the pure algorithm layer
// (server/src/recommendation/**). Only reached when the "scored" recommender
// mode is active (see config/recommenderMode.js) - the controller checks
// that before calling in here.
import { getStorefrontProducts } from "./productService.js";
import { getUserInteractions } from "./interactionService.js";
import { mapProductToItem } from "../recommendation/mapProductToItem.js";
import { generatePersonalizedOutfits } from "../recommendation/personalization/finalRanker.js";
import { resolveAlpha } from "../recommendation/personalization/alpha.js";
import { buildAttributeProfile, buildUserAffinityContext } from "../recommendation/personalization/attributeProfile.js";
import { scoringConfig } from "../config/scoringConfig.js";
import { applyItemRules } from "../recommendation/rules/ruleEngine.js";

export class AnchorNotFoundError extends Error {
  constructor(anchorItemId) {
    super(`Anchor product "${anchorItemId}" not found`);
    this.name = "AnchorNotFoundError";
  }
}

async function resolvePersonalization(userId, wardrobeItems, now) {
  if (!userId) {
    return {
      profile: buildAttributeProfile([]),
      preferenceScores: new Map(),
      alpha: resolveAlpha({ isAnonymous: true }),
    };
  }

  const interactions = await getUserInteractions(userId);
  const itemsById = Object.fromEntries(wardrobeItems.map((item) => [item.id, item]));
  const { profile, preferenceScores } = buildUserAffinityContext(interactions, itemsById, { now });
  const alpha = resolveAlpha({ interactionCount: interactions.length });

  return { profile, preferenceScores, alpha };
}

// occasion/season are passed straight through as targetOccasion/targetSeason
// (T2.3's semantics: omitted -> Jaccard for occasion, current-date-derived
// for season). limit defaults to scoringConfig.generation.topN.
//
// Returns { outfits, ruleMessages }. ruleMessages is empty unless the anchor
// itself fails a hard rule for the requested context (I7.3), in which case
// outfits is [] and ruleMessages says why - no error is thrown.
export async function getOutfitRecommendations({ anchorItemId, userId, occasion, season, limit, now = new Date() }) {
  const products = await getStorefrontProducts();
  const anchorProduct = products.find((p) => p._id.toString() === String(anchorItemId));

  if (!anchorProduct) {
    throw new AnchorNotFoundError(anchorItemId);
  }

  const wardrobeItems = products.map(mapProductToItem);
  const anchorItem = mapProductToItem(anchorProduct);
  const context = { targetOccasion: occasion, targetSeason: season };

  const anchorRules = applyItemRules(anchorItem, context);
  if (!anchorRules.allowed) {
    return { outfits: [], ruleMessages: anchorRules.messages };
  }

  const personalization = await resolvePersonalization(userId, wardrobeItems, now);
  const topN = limit ?? scoringConfig.generation.topN;

  const outfits = generatePersonalizedOutfits(anchorItem, wardrobeItems, context, personalization, topN);

  // Enrich each outfit's item ids with the display fields the client needs
  // (name/image/price) - the algorithm layer only ever sees category/color/
  // style/pattern/etc, never product metadata.
  const productsById = Object.fromEntries(products.map((p) => [p._id.toString(), p]));
  return {
    outfits: outfits.map((outfit) => ({
      ...outfit,
      products: outfit.items.map((id) => {
        const p = productsById[id];
        return { id, name: p.name, image: p.image, price: p.finalPrice };
      }),
    })),
    ruleMessages: [],
  };
}
