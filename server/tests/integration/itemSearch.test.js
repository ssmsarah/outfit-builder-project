// I7.4: HTTP-level tests for GET /api/items/search and POST /api/items/match
// (POST /api/outfits/recommend is covered in outfitRecommend.test.js).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../src/app.js";
import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/memoryDb.js";
import Product from "../../src/models/Product.js";
import User from "../../src/models/User.js";
import { invalidateSearchIndex } from "../../src/services/searchService.js";

async function createSeller() {
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

describe("item search & match API - integration", () => {
  let products;

  beforeAll(async () => {
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    invalidateSearchIndex();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    invalidateSearchIndex();

    const seller = await createSeller();
    const base = { price: 1000, store: "Store", seller: seller._id, image: "https://example.com/x.jpg", available: true, stock: 5 };

    products = {
      tee: await Product.create({ ...base, name: "Black Cotton Tee", category: ["tops"], colors: ["black"], style: "casual" }),
      trousers: await Product.create({ ...base, name: "Black Tailored Trousers", category: ["bottoms"], colors: ["black"], style: "formal" }),
      sneakers: await Product.create({ ...base, name: "White Canvas Sneakers", category: ["shoes"], colors: ["white"] }),
      shirt: await Product.create({ ...base, name: "Navy Oxford Shirt", category: ["formals"], colors: ["navy"], style: "smart_casual", discountType: "percentage", discountValue: 10 }),
    };
  });

  describe("GET /api/items/search", () => {
    it("200: returns ranked results with the score breakdown and parsed attributes", async () => {
      const res = await request(app).get("/api/items/search").query({ q: "blak casul tee" });

      expect(res.status).toBe(200);
      expect(res.body.parsedAttributes).toEqual({ color: "black", style: "casual", category: "top" });
      expect(res.body.results.length).toBeGreaterThan(0);

      const [top] = res.body.results;
      expect(top.item._id).toBe(products.tee._id.toString());
      expect(top.item).toMatchObject({ name: "Black Cotton Tee", image: expect.any(String), price: 1000, outfitCategory: "top", colorName: "black" });
      expect(top).toEqual(
        expect.objectContaining({
          hybridScore: expect.any(Number),
          searchScore: expect.any(Number),
          matchScore: expect.any(Number),
          matched: expect.any(Array),
          missed: expect.any(Array),
        })
      );
    });

    it("200: a category in the query filters other categories out", async () => {
      const res = await request(app).get("/api/items/search").query({ q: "black top" });
      const names = res.body.results.map((r) => r.item.name);
      expect(names).toContain("Black Cotton Tee");
      expect(names).not.toContain("Black Tailored Trousers");
    });

    it("200: returns the discounted price as `price`", async () => {
      const res = await request(app).get("/api/items/search").query({ q: "navy oxford shirt" });
      expect(res.body.results[0].item).toMatchObject({ price: 900, originalPrice: 1000 });
    });

    it("200: supports limit and offset", async () => {
      const all = await request(app).get("/api/items/search").query({ q: "black", limit: 10 });
      const page = await request(app).get("/api/items/search").query({ q: "black", limit: 1, offset: 1 });

      expect(page.status).toBe(200);
      expect(page.body.results).toHaveLength(1);
      expect(page.body.results[0].item._id).toBe(all.body.results[1].item._id);
      expect(page.body.total).toBe(all.body.total);
    });

    it("200: an unmatched query returns an empty list", async () => {
      const res = await request(app).get("/api/items/search").query({ q: "zzzz" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ results: [], parsedAttributes: {}, total: 0 });
    });

    it.each([
      [{}, /q .* is required/],
      [{ q: "" }, /q .* is required/],
      [{ q: "   " }, /q .* is required/],
      [{ q: "tee", limit: "0" }, /limit/],
      [{ q: "tee", limit: "abc" }, /limit/],
      [{ q: "tee", limit: "500" }, /limit/],
      [{ q: "tee", offset: "-1" }, /offset/],
    ])("400 for %j", async (query, message) => {
      const res = await request(app).get("/api/items/search").query(query);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(message);
    });
  });

  describe("POST /api/items/match", () => {
    it("200: returns items ranked by MatchScore with matched/missed", async () => {
      const res = await request(app)
        .post("/api/items/match")
        .send({ attributes: { category: "top", color: "black" }, limit: 5 });

      expect(res.status).toBe(200);
      const [first, ...rest] = res.body.results;
      expect(first.item.name).toBe("Black Cotton Tee");
      expect(first).toMatchObject({ matchScore: 1, matched: ["category", "color"], missed: [] });

      // category is a hard filter: only tops come back.
      expect(res.body.results.every((r) => r.item.outfitCategory === "top")).toBe(true);
      expect(rest.every((r) => r.matchScore <= first.matchScore)).toBe(true);
    });

    it("200: closest matches are returned even without an exact one", async () => {
      const res = await request(app).post("/api/items/match").send({ attributes: { category: "top", color: "blue" } });
      expect(res.body.results[0].item.name).toBe("Navy Oxford Shirt");
      expect(res.body.results[0].matchScore).toBeLessThan(1);
    });

    it("200: respects limit", async () => {
      const res = await request(app).post("/api/items/match").send({ attributes: { style: "casual" }, limit: 1 });
      expect(res.body.results).toHaveLength(1);
    });

    it.each([
      [{}, /attributes must be an object/],
      [{ attributes: "top" }, /attributes must be an object/],
      [{ attributes: {} }, /at least one attribute/],
      [{ attributes: { fabric: "wool" } }, /Unknown attribute "fabric"/],
      [{ attributes: { category: "hat" } }, /Invalid category "hat"/],
      [{ attributes: { color: "chartreuse" } }, /Invalid color "chartreuse"/],
      [{ attributes: { style: "gothic" } }, /Invalid style/],
      [{ attributes: { category: "top" }, limit: 0 }, /limit/],
    ])("400 for %j", async (body, message) => {
      const res = await request(app).post("/api/items/match").send(body);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(message);
    });
  });
});
