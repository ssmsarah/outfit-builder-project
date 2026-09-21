import express from "express";

import {
  createReview,
  getProductReviews,
  getSellerReviews,
} from "../controllers/reviewController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/product/:productId", getProductReviews);
router.get(
  "/seller-reviews",
  protect,
  requireRole("seller"),
  getSellerReviews
);
router.post("/:productId", protect, createReview);

export default router;
