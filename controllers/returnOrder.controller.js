import { Order } from "../models/order.model.js";
import { ReturnOrder } from "../models/returnOrder.model.js";

export const returnOrderRequest = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason, comment, items } = req.body;
        const products = JSON.parse(items);
    
        if (!reason || !comment || !products || products.length === 0) {
            return res.status(400).json({ message: 'Reason, comment, and products are required' });
        }

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const orderDeliveredTime = new Date(order.deliveredAt);
        const currentTime = new Date();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (currentTime.getTime() - orderDeliveredTime.getTime() > twentyFourHours) {
            return res.status(400).json({ message: 'Return window (24 hrs) has passed.' });
        }

        const returnItems = [];

        for (const product of products) {
            const item = order.items.find(i => i.productId.toString() === product.productId);
          
            if (!item) continue;

            const alreadyReturned = item.returnedQuantity || 0;
            const maxReturnable = item.quantity - alreadyReturned;

            if (product.quantity > maxReturnable) {
                return res.status(400).json({
                    message: `Cannot return more than remaining quantity for ${item.name}. Already returned: ${alreadyReturned}`
                });
            }

            if (product.quantity <= 0 || maxReturnable <= 0) {
                continue;
            }

            returnItems.push({
                productId: item.productId,
                name: item.name,
                quantity: product.quantity,
                price: item.price,
                image: item.image,
                originalPrice: item.originalPrice,
                category: item.category
            });

            // Update returnedQuantity in the order item
            item.returnedQuantity = alreadyReturned + product.quantity;
        }

        if (returnItems.length === 0) {
            return res.status(400).json({ message: 'All selected products have already been fully returned.' });
        }

        const refundAmount = returnItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

        const returnOrder = new ReturnOrder({
            user: order.user,
            orderId: order._id,
            reason,
            comment,
            items: returnItems,
            refundAmount,
            pickUpAddress: order.shippingAddress,
            status: 'Requested',
            refundStatus: 'Pending',
            requestedAt: new Date()
        });

        if (req.file) {
            returnOrder.imageUrl = req.file.path;
        }

        await returnOrder.save();
        await order.save(); 

        res.status(200).json({
            success: true,
            message: 'Return request placed successfully.',
            returnOrder
        });

    } catch (error) {
       return res.status(500).json({ message: error.message });
    }
};


export const cancelReturnRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const returnOrder = await ReturnOrder.findById(id);
        if (!returnOrder) {
            return res.status(404).json({ message: 'return order not found' });
        }


        if (returnOrder.status === 'Picked' || returnOrder.status === 'Refunded') {
            return res.status(400).json({ message: 'Return request cannot be cancelled after it has been picked or refunded.' });
        }

        if (returnOrder.status === 'Cancelled') {
            return res.status(400).json({ message: 'Return request is already cancelled.' });
        }

        returnOrder.status = 'Cancelled';
        returnOrder.cancelledAt = new Date();
        await returnOrder.save();

        res.status(200).json({ message: 'Return request cancelled successfully', returnOrder });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const getUserReturnRequest = async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalItems = await ReturnOrder.countDocuments({ user: userId });
        if (totalItems === 0) {
            return res.status(404).json({ message: 'No return requests found for this user', returnRequests: [] });
        }

        const returnRequests = await ReturnOrder.find({ user: userId });


        res.status(200).json({
            page,
            limit,
            totalPages: Math.ceil(totalItems / limit),
            totalItems,
            returnRequests
        });

    } catch (error) {
        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
}

export const getAllReturnRequestOrders = async (req, res) => {
    const { status, date } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;


    let filter = {};

    if (status) {
        filter["status"] = new RegExp(`^${status}$`, 'i');
    }

     if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.requestedAt = { $gte: start, $lt: end };
    }

    try {

        const totalItems = await ReturnOrder.countDocuments(filter);
        if (totalItems === 0) {
            return res.status(404).json({ message: 'No return requests found', returnRequest: [] });
        }
        const returnRequest = await ReturnOrder.find(filter)
            .populate('user', '_id name email phoneNumber')
            .populate('orderId', '_id orderId totalAmount status items deliveredAt')
            .populate('pickUpAgent', '_id name email phoneNumber')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.status(200).json({
            page,
            limit,
            totalPages: Math.ceil(totalItems / limit),
            totalItems,
            returnRequest
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}


export const updateReturnRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const returnOrder = await ReturnOrder.findById(id);
        
        if (!returnOrder) {
            return res.status(404).json({ message: 'return order not found' });
        }

        const order = await Order.findById(returnOrder.orderId);
        if (!order) {
            return res.status(404).json({ message: 'order not found' });
        }

        if (status === 'Approved') {
            returnOrder.status = 'Approved';
            returnOrder.approvedAt = new Date();
            order.status = 'Returned';
        } else if (status === 'Rejected') {
            returnOrder.status = 'Rejected';
            returnOrder.rejectedAt = new Date();
        } else if (status === 'Picked') {
            returnOrder.status = 'Picked';
            returnOrder.pickedAt = new Date();
        } else if (status === 'Refunded') {
            returnOrder.status = 'Refunded';
            returnOrder.refundedAt = new Date();
            order.status = 'Returned';
        } else if (status === 'Cancelled') {
            returnOrder.status = 'Cancelled';
            returnOrder.cancelledAt = new Date();
        } else {
            return res.status(400).json({ message: 'Invalid status' });
        }

        await returnOrder.save();
        res.status(200).json({ message: 'Return request status updated successfully', returnOrder });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}