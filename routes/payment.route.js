import express from 'express';
import { createCheckoutSession ,initiateRefund,storeOrderAfterPayment} from '../controllers/stripe.controller.js';
import { getPaymentDetails } from '../controllers/payment.controller.js';
import { isAdmin } from '../middlewares/authmiddleware.js';
const router = express.Router();

router.post('/create-checkout-session', createCheckoutSession);
router.post('/store-order', storeOrderAfterPayment);
router.post('/initiate-refund',isAdmin, initiateRefund);

router.get('/payment-details/:orderId', getPaymentDetails);

export default router;