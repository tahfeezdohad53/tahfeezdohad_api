import express from 'express';
import { handleSignin } from '../controller/auth.js';
import { handleUpdateUser } from '../controller/user.js';
import { uploadImage } from '../libs/multer.js';

const router = new express.Router();

router.post('/update',uploadImage.single('image'),handleUpdateUser)

export default router;