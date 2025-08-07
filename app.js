import express from "express"
import productRoutes from "./routes/product.route.js"
import categoryRoutes from "./routes/category.route.js"
import productlistRoutes from "./routes/productlist.route.js"
import cartRoutes from "./routes/cart.route.js"
import userRoutes from "./routes/user.route.js"
import emailRoutes from "./routes/email.route.js"
import chatRoutes from "./routes/chat.route.js"
import paymentRoutes from "./routes/payment.route.js"
import receiptRoutes from "./routes/receipt.route.js"
import orderRoutes from "./routes/order.route.js"
import deliveryRoutes from "./routes/delivery.route.js"
import productReviewRoutes from "./routes/ProductReview.route.js"

import wishListRoutes from "./routes/wishList.route.js"
import shippingAddressRoutes from "./routes/shippingAddressRoutes.js"

import cors from "cors"
import cookieParser from "cookie-parser";
import { stripeWebhookHandler } from "./controllers/stripe.controller.js"
import { protect } from "./middlewares/authmiddleware.js"
import notificationRoutes from "./routes/notification.route.js";

const app = express()

app.use("/api/payment/stripe-webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

const corsOrigin = process.env.CORS_ORIGIN?.split(",");
app.use(cors({
    origin: corsOrigin,
    credentials: true
}))
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(express.json());
// Route prefix
app.use('/api/product', productRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/user', userRoutes)
app.use('/api/productlist', productlistRoutes)
app.use('/api/review', productReviewRoutes);
app.use('/api/cart', protect, cartRoutes)
app.use('/api/contact', emailRoutes);
app.use('/api', chatRoutes)
app.use('/api/wishlist', wishListRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/receipt', receiptRoutes)
app.use('/api/order', orderRoutes)
app.use('/api', shippingAddressRoutes)
app.use('/api/notifications', protect, notificationRoutes)
app.use('/api/delivery', deliveryRoutes)

export { app }