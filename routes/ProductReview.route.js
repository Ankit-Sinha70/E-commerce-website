import express from 'express';
import { createReview, deleteReview, getReviewsByProductId, updateReview } from '../controllers/productReview.controller.js';
import { uploadProductReview } from '../middlewares/upload.js';
import { protect } from '../middlewares/authmiddleware.js';

const router = express.Router();

router.post('/create', protect, uploadProductReview.fields([{ name: 'images', maxCount: 5 }]), createReview);
router.put('/:reviewId', protect, uploadProductReview.fields([{ name: 'images', maxCount: 5 }]), updateReview);

router.get('/:productId', getReviewsByProductId);
router.delete('/:reviewId', protect, deleteReview);

export default router;