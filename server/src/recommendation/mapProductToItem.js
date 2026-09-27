// Adapter between real marketplace data (a Product Mongoose document, a
// `.lean()` plain object, or any record shaped like Product) and the plain
// "item" object the pure algorithm layer consumes (category/colorHex/style/
// pattern/seasons/occasions/isNeutralOverride - see itemEnums.js and the
// T0.4 Decision Log for why the field names differ from Product's).
//
// This does NOT trust that Product's pre-validate derivation hook already
// ran: `.lean()` reads skip Mongoose hooks entirely, and the hook only
// fires on write, so a legacy document that predates T0.2 and was never
// re-saved or migrated will reach this function with outfitCategory/
// colorHex/etc. still undefined. mapProductToItem re-applies the same
// derivation fallbacks independently, so the algorithm layer gets a valid,
// fully-populated item no matter which of those states the real record is
// in. This is what makes it safe to run the recommender against real,
// user-fed marketplace data - not just the T0.4 fixtures.
import {
  deriveOutfitCategory,
  deriveColorHex,
  deriveIsNeutralOverride,
  DEFAULT_STYLE,
  DEFAULT_PATTERN,
  ALL_SEASONS,
  DEFAULT_OCCASIONS,
} from "../utils/outfitAttributeDefaults.js";

export function mapProductToItem(product) {
  if (!product) {
    throw new Error("mapProductToItem: product is required");
  }

  const id = product.id ?? product._id;
  if (!id) {
    throw new Error("mapProductToItem: product is missing an id/_id");
  }

  const legacyCategories = Array.isArray(product.category) ? product.category : [];
  const legacyColors = Array.isArray(product.colors) ? product.colors : [];

  const category = product.outfitCategory || deriveOutfitCategory(legacyCategories);
  const colorHex = product.colorHex || deriveColorHex(legacyColors);

  const isNeutralOverride =
    product.isNeutralOverride !== undefined
      ? product.isNeutralOverride
      : deriveIsNeutralOverride(legacyColors);

  const style = product.style || DEFAULT_STYLE;
  const pattern = product.pattern || DEFAULT_PATTERN;

  const seasons =
    Array.isArray(product.seasons) && product.seasons.length > 0
      ? product.seasons
      : [...ALL_SEASONS];

  const occasions =
    Array.isArray(product.occasions) && product.occasions.length > 0
      ? product.occasions
      : [...DEFAULT_OCCASIONS];

  const item = {
    id: String(id),
    category,
    colorHex,
    style,
    pattern,
    seasons,
    occasions,
  };

  if (isNeutralOverride) {
    item.isNeutralOverride = true;
  }

  return item;
}
