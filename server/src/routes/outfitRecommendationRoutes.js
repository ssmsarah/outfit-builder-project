import express from "express";
import { recommendOutfits } from "../controllers/recommendationController.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Logged-in callers get personalized results; anonymous callers get the
// cold-start (pure-compatibility) recommender - see recommendationService.js.
router.post("/recommend", optionalAuth, recommendOutfits);

export default router;
