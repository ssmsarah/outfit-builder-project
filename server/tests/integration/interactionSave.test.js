import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/memoryDb.js";
import User from "../../src/models/User.js";
import Interaction from "../../src/models/Interaction.js";

describe("POST /api/interactions/save - integration", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  async function authedUser() {
    const user = await User.create({
      name: "Customer",
      email: `customer-${new mongoose.Types.ObjectId()}@example.com`,
      password: "password123",
      role: "user",
    });
    const token = jwt.sign({ userId: user._id.toString(), role: "user" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    return { user, token };
  }

  it("401: requires authentication", async () => {
    const res = await request(app)
      .post("/api/interactions/save")
      .send({ itemIds: [new mongoose.Types.ObjectId().toString()] });
    expect(res.status).toBe(401);
  });

  it("400: rejects a missing/empty itemIds array", async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post("/api/interactions/save")
      .set("Authorization", `Bearer ${token}`)
      .send({ itemIds: [] });
    expect(res.status).toBe(400);
  });

  it("200: logs a save interaction for every item, with no outfitId", async () => {
    const { user, token } = await authedUser();
    const itemIds = [new mongoose.Types.ObjectId().toString(), new mongoose.Types.ObjectId().toString()];

    const res = await request(app)
      .post("/api/interactions/save")
      .set("Authorization", `Bearer ${token}`)
      .send({ itemIds });

    expect(res.status).toBe(200);
    expect(res.body.itemCount).toBe(2);

    const saved = await Interaction.find({ userId: user._id, type: "save" });
    expect(saved).toHaveLength(2);
    expect(saved.every((s) => s.outfitId === undefined)).toBe(true);
  });
});
