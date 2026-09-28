import express from "express";
import { searchItems, matchItemsByAttributes } from "../controllers/itemSearchController.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Fuzzy + attribute search over the storefront catalog (I7.4). Public, like
// product browsing; a token is read if present but never required.
router.get("/search", optionalAuth, searchItems);
router.post("/match", optionalAuth, matchItemsByAttributes);

export default router;
