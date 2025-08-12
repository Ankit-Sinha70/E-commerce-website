import Stripe from "stripe";
import dotenv from "dotenv";
import { Order } from "../models/order.model.js";
import { v4 as uuidv4 } from 'uuid';
import { orderPlacedNotification } from "../utils/notification.js";
import { Payment } from "../models/payment.model.js";
import { ReturnOrder } from "../models/returnOrder.model.js";
import { User } from "../models/user.model.js";
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  const {
    userId,
    email,
    items,
    shippingAddress,
    totalAmount,
  } = req.body;


  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // shipping_address_collection: {
      //   allowed_countries: ["US", "IN", "UAE"],
      // },

      customer_email: email,
      line_items: items.map((item) => ({
        price_data: {
          currency: "AED",
          unit_amount: item.price * 100,
          product_data: {
            name: item.name,
            description: "Optional description",
            images: [item.image],
            metadata: {
              category: item.category.name,
              productId: item.productId,
              originalPrice: item.originalPrice,
            },
          },
        },
        quantity: item.quantity,
      })),
      metadata: {
        userId: userId || "",
        // Store the frontend-provided shipping address in metadata, now matching frontend's flat structure
        shipping_full_name: shippingAddress?.fullName || "",
        shipping_phone_number: shippingAddress?.phoneNumber || "",
        shipping_address_line: shippingAddress?.addressLine || "",
        shipping_address_line2: shippingAddress?.addressLine2 || "",
        shipping_city: shippingAddress?.city || "",
        shipping_state: shippingAddress?.state || "",
        shipping_postal_code: shippingAddress?.postalCode || "",
        shipping_country: shippingAddress?.country || "",
      },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const storeOrderAfterPayment = async (req, res) => {
  const { sessionId } = req.body;

  try {

    const existingOrder = await Order.findOne({ sessionId });
    if (existingOrder) {
      return res.status(200).json({
        message: "Order already exists",
        orderId: existingOrder.orderId,
      });
    }

    const expandedSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product", "customer", "shipping", "payment_intent.charges"],
    });

    const lineItems = expandedSession.line_items;
    const collectedShippingAddress = expandedSession.shipping;
    const meta = expandedSession.metadata;

    const frontendProvidedShippingAddress = {
      fullName: meta.shipping_full_name,
      phoneNumber: meta.shipping_phone_number,
      addressLine: meta.shipping_address_line,
      city: meta.shipping_city,
      state: meta.shipping_state,
      postalCode: meta.shipping_postal_code,
      country: meta.shipping_country,
    };

    const addressToStore = {
      fullName:
        collectedShippingAddress?.name ||
        frontendProvidedShippingAddress.fullName,
      phoneNumber: frontendProvidedShippingAddress.phoneNumber,
      addressLine:
        collectedShippingAddress?.address?.line1 ||
        frontendProvidedShippingAddress.addressLine,
      city:
        collectedShippingAddress?.address?.city ||
        frontendProvidedShippingAddress.city,
      state:
        collectedShippingAddress?.address?.state ||
        frontendProvidedShippingAddress.state,
      postalCode:
        collectedShippingAddress?.address?.postal_code ||
        frontendProvidedShippingAddress.postalCode,
      country:
        collectedShippingAddress?.address?.country ||
        frontendProvidedShippingAddress.country,
    };
    let userId = meta.userId || null;
    if(!meta.userId) {
      const user = await User.findOne({ email: expandedSession.customer_details.email });
      userId = user?._id || null;
    }

    const order = new Order({
      orderId: uuidv4(),
      sessionId: sessionId,
      user: userId,
      email: expandedSession.customer_details.email,
      totalAmount: expandedSession.amount_total / 100,
      items: lineItems.data.map((item) => ({
        name: item?.description,
        quantity: item.quantity,
        price: item.amount_total / 100,
        productId: item.price.product.metadata.productId,
        category: item.price.product.metadata.category,
        originalPrice: item.price.product.metadata.originalPrice,
        image: item.price.product.images[0],
      })),
      shippingAddress: addressToStore,
      status: "Processing",
    });


    await order.save();

    if (order.user) {
      await orderPlacedNotification(order.user, order._id);
    }

    const payment = new Payment({
      orderId: order._id,
      userId: order.user || null,
      email: order.email,
      amount: order.totalAmount,
      paymentStatus: "Paid",
      paymentMethod: expandedSession.payment_method_types[0],
      gateway: "stripe",
      sessionId: order.sessionId,
      receiptUrl: expandedSession.payment_intent?.charges?.data[0]?.receipt_url || null,
      paymentTime: new Date(expandedSession.created * 1000),
    });

    await payment.save();


    res.status(201).json({
      message: "Order saved successfully",
      orderId: order.orderId,
      shippingAddress: order.shippingAddress,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }


  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      const existingOrder = await Order.findOne({ sessionId: session.id });
      if (existingOrder) {
        return res.status(200).send("Order already exists.");
      }

      // Expand line items and shipping 
      const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items.data.price.product", "customer", "shipping", "payment_intent.charges"],
      });

      const lineItems = expandedSession.line_items;
      const collectedShippingAddress = expandedSession.shipping;
      const meta = expandedSession.metadata;

      const frontendProvidedShippingAddress = {
        fullName: meta.shipping_full_name,
        phoneNumber: meta.shipping_phone_number,
        addressLine: meta.shipping_address_line,
        city: meta.shipping_city,
        state: meta.shipping_state,
        postalCode: meta.shipping_postal_code,
        country: meta.shipping_country,
      };

      const addressToStore = {
        fullName: collectedShippingAddress?.name || frontendProvidedShippingAddress.fullName,
        phoneNumber: frontendProvidedShippingAddress.phoneNumber,
        addressLine: collectedShippingAddress?.address?.line1 || frontendProvidedShippingAddress.addressLine,
        city: collectedShippingAddress?.address?.city || frontendProvidedShippingAddress.city,
        state: collectedShippingAddress?.address?.state || frontendProvidedShippingAddress.state,
        postalCode: collectedShippingAddress?.address?.postal_code || frontendProvidedShippingAddress.postalCode,
        country: collectedShippingAddress?.address?.country || frontendProvidedShippingAddress.country,
      };
      let userId = meta.userId || null;
      if (!meta.userId) {
        const user = await User.findOne({ email: expandedSession.customer_details.email });
        userId = user?._id || null;
      }

      const order = new Order({
        orderId: uuidv4(),
        sessionId: session.id,
        user: userId,
        email: expandedSession.customer_details.email,
        totalAmount: expandedSession.amount_total / 100,
        items: lineItems.data.map((item) => ({
          name: item?.description,
          quantity: item.quantity,
          price: item.amount_total / 100,
          productId: item.price.product.metadata.productId,
          category: item.price.product.metadata.category,
          originalPrice: item.price.product.metadata.originalPrice,
          image: item.price.product.images[0],
        })),
        shippingAddress: addressToStore,
        status: "Processing",
      });

      await order.save();

      if (order.user) {
        await orderPlacedNotification(order.user, order._id);
      }
      const payment = new Payment({
        orderId: order._id,
        userId: order.user || null,
        email: order.email,
        amount: order.totalAmount,
        paymentStatus: "Paid",
        paymentMethod: expandedSession.payment_method_types[0],
        gateway: "stripe",
        sessionId: order.sessionId,
        receiptUrl: expandedSession.payment_intent?.charges?.data[0]?.receipt_url || null,
        paymentTime: new Date(expandedSession.created * 1000),
      });

      await payment.save();

      return res.status(200).send("Order stored successfully");
    } catch (error) {
      console.error("Error creating order from webhook:", error);
      return res.status(500).send("Webhook processing failed");
    }
  }

  if (event.type === "refund.updated") {
    const refund = event.data.object;
    const returnOrderId = refund.metadata?.returnOrderId || null;
    const cancelOrderId = refund.metadata?.cancelOrderId || null;
    let orderId = null;


    if (refund.status === "succeeded") {
      if (returnOrderId) {
        const returnOrder = await ReturnOrder.findById(returnOrderId);
        if (!returnOrder) return res.status(404).send("Return order not found");

        if (returnOrder.refundStatus !== "Succeeded") {
          returnOrder.stripeRefundId = refund.id;
          returnOrder.refundAmount = refund.amount / 100;
          returnOrder.refundStatus = 'Succeeded';
          returnOrder.status = 'Refunded';
          returnOrder.refundedAt = new Date();
          await returnOrder.save();
        }
        orderId = returnOrder.orderId;
      }
      else if (cancelOrderId) {
        const order = await Order.findById(cancelOrderId);
        if (!order) return res.status(404).send("Cancel order not found");

        if (order.refundStatus !== "Succeeded") {
          order.refundStatus = 'Succeeded';
          order.refundedAt = new Date();
          await order.save();
        }
        orderId = order._id;
      }
      // Update payment record
      if (orderId) {
        const payment = await Payment.findOne({ orderId });
        if (payment) {
          payment.paymentStatus = 'Refunded';
          payment.refundTime = new Date();
          payment.refundId = refund.id;
          payment.refundedAmount = refund.amount / 100;
          payment.returnOrderId = returnOrderId;
          await payment.save();
        }
      }
      return res.status(200).send("Refund processed successfully");
    } 
    else if (refund.status === "failed") {
      if (returnOrderId) {
        const returnOrder = await ReturnOrder.findById(returnOrderId);
        if (returnOrder) {
          returnOrder.refundStatus = 'Failed';
          returnOrder.refundFailureReason = refund.failure_reason;
          await returnOrder.save();
        }
      }
      else if (cancelOrderId) {
        const order = await Order.findById(cancelOrderId);
        if (order) {
          order.refundStatus = 'Failed';
          order.refundFailureReason = refund.failure_reason;
          await order.save();
        }
      }
    }
  }


  res.status(200).send("Event received");
}


