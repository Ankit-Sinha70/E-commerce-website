import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { createTransport } from "nodemailer";
import { cloudinary } from "../utils/cloudinary.js";

//create user
export const register = async (req, res) => {
  try {
    const { name, email, password, address } = req.body;

    const UserExist = await User.findOne({ email });
    if (UserExist) {
      return res
        .status(400)
        .json({ success: false, message: "User Already exist" });
    }

    const user = new User({ name, email, password, address });
    const savedUser = await user.save();
    const { password: _, ...response } = savedUser.toObject();

    res
      .status(201)
      .json({ success: true, message: "User Created", data: response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN } // Short-lived access token
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_EXPIRES_IN,
  });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.status === "Inactive") {
      return res.status(401).json({ message: "User is Inactive" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });
    const { password: _, ...userProfile } = user.toObject();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    userProfile.refreshtoken = refreshToken;
    res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })
      .status(200)
      .json({ userProfile, accessToken });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email, address } = req.body;
    const user = await User.findById(req.params.id).select(
      "+avatarPublicId -password"
    ); // fetch existing product
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.name = name || user.name;
    user.email = email || user.email;
    user.address = address || user.address;
    if (req.file) {
      if (user.avatarPublicId) {
        await cloudinary.uploader.destroy(user.avatarPublicId);
      }
      user.avatar = req.file.path;
      user.avatarPublicId = req.file.filename;
    }
    const userObj = await user.save();
    const updatedUser = userObj.toObject();
    delete updatedUser.avatarPublicId;
    res.status(200).json({ message: "User updated successfully", updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getuser = async (req, res) => {
  try {
    const id = req.user.id;
    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.status === "Inactive") {
      return res.status(401).json({ message: "User is Inactive" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "strict", // make sure this matches how you set it
  });
  res.status(200).json({ message: "Logged out successfully" });
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).send("User not found");

  const token = crypto.randomBytes(20).toString("hex");

  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  const transporter = createTransport({
    service: "Gmail",
    auth: {
      user: process.env.MAIL,
      pass: process.env.APP_PASS,
    },
  });

  const mailOptions = {
    to: user.email,
    subject: "Password Reset",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="color: #0056b3; text-align: center;">Password Reset Request</h2>
        <p>Dear ${user.name},</p>
        <p>You have requested to reset your password. Please click on the button below to reset it:</p>
        <p style="text-align: center;">
          <a href="${resetURL}" style="display: inline-block; padding: 10px 20px; margin-top: 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </p>
        <p style="font-size: 0.9em; color: #666; margin-top: 20px;">This link will expire in 1 hour.</p>
        <p style="font-size: 0.9em; color: #666;">If you did not request a password reset, please ignore this email.</p>
        <p style="margin-top: 30px;">Regards,</p>
        <p>Your Application Team</p>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) return res.status(500).send("Email not sent");
    res.send("Password reset email sent");
  });
};

// Reset Password
export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).send("Token is invalid or expired");

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.send("Password has been reset");
};

// update password
export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Old password is incorrect" });

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) return res.status(401).json({ message: "User not found" });

    if (user.status === "Inactive") {
      return res.status(401).json({ message: "User is Inactive" });
    }

    const newAccessToken = generateAccessToken(user);

    res.status(200).json({ accessToken: newAccessToken, user: user });
  } catch (err) {
    console.error("Refresh error:", err.message);
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { name } = req.query;
    const filter = { role: "user" };
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }
    const users = await User.find(filter)
      .select("-password -refreshtoken")
      .lean();
    res.status(200).json({
      success: true,
      message: users.length ? "Users fetched successfully" : "No users found",
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Allow if admin or the user themselves
    if (req.user.id !== id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(401).json({ message: "User not found" });

    if (user.status === "Inactive") {
      return res.status(400).json({ message: "User is already Inactive" });
    }

    user.status = "Inactive";
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const deleteUserAvatar = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.id !== id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const user = await User.findById(id).select("+avatarPublicId");
    if (!user) return res.status(401).json({ message: "User not found" });

    if (user.avatarPublicId) {
      await cloudinary.uploader.destroy(user.avatarPublicId);
      user.avatar = null;
      user.avatarPublicId = null;
      await user.save();
      res
        .status(200)
        .json({ success: true, message: "Avatar deleted successfully" });
    }
    res.status(200).json({ success: true, message: "No avatar to delete" });
  } catch (error) {
    console.error("Error deleting user avatar:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
};

export const setStatusActive = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "User not found" });

    if(user.role !== 'user'){
      return res.status(200).json({ message: "Unauthorized" });
    }

    if (user.status === "Active") {
      return res.status(200).json({ message: "User is already Active" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    user.status = "Active";
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "User status set to Active" });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
};
