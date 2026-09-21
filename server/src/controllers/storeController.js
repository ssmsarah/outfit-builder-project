import User from "../models/User.js";
import Product from "../models/Product.js";

export const getStores = async (req, res) => {
  try {
    const sellers = await User.find({
      role: "seller",
      sellerStatus: "approved",
    }).select("name storeName address createdAt");

    const stores = await Promise.all(
      sellers.map(async (seller) => {
        const productCount = await Product.countDocuments({
          seller: seller._id,
        });

        return {
          id: seller._id,
          storeName: seller.storeName,
          ownerName: seller.name,
          address: seller.address,
          productCount,
        };
      })
    );

    res.status(200).json(stores);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch stores",
      error: error.message,
    });
  }
};

export const getStore = async (req, res) => {
  try {
    const seller = await User.findOne({
      _id: req.params.sellerId,
      role: "seller",
      sellerStatus: "approved",
    }).select("name storeName address createdAt");

    if (!seller) {
      return res.status(404).json({ message: "Store not found" });
    }

    const products = await Product.find({
      seller: seller._id,
      available: true,
    });

    res.status(200).json({
      id: seller._id,
      storeName: seller.storeName,
      ownerName: seller.name,
      address: seller.address,
      products,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch store",
      error: error.message,
    });
  }
};