export const initiateReturnRequestRefund = async (req, res) => {
  try {
    const { returnOrderId } = req.params;

    const returnOrder = await ReturnOrder.findById(returnOrderId).populate('orderId');
    if (!returnOrder) {
      return res.status(404).json({ message: 'return order not found' });
    }

    const session = await stripe.checkout.sessions.retrieve(returnOrder.orderId.sessionId);

    if (!session.payment_intent) {
      return res.status(400).json({ message: 'No payment intent found in session.' });
    }

    if (returnOrder.refundStatus === 'Initiated') {
      return res.status(200).json({ message: 'Refund already initiated.' });
    }

    if (returnOrder.refundStatus === 'Succeeded') {
      return res.status(200).json({ message: 'Refund already processed.' });
    }

    const refund = await stripe.refunds.create({
      payment_intent: session.payment_intent,
      amount: returnOrder.refundAmount * 100,
      metadata: {
        returnOrderId: returnOrder._id.toString(),
      }
    });

    returnOrder.refundStatus = 'Initiated';
    returnOrder.stripeRefundId = refund.id;

    await returnOrder.save();

    res.status(200).json({ message: 'Refund initiated', refund });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Refund failed', error: error.message });
  }
};

export const initiateCancelledOrderRefund = async (req, res) => {
  try {
    const { cancelOrderId } = req.params;

    const order = await Order.findById(cancelOrderId).populate('user', '_id name email phoneNumber');

    if (!order) {
      return res.status(404).json({ message: 'order not found' });
    }

    if (order.status !== "Cancelled") {
      return res.status(400).json({ message: "Order did not Cancelled." })
    }

    const session = await stripe.checkout.sessions.retrieve(order.sessionId);

    if (!session.payment_intent) {
      return res.status(400).json({ message: 'No payment intent found in session.' });
    }

    if (order.refundStatus === 'Initiated') {
      return res.status(200).json({ message: 'Refund already initiated.' });
    }

    if (order.refundStatus === 'Succeeded') {
      return res.status(200).json({ message: 'Refund already processed.' });
    }

    const refund = await stripe.refunds.create({
      payment_intent: session.payment_intent,
      amount: order.totalAmount * 100,
      metadata: {
        cancelOrderId: order._id.toString(),
      }
    });

    order.refundStatus = 'Initiated';

    await order.save();

    res.status(200).json({ message: 'Refund initiated', refund, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Refund failed', error: error.message });
  }
};