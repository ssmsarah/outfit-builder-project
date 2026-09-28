import { getRecommenderMode } from "../config/recommenderMode.js";
import { getOutfitRecommendations, AnchorNotFoundError } from "../services/recommendationService.js";
import { validateRecommendRequest } from "../validators/recommendOutfitsValidator.js";

export const recommendOutfits = async (req, res) => {
  try {
    if (getRecommenderMode() === "legacy") {
      return res.status(503).json({
        message: "The scored recommender is disabled (recommender=legacy).",
      });
    }

    const { anchorItemId, occasion, season, limit } = req.body;

    const validationError = validateRecommendRequest({ anchorItemId, occasion, season, limit });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { outfits, ruleMessages } = await getOutfitRecommendations({
      anchorItemId,
      userId: req.user?.userId,
      occasion,
      season,
      limit,
    });

    res.status(200).json({ outfits, ruleMessages });
  } catch (error) {
    if (error instanceof AnchorNotFoundError) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({
      message: "Failed to generate recommendations",
      error: error.message,
    });
  }
};
