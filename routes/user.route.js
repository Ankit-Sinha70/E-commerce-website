import express from "express";
import {
  register,
  loginUser,
  updateUser,
  getuser,
  logoutUser,
  forgotPassword,
  resetPassword,
  refreshToken,
  changePassword,
  getAllUsers,
  deleteUser,
  setStatusActive,
  deleteUserAvatar,
} from "../controllers/user.controller.js";
import { protect, isAdmin } from "../middlewares/authmiddleware.js";
import { uploadAvatar } from "../middlewares/upload.js";

const router = express.Router();

router.post("/create", register);
router.post("/login", loginUser);
router.put("/update/:id", protect, uploadAvatar.single("avatar"), updateUser);
router.delete("/delete-avatar/:id", protect, deleteUserAvatar);

router.get("/profile", protect, getuser);
router.get("/admin-data", protect, isAdmin, (req, res) => {
  res.json({ message: "Welcome Admin" });
});

router.get("/all-users", isAdmin, getAllUsers);
router.delete("/delete/:id", protect, deleteUser);
router.post("/backup", setStatusActive);
router.post("/refresh-token", refreshToken);

router.post("/logout", logoutUser);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/update-password", protect, changePassword);

export default router;
