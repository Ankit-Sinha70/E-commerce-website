import express from "express";
import { isAdmin } from "../middlewares/authmiddleware.js";
import upload from "../middlewares/upload.js";
import { createSubcategory, getSubcategories, getSubcategoryById, updateSubcategory, deleteSubcategory } from "../controllers/subcategory.controller.js";

const router = express.Router();

router.post("/create", isAdmin, upload.single("image"), createSubcategory);
router.get("/", getSubcategories);
router.get("/:id", getSubcategoryById);
router.put("/update/:id", isAdmin, upload.single("image"), updateSubcategory);
router.delete("/delete/:id", isAdmin, deleteSubcategory);

export default router;
