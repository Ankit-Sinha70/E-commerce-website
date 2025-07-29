import express from 'express';
import {
    createShippingAddress,
    getShippingAddresses,
    updateShippingAddress,
    deleteShippingAddress,
} from '../controllers/shippingAddressController.js';
import { protect } from '../middlewares/authmiddleware.js';

const router = express.Router();


router.post('/create-address', protect, createShippingAddress);
router.get('/get-address', protect, getShippingAddresses);
router.put('/update-address/:id', protect, updateShippingAddress);
router.delete('/delete-address/:id', protect, deleteShippingAddress);

export default router; 