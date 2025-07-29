import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["Order", "Info", "Warning"],
    default: "Info",
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
//   link: {
//     type: String, // Optional: link to order details, offer page etc.
//     default: "",
//   },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});


export const Notification = mongoose.model("Notification", NotificationSchema);
