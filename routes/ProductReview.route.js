import express from 'express';
import { uploadProductReview } from '../middlewares/upload.js';
import { protect } from '../middlewares/authmiddleware.js';
import { createReview } from '../controllers/productReview.controller.js';
import { updateReview } from '../controllers/productReview.controller.js';
import { getReviewsByProductId } from '../controllers/productReview.controller.js';
import { deleteReview } from '../controllers/productReview.controller.js';

const router = express.Router();

router.post('/', protect, uploadProductReview.fields([{ name: 'images', maxCount: 5 }]), createReview);
router.put('/:reviewId', protect, uploadProductReview.fields([{ name: 'images', maxCount: 5 }]), updateReview);

router.get('/:productId', getReviewsByProductId);
router.delete('/:reviewId', protect, deleteReview);

export default router;