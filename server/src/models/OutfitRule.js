import mongoose from 'mongoose';

const OutfitRuleSchema = new mongoose.Schema(
	{
		ruleType: { type: String, required: true },
		sourceCategory: { type: String, required: true },
		targetCategory: { type: String, required: true },
		conditions: { type: mongoose.Schema.Types.Mixed, default: {} },
		weight: { type: Number, default: 0 },
		penalty: { type: Number, default: 0 },
		description: { type: String, default: '' },
		isActive: { type: Boolean, default: true }
	},
	{ timestamps: true }
);

export default mongoose.model('OutfitRule', OutfitRuleSchema);
