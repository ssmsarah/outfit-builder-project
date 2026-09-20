import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";


// ===============================
// Dashboard Statistics
// ===============================

export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({
      role: "user",
    });

    const totalSellers = await User.countDocuments({
      role: "seller",
    });

    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    res.status(200).json({
      totalUsers,
      totalSellers,
      totalProducts,
      totalOrders,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};


// ===============================
// Get All Sellers
// ===============================

export const getSellers = async (req, res) => {
  try {
    const sellers = await User.find({
      role: "seller",
    }).select(
      "name storeName email phone address panVat sellerStatus createdAt"
    );

    res.status(200).json(sellers);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch sellers",
      error: error.message,
    });
  }
};


// ===============================
// Approve Seller
// ===============================

export const approveSeller = async (req, res) => {
  try {
    const { id } = req.params;

    const seller = await User.findOneAndUpdate(
      {
        _id: id,
        role: "seller",
      },
      {
        sellerStatus: "approved",
      },
      {
        new: true,
      }
    );

    if (!seller) {
      return res.status(404).json({
        message: "Seller not found",
      });
    }

    res.status(200).json({
      message: "Seller approved successfully",
      seller: {
        id: seller._id,
        name: seller.name,
        storeName: seller.storeName,
        sellerStatus: seller.sellerStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to approve seller",
      error: error.message,
    });
  }
};


// ===============================
// Reject Seller
// ===============================

export const rejectSeller = async (req, res) => {
  try {
    const { id } = req.params;

    const seller = await User.findOneAndUpdate(
      {
        _id: id,
        role: "seller",
      },
      {
        sellerStatus: "rejected",
      },
      {
        new: true,
      }
    );

    if (!seller) {
      return res.status(404).json({
        message: "Seller not found",
      });
    }

    res.status(200).json({
      message: "Seller rejected successfully",
      seller: {
        id: seller._id,
        name: seller.name,
        storeName: seller.storeName,
        sellerStatus: seller.sellerStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to reject seller",
      error: error.message,
    });
  }
};


// ===============================
// Get All Customers
// ===============================

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: "user",
    }).select("name email phone address isBlocked createdAt");

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};


// ===============================
// Block / Unblock User
// ===============================

export const toggleUserBlock = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      _id: id,
      role: "user",
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      message: user.isBlocked
        ? "User blocked successfully"
        : "User unblocked successfully",
      user: {
        id: user._id,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update user status",
      error: error.message,
    });
  }
};