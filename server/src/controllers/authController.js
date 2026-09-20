import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const signup = async (req, res) => {
  try {
    const {
      name,
      storeName,
      email,
      phone,
      address,
      panVat,
      password,
      role,
    } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // Seller-specific validation
    if (role === "seller") {
      if (!storeName || !phone || !address || !panVat) {
        return res.status(400).json({
          message:
            "Store name, phone, address and PAN/VAT number are required for sellers",
        });
      }
    }

    // Check existing email
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      storeName: role === "seller" ? storeName : undefined,
      email,
      phone: role === "seller" ? phone : undefined,
      address: role === "seller" ? address : undefined,
      panVat: role === "seller" ? panVat : undefined,
      password: hashedPassword,
      role: role || "user",

      // Sellers start as pending
      sellerStatus: role === "seller" ? "pending" : undefined,
    });

    res.status(201).json({
      message:
        role === "seller"
          ? "Seller account created successfully. Your account is under verification."
          : "Account created successfully",

      user: {
        id: user._id,
        name: user.name,
        storeName: user.storeName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        panVat: user.panVat,
        role: user.role,
        sellerStatus: user.sellerStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Signup failed",
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Seller verification check
    if (user.role === "seller") {
      if (user.sellerStatus === "pending") {
        return res.status(403).json({
          message:
            "Your seller account is waiting for admin approval.",
        });
      }

      if (user.sellerStatus === "rejected") {
        return res.status(403).json({
          message:
            "Your seller account has been rejected. Please contact support.",
        });
      }
    }

    // Create JWT
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        storeName: user.storeName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        panVat: user.panVat,
        role: user.role,
        sellerStatus: user.sellerStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};