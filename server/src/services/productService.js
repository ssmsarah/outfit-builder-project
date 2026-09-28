import Product from "../models/Product.js";
import User from "../models/User.js";

// Only products belonging to registered, admin-approved sellers should ever
// reach the public storefront (search, category browsing, new arrivals,
// recommendations, etc). Moved here from productController.js (T4.1) so the
// new recommendation service can reuse it without duplicating the query.
export const getApprovedSellerIds = async () => {
  const sellers = await User.find({
    role: "seller",
    sellerStatus: "approved",
  }).select("_id");

  return sellers.map((s) => s._id);
};

// Every product shoppers can see: available and from an approved seller.
// Shared by the recommender (T4.1) and fuzzy search (S6.9).
export const getStorefrontProducts = async () => {
  const approvedSellerIds = await getApprovedSellerIds();
  return Product.find({ available: true, seller: { $in: approvedSellerIds } });
};

export const isStorefrontProduct = async (product) => {
  if (!product || product.available === false) return false;
  const seller = await User.findById(product.seller).select("role sellerStatus");
  return seller?.role === "seller" && seller.sellerStatus === "approved";
};

export const createProduct = async (productData) => {
  const product = await Product.create(productData);
  return product;
};

export const getAllProducts = async () => {
  return await Product.find();
};

export const getProductsByCategory = async (category) => {
  return await Product.find({
    category,
    available: true,
  });
};