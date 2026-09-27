// One-off migration for T0.2: MongoDB/Mongoose has no schema migration tool
// in this project, so this script plays that role.
//   up   (default): backfill outfitCategory/colorHex/isNeutralOverride/
//                    style/pattern/seasons/occasions on existing Product
//                    documents that don't have them yet.
//   down: remove those same fields, restoring documents to their pre-T0.2
//         shape. No original field is ever touched, so this is lossless
//         in both directions.
//
// Usage:
//   node src/scripts/backfillOutfitAttributes.js       (up)
//   node src/scripts/backfillOutfitAttributes.js down

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Product from "../models/Product.js";
import {
  deriveOutfitCategory,
  deriveColorHex,
  deriveIsNeutralOverride,
  DEFAULT_STYLE,
  DEFAULT_PATTERN,
  ALL_SEASONS,
  DEFAULT_OCCASIONS,
} from "../utils/outfitAttributeDefaults.js";

const NEW_FIELDS = [
  "outfitCategory",
  "colorHex",
  "isNeutralOverride",
  "style",
  "pattern",
  "seasons",
  "occasions",
];

async function up() {
  const products = await Product.find({});
  let updated = 0;

  for (const product of products) {
    let changed = false;

    if (!product.outfitCategory) {
      product.outfitCategory = deriveOutfitCategory(product.category);
      changed = true;
    }

    if (!product.colorHex) {
      product.colorHex = deriveColorHex(product.colors);
      changed = true;
    }

    if (product.isNeutralOverride === undefined) {
      const inferred = deriveIsNeutralOverride(product.colors);
      if (inferred) {
        product.isNeutralOverride = inferred;
        changed = true;
      }
    }

    if (product.style === undefined) {
      product.style = DEFAULT_STYLE;
      changed = true;
    }

    if (product.pattern === undefined) {
      product.pattern = DEFAULT_PATTERN;
      changed = true;
    }

    if (!product.seasons || product.seasons.length === 0) {
      product.seasons = [...ALL_SEASONS];
      changed = true;
    }

    if (!product.occasions || product.occasions.length === 0) {
      product.occasions = [...DEFAULT_OCCASIONS];
      changed = true;
    }

    if (changed) {
      await product.save();
      updated += 1;
    }
  }

  console.log(`Backfilled outfit attributes on ${updated}/${products.length} product(s).`);
}

async function down() {
  const unset = Object.fromEntries(NEW_FIELDS.map((field) => [field, ""]));
  const result = await Product.updateMany({}, { $unset: unset });
  console.log(`Removed outfit attributes from ${result.modifiedCount} product(s).`);
}

async function run() {
  const direction = process.argv[2] === "down" ? "down" : "up";

  await connectDB();
  try {
    await (direction === "down" ? down() : up());
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
