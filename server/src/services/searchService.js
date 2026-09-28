// Search Service (S6.9): the data layer around the pure search index
// (recommendation/search/searchIndex.js).
//
// The storefront catalog is shared by every shopper (there is no per-user
// wardrobe), so one catalog index is built on the first search and cached
// in memory. Product create/edit/delete call addItem/updateItem/removeItem
// to keep it current; the index stores raw counts and recomputes IDF lazily
// on the next search. Seller approval changes affect many products at once,
// so those invalidate the cache and the next search rebuilds it.
import { getStorefrontProducts, isStorefrontProduct } from "./productService.js";
import { mapProductToItem } from "../recommendation/mapProductToItem.js";
import { createSearchIndex, indexItem, removeItem as removeFromIndex, searchIndex } from "../recommendation/search/searchIndex.js";
import { hybridSearch as hybridSearchIndex } from "../recommendation/search/hybridSearch.js";
import { colorName } from "../recommendation/search/colorNames.js";
import { matchItems } from "../recommendation/rules/attributeMatcher.js";
import { searchConfig } from "../config/searchConfig.js";

// The algorithm item (mapProductToItem) plus the display fields the client
// needs. Search and matching ignore `product`; the API returns it.
function toIndexedItem(product) {
  return {
    ...mapProductToItem(product),
    product: {
      _id: String(product._id ?? product.id),
      name: product.name,
      image: product.image,
      price: product.finalPrice ?? product.price,
      originalPrice: product.price,
      store: product.store,
      category: product.category,
      colors: product.colors,
    },
  };
}

// API shape: the product's display fields plus the attributes the ranking
// used, so the client can show why an item matched.
export function toApiItem(item) {
  return {
    ...item.product,
    outfitCategory: item.category,
    colorName: colorName(item.colorHex),
    style: item.style,
    pattern: item.pattern,
    seasons: item.seasons,
    occasions: item.occasions,
  };
}

let catalogIndex = null;
let buildPromise = null;
// Changes that arrive while the index is being built from a DB snapshot are
// queued and replayed on top of it, so none are lost.
let pendingChanges = [];

async function buildCatalogIndex() {
  const products = await getStorefrontProducts();
  const index = createSearchIndex(products.map(toIndexedItem));

  for (const apply of pendingChanges) apply(index);
  pendingChanges = [];

  return index;
}

export async function getSearchIndex() {
  if (catalogIndex) return catalogIndex;

  if (!buildPromise) {
    buildPromise = buildCatalogIndex()
      .then((index) => {
        catalogIndex = index;
        return index;
      })
      .finally(() => {
        buildPromise = null;
      });
  }

  return buildPromise;
}

function applyChange(change) {
  if (catalogIndex) change(catalogIndex);
  else if (buildPromise) pendingChanges.push(change);
  // No index yet: the first search builds it from the DB, change included.
}

// Adds or replaces a product. A product that is no longer on the
// storefront (unavailable, or its seller is not approved) is removed.
export async function addItem(product) {
  const id = String(product._id ?? product.id);

  if (await isStorefrontProduct(product)) {
    const item = toIndexedItem(product);
    applyChange((index) => indexItem(index, item));
  } else {
    applyChange((index) => removeFromIndex(index, id));
  }
}

export const updateItem = addItem;

export function removeItem(productId) {
  const id = String(productId);
  applyChange((index) => removeFromIndex(index, id));
}

// Drops the cached index; the next search rebuilds it from the DB.
export function invalidateSearchIndex() {
  catalogIndex = null;
  pendingChanges = [];
}

// Runs an index update without ever failing the request that triggered it:
// if the incremental update throws, the cache is dropped so the next search
// rebuilds a correct index from the database.
export async function syncSearchIndex(update) {
  try {
    await update();
  } catch (error) {
    console.error("Search index update failed; index will be rebuilt:", error.message);
    invalidateSearchIndex();
  }
}

// search(query, userId, options) from the README. userId is accepted for
// the documented signature, but every shopper searches the same catalog.
export async function search(query, userId, options = {}) {
  const index = await getSearchIndex();
  return searchIndex(index, query, options).map((result) => ({
    ...result,
    item: index.items.get(result.itemId),
  }));
}

// I7.2 hybrid ranking over the catalog, for GET /api/items/search.
export async function hybridSearch(query, userId, options = {}) {
  const index = await getSearchIndex();
  const { results, parsedAttributes, total } = hybridSearchIndex(index, query, options);

  return {
    results: results.map((result) => ({ ...result, item: toApiItem(index.items.get(result.itemId)) })),
    parsedAttributes,
    total,
  };
}

// R5.7 attribute matching over the catalog, for POST /api/items/match.
export async function matchCatalog(attributes, { limit = searchConfig.defaultLimit } = {}) {
  const index = await getSearchIndex();

  return matchItems([...index.items.values()], attributes)
    .slice(0, limit)
    .map(({ item, score, matched, missed }) => ({ item: toApiItem(item), matchScore: score, matched, missed }));
}
