import { cloudinary } from "../utils/cloudinary.js";
import Product from "../models/product.model.js";
import Subcategory from "../models/subcategory.model.js";

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const { name, originalPrice, discountPrice, description, subcategory } =
      req.body;

    // Validate required fields
    if (!name || !originalPrice || !discountPrice || !subcategory) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide all required fields (name, originalPrice, discountPrice, subcategory)",
        });
    }

    // Validate subcategory and derive category
    const sub = await Subcategory.findById(subcategory).populate("category", "status");
    if (!sub) {
      return res.status(400).json({ success: false, message: "Subcategory not found" });
    }
    if (sub.status === "Inactive") {
      return res.status(400).json({ success: false, message: "Cannot add product to an Inactive subcategory" });
    }

    // Ensure originalPrice > discountPrice
    if (Number(originalPrice) <= Number(discountPrice)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Original price must be greater than discount price",
        });
    }

    const product = new Product({
      name,
      originalPrice,
      discountPrice,
      description,
      subcategory: sub._id,
      category: sub.category._id || sub.category, // ensured by pre-validate too
      image: req.file ? (req.file.secure_url || req.file.path) : null,
      images: req.file ? [req.file.secure_url || req.file.path] : [],
    });

    const createdProduct = await product.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: createdProduct,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// Get all products
// ...existing code...
export const getProducts = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      name,
      minPrice,
      maxPrice,
      sortBy,
      page = 1,
      limit = 20,
      priceField = "originalPrice",
    } = req.query;

    const filter = {};
    if (subcategory) filter.subcategory = subcategory;
    if (category) filter.category = category;
    if (name) filter.name = { $regex: name, $options: "i" };
    if (minPrice || maxPrice) {
      // ensure we filter on the actual numeric price field
      filter[priceField] = {};
      if (minPrice) filter[priceField].$gte = Number(minPrice);
      if (maxPrice) filter[priceField].$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);

    let query = Product.find(filter).populate("subcategory", "name").populate("category", "name");
    if (sortBy) query = query.sort(sortBy);

    query = query.skip(skip).limit(Number(limit));

    const products = await query;
    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      message: "Products fetched successfully",
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      total,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Best Deal Products
export const getBestDeals = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0, private");
    const bestDeals = await Product.aggregate([
      {
        $addFields: {
          originalPriceNum: { $toDouble: "$originalPrice" },
          discountPriceNum: { $toDouble: "$discountPrice" },
        },
      },
      {
        $addFields: {
          discountPercentage: {
            $cond: [
              { $gt: ["$originalPriceNum", 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ["$originalPriceNum", "$discountPriceNum"] },
                          "$originalPriceNum",
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { discountPercentage: -1 } },
      { $limit: 10 },
      // project fields as needed (exclude internal fields if required)
      {
        $project: {
          name: 1,
          brand: 1,
          category: 1,
          subcategory: 1,
          image: 1,
          images: 1,
          originalPrice: 1,
          discountPrice: 1,
          discountPercentage: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    res.json({
      success: true,
      message: "Best deals fetched successfully",
      data: bestDeals,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// Get single product by ID + related products
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("subcategory", "name")
      .populate("category", "name");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const relatedProducts = await Product.find({
      category: product.category?._id || product.category,
      _id: { $ne: product._id },
    })
      .limit(4)
      .populate("subcategory", "name").populate("category", "name");

    const discountPercentage = Math.round(
      ((product.originalPrice - product.discountPrice) /
        product.originalPrice) *
        100
    );

    res.json({
      success: true,
      message: "Product fetched successfully",
      data: {
        product,
        relatedProducts,
        discountPercentage,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update product by ID
export const updateProduct = async (req, res) => {
  try {
    const { name, originalPrice, discountPrice, description, subcategory } =
      req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Update fields
    product.name = name || product.name;
    product.originalPrice = originalPrice || product.originalPrice;
    product.discountPrice = discountPrice || product.discountPrice;
    product.description = description || product.description;

    if (subcategory) {
      const sub = await Subcategory.findById(subcategory).populate("category", "status");
      if (!sub) {
        return res.status(400).json({ success: false, message: "Subcategory not found" });
      }
      if (sub.status === "Inactive") {
        return res.status(400).json({ success: false, message: "Cannot move product to an Inactive subcategory" });
      }
      product.subcategory = sub._id;
      product.category = sub.category._id || sub.category;
    }

    product.image = req.file
    ? (req.file.secure_url || req.file.path)
    : product.image;
  
  if (req.file) {
    // Keep images array in sync if you want
    if (!Array.isArray(product.images)) product.images = [];
    product.images[0] = req.file.secure_url || req.file.path;
  }

    if (Number(product.originalPrice) <= Number(product.discountPrice)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Original price must be greater than discount price",
        });
    }

    const updatedProduct = await product.save();

    res.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// Delete product by ID
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    if (product.image) {
      const publicIdMatch = product.image.match(/\/([^/]+)\.[a-z]+$/);
      if (publicIdMatch) {
        const publicId = `natural_ice/${publicIdMatch[1]}`;
        await cloudinary.uploader.destroy(publicId);
      }
    }

    await product.deleteOne();

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
