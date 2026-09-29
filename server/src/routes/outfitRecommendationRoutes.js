import express from "express";
import { recommendOutfits } from "../controllers/recommendationController.js";
import {
  getSavedOutfits,
  saveOutfit,
  deleteSavedOutfit,
} from "../controllers/savedOutfitController.js";
import { optionalAuth, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Logged-in callers get personalized results; anonymous callers get the
// cold-start (pure-compatibility) recommender - see recommendationService.js.
router.post("/recommend", optionalAuth, recommendOutfits);

// Outfit Builder "Save Outfit" drafts - requires login, same as wishlist/cart.
router.get("/saved", protect, getSavedOutfits);
router.post("/saved", protect, saveOutfit);
router.delete("/saved/:id", protect, deleteSavedOutfit);

export default router;
