import express from "express";
import { saveOutfitItems } from "../controllers/interactionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Requires login, same as the existing wishlist ("like") endpoints -
// interactions are always attributed to a real user.
router.post("/save", protect, saveOutfitItems);

export default router;
