import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
	{
		sourceId: { type: String, required: true, unique: true, index: true, trim: true },
		sku: { type: String, default: '', trim: true },
		slug: { type: String, default: '', trim: true },
		name: { type: String, required: true, trim: true },
		brand: { type: String, required: true, trim: true },
		category: { type: String, required: true, index: true, trim: true },
		subCategory: { type: String, default: '', trim: true },
		genderTarget: { type: String, default: 'unisex', trim: true },
		price: { type: Number, required: true, min: 0 },
		color: { type: String, default: '', trim: true },
		colorFamily: { type: String, default: '', index: true, trim: true },
		styleTags: [{ type: String, index: true }],
		season: [{ type: String }],
		occasion: [{ type: String }],
		fitType: { type: String, default: '', trim: true },
		fabricWeight: { type: String, default: '', trim: true },
		material: { type: String, default: '', trim: true },
		sizes: [{ type: String }],
		colors: [{ type: String }],
		image: { type: String, default: '' },
		images: [{ type: String }],
		inventoryCount: { type: Number, default: 0, min: 0 },
		rating: { type: Number, default: 0, min: 0, max: 5 },
		isActive: { type: Boolean, default: true }
	},
	{ timestamps: true }
);

export default mongoose.model('Product', ProductSchema);
