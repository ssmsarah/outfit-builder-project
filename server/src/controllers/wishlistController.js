import User from "../models/User.js";
import Product from "../models/Product.js";

export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate("wishlist");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.wishlist.filter(Boolean));
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch wishlist",
      error: error.message,
    });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const user = await User.findById(req.user.userId);

    if (!user.wishlist.some((id) => id.toString() === productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    await user.populate("wishlist");

    res.status(200).json(user.wishlist);
  } catch (error) {
    res.status(500).json({
      message: "Failed to add product to wishlist",
      error: error.message,
    });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.userId);

    user.wishlist = user.wishlist.filter(
      (id) => id.toString() !== productId
    );

    await user.save();
    await user.populate("wishlist");

    res.status(200).json(user.wishlist);
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove product from wishlist",
      error: error.message,
    });
  }
};
