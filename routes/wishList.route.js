import express from "express";
import {
  addItemToWishList,
  getUserWishList,
  removeItemFromWishList,
  clearWishList,
  mergeWishListItems,
} from "../controllers/wishList.controller.js";
import { protect } from "../middlewares/authmiddleware.js";
const router = express.Router();
router.post("/addToWishlist", protect, addItemToWishList);

router.get("/wishlist", protect, getUserWishList);

router.delete("/remove/:id", protect, removeItemFromWishList);

router.delete("/clear", protect, clearWishList);

router.post("/merge", mergeWishListItems);
export default router;
