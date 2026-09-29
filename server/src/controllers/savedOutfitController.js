import Outfit from "../models/Outfit.js";

const POPULATE_FIELDS = "name image price finalPrice discountType discountValue";

// GET /api/outfits/saved - the logged-in user's saved outfit drafts, newest first.
export const getSavedOutfits = async (req, res) => {
  try {
    const outfits = await Outfit.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .populate("top", POPULATE_FIELDS)
      .populate("bottom", POPULATE_FIELDS)
      .populate("shoes", POPULATE_FIELDS)
      .populate("accessories", POPULATE_FIELDS);

    res.status(200).json(outfits);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch saved outfits",
      error: error.message,
    });
  }
};

// POST /api/outfits/saved - save a completed outfit-builder look as a draft.
export const saveOutfit = async (req, res) => {
  try {
    const { name, top, isDress, bottom, shoes, accessories } = req.body;

    if (!top || !shoes) {
      return res.status(400).json({
        message: "An outfit needs at least a top (or dress) and shoes.",
      });
    }

    const outfit = await Outfit.create({
      user: req.user.userId,
      name: name || "My Outfit",
      top,
      isDress: !!isDress,
      bottom: isDress ? undefined : bottom,
      shoes,
      accessories: Array.isArray(accessories) ? accessories : [],
    });

    await outfit.populate([
      { path: "top", select: POPULATE_FIELDS },
      { path: "bottom", select: POPULATE_FIELDS },
      { path: "shoes", select: POPULATE_FIELDS },
      { path: "accessories", select: POPULATE_FIELDS },
    ]);

    res.status(201).json(outfit);
  } catch (error) {
    res.status(400).json({
      message: "Failed to save outfit",
      error: error.message,
    });
  }
};

// DELETE /api/outfits/saved/:id - remove a saved draft (owner only).
export const deleteSavedOutfit = async (req, res) => {
  try {
    const outfit = await Outfit.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!outfit) {
      return res.status(404).json({
        message: "Saved outfit not found",
      });
    }

    res.status(200).json({ message: "Saved outfit removed" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete saved outfit",
      error: error.message,
    });
  }
};
