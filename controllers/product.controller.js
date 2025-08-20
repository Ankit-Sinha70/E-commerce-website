import { cloudinary } from "../utils/cloudinary.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js"

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const { name, price, description, category } = req.body;

    const newProduct = new Product({
      name,
      price,
      description,
      category,
      image: req.file ? req.file.path : null,
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all products
export const getProducts = async (req, res) => {
  try {
    const {
      category,
      name,
      minPrice,
      maxPrice,
      sortBy,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (category) {
      filter.category = category;
    }
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);

    let query = Product.find(filter).populate("category", "name");
    if (sortBy) {
      query = query.sort(sortBy);
    }

    query = query.skip(skip).limit(Number(limit));

    const products = await query;

    const total = await Product.countDocuments(filter);

    res.json({
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      total,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single product by ID
export const getProductById = async (req, res) => {
  try {
    const products = await Product.find().populate("category", "name"); 
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update product by ID
export const updateProduct = async (req, res) => {
  try {
    const { name, price, description, stock, category } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (req.file) {
      const oldImageUrl = product.image;
      const publicIdMatch = oldImageUrl.match(/\/([^/]+)\.[a-z]+$/);
      if (publicIdMatch) {
        const publicId = `natural_ice/${publicIdMatch[1]}`;
        await cloudinary.uploader.destroy(publicId);
      }
      product.image = req.file.path;
    }

    product.name = name || product.name;
    product.price = price || product.price;
    product.description = description || product.description;
    product.stock = stock || product.stock;
    product.category = category || product.category;

    const updated = await product.save();
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete product by ID
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.image) {
      const publicIdMatch = product.image.match(/\/([^/]+)\.[a-z]+$/);
      if (publicIdMatch) {
        const publicId = `natural_ice/${publicIdMatch[1]}`;
        await cloudinary.uploader.destroy(publicId);
      }
    }

    await product.deleteOne();
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
