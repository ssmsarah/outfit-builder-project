// T4.2: real HTTP-level integration tests for POST /api/outfits/recommend -
// driven through the actual Express app (supertest), not by calling the
// controller function directly, so the route wiring/middleware/JSON body
// parsing are exercised too, not just the handler logic.
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/memoryDb.js";
import Product from "../../src/models/Product.js";
import User from "../../src/models/User.js";

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

describe("POST /api/outfits/recommend - integration", () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalMode = process.env.RECOMMENDER;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    await disconnectTestDb();
    process.env.JWT_SECRET = originalSecret;
  });

  beforeEach(async () => {
    await clearTestDb();
    process.env.RECOMMENDER = "scored";
  });

  afterEach(() => {
    if (originalMode === undefined) delete process.env.RECOMMENDER;
    else process.env.RECOMMENDER = originalMode;
  });

  it("success: returns 200 with T2.8+T3.7-shaped outfits for a valid anonymous request", async () => {
    const seller = await createApprovedSeller();
    const top = await Product.create(productData({ name: "Top", category: ["tops"], seller: seller._id, colors: ["black"] }));
    await Product.create(productData({ name: "Bottom", category: ["bottoms"], seller: seller._id, colors: ["blue"] }));
    await Product.create(productData({ name: "Shoes", category: ["shoes"], seller: seller._id, colors: ["white"] }));

    const res = await request(app)
      .post("/api/outfits/recommend")
      .send({ anchorItemId: top._id.toString(), occasion: "casual", limit: 3 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.outfits)).toBe(true);
    expect(res.body.outfits.length).toBeGreaterThan(0);
    expect(res.body.outfits.length).toBeLessThanOrEqual(3);

    const outfit = res.body.outfits[0];
    expect(outfit).toHaveProperty("items");
    expect(outfit).toHaveProperty("compatibilityScore");
    expect(outfit).toHaveProperty("breakdown");
    expect(outfit).toHaveProperty("colorRelations");
    expect(outfit).toHaveProperty("reasons");
    expect(outfit).toHaveProperty("preferenceScore");
    expect(outfit).toHaveProperty("finalScore");
    expect(outfit).toHaveProperty("alpha");
    expect(outfit).toHaveProperty("products");
    // I7.3: rule output per outfit
    expect(outfit).toHaveProperty("ruleAdjustment");
    expect(outfit).toHaveProperty("appliedRules");
    expect(outfit).toHaveProperty("adjustedCompatibilityScore");
    expect(res.body.ruleMessages).toEqual([]);
  });

  it("I7.3: an anchor that fails a hard rule returns 200 with no outfits and the rule message", async () => {
    const seller = await createApprovedSeller();
    const sportyTop = await Product.create(
      productData({ name: "Track Top", category: ["tops"], seller: seller._id, colors: ["red"], style: "sporty" })
    );
    await Product.create(productData({ name: "Bottom", category: ["bottoms"], seller: seller._id, colors: ["black"] }));
    await Product.create(productData({ name: "Shoes", category: ["shoes"], seller: seller._id, colors: ["black"] }));

    const res = await request(app)
      .post("/api/outfits/recommend")
      .send({ anchorItemId: sportyTop._id.toString(), occasion: "formal" });

    expect(res.status).toBe(200);
    expect(res.body.outfits).toEqual([]);
    expect(res.body.ruleMessages).toEqual(["Sporty or streetwear items are not suitable for formal occasions"]);
  });

  it("success: takes the user from the auth session (Bearer token) for personalization", async () => {
    const seller = await createApprovedSeller();
    const customer = await User.create({
      name: "Customer",
      email: `customer-${new mongoose.Types.ObjectId()}@example.com`,
      password: "password123",
      role: "user",
    });
    const token = jwt.sign({ userId: customer._id.toString(), role: "user" }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const top = await Product.create(productData({ name: "Top", category: ["tops"], seller: seller._id, colors: ["black"] }));
    await Product.create(productData({ name: "Bottom", category: ["bottoms"], seller: seller._id, colors: ["blue"] }));
    await Product.create(productData({ name: "Shoes", category: ["shoes"], seller: seller._id, colors: ["white"] }));

    const anon = await request(app).post("/api/outfits/recommend").send({ anchorItemId: top._id.toString() });
    const authed = await request(app)
      .post("/api/outfits/recommend")
      .set("Authorization", `Bearer ${token}`)
      .send({ anchorItemId: top._id.toString() });

    expect(anon.status).toBe(200);
    expect(authed.status).toBe(200);
    expect(anon.body.outfits[0].alpha).toBe(1.0); // anonymous -> cold start
    expect(authed.body.outfits[0].alpha).toBe(1.0); // <5 interactions -> still cold start, but resolved per-user
  });

  it("400: missing anchorItemId", async () => {
    const res = await request(app).post("/api/outfits/recommend").send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/anchorItemId/);
  });

  it("400: invalid occasion enum value", async () => {
    const res = await request(app)
      .post("/api/outfits/recommend")
      .send({ anchorItemId: new mongoose.Types.ObjectId().toString(), occasion: "brunch" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid occasion/);
  });

  it("400: invalid season enum value", async () => {
    const res = await request(app)
      .post("/api/outfits/recommend")
      .send({ anchorItemId: new mongoose.Types.ObjectId().toString(), season: "monsoon" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid season/);
  });

  it("404: unknown anchor item id", async () => {
    const res = await request(app)
      .post("/api/outfits/recommend")
      .send({ anchorItemId: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(404);
  });

  it("503: RECOMMENDER=legacy disables the endpoint", async () => {
    process.env.RECOMMENDER = "legacy";
    const res = await request(app)
      .post("/api/outfits/recommend")
      .send({ anchorItemId: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(503);
  });
});
