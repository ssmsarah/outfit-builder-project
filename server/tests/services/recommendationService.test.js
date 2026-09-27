import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/memoryDb.js";
import { getOutfitRecommendations, AnchorNotFoundError } from "../../src/services/recommendationService.js";
import { logInteraction } from "../../src/services/interactionService.js";
import Product from "../../src/models/Product.js";
import User from "../../src/models/User.js";

async function createSeller(sellerStatus = "approved") {
  return User.create({
    name: "Seller",
    storeName: "Store",
    email: `seller-${new mongoose.Types.ObjectId()}@example.com`,
    phone: "1234567890",
    address: "Somewhere",
    panVat: "PAN123",
    password: "password123",
    role: "seller",
    sellerStatus,
  });
}

async function createCustomer() {
  return User.create({
    name: "Customer",
    email: `customer-${new mongoose.Types.ObjectId()}@example.com`,
    password: "password123",
    role: "user",
  });
}

function productData(overrides) {
  return {
    price: 1000,
    store: "Store",
    image: "https://example.com/item.jpg",
    available: true,
    stock: 5,
    ...overrides,
  };
}

describe("getOutfitRecommendations - real DB integration", () => {
  beforeAll(async () => {
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("throws AnchorNotFoundError for a nonexistent anchor id", async () => {
    await expect(
      getOutfitRecommendations({ anchorItemId: new mongoose.Types.ObjectId().toString() })
    ).rejects.toBeInstanceOf(AnchorNotFoundError);
  });

  it("generates outfits for an anonymous caller using cold-start (alpha=1.0)", async () => {
    const seller = await createSeller();
    const top = await Product.create(productData({ name: "Top", category: ["tops"], seller: seller._id, colors: ["black"] }));
    await Product.create(productData({ name: "Bottom", category: ["bottoms"], seller: seller._id, colors: ["blue"] }));
    await Product.create(productData({ name: "Shoes", category: ["shoes"], seller: seller._id, colors: ["white"] }));

    const outfits = await getOutfitRecommendations({ anchorItemId: top._id.toString(), occasion: "casual" });

    expect(outfits.length).toBeGreaterThan(0);
    for (const outfit of outfits) {
      expect(outfit.alpha).toBe(1.0);
      expect(outfit.finalScore).toBe(outfit.compatibilityScore); // coldStart collapse, per T3.6
      expect(outfit.products.length).toBe(outfit.items.length);
    }
  });

  it("excludes products from unapproved sellers, even if otherwise a perfect match", async () => {
    const approvedSeller = await createSeller("approved");
    const pendingSeller = await createSeller("pending");

    const top = await Product.create(productData({ name: "Top", category: ["tops"], seller: approvedSeller._id, colors: ["black"] }));
    await Product.create(productData({ name: "Bottom", category: ["bottoms"], seller: approvedSeller._id, colors: ["blue"] }));
    await Product.create(productData({ name: "Shoes", category: ["shoes"], seller: approvedSeller._id, colors: ["white"] }));
    const pendingBottom = await Product.create(
      productData({ name: "Pending Bottom", category: ["bottoms"], seller: pendingSeller._id, colors: ["blue"] })
    );

    const outfits = await getOutfitRecommendations({ anchorItemId: top._id.toString() });

    const usedProductIds = outfits.flatMap((o) => o.items);
    expect(usedProductIds).not.toContain(pendingBottom._id.toString());
  });

  it("excludes unavailable products", async () => {
    const seller = await createSeller();
    const top = await Product.create(productData({ name: "Top", category: ["tops"], seller: seller._id, colors: ["black"] }));
    await Product.create(productData({ name: "Bottom", category: ["bottoms"], seller: seller._id, colors: ["blue"] }));
    const unavailableShoes = await Product.create(
      productData({ name: "Unavailable Shoes", category: ["shoes"], seller: seller._id, colors: ["white"], available: false })
    );

    // No available shoes at all -> generateOutfits should return [], not throw
    // (T2.7's "returns fewer than topN without error" behavior).
    const outfits = await getOutfitRecommendations({ anchorItemId: top._id.toString() });
    const usedProductIds = outfits.flatMap((o) => o.items);
    expect(usedProductIds).not.toContain(unavailableShoes._id.toString());
    expect(outfits).toEqual([]);
  });

  it("gives a logged-in user with real interactions a non-cold-start alpha and reflects their preferences", async () => {
    const seller = await createSeller();
    const customer = await createCustomer();

    const top = await Product.create(productData({ name: "Top", category: ["tops"], seller: seller._id, colors: ["black"] }));
    const lovedBottom = await Product.create(
      productData({ name: "Loved Bottom", category: ["bottoms"], seller: seller._id, colors: ["blue"] })
    );
    await Product.create(productData({ name: "Other Bottom", category: ["bottoms"], seller: seller._id, colors: ["red"] }));
    await Product.create(productData({ name: "Shoes", category: ["shoes"], seller: seller._id, colors: ["white"] }));

    // Enough real, persisted interactions to clear minInteractions (5).
    await logInteraction({ userId: customer._id, itemId: lovedBottom._id, type: "like" });
    await logInteraction({ userId: customer._id, itemId: lovedBottom._id, type: "purchase" });
    await logInteraction({ userId: customer._id, itemId: lovedBottom._id, type: "view" });
    await logInteraction({ userId: customer._id, itemId: lovedBottom._id, type: "view" });
    await logInteraction({ userId: customer._id, itemId: lovedBottom._id, type: "view" });

    const outfits = await getOutfitRecommendations({
      anchorItemId: top._id.toString(),
      userId: customer._id,
    });

    expect(outfits.length).toBeGreaterThan(0);
    expect(outfits[0].alpha).toBe(0.7); // default alpha, not cold start
    for (const outfit of outfits) {
      expect(outfit.preferenceScore).toBeGreaterThanOrEqual(0);
      expect(outfit.preferenceScore).toBeLessThanOrEqual(1);
    }
  });
});
