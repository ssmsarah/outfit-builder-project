import Product from "../models/Product.js";

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