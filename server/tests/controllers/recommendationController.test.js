import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";
import { recommendOutfits } from "../../src/controllers/recommendationController.js";
import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/memoryDb.js";
import Product from "../../src/models/Product.js";
import User from "../../src/models/User.js";

function mockRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

async function createApprovedSeller() {
  return User.create({
    name: "Seller",
    storeName: "Store",
    email: `seller-${new mongoose.Types.ObjectId()}@example.com`,
    phone: "1234567890",
    address: "Somewhere",
    panVat: "PAN123",
    password: "password123",
    role: "seller",
    sellerStatus: "approved",
  });
}

describe("recommendOutfits controller", () => {
  const originalMode = process.env.RECOMMENDER;

  beforeAll(async () => {
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  afterEach(() => {
    if (originalMode === undefined) delete process.env.RECOMMENDER;
    else process.env.RECOMMENDER = originalMode;
  });

  it("returns 503 when RECOMMENDER=legacy, without touching the database", async () => {
    process.env.RECOMMENDER = "legacy";
    const req = { body: { anchorItemId: "000000000000000000000000" } };
    const res = mockRes();

    await recommendOutfits(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body.message).toMatch(/disabled/);
  });

  it("returns 400 when anchorItemId is missing (RECOMMENDER=scored)", async () => {
    process.env.RECOMMENDER = "scored";
    const req = { body: {} };
    const res = mockRes();

    await recommendOutfits(req, res);

    expect(res.statusCode).toBe(400);
  });

  it("returns 404 when the anchor product doesn't exist", async () => {
    process.env.RECOMMENDER = "scored";
    const req = { body: { anchorItemId: new mongoose.Types.ObjectId().toString() } };
    const res = mockRes();

    await recommendOutfits(req, res);

    expect(res.statusCode).toBe(404);
  });

  it("returns 200 with outfits for a valid anchor when RECOMMENDER=scored", async () => {
    process.env.RECOMMENDER = "scored";
    const seller = await createApprovedSeller();

    const top = await Product.create({
      name: "Top", price: 1000, category: ["tops"], store: "Store", seller: seller._id,
      image: "https://example.com/top.jpg", colors: ["black"], available: true, stock: 5,
    });
    await Product.create({
      name: "Bottom", price: 1500, category: ["bottoms"], store: "Store", seller: seller._id,
      image: "https://example.com/bottom.jpg", colors: ["blue"], available: true, stock: 5,
    });
    await Product.create({
      name: "Shoes", price: 2000, category: ["shoes"], store: "Store", seller: seller._id,
      image: "https://example.com/shoes.jpg", colors: ["white"], available: true, stock: 5,
    });

    const req = { body: { anchorItemId: top._id.toString(), occasion: "casual" } };
    const res = mockRes();

    await recommendOutfits(req, res);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.outfits)).toBe(true);
    expect(res.body.outfits.length).toBeGreaterThan(0);
    for (const outfit of res.body.outfits) {
      expect(outfit).toHaveProperty("finalScore");
      expect(outfit).toHaveProperty("products");
      expect(outfit.products.every((p) => p.name && p.image)).toBe(true);
    }
  });
});
