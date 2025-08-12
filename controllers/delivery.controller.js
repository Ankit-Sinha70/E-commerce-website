import { Order } from "../models/order.model.js";
import { ReturnOrder } from "../models/returnOrder.model.js";
import { User } from "../models/user.model.js";


export const registerDeliveryAgent = async (req, res) => {
  try {
    const { name, email, password, address } = req.body;

    const UserExist = await User.findOne({ email });
    if (UserExist) {
      return res
        .status(400)
        .json({ success: false, message: "User Already exist" });
    }

    const user = new User({ name, email, password, address, role: 'delivery' });
    const savedUser = await user.save();
    const { password: _, ...response } = savedUser.toObject();

    res.status(201).json({ success: true, message: "Delivery Agent Created", data: response });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAllDeliveryAgents = async (req, res) => {
  try {
    const { name } = req.query;

    const filter = { role: "delivery" };

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }
    const deliveryUsers = await User.find(filter)
      .select("-password -refreshtoken")
      .sort({ createdAt: -1 })
      .lean();

    if (!deliveryUsers.length) {
      return res.status(404).json({ success: false, message: "No Delivery Agents found" });
    }

    res.status(200).json({ success: true, message: "Delivery Agents fetched successfully", data: deliveryUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}


export const setDeliveryAgentInactive = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.role !== 'delivery') {
      return res.status(401).json({ success: false, message: "User is not Delivery Agent" })
    }

    if (user.status === "Inactive") {
      return res.status(400).json({ success: false, message: "Delivery Agent is already Inactive" });
    }

    user.status = "Inactive";
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Delivery Agent Inactive successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const setDeliveryAgentActive = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.role !== 'delivery') {
      return res.status(401).json({ success: false, message: "User is not Delivery Agent" })
    }

    if (user.status === "Active") {
      return res.status(400).json({ success: false, message: "Delivery Agent is already Active" });
    }

    user.status = "Active";
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Delivery Agent activated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
};


export const assignDeliveryAgent = async (req, res) => {
  try {
    const { orderId, deliveryAgentId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (order.status === 'Delivered') {
      return res.status(400).json({ success: false, message: "Order is already delivered" });
    }
    if (order.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: "Order is cancelled" });
    }

    const deliveryAgent = await User.findOne({ _id: deliveryAgentId, role: 'delivery' });
    if (!deliveryAgent) {
      return res.status(404).json({ success: false, message: "Delivery Agent not found" });
    }

    if (deliveryAgent.status !== 'Active') {
      return res.status(401).json({ success: false, message: "Delivery Agent is not Active" });
    }

    if (order.deliveryAgent === deliveryAgent._id) {
      return res.status(400).json({ success: false, message: "Delivery Agent already assigned to this order" });
    }

    order.deliveryAgent = deliveryAgentId;
    await order.save();

    res.status(200).json({ success: true, message: "Delivery Agent assigned", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}


export const assignPickUpAgent = async (req, res) => {
  try {
    const { returnOrderId, pickUpAgentId } = req.body;

    if (!returnOrderId || !pickUpAgentId) {
      return res.status(400).json({ success: false, message: "Return Order ID and Pick Up Agent ID are required" });
    }

    const returnOrder = await ReturnOrder.findById(returnOrderId);
    if (!returnOrder) {
      return res.status(404).json({ success: false, message: "Return Order not found" });
    }

    if (returnOrder.status !== 'Approved') {
      return res.status(400).json({ success: false, message: "Return request is not approved" });
    }

    if (returnOrder.pickUpAgent === pickUpAgentId) {
      return res.status(400).json({ success: false, message: "Pick Up Agent already assigned to this order" });
    }

    returnOrder.pickUpAgent = pickUpAgentId;
    await returnOrder.save();

    res.status(200).json({ success: true, message: "Pick Up Agent assigned", returnOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export const getAssignedOrders = async (req, res) => {
  try {
    const { agentId } = req.params;

    // Fetch delivery orders
    const deliveryOrders = await Order.find({
      deliveryAgent: agentId,
      status: { $in: ['Pending', 'Processing', 'Shipped'] }
    })
      .populate('user', 'name email phoneNumber')
      .lean();

    const mappedDelivery = deliveryOrders.map(order => ({
      ...order,
      taskType: 'Delivery'
    }));

    // Fetch pickup return orders
    const pickupOrders = await ReturnOrder.find({
      pickUpAgent: agentId,
      status: { $in: ['Requested', 'Approved'] }
    })
      .populate('user', 'name email phoneNumber')
      .lean();

    const mappedPickup = pickupOrders.map(order => ({
      ...order,
      taskType: 'Pickup'
    }));

    const assignedOrders = [...mappedDelivery, ...mappedPickup];

    res.status(200).json({
      success: true,
      message: "Assigned orders fetched successfully",
      data: assignedOrders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



export const addDeliveryNotes = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryNotes } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    order.deliveryNotes = deliveryNotes;
    await order.save();
    res.status(200).json({ success: true, message: "Delivery Notes added", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}