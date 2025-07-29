import { Payment } from "../models/payment.model.js";

export const getPaymentDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const payment = await Payment.findOne({ orderId })
        .populate('userId', 'name email')
        .populate('orderId', '_id orderId items totalAmount');
        if(!payment){
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.status(200).json({ payment });
    } catch (error) {
        res.status(500).json({ message: error.message || "Internal server error"});
    }
}