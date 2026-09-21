import Product from "../models/Product.js";
import User from "../models/User.js";

// Only products belonging to registered, admin-approved sellers should ever
// reach the public storefront (search, category browsing, new arrivals, etc).
const getApprovedSellerIds = async () => {
  const sellers = await User.find({
    role: "seller",
    sellerStatus: "approved",
  }).select("_id");

  return sellers.map((s) => s._id);
};

// Get all products (optionally filtered by search / category / seller / discounted)
export const getProducts = async (req, res) => {
  try {
    const { search, category, seller, discounted } = req.query;

    const approvedSellerIds = await getApprovedSellerIds();

    const filter = {
      available: true,
      seller: { $in: approvedSellerIds },
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      filter.category = category.toLowerCase();
    }

    if (seller) {
      filter.seller = seller;
    }

    if (discounted === "true") {
      filter.discountType = { $ne: "none" };
      filter.discountValue = { $gt: 0 };
    }

    const products = await Product.find(filter);

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// Get newest products
export const getNewArrivals = async (req, res) => {
  try {
    const approvedSellerIds = await getApprovedSellerIds();

    const products = await Product.find({
      available: true,
      seller: { $in: approvedSellerIds },
    })
      .sort({ createdAt: -1 })
      .limit(12);

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch new arrivals",
      error: error.message,
    });
  }
};

// Get products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const approvedSellerIds = await getApprovedSellerIds();

    const products = await Product.find({
      category: category.toLowerCase(),
      available: true,
      seller: { $in: approvedSellerIds },
    });

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// Admin - every product regardless of seller/availability status, for moderation
export const getAdminProducts = async (req, res) => {
  try {
    const products = await Product.find().populate(
      "seller",
      "name storeName sellerStatus"
    );

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// Get one product
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

// Get products belonging to the logged-in seller
export const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({
      seller: req.user.userId,
    });

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch your products",
      error: error.message,
    });
  }
};
// Create product
export const createProduct = async (req, res) => {
  try {
    const seller = await User.findById(req.user.userId);

    if (!seller) {
      return res.status(404).json({
        message: "Seller not found",
      });
    }

    if (seller.role !== "seller") {
      return res.status(403).json({
        message: "Only sellers can list products",
      });
    }

    const product = await Product.create({
      ...req.body,
      seller: req.user.userId,
      store: seller.storeName,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({
      message: "Failed to create product",
      error: error.message,
    });
  }
};
// Delete product - seller can delete only their own product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      seller: req.user.userId,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found or you are not authorized to delete it",
      });
    }

    res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

// Update product - seller can update only their own product
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        seller: req.user.userId,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        message:
          "Product not found or you are not authorized to update it",
      });
    }

    res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to update product",
      error: error.message,
    });
  }
};

// Delete product - admin can moderate/delete any product
export const adminDeleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      message: "Product removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove product",
      error: error.message,
    });
  }
};