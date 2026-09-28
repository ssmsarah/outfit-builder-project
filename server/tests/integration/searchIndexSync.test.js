// S6.9 (service layer): the cached catalog search index stays consistent
// with product create/edit/delete done through the real HTTP routes, and
// with seller approval changes.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/memoryDb.js";
import Product from "../../src/models/Product.js";
import User from "../../src/models/User.js";
import { search, getSearchIndex, invalidateSearchIndex } from "../../src/services/searchService.js";

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

const tokenFor = (user, role = user.role) =>
  jwt.sign({ userId: user._id.toString(), role }, process.env.JWT_SECRET, { expiresIn: "1h" });

const productBody = (overrides) => ({
  price: 1000,
  image: "https://example.com/item.jpg",
  available: true,
  stock: 5,
  ...overrides,
});

const ids = (results) => results.map((r) => r.itemId);

describe("search index sync - integration", () => {
  const originalSecret = process.env.JWT_SECRET;
  let seller;
  let sellerToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    invalidateSearchIndex();
    await disconnectTestDb();
    process.env.JWT_SECRET = originalSecret;
  });

  beforeEach(async () => {
    await clearTestDb();
    invalidateSearchIndex();
    seller = await createSeller();
    sellerToken = tokenFor(seller);
  });

  async function createViaApi(body, token = sellerToken) {
    const res = await request(app).post("/api/products").set("Authorization", `Bearer ${token}`).send(body);
    expect(res.status).toBe(201);
    return res.body;
  }

  it("builds the index lazily on first search from the storefront catalog", async () => {
    await Product.create({ ...productBody({ name: "Black Cotton Tee", category: ["tops"], colors: ["black"] }), store: "Store", seller: seller._id });

    const results = await search("black tee", null);
    expect(results[0].item.name).toBe("Black Cotton Tee");
    expect(results[0]).toEqual(
      expect.objectContaining({ itemId: expect.any(String), score: expect.any(Number), sWord: expect.any(Number), sChar: expect.any(Number) })
    );
  });

  it("after adding a new item through the API, a search immediately finds it", async () => {
    await search("warm up the index", null);

    const created = await createViaApi(productBody({ name: "Velvet Blazer", category: ["formals"], colors: ["maroon"] }));

    expect(ids(await search("velvet blazer", null))[0]).toBe(created._id);
  });

  it("after deleting through the API, the item never appears", async () => {
    const created = await createViaApi(productBody({ name: "Velvet Blazer", category: ["formals"], colors: ["maroon"] }));
    expect(ids(await search("velvet blazer", null))).toContain(created._id);

    const res = await request(app).delete(`/api/products/${created._id}`).set("Authorization", `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);

    for (const query of ["velvet blazer", "blazer", "maroon", "velvet"]) {
      expect(ids(await search(query, null, { minScore: 0 }))).not.toContain(created._id);
    }
  });

  it("an admin delete also removes the item", async () => {
    const created = await createViaApi(productBody({ name: "Velvet Blazer", category: ["formals"] }));
    await search("velvet", null);

    const admin = await User.create({
      name: "Admin", email: "admin@example.com", phone: "1", address: "x", password: "password123", role: "admin",
    });
    const res = await request(app).delete(`/api/admin/products/${created._id}`).set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(200);

    expect(ids(await search("velvet blazer", null, { minScore: 0 }))).not.toContain(created._id);
  });

  it("an edit through the API re-indexes the item under its new text", async () => {
    const created = await createViaApi(productBody({ name: "Velvet Blazer", category: ["formals"] }));
    await search("velvet", null);

    const res = await request(app)
      .put(`/api/products/${created._id}`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ name: "Linen Overshirt" });
    expect(res.status).toBe(200);

    expect(ids(await search("linen overshirt", null))[0]).toBe(created._id);
    expect(ids(await search("velvet", null, { minScore: 0 }))).not.toContain(created._id);
  });

  it("marking an item unavailable removes it from search", async () => {
    const created = await createViaApi(productBody({ name: "Velvet Blazer", category: ["formals"] }));
    await search("velvet", null);

    await request(app).put(`/api/products/${created._id}`).set("Authorization", `Bearer ${sellerToken}`).send({ available: false });

    expect(ids(await search("velvet blazer", null, { minScore: 0 }))).not.toContain(created._id);
  });

  it("products of a pending seller are not indexed until the seller is approved", async () => {
    const pending = await createSeller("pending");
    const created = await createViaApi(productBody({ name: "Velvet Blazer", category: ["formals"] }), tokenFor(pending));
    expect(ids(await search("velvet blazer", null, { minScore: 0 }))).not.toContain(created._id);

    const admin = await User.create({
      name: "Admin", email: "admin2@example.com", phone: "1", address: "x", password: "password123", role: "admin",
    });
    const res = await request(app)
      .patch(`/api/admin/sellers/${pending._id}/approve`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(200);

    expect(ids(await search("velvet blazer", null))[0]).toBe(created._id);
  });

  it("the incrementally maintained index equals a fresh rebuild from the DB", async () => {
    const a = await createViaApi(productBody({ name: "Black Cotton Tee", category: ["tops"], colors: ["black"] }));
    await search("tee", null);
    const b = await createViaApi(productBody({ name: "Blue Denim Jeans", category: ["bottoms"], colors: ["blue"] }));
    await createViaApi(productBody({ name: "White Canvas Sneakers", category: ["shoes"], colors: ["white"] }));
    await request(app).put(`/api/products/${a._id}`).set("Authorization", `Bearer ${sellerToken}`).send({ name: "Black Crew Tee" });
    await request(app).delete(`/api/products/${b._id}`).set("Authorization", `Bearer ${sellerToken}`);

    const queries = ["black tee", "crew", "jeans", "white sneakrs", "blue"];
    const incremental = await Promise.all(queries.map((q) => search(q, null, { minScore: 0 })));

    invalidateSearchIndex();
    const rebuilt = await Promise.all(queries.map((q) => search(q, null, { minScore: 0 })));

    const strip = (lists) => lists.map((list) => list.map(({ item, ...rest }) => rest));
    expect(strip(incremental)).toEqual(strip(rebuilt));
  });

  it("concurrent first searches share one index build", async () => {
    await createViaApi(productBody({ name: "Black Cotton Tee", category: ["tops"] }));
    invalidateSearchIndex();
    const [x, y] = await Promise.all([getSearchIndex(), getSearchIndex()]);
    expect(x).toBe(y);
  });
});
