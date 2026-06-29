import express from 'express';
import { protectRoute } from '../controller/auth.js';
import {
  handleGetUser,
  handleUpdatePassword,
  handleImageUpdate,
} from "../controller/user.js";
import {uploadImage} from '../libs/multer.js';

const router = new express.Router();


router.patch('/updatePassword',protectRoute,handleUpdatePassword);
router.get('/getUser',protectRoute,handleGetUser);
router.post('/image',protectRoute, uploadImage.single('image') ,handleImageUpdate);

export default router;