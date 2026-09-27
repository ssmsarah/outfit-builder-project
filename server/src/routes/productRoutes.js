import express from "express";

import {
  getProducts,
  getMyProducts,
  getProductsByCategory,
  getNewArrivals,
  getProduct,
  createProduct,
  deleteProduct,
  updateProduct,
} from "../controllers/productController.js";

import { protect, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all products
// Used by customers/storefront
router.get("/", getProducts);

// Get products belonging only to logged-in seller
router.get("/my-products", protect, getMyProducts);

// Get newest products
router.get("/new-arrivals", getNewArrivals);

// Get products by category
router.get("/category/:category", getProductsByCategory);

// Get single product (view tracked for logged-in users; anonymous browsing
// still works unauthenticated - see authMiddleware.optionalAuth)
router.get("/:id", optionalAuth, getProduct);

// Create product
// Seller must be logged in
router.post("/", protect, createProduct);

router.delete("/:id", protect, deleteProduct);

router.put("/:id", protect, updateProduct);

export default router;