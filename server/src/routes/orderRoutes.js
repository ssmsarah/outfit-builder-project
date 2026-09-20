import express from "express";

import {
  placeOrder,
  getMyOrders,
  getOrder,
  getSellerOrders,
  updateItemStatus,
} from "../controllers/orderController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", placeOrder);
router.get("/my-orders", getMyOrders);
router.get("/seller-orders", requireRole("seller"), getSellerOrders);
router.patch(
  "/:orderId/items/:itemId/status",
  requireRole("seller"),
  updateItemStatus
);
router.get("/:id", getOrder);

export default router;
