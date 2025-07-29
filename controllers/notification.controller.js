import { Notification } from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
    const {userId} = req.params;
    try{
        const notifications = await Notification.find({userId}).sort({createdAt: -1});
        if(!notifications.length){
            return res.status(200).json({message: "No notifications found"});
        }
        res.status(200).json({success:true, notifications});
    }catch(error){
        console.error('Error fetching notifications:', error);
        res.status(500).json({success:false, message: error.message});
    }
}

export const markAsRead = async (req, res) => {
    const {id} = req.params;
    try{
        const notification = await Notification.findByIdAndUpdate(id, {isRead: true}, {new: true});
        if(!notification){
            return res.status(404).json({success:false, message: "Notification not found"});
        }
        res.status(200).json({success:true, notification});
    }catch(error){
        console.error('Error marking notification as read:', error);
        res.status(500).json({success:false, message: error.message});
    }
}

export const markAllAsRead = async (req, res) => {
    const { userId } = req.params;
    try {
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }
        
        const updateResult = await Notification.updateMany(
            { userId: userId, isRead: false }, 
            { $set: { isRead: true } }
        );
        if (updateResult.matchedCount === 0) {
            return res.status(200).json({ success: true, message: "No unread notifications to mark as read." });
        }
        res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ success: false, message: "An error occurred while marking notifications as read." });
    }
};

export const deleteNotification = async (req, res) => {
    const {id} = req.params;
    try{
        const notification = await Notification.findByIdAndDelete(id);
        if(!notification){
            return res.status(404).json({success:false, message: "Notification not found"});
        }
        res.status(200).json({success:true, message: "Notification deleted successfully"});
    }catch(error){
        console.error('Error deleting notification:', error);
        res.status(500).json({success:false, message: error.message});
    }
}

export const deleteAllNotifications = async (req, res) => {
    const {userId} = req.params;
    try{
        const { notification } = req.body;

        if(!userId){
            return res.status(400).json({success:false, message: "User ID is required"});
        }
        let filter = { userId };
        if (Array.isArray(notification) && notification.length > 0) {
            filter._id = { $in: notification };
        }
        const deletedNotifications = await Notification.deleteMany(filter);
        if(!deletedNotifications.deletedCount){
            return res.status(404).json({success:false, message: "No notifications found"});
        }
        res.status(200).json({success:true, message: "Notifications deleted successfully"});
    }catch(error){
        console.error('Error deleting notifications:', error);
        res.status(500).json({success:false, message: error.message});
    }
}