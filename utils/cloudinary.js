// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'natural_ice',
    allowed_formats: ['jpeg', 'png', 'jpg','webp'],
  },
});

const storageAvatar = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'natural_ice/avatars',
    allowed_formats: ['jpeg', 'png', 'jpg','webp'],
  },
});

const storageReturnOrder = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'natural_ice/return-order',
    allowed_formats: ['jpeg', 'png', 'jpg','webp'],
  },
});

const storageProductReview = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'natural_ice/product-reviews',
    allowed_formats: ['jpeg', 'png', 'jpg','webp'],
  },
});

export const deleteImageByUrl = async (imageUrl) => {
  try {
    const parts = imageUrl.split('/');
    const fileName = parts.pop().split('.')[0]; 
    const folder = parts.slice(parts.indexOf('upload') + 2).join('/');
    const publicId = `${folder}/${fileName}`;
    
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Deleted:', publicId, result);
    return result;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};


export { cloudinary, storage, storageAvatar, storageReturnOrder, storageProductReview };
