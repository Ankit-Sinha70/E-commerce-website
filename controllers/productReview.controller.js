import { Order } from "../models/order.model.js";
import  Product  from "../models/product.model.js";
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

         const hasReviewed = await ProductReview.findOne({ productId, userId });
        if (hasReviewed) {
            return res.status(400).json({ message: "You have already reviewed this product." });
        }
        
        const intRating = parseInt(rating);

        if (!intRating || intRating < 1 || intRating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
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

        const productReviews = await ProductReview.find({ productId: product._id });
        const totalReviews = productReviews.length;
        const averageRating = productReviews.reduce((acc, review) => acc + review.rating, 0) / totalReviews || 0;

        product.ratings = averageRating.toFixed(1);
        product.numReviews = totalReviews;
        await product.save();
        return res.status(201).json({ message: "Review created successfully", review });
    } catch (error) {
        console.error("Error in Creating Review: ", error.message)
        return res.status(500).json({ message: error.message || "Internal Server Error!" })
    }
}


export const getReviewsByProductId = async (req, res) => {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;


    try {
        const totalItems = await ProductReview.countDocuments({ productId });
        if (totalItems === 0) {
            return res.status(404).json({ message: "No reviews found for this product." });
        }
        const reviews = await ProductReview.find({ productId })
            .populate('userId', 'name email')
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            page,
            limit,
            totalPages: Math.ceil(totalItems / limit),
            totalItems,
            reviews
        });
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


        const productReviews = await ProductReview.find({ productId: review.productId });
        const totalReviews = productReviews.length;
        const averageRating = productReviews.reduce((acc, review) => acc + review.rating, 0) / totalReviews || 0;

        await Product.findByIdAndUpdate(review.productId, {
            ratings: averageRating.toFixed(1),
            numReviews: totalReviews
        });

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

        const productReviews = await ProductReview.find({ productId: review.productId });
        const totalReviews = productReviews.length;
        const averageRating = productReviews.reduce((acc, review) => acc + review.rating, 0) / totalReviews || 0;

        await Product.findByIdAndUpdate(review.productId, {
            ratings: averageRating.toFixed(1),
            numReviews: totalReviews
        });

        return res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
        console.error("Error in Deleting Review: ", error.message);
        return res.status(500).json({ message: error.message || "Internal Server Error!" });
    }
}
