import { Payment } from "../models/payment.model.js";

export const getPaymentDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const payment = await Payment.findOne({ orderId })
        .populate('userId', 'name email')
        .populate('orderId', '_id orderId items totalAmount status')
        .populate('returnOrderId', '_id orderId items totalAmount status refundStatus');

        if(!payment){
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.status(200).json({ payment });
    } catch (error) {
        res.status(500).json({ message: error.message || "Internal server error"});
    }
}


export const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
        .populate('userId', 'name email')
        .populate('orderId', '_id orderId items totalAmount status')
        .populate('returnOrderId', '_id orderId items totalAmount status refundStatus');

        if(payments.length === 0){
            return res.status(404).json({ message: 'No payments found' });
        }

        res.status(200).json({ payments });
    } catch (error) {
        res.status(500).json({ message: error.message || "Internal server error"});
    }
}


export const getPaymentDetailsByEmail = async (req, res) => {
    try {
        const { email } = req.params;

        const payments = await Payment.find({ email })
        .populate('userId', 'name email')
        .populate('orderId', '_id orderId items totalAmount status')
        .populate('returnOrderId', '_id orderId items totalAmount status refundStatus');

        if(payments.length === 0){
            return res.status(404).json({ message: 'No payments found' });
        }

        res.status(200).json({ payments });
    } catch (error) {
        res.status(500).json({ message: error.message || "Internal server error"});
    }
}


export const getUserPayments = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const payments = await Payment.find({ userId })
        .populate('userId', 'name email')
        .populate('orderId', '_id orderId items totalAmount status')
        .populate('returnOrderId', '_id orderId items totalAmount status refundStatus');
        
        if(payments.length === 0){
            return res.status(404).json({ message: 'No payments found' });
        }

        res.status(200).json({ payments });
    } catch (error) {
        res.status(500).json({ message: error.message || "Internal server error"});
    }
}