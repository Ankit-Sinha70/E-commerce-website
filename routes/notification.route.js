import express from "express";
import { getNotifications, markAsRead, deleteNotification, markAllAsRead, deleteAllNotifications } from "../controllers/notification.controller.js";
import { protect } from "../middlewares/authmiddleware.js";

const router = express.Router();

router.get('/:userId', protect, getNotifications);
router.put('/read/:id', protect, markAsRead);
router.delete('/delete/:id', protect, deleteNotification);
router.put('/read-all/:userId', protect, markAllAsRead);
router.delete('/delete-all/:userId', protect, deleteAllNotifications);

export default router;
