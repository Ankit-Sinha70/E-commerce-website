import {Wish} from "../models/wishList.model.js";
import jwt from "jsonwebtoken";

export const addItemToWishList = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const { productId } = req.body;

    let wishList = await Wish.findOne({ user: userId });

    if (!wishList) {
      wishList = new Wish({ user: userId, products: [] });
    }

    if (!wishList.products.includes(productId )) {
      wishList.products.push(productId );
      await wishList.save();
    }

    res.status(200).json(wishList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get user's wishlist
export const getUserWishList = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
      const userId = req.user.id;
      const totalItems = await Wish.countDocuments({ user: userId });
      if (totalItems === 0) {
        return res.status(404).json({ message: "Wishlist not found." });
      }

      const wishList = await Wish.findOne({ user: userId })
        .populate("products")
        .skip(skip)
        .limit(limit)
        .lean();

    res.status(200).json({
      message: "Wishlist fetched successfully",
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      wishList,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove item from wishlist
export const removeItemFromWishList = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    // const { productId } = req.body;
 const productId = req.params.id;
    const wishList = await Wish.findOne({ user: userId });

    if (!wishList) {
      return res.status(404).json({ message: "Wishlist not found." });
    }

    wishList.products = wishList.products.filter(
      (id) => id.toString() !== productId
    );

    await wishList.save();

    res.status(200).json(wishList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear wishlist
export const clearWishList = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const wishList = await Wish.findOne({ user: userId });

    if (!wishList) {
      return res.status(404).json({ message: "Wishlist not found." });
    }

    wishList.products = [];
    await wishList.save();

    res.status(200).json(wishList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Merge wishlist items
export const mergeWishListItems = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const { products } = req.body;

    let wishList = await Wish.findOne({ user: userId });

    if (!wishList) {
      wishList = new Wish({ user: userId, products: [] });
    }

    products.forEach((productId) => {
      if (!wishList.products.includes(productId)) {
        wishList.products.push(productId);
      }
    });

    await wishList.save();

    res.status(200).json(wishList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
