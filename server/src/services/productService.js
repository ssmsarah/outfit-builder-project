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