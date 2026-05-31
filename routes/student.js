import express from 'express';
import { protectRoute } from '../controller/auth.js';
import { handleAssignProxy, handleChangeDiary, handleGetAllStudentNames, handleGetStudents, handleUpdateStudent } from '../controller/student.js';
import { uploadImage } from '../libs/multer.js';

const router = new express.Router();

router.post('/update',uploadImage.single('image'),handleUpdateStudent)
router.patch('/changeDiary',protectRoute,handleChangeDiary)
router.patch('/assignProxy',protectRoute,handleAssignProxy)
router.get('/getStudents',protectRoute,handleGetStudents)
router.get('/getAllStudentsAndTeachers',protectRoute,handleGetAllStudentNames)

export default router;