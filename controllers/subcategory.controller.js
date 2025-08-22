import Subcategory from "../models/subcategory.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

// Create subcategory
export const createSubcategory = async (req, res) => {
  try {
    const { name, description, status, category } = req.body;
    const image = req.file ? (req.file.secure_url || req.file.path) : "";

    if (!name || !category) {
      return res.status(400).json({ success: false, message: "name and category are required" });
    }

    const parent = await Category.findById(category);
    if (!parent) return res.status(400).json({ success: false, message: "Parent category not found" });

    if (parent.status === "Inactive" && (status || "Active") === "Active") {
      return res.status(400).json({ success: false, message: "Cannot create an Active subcategory under an Inactive category" });
    }

    const dup = await Subcategory.findOne({ name: name.trim(), category: parent._id })
      .collation({ locale: "en", strength: 2 });
    if (dup) return res.status(400).json({ success: false, message: "Subcategory already exists under this category" });

    const sub = await Subcategory.create({ name: name.trim(), description, status: status || "Active", image, category: parent._id });
    return res.status(201).json({ success: true, message: "Subcategory created", data: sub });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// List subcategories
export const getSubcategories = async (req, res) => {
  try {
    const { category, name, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (name) filter.name = { $regex: name, $options: "i" };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Subcategory.find(filter).populate("category", "name").skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Subcategory.countDocuments(filter),
    ]);

    return res.json({ success: true, page: Number(page), pages: Math.ceil(total / Number(limit)), total, count: items.length, data: items });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Get single subcategory
export const getSubcategoryById = async (req, res) => {
  try {
    const sub = await Subcategory.findById(req.params.id).populate("category", "name");
    if (!sub) return res.status(404).json({ success: false, message: "Subcategory not found" });
    const products = await Product.find({ subcategory: sub._id }).limit(20);
    return res.json({ success: true, data: { subcategory: sub, products } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Update subcategory
export const updateSubcategory = async (req, res) => {
  try {
    const { name, description, status, category } = req.body;
    const image = req.file ? (req.file.secure_url || req.file.path) : undefined;

    const sub = await Subcategory.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: "Subcategory not found" });

    let nextCategory = sub.category;
    if (typeof category !== "undefined" && category !== null) {
      const parent = await Category.findById(category);
      if (!parent) return res.status(400).json({ success: false, message: "Parent category not found" });
      if (status === "Active" && parent.status === "Inactive") {
        return res.status(400).json({ success: false, message: "Cannot set Active while parent category is Inactive" });
      }
      nextCategory = parent._id;
    }

    const nextName = name?.trim() ?? sub.name;
    const hasNameOrParentChanged = (name && name.trim() !== sub.name) || (String(nextCategory) !== String(sub.category));
    if (hasNameOrParentChanged) {
      const dup = await Subcategory.findOne({ _id: { $ne: sub._id }, name: nextName, category: nextCategory })
        .collation({ locale: "en", strength: 2 });
      if (dup) return res.status(400).json({ success: false, message: "Subcategory already exists under this category" });
    }

    sub.name = nextName;
    if (typeof description !== "undefined") sub.description = description;
    if (typeof status !== "undefined") sub.status = status;
    if (typeof category !== "undefined") sub.category = nextCategory;
    if (typeof image !== "undefined") sub.image = image;

    const updated = await sub.save();
    return res.json({ success: true, message: "Subcategory updated", data: updated });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Delete subcategory (block if products exist)
export const deleteSubcategory = async (req, res) => {
  try {
    const id = req.params.id;
    const productCount = await Product.countDocuments({ subcategory: id });
    if (productCount > 0) {
      return res.status(400).json({ success: false, message: "Cannot delete subcategory with existing products" });
    }
    const deleted = await Subcategory.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Subcategory not found" });
    return res.json({ success: true, message: "Subcategory deleted" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
