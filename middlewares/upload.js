import multer from 'multer';
import { storage, storageAvatar, storageProductReview, storageReturnOrder } from '../utils/cloudinary.js';

const upload = multer({ storage });
const uploadAvatar = multer({ storage: storageAvatar });
const uploadReturnOrderImage = multer({ storage: storageReturnOrder });
const uploadProductReview = multer({ storage: storageProductReview });

export default upload;
export { uploadAvatar, uploadReturnOrderImage, uploadProductReview };