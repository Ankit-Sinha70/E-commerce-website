import express from "express";
import {
  getProductById,
  getProducts,
} from "../controllers/product.controller.js";

const router = express.Router();

router.get("/list", getProducts);
router.get("/single/:id", getProductById);

export default router;
