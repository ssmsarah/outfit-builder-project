import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

// Place an order (from cart or a direct buy-now item)
export const placeOrder = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items to order" });
    }

    if (
      !shippingAddress ||
      !shippingAddress.name ||
      !shippingAddress.phone ||
      !shippingAddress.address
    ) {
      return res.status(400).json({
        message: "Shipping name, phone and address are required",
      });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const { productId, quantity } of items) {
      const qty = Number(quantity) || 1;

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          message: `Product not found`,
        });
      }

      if (product.stock < qty) {
        return res.status(400).json({
          message: `Not enough stock for "${product.name}". Only ${product.stock} left.`,
        });
      }

      product.stock -= qty;
      await product.save();

      const unitPrice = product.finalPrice;

      orderItems.push({
        product: product._id,
        seller: product.seller,
        quantity: qty,
        price: unitPrice,
        status: "pending",
      });

      totalAmount += unitPrice * qty;
    }

    const order = await Order.create({
      customer: req.user.userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
    });

    // Remove any ordered products from the customer's cart
    const orderedProductIds = items.map((item) => item.productId);

    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { cart: { product: { $in: orderedProductIds } } },
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({
      message: "Failed to place order",
      error: error.message,
    });
  }
};

// Customer's own orders
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.userId })
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// A single order - visible to its customer, an involved seller, or an admin
export const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product")
      .populate("customer", "name email phone");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const { userId, role } = req.user;

    const isOwner = order.customer._id.toString() === userId;
    const isInvolvedSeller = order.items.some(
      (item) => item.seller.toString() === userId
    );

    if (!isOwner && !isInvolvedSeller && role !== "admin") {
      return res.status(403).json({
        message: "You are not authorized to view this order",
      });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

// Orders containing this seller's products, scoped to only their items
export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.userId;

    const orders = await Order.find({ "items.seller": sellerId })
      .populate("items.product")
      .populate("customer", "name email phone")
      .sort({ createdAt: -1 });

    const scoped = orders.map((order) => ({
      _id: order._id,
      customer: order.customer,
      shippingAddress: order.shippingAddress,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      items: order.items.filter(
        (item) => item.seller.toString() === sellerId
      ),
    }));

    res.status(200).json(scoped);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch seller orders",
      error: error.message,
    });
  }
};

// Seller updates the fulfillment status of their own item within an order
export const updateItemStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.id(itemId);

    if (!item || item.seller.toString() !== req.user.userId) {
      return res.status(404).json({
        message: "Order item not found or you are not authorized to update it",
      });
    }

    item.status = status;
    await order.save();

    res.status(200).json({
      message: "Order item status updated",
      item,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update order item status",
      error: error.message,
    });
  }
};

// Admin - all orders
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.product")
      .populate("customer", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// Admin - override payment status
export const updateOrderPayment = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({
      message: "Payment status updated",
      order,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update payment status",
      error: error.message,
    });
  }
};
