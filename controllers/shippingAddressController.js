import ShippingAddress from "../models/ShippingAddress.js";

const createShippingAddress = async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      addressLine,
      city,
      state,
      postalCode,
      country,
      type,
      isDefault,
    } = req.body;
    const userId = req.user.id;

    // Validate request body
    if (
      !fullName ||
      !phoneNumber ||
      !addressLine ||
      !city ||
      !state ||
      !postalCode ||
      !country
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided." });
    }

    // Check if there's an existing default address and update it if a new one is set to default
    if (isDefault) {
      await ShippingAddress.updateMany(
        { userId, isDefault: true },
        { isDefault: false }
      );
    }

    const newAddress = new ShippingAddress({
      userId,
      fullName,
      phoneNumber,
      addressLine,
      city,
      state,
      postalCode,
      country,
      type,
      isDefault: isDefault || false,
    });

    await newAddress.save();
    res
      .status(201)
      .json({
        message: "Shipping address created successfully",
        address: newAddress,
      });
  } catch (error) {
    console.error("Error creating shipping address:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getShippingAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await ShippingAddress.find({ userId }).sort({
      isDefault: -1,
      createdAt: 1,
    });

    if (!addresses.length) {
      return res
        .status(404)
        .json({ message: "No shipping addresses found for this user." });
    }

    res.status(200).json({ addresses });
  } catch (error) {
    console.error("Error fetching shipping addresses:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateShippingAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No update data provided." });
    }

    if (updates.isDefault === true) {
      await ShippingAddress.updateMany(
        { userId, isDefault: true, _id: { $ne: id } },
        { isDefault: false }
      );
    }

    const updatedAddress = await ShippingAddress.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedAddress) {
      return res
        .status(404)
        .json({
          message: "Shipping address not found or not authorized to update.",
        });
    }

    res
      .status(200)
      .json({
        message: "Shipping address updated successfully",
        address: updatedAddress,
      });
  } catch (error) {
    console.error("Error updating shipping address:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteShippingAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deletedAddress = await ShippingAddress.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!deletedAddress) {
      return res
        .status(404)
        .json({
          message: "Shipping address not found or not authorized to delete.",
        });
    }

    res.status(200).json({ message: "Shipping address deleted successfully" });
  } catch (error) {
    console.error("Error deleting shipping address:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export {
  createShippingAddress,
  getShippingAddresses,
  updateShippingAddress,
  deleteShippingAddress,
};
