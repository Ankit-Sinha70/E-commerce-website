// No changes required in this file for routing paths. Ensure client sends `subcategory` in body for create/update.
import express from "express";
import {
  createProduct,
  deleteProduct,
  getBestDeals,
  getProductById,
  getProducts,
  updateProduct,
} from "../controllers/product.controller.js";
import { isAdmin } from "../middlewares/authmiddleware.js";

import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/create", isAdmin, upload.single("image"), createProduct);
router.get("/list", getProducts);
router.get("/single/:id", getProductById);
router.put("/update/:id", isAdmin, upload.single("image"), updateProduct);
router.delete("/delete/:id", isAdmin, deleteProduct);
router.get("/best-deals", getBestDeals);

export default router;
