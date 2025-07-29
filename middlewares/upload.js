import multer from 'multer';
import { storage, storageAvatar, storageReturnOrder } from '../utils/cloudinary.js';

const upload = multer({ storage });
const uploadAvatar = multer({ storage: storageAvatar });
const uploadReturnOrderImage = multer({ storage: storageReturnOrder });

export default upload;
export { uploadAvatar, uploadReturnOrderImage };