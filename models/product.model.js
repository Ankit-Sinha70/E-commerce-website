// models/Product.js
import mongoose from "mongoose";
import Subcategory from "./subcategory.model.js";
import Category from "./category.model.js";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: false,
    },
    originalPrice: { 
       type: Number,
       required: true
       },
    discountPrice: { 
       type: Number,
       required: true 
      },
    discountPercentage: { 
      type: Number 
    },
    description: { type: String, default: "" },
    images: [
      {type: String}
      ],
      image: { type: String, default: null },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: { 
      type: String
     },
    stock: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    ratings: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

// Derive category from subcategory and compute discountPercentage
productSchema.pre("validate", async function (next) {
  try {
    if (this.subcategory) {
      const sub = await Subcategory.findById(this.subcategory).select("category").lean();
      if (sub?.category) {
        this.category = sub.category;
      }
    }
    if (this.originalPrice && this.discountPrice) {
      this.discountPercentage = Math.round(
        ((this.originalPrice - this.discountPrice) / this.originalPrice) * 100
      );
    }
    next();
  } catch (e) {
    next(e);
  }
});

const Product = mongoose.model("Product", productSchema);
export default Product;
