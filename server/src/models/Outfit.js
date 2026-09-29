import mongoose from "mongoose";

// A saved outfit-builder draft: the piece the user picked at each step,
// so it can be re-shown/re-added to cart later from "My Saved Outfits".
const outfitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      trim: true,
      default: "My Outfit",
    },

    // Either a full dress (isDress: true, bottom empty) or a top + bottom.
    top: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    isDress: {
      type: Boolean,
      default: false,
    },

    bottom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    shoes: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    accessories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Outfit = mongoose.model("Outfit", outfitSchema);

export default Outfit;
