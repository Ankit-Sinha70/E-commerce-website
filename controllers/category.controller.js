import Category from '../models/category.model.js';
import Product from "../models/product.model.js";

const getDescendantIds = async (rootId) => {
  const ids = [];
  const stack = [rootId];

  while (stack.length) {
    const current = stack.pop();
    const children = await Category.find(
      { parentCategory: current },
      { _id: 1 }
    ).lean();

    for (const child of children) {
      ids.push(child._id);
      stack.push(child._id);
    }
  }
  return ids;
};

const willCreateCycle = async (nodeId, newParentId) => {
  if (!newParentId) return false;
  if (String(nodeId) === String(newParentId)) return true;

  let current = await Category.findById(newParentId, { parentCategory: 1 }).lean();
  while (current) {
    if (String(current._id) === String(nodeId)) return true;
    if (!current.parentCategory) break;
    current = await Category.findById(current.parentCategory, { parentCategory: 1 }).lean();
  }
  return false;
};


// helper: build nested tree
const buildCategoryTree = (categories, parent = null) => {
  const parentId = parent ? String(parent) : null;
  return categories
    .filter(c => String(c.parentCategory ?? null) === parentId)
    .map(c => ({
      ...c.toObject(),
      children: buildCategoryTree(categories, c._id),
    }));
};

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const { name, status, nested } = req.query;

    // If nested=true, return full tree (no pagination)
    if (String(nested).toLowerCase() === "true") {
      const filter = {};
      if (name) filter.name = { $regex: name, $options: "i" };
      if (status) filter.status = status;

      const all = await Category.find(filter).sort({ createdAt: -1 });
      const tree = buildCategoryTree(all);
      const categoriesWithProducts = await Promise.all(
        tree.map(async (category) => {
          const products = await Product.find({ category: category._id });
          return { ...category, products };
        })
      );
      return res.json({ success: true, categories: categoriesWithProducts });
    }

    // Otherwise: flat + paginated (your original behavior)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (name) filter.name = { $regex: name, $options: "i" };
    if (status) filter.status = status;

    const totalItems = await Category.countDocuments(filter);
    if (totalItems === 0) {
      return res.status(404).json({ message: "No categories found" });
    }

    const categories = await Category.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("parentCategory", "name");

    const categoriesWithProducts = await Promise.all(
      categories.map(async (category) => {
        const products = await Product.find({ category: category._id });
        return { ...category.toObject(), products };
      })
    );

    return res.json({
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      categories: categoriesWithProducts,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// Get category by ID
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate("parentCategory", "name");
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    const products = await Product.find({ category: category._id });
    return res.json({ ...category.toObject(), products });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// Create new category
export const createCategory = async (req, res) => {
  try {
    const { name, description, status, parentCategory } = req.body;
    const image = req.file ? req.file.path : ""; 

    let parent = null;
    if (parentCategory) {
      parent = await Category.findById(parentCategory);
      if (!parent) {
        return res.status(400).json({ success: false, message: "Parent category not found" });
      }
    }

    // ❗ status rule when parent is Inactive
    if (parent && parent.status === "Inactive" && (status || "Active") === "Active") {
      return res
        .status(400)
        .json({ success: false, message: "Cannot create an Active subcategory under an Inactive parent" });
    }

    // Duplicate within SAME parent only (scoped)
    const dup = await Category.findOne({
      name: name?.trim(),
      parentCategory: parent ? parent._id : null,
    }).collation({ locale: "en", strength: 2 });

    if (dup) {
      return res
        .status(400)
        .json({ success: false, message: "Category with this name already exists under the selected parent" });
    }

    const category = new Category({
      name: name?.trim(),
      description,
      status: status || "Active",
      parentCategory: parent ? parent._id : null,
      image,
    });

    const savedCategory = await category.save();
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: savedCategory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, description, status, parentCategory } = req.body;
    const image = req.file ? req.file.path : undefined; // if you enabled upload on this route

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category does not exist' });
    }

    // --- Parent handling ---
    let nextParent = null;
    if (typeof parentCategory !== "undefined" && parentCategory !== null) {
      nextParent = await Category.findById(parentCategory);
      if (!nextParent) {
        return res.status(400).json({ message: "Parent category not found" });
      }
    }

    // Prevent self-parenting and cycles
    if (typeof parentCategory !== "undefined") {
      const newParentId = nextParent ? nextParent._id : null;

      if (newParentId && String(newParentId) === String(category._id)) {
        return res.status(400).json({ message: "A category cannot be its own parent" });
      }

      if (await willCreateCycle(category._id, newParentId)) {
        return res.status(400).json({ message: "Invalid parent: would create a cycle" });
      }
    }

    // Compute "next" values for name/parent (used for duplicate checks + status logic)
    const nextName = name?.trim() ?? category.name;
    const nextParentId =
      typeof parentCategory !== "undefined"
        ? (nextParent ? nextParent._id : null)
        : category.parentCategory;

    // If name/parent changed, enforce scoped uniqueness (name + parent)
    const hasNameOrParentChanged =
      (name && name.trim() !== category.name) ||
      (typeof parentCategory !== "undefined" && String(nextParentId ?? null) !== String(category.parentCategory ?? null));

    if (hasNameOrParentChanged) {
      const dup = await Category.findOne({
        _id: { $ne: category._id },
        name: nextName,
        parentCategory: nextParentId ?? null,
      }).collation({ locale: "en", strength: 2 });

      if (dup) {
        return res.status(400).json({
          message: "Category with this name already exists under the selected parent",
        });
      }
    }

    // --- Status rules ---
    // If attempting to set Active, parent (if any) must be Active
    if (typeof status !== "undefined" && status === "Active" && nextParentId) {
      const parentDoc = nextParent || (await Category.findById(nextParentId));
      if (parentDoc && parentDoc.status === "Inactive") {
        return res.status(400).json({
          message: "Cannot set category Active while its parent is Inactive",
        });
      }
    }

    // If setting Inactive, also set all descendants Inactive
    if (typeof status !== "undefined" && status === "Inactive" && category.status !== "Inactive") {
      const descendants = await getDescendantIds(category._id);
      if (descendants.length > 0) {
        await Category.updateMany(
          { _id: { $in: descendants } },
          { $set: { status: "Inactive" } }
        );
      }
    }

    // --- Apply updates ---
    category.name = nextName;
    if (typeof description !== "undefined") category.description = description;
    if (typeof status !== "undefined") category.status = status;
    if (typeof parentCategory !== "undefined") category.parentCategory = nextParentId ?? null;
    if (typeof image !== "undefined") category.image = image;

    const updatedCategory = await category.save();
    return res.json(updatedCategory);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    // Block delete if children exist
    const childCount = await Category.countDocuments({ parentCategory: id });
    if (childCount > 0) {
      return res.status(400).json({
        message:
          "Cannot delete category with existing subcategories. Please move or delete subcategories first.",
      });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ message: "Category does not exist" });
    }

    return res.json({ message: "Category deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* 👉 Alternative: cascade delete (use with caution)
const deleteCategoryAndChildren = async (id) => {
  const children = await Category.find({ parentCategory: id });
  for (const child of children) {
    await deleteCategoryAndChildren(child._id);
  }
  await Category.findByIdAndDelete(id);
};

export const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const exists = await Category.findById(id);
    if (!exists) return res.status(404).json({ message: "Category does not exist" });
    await deleteCategoryAndChildren(id);
    return res.json({ message: "Category and its subcategories deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
*/
