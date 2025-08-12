import { Category } from '../models/category.model.js';

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const { name, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (name) {
      filter.name = { $regex: name, $options: 'i' }; // Add name to filter for case-insensitive partial match
    }

    if (status) {
      filter.status = status;
    }

    const totalItems = await Category.countDocuments(filter);
    if (totalItems === 0) {
      return res.status(404).json({ message: 'No categories found' });
    }
    const categories = await Category.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 });
    res.json({
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      categories
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get category by ID
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new category
export const createCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = new Category({ name, description, status });
    const savedCategory = await category.save();

    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category does not exist' });
    }

    category.name = name ?? category.name;
    category.description = description ?? category.description;
    category.status = status ?? category.status;

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category does not exist' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
