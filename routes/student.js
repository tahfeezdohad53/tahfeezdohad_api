import express from 'express';
import { handleSignin, protectRoute } from '../controller/auth.js';
import { handleGetStudents, handleUpdateStudent } from '../controller/student.js';
import { uploadImage } from '../libs/multer.js';

const router = new express.Router();

router.post('/update',uploadImage.single('image'),handleUpdateStudent)
router.get('/getStudents',protectRoute,handleGetStudents)

export default router;