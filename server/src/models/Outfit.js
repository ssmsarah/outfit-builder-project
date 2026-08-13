import mongoose from 'mongoose';

const OutfitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: 'Saved Outfit' },
    notes: { type: String, default: '' },
    selectedIds: {
      top: { type: String, default: null },
      bottom: { type: String, default: null },
      shoes: { type: String, default: null },
      accessories: { type: [String], default: [] }
    },
    selectedTopId: { type: String, default: null },
    selectedBottomId: { type: String, default: null },
    selectedShoesId: { type: String, default: null },
    selectedAccessoryIds: { type: [String], default: [] },
    compatibilityScore: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    ruleBreakdown: { type: [String], default: [] },
    warnings: { type: [String], default: [] },
    status: { type: String, default: 'saved' },
    snapshot: { type: Object, default: {} }
  },
  { timestamps: true }
);

export default mongoose.model('Outfit', OutfitSchema);
