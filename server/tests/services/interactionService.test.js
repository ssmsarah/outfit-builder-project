import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/memoryDb.js";
import {
  logInteraction,
  removeLike,
  logOutfitSave,
  getUserInteractions,
  isLiked,
} from "../../src/services/interactionService.js";
import Interaction from "../../src/models/Interaction.js";

const userId = () => new mongoose.Types.ObjectId();
const itemId = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  await connectTestDb();
}, 60000);

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe("logInteraction - persistence", () => {
  it("persists an interaction that can be queried back by userId", async () => {
    const user = userId();
    const item = itemId();

    await logInteraction({ userId: user, itemId: item, type: "view" });

    const found = await Interaction.find({ userId: user });
    expect(found).toHaveLength(1);
    expect(found[0].itemId.toString()).toBe(item.toString());
    expect(found[0].type).toBe("view");
  });

  it("getUserInteractions returns only that user's interactions, newest first", async () => {
    const alice = userId();
    const bob = userId();

    await logInteraction({ userId: alice, itemId: itemId(), type: "view" });
    await new Promise((r) => setTimeout(r, 5));
    await logInteraction({ userId: alice, itemId: itemId(), type: "view" });
    await logInteraction({ userId: bob, itemId: itemId(), type: "view" });

    const aliceInteractions = await getUserInteractions(alice);
    expect(aliceInteractions).toHaveLength(2);
    expect(aliceInteractions[0].timestamp.getTime()).toBeGreaterThanOrEqual(
      aliceInteractions[1].timestamp.getTime()
    );
  });
});

describe("logInteraction - like is a toggle", () => {
  it("liking the same item twice does not create a duplicate interaction", async () => {
    const user = userId();
    const item = itemId();

    await logInteraction({ userId: user, itemId: item, type: "like" });
    await logInteraction({ userId: user, itemId: item, type: "like" });

    const likes = await Interaction.find({ userId: user, itemId: item, type: "like" });
    expect(likes).toHaveLength(1);
  });

  it("isLiked reflects the current toggle state", async () => {
    const user = userId();
    const item = itemId();

    expect(await isLiked({ userId: user, itemId: item })).toBe(false);
    await logInteraction({ userId: user, itemId: item, type: "like" });
    expect(await isLiked({ userId: user, itemId: item })).toBe(true);
    await removeLike({ userId: user, itemId: item });
    expect(await isLiked({ userId: user, itemId: item })).toBe(false);
  });

  it("re-liking after an unlike creates a fresh like (not blocked forever)", async () => {
    const user = userId();
    const item = itemId();

    await logInteraction({ userId: user, itemId: item, type: "like" });
    await removeLike({ userId: user, itemId: item });
    await logInteraction({ userId: user, itemId: item, type: "like" });

    const likes = await Interaction.find({ userId: user, itemId: item, type: "like" });
    expect(likes).toHaveLength(1);
  });

  it("view/save/purchase are append-only and do NOT dedupe like 'like' does", async () => {
    const user = userId();
    const item = itemId();

    await logInteraction({ userId: user, itemId: item, type: "view" });
    await logInteraction({ userId: user, itemId: item, type: "view" });
    await logInteraction({ userId: user, itemId: item, type: "view" });

    const views = await Interaction.find({ userId: user, itemId: item, type: "view" });
    expect(views).toHaveLength(3);
  });
});

describe("logOutfitSave", () => {
  it("logs a save interaction for every item in the outfit", async () => {
    const user = userId();
    const outfit = new mongoose.Types.ObjectId();
    const items = [itemId(), itemId(), itemId()];

    await logOutfitSave({ userId: user, outfitId: outfit, itemIds: items });

    const saves = await Interaction.find({ userId: user, outfitId: outfit, type: "save" });
    expect(saves).toHaveLength(3);
    expect(saves.map((s) => s.itemId.toString()).sort()).toEqual(items.map((i) => i.toString()).sort());
  });
});
