import { logOutfitSave } from "../services/interactionService.js";

// Logs a "save" interaction for each item in a recommended outfit (T4.3's
// Save button). No outfitId and no persisted "saved outfit" record - there
// is no outfit-persistence feature in this app (T0.1/T3.1's audit findings);
// this only feeds the personalization signal T3.2+ already knows how to use.
export const saveOutfitItems = async (req, res) => {
  try {
    const { itemIds } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: "itemIds must be a non-empty array" });
    }

    await logOutfitSave({ userId: req.user.userId, itemIds });

    res.status(200).json({ message: "Saved", itemCount: itemIds.length });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "One or more itemIds are invalid" });
    }

    res.status(500).json({
      message: "Failed to save outfit",
      error: error.message,
    });
  }
};
