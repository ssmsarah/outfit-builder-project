import mongoose from "mongoose";
import {
  deriveOutfitCategory,
  deriveColorHex,
  deriveIsNeutralOverride,
  DEFAULT_STYLE,
  DEFAULT_PATTERN,
  ALL_SEASONS,
  DEFAULT_OCCASIONS,
} from "../utils/outfitAttributeDefaults.js";
import { CATEGORIES, STYLES, PATTERNS, SEASONS, OCCASIONS } from "../recommendation/itemEnums.js";

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

    // --- Outfit-algorithm attributes (T0.2) ---
    // Additive: kept separate from the marketplace `category`/`colors`
    // fields above so existing filtering, cart, and wishlist code is
    // untouched. See docs/algorithms/AUDIT.md and the Decision Log.
    outfitCategory: {
      type: String,
      enum: CATEGORIES,
    },

    colorHex: {
      type: String,
      validate: {
        validator: (v) => !v || /^#[0-9A-Fa-f]{6}$/.test(v),
        message: (props) => `${props.value} is not a valid #RRGGBB hex color`,
      },
    },

    isNeutralOverride: {
      type: Boolean,
    },

    style: {
      type: String,
      enum: STYLES,
      default: DEFAULT_STYLE,
    },

    pattern: {
      type: String,
      enum: PATTERNS,
      default: DEFAULT_PATTERN,
    },

    seasons: {
      type: [
        {
          type: String,
          enum: SEASONS,
        },
      ],
      default: () => [...ALL_SEASONS],
    },

    occasions: {
      type: [
        {
          type: String,
          enum: OCCASIONS,
        },
      ],
      default: () => [...DEFAULT_OCCASIONS],
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

// Backfills outfitCategory/colorHex/isNeutralOverride from the legacy
// category/colors fields whenever a document is created or saved without
// them explicitly set - keeps existing seller product-creation flows
// working unchanged while still giving every item usable T0.2 attributes.
productSchema.pre("validate", function (next) {
  if (!this.outfitCategory) {
    this.outfitCategory = deriveOutfitCategory(this.category);
  }

  if (!this.colorHex) {
    this.colorHex = deriveColorHex(this.colors);
  }

  if (this.isNeutralOverride === undefined) {
    const inferred = deriveIsNeutralOverride(this.colors);
    if (inferred) {
      this.isNeutralOverride = inferred;
    }
  }

  next();
});

const Product = mongoose.model("Product", productSchema);

export default Product;