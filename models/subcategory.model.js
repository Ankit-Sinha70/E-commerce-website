import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Unique per (name + category), case-insensitive
subcategorySchema.index(
  { name: 1, category: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

export default mongoose.model("Subcategory", subcategorySchema);
