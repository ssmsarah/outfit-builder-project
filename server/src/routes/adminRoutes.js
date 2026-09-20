import express from "express";

import {
  getDashboardStats,
  getSellers,
  approveSeller,
  rejectSeller,
  getUsers,
  toggleUserBlock,
} from "../controllers/adminController.js";
import {
  adminDeleteProduct,
  getAdminProducts,
} from "../controllers/productController.js";
import {
  getAllOrders,
  updateOrderPayment,
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/stats", getDashboardStats);

router.get("/sellers", getSellers);

router.patch("/sellers/:id/approve", approveSeller);

router.patch("/sellers/:id/reject", rejectSeller);

router.get("/users", getUsers);

router.patch("/users/:id/block", toggleUserBlock);

router.get("/products", getAdminProducts);

router.delete("/products/:id", adminDeleteProduct);

router.get("/orders", getAllOrders);

router.patch("/orders/:id/payment", updateOrderPayment);

export default router;