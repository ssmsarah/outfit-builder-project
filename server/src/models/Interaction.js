import mongoose from "mongoose";

// User interaction tracking (T3.1). Feeds Sprint 3's personalization
// signals: like (toggle, one doc per user+item - see interactionService.js),
// view/save/purchase (append-only, one doc per event, so T3.2's frequency
// and time-decay math has real event timestamps to work with).
const interactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  outfitId: { type: mongoose.Schema.Types.ObjectId, ref: "Outfit" },
  type: { type: String, enum: ["like", "view", "save", "purchase"], required: true },
  timestamp: { type: Date, default: Date.now },
});

interactionSchema.index({ userId: 1, itemId: 1, type: 1 });

const Interaction = mongoose.model("Interaction", interactionSchema);
export default Interaction;
