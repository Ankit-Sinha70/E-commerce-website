import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../db/index.js";
import Category from "../models/category.model.js";
import Subcategory from "../models/subcategory.model.js";
import Product from "../models/product.model.js";

// Load env vars
dotenv.config();

const DEFAULT_SUBCATEGORY_NAME = process.env.DEFAULT_SUBCATEGORY_NAME || "General";

async function ensureGeneralSubcategory(categoryId) {
  // Try find existing default subcategory by name
  let sub = await Subcategory.findOne({ category: categoryId, name: DEFAULT_SUBCATEGORY_NAME })
    .collation({ locale: "en", strength: 2 });
  if (!sub) {
    sub = await Subcategory.create({
      name: DEFAULT_SUBCATEGORY_NAME,
      description: "Auto-created by backfill script",
      status: "Active",
      category: categoryId,
    });
    console.log(`  + Created default subcategory '${DEFAULT_SUBCATEGORY_NAME}' for category ${categoryId}`);
  }
  return sub;
}

async function backfill() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    const categories = await Category.find({}, { _id: 1, name: 1 }).lean();
    console.log(`Found ${categories.length} categories`);

    let totalAssigned = 0;

    for (const cat of categories) {
      console.log(`\nProcessing category: ${cat.name} (${cat._id})`);
      const general = await ensureGeneralSubcategory(cat._id);

      // Assign products that have this category but no subcategory
      const filter = { category: cat._id, $or: [{ subcategory: { $exists: false } }, { subcategory: null }] };
      const update = { $set: { subcategory: general._id, category: cat._id } };

      const res = await Product.updateMany(filter, update, { strict: false });
      console.log(`  ~ Assigned ${res.modifiedCount} products to '${DEFAULT_SUBCATEGORY_NAME}'`);
      totalAssigned += res.modifiedCount || 0;
    }

    console.log(`\nBackfill complete. Total reassigned products: ${totalAssigned}`);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close().catch(() => {});
    console.log("Disconnected from MongoDB");
  }
}

backfill();
