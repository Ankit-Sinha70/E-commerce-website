import mongoose, { Schema } from "mongoose";

export const ReturnRequestSchema = new Schema({
  isRequested: { type: Boolean, required: true, default: false },
  reason: { type: String, required: true },
  comment: { type: String, required: true },
  imageUrl: { type: String },
  pickUpAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['Requested', 'Approved', 'Rejected', 'Picked', 'Refunded', 'Cancelled'],
    default: 'Requested',
  },
  stripeRefundId: { type: String },
  refundAmount: { type: Number },
  refundStatus: {
    type: String,
    enum: ['Pending', 'Initiated', 'Succeeded', 'Failed'],
    default: 'Pending',
  },
  refundFailureReason: { type: String },

  requestedAt: Date,
  approvedAt: Date,
  rejectedAt: Date,
  pickedAt: Date,
  refundedAt: Date,
  cancelledAt: Date,
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    guestId: {
      type: String,
      required: false,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
    },
    items: [
      {
        name: String,
        quantity: Number,
        price: Number,
        productId: String,
        category: String,
        originalPrice: Number,
        image: String,
      },
    ],
    shippingAddress: {
      fullName: { type: String },
      phoneNumber: { type: String },
      addressLine: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String },
    },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Returned", "Cancelled"],
      default: "Pending",
    },
    currentLocation: { type: String },
    estimatedDeliveryDate: { type: Date },

    returnRequest: ReturnRequestSchema,

    deliveryAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deliveryNotes: { type: String },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },

    trackingHistory: [
      {
        status: String,
        location: String,
        timestamp: Date,
      },
    ],
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
