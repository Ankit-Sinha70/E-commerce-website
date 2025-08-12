import express from 'express';
import { createCheckoutSession ,initiateCancelledOrderRefund,initiateReturnRequestRefund, storeOrderAfterPayment} from '../controllers/stripe.controller.js';
import { getAllPayments, getPaymentDetails, getPaymentDetailsByEmail, getUserPayments } from '../controllers/payment.controller.js';
import { isAdmin } from '../middlewares/authmiddleware.js';
const router = express.Router();

router.post('/create-checkout-session', createCheckoutSession);
router.post('/store-order', storeOrderAfterPayment);

router.post('/initiate-refund/returned-order/:returnOrderId',isAdmin, initiateReturnRequestRefund);
router.post('/initiate-refund/cancelled-order/:cancelOrderId',isAdmin, initiateCancelledOrderRefund);

router.get('/payment-details/:orderId', getPaymentDetails);
router.get('/all-payments',isAdmin, getAllPayments);
router.get('/payment-details-by-email/:email', getPaymentDetailsByEmail);
router.get('/user-payments/:userId', getUserPayments);

export default router;