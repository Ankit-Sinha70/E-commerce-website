import express from 'express';
import {
  addItemToWishList,
  getUserWishList,
  removeItemFromWishList,
  clearWishList,
  mergeWishListItems
} from '../controllers/wishList.controller.js';
const router = express.Router();
router.post('/addToWishlist', addItemToWishList);

router.get('/wishlist', getUserWishList);

router.delete('/remove/:id', removeItemFromWishList);

router.delete('/clear', clearWishList);

router.post('/merge', mergeWishListItems);
export default router;
