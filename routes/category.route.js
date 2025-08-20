import express from "express";
import { isAdmin } from "../middlewares/authmiddleware.js";
import upload from "../middlewares/upload.js";

import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/category.controller.js";

const router = express.Router();

router.post("/create", isAdmin, upload.single("image"), createCategory);
router.put("/update/:id", isAdmin, upload.single("image"), updateCategory);
router.delete("/delete/:id", isAdmin, deleteCategory);
router.get("/", getCategories);
router.get("/:id", getCategoryById);

export default router;
