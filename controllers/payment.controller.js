import { Payment } from "../models/payment.model.js";

/* Centralized populate options */
const paymentPopulate = [
  { path: "userId", select: "name email" },
  { path: "orderId", select: "_id orderId items totalAmount status" },
  { path: "returnOrderId", select: "_id orderId items totalAmount status refundStatus" },
];

/* Get single payment by orderId */
export const getPaymentDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await Payment.findOne({ orderId }).populate(paymentPopulate);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({ payment });
  } catch (error) {
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

/* 📌 Get all payments with pagination */
export const getAllPayments = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const totalItems = await Payment.countDocuments();
    const payments = await Payment.find()
      .skip(skip)
      .limit(limit)
      .populate(paymentPopulate)
      .sort({ createdAt: -1 });

    res.status(200).json({
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      payments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

/* 📌 Get payments by email */
export const getPaymentDetailsByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const payments = await Payment.find({ email })
      .populate(paymentPopulate)
      .sort({ createdAt: -1 });

    res.status(200).json({ payments });
  } catch (error) {
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

/* 📌 Get user’s payments with pagination */
export const getUserPayments = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const totalItems = await Payment.countDocuments({ userId });

    const payments = await Payment.find({ userId })
      .skip(skip)
      .limit(limit)
      .populate(paymentPopulate)
      .sort({ createdAt: -1 });

    res.status(200).json({
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      payments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};
