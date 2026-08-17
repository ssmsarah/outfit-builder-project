import express from "express";

import {
  getProducts,
  getProductsByCategory,
  getProduct,
  createProduct,
} from "../controllers/productController.js";

const router = express.Router();

// Get all products
router.get("/", getProducts);

// Get products by category
router.get("/category/:category", getProductsByCategory);

// Get single product
router.get("/:id", getProduct);

// Create product
router.post("/", createProduct);

export default router;