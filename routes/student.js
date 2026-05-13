import express from 'express';
import { handleSignin, protectRoute } from '../controller/auth.js';
import { handleChangeDiary, handleGetAllStudentNames, handleGetStudents, handleUpdateStudent } from '../controller/student.js';
import { uploadImage } from '../libs/multer.js';

const router = new express.Router();

router.post('/update',uploadImage.single('image'),handleUpdateStudent)
router.patch('/changeDiary',protectRoute,handleChangeDiary)
router.get('/getStudents',protectRoute,handleGetStudents)
router.get('/getAllStudentsAndTeachers',protectRoute,handleGetAllStudentNames)

export default router;