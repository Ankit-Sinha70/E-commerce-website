import mongoose, { Schema } from "mongoose";


const ReturnOrderSchema = new Schema({
    // isRequested: { type: Boolean, required: true, default: false },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reason: { type: String, required: true },
    comment: { type: String, required: true },
    imageUrl: { type: String },
    pickUpAgent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
    pickUpAddress: {
        fullName: { type: String },
        phoneNumber: { type: String },
        addressLine: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String },
        country: { type: String },
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

export const ReturnOrder = mongoose.model("ReturnOrder", ReturnOrderSchema);