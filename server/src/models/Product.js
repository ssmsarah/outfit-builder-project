import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
    },

  category: {
  type: [
    {
      type: String,
      enum: [
        "dresses",
        "tops",
        "bottoms",
        "formals",
        "shoes",
        "accessories",
      ],
    },
  ],
  required: true,
},

    store: {
      type: String,
      required: true,
    },

    // Seller who owns this product
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    image: {
      type: String,
      required: true,
    },

    colors: {
      type: [String],
      default: [],
    },

    sizes: {
      type: [String],
      default: [],
    },

    available: {
      type: Boolean,
      default: true,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    ratingAvg: {
      type: Number,
      default: 0,
    },

    numReviews: {
      type: Number,
      default: 0,
    },

    discountType: {
      type: String,
      enum: ["none", "percentage", "flat"],
      default: "none",
    },

    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual("finalPrice").get(function () {
  if (this.discountType === "percentage" && this.discountValue > 0) {
    const discounted = this.price - (this.price * this.discountValue) / 100;
    return Math.max(0, Math.round(discounted));
  }

  if (this.discountType === "flat" && this.discountValue > 0) {
    return Math.max(0, Math.round(this.price - this.discountValue));
  }

  return this.price;
});

const Product = mongoose.model("Product", productSchema);

export default Product;