import Review from "../models/Review.js";
import Product from "../models/Product.js";

const recalcProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const ratingAvg = stats[0]?.avg || 0;
  const numReviews = stats[0]?.count || 0;

  await Product.findByIdAndUpdate(productId, {
    ratingAvg: Math.round(ratingAvg * 10) / 10,
    numReviews,
  });
};

export const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const review = await Review.create({
      product: productId,
      customer: req.user.userId,
      rating,
      comment,
    });

    await recalcProductRating(review.product);

    const populated = await review.populate("customer", "name");

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reviewed this product",
      });
    }

    res.status(500).json({
      message: "Failed to submit review",
      error: error.message,
    });
  }
};

export const getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      product: req.params.productId,
    })
      .populate("customer", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};

export const getSellerReviews = async (req, res) => {
  try {
    const products = await Product.find({
      seller: req.user.userId,
    }).select("_id name image");

    const productIds = products.map((p) => p._id);

    const reviews = await Review.find({
      product: { $in: productIds },
    })
      .populate("customer", "name")
      .populate("product", "name image")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};
