import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { ProductReview } from "../models/productReview.model.js";
import { User } from "../models/user.model.js";
import { deleteImageByUrl } from "../utils/cloudinary.js";

export const createReview = async (req, res) => {
    const { productId, userId, rating, comment } = req.body;

    try {

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(401).json({ message: "Product not found" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        const intRating = parseInt(rating);

        if (!intRating || intRating < 1 || intRating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        const hasReviewed = await ProductReview.findOne({ productId, userId });
        if (hasReviewed) {
            return res.status(400).json({ message: "You have already reviewed this product." });
        }

        const hasPurchased = await Order.findOne({
            user: userId,
            status: { $in: ['Delivered', 'Returned'] }, 
            'items.productId': productId
        });

        if (!hasPurchased) {
            return res.status(403).json({ message: "You can only review products you have purchased." });
        }

        const review = new ProductReview({
            productId: product._id,
            userId: user._id,
            rating: intRating,
            comment: comment || ""
        });

        if (req.files && req.files.images) {
            const images = req.files.images?.map(file => file.path);
            review.images = images;
        }

        await review.save();
        return res.status(201).json({ message: "Review created successfully", review });
    } catch (error) {
        console.error("Error in Creating Review: ", error.message)
        return res.status(500).json({ message: error.message || "Internal Server Error!" })
    }
}


export const getReviewsByProductId = async (req, res) => {
    const { productId } = req.params;

    try {
        const reviews = await ProductReview.find({ productId }).populate('userId', 'name email');

        if (!reviews || reviews.length === 0) {
            return res.status(404).json({ message: "No reviews found for this product." });
        }

        return res.status(200).json({ reviews });
    } catch (error) {
        console.error("Error in Fetching Reviews: ", error.message);
        return res.status(500).json({ message: error.message || "Internal Server Error!" });
    }
}


export const updateReview = async (req, res) => {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    try {
        const review = await ProductReview.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        const intRating = parseInt(rating);
        if (!intRating || intRating < 1 || intRating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        review.rating = intRating;
        review.comment = comment || "";

        if (req.files && req.files.images) {
            if(review.images && review.images.length > 0) {
            await Promise.all(review.images.map(image => deleteImageByUrl(image)));
            }

            const images = req.files.images?.map(file => file.path);
            review.images = images;
        }

        await review.save();
        return res.status(200).json({ message: "Review updated successfully", review });
    } catch (error) {
        console.error("Error in Updating Review: ", error.message);
        return res.status(500).json({ message: error.message || "Internal Server Error!" });
    }
}

export const deleteReview = async (req, res) => {
    const { reviewId } = req.params;
    try {
        const review = await ProductReview.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        if(review.images && review.images.length > 0) {
            await Promise.all(review.images.map(image => deleteImageByUrl(image)));
        }

        await review.deleteOne();
        return res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
        console.error("Error in Deleting Review: ", error.message);
        return res.status(500).json({ message: error.message || "Internal Server Error!" });
    }
}
