import mongoose ,{ Schema } from "mongoose";


const productReviewSchema = new Schema({
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product',
        required: true
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required:true
    },
    rating: { 
        type: Number, 
        required: true, 
        min: 1, 
        max: 5 
    },
    comment: { type: String },
    images: {
        type: [String],
        default: [],
      },
  },{timestamps: true});


  export const ProductReview = mongoose.model('ProductReview', productReviewSchema); 