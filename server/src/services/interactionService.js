import Interaction from "../models/Interaction.js";

// "like" is a toggle: liking an already-liked item is a no-op (returns the
// existing record instead of creating a duplicate). view/save/purchase are
// append-only - every call creates a new timestamped event, since repeated
// views/saves/purchases are meaningful signals for T3.2's decay math.
export async function logInteraction({ userId, itemId, outfitId, type }) {
  if (type === "like") {
    const existing = await Interaction.findOne({ userId, itemId, type: "like" });
    if (existing) return existing;
  }

  return Interaction.create({ userId, itemId, outfitId, type });
}

// The other half of the "like" toggle: un-liking removes the existing like
// record entirely (there's no separate "unlike" interaction type).
export async function removeLike({ userId, itemId }) {
  return Interaction.deleteOne({ userId, itemId, type: "like" });
}

// Saving an outfit logs a "save" for every item in it (README, T3.1).
export async function logOutfitSave({ userId, outfitId, itemIds }) {
  return Promise.all(
    itemIds.map((itemId) => logInteraction({ userId, itemId, outfitId, type: "save" }))
  );
}

export async function getUserInteractions(userId, filter = {}) {
  return Interaction.find({ userId, ...filter }).sort({ timestamp: -1 });
}

export async function isLiked({ userId, itemId }) {
  const existing = await Interaction.findOne({ userId, itemId, type: "like" });
  return Boolean(existing);
}
