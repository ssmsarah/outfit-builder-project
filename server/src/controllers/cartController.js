import User from "../models/User.js";
import Product from "../models/Product.js";

// Get logged-in user's cart, populated with product details
export const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate(
      "cart.product"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const cart = user.cart.filter((item) => item.product);

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch cart",
      error: error.message,
    });
  }
};

// Add a product to cart (or bump quantity if already present)
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "productId is required" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const user = await User.findById(req.user.userId);

    const existingItem = user.cart.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += Number(quantity) || 1;
    } else {
      user.cart.push({
        product: productId,
        quantity: Number(quantity) || 1,
      });
    }

    await user.save();
    await user.populate("cart.product");

    res.status(200).json(user.cart);
  } catch (error) {
    res.status(500).json({
      message: "Failed to add product to cart",
      error: error.message,
    });
  }
};

// Update quantity of a cart item
export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "quantity must be at least 1" });
    }

    const user = await User.findById(req.user.userId);

    const item = user.cart.find(
      (item) => item.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    item.quantity = Number(quantity);

    await user.save();
    await user.populate("cart.product");

    res.status(200).json(user.cart);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update cart item",
      error: error.message,
    });
  }
};

// Remove a single item from cart
export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.userId);

    user.cart = user.cart.filter(
      (item) => item.product.toString() !== productId
    );

    await user.save();
    await user.populate("cart.product");

    res.status(200).json(user.cart);
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove item from cart",
      error: error.message,
    });
  }
};

// Clear the entire cart
export const clearCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    user.cart = [];

    await user.save();

    res.status(200).json([]);
  } catch (error) {
    res.status(500).json({
      message: "Failed to clear cart",
      error: error.message,
    });
  }
};
