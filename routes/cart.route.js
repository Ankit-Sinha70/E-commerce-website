import express from 'express';
import { addItemToCart, clearUserCart, getUserCart, mergeProduct, removeCartItem } from '../controllers/cart.controller.js';
const router = express.Router();

router.post('/addToCart', addItemToCart);
router.get('/cartList' ,getUserCart)
router.delete('/delete/:id' ,removeCartItem)
router.delete('/clear', clearUserCart);
router.post('/merge',mergeProduct)
export default router;

