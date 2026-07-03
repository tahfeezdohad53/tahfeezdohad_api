import express from 'express';
import { protectRoute } from '../controller/auth.js';
import {
  handleAssignProxy,
  handleChangeDiary,
  handleAssignMultipleProxies,
  handleChangeMultipleDiary,
  handleGetAllStudentNames,
  handleGetStudents,
  handleUpdateStudent,
  handleGetMaqaratStudents
} from "../controller/student.js";
import { uploadImage } from '../libs/multer.js';

const router = new express.Router();

router.post('/update',uploadImage.single('image'),handleUpdateStudent)
router.patch('/changeDiary',protectRoute,handleChangeDiary)
router.patch('/changeMultipleDiaries',protectRoute,handleChangeMultipleDiary)
router.patch("/assignMultipleProxies", protectRoute, handleAssignMultipleProxies);
router.patch('/assignProxy',protectRoute,handleAssignProxy)
router.get('/getStudents',protectRoute,handleGetStudents)
router.get('/getMaqaratStudents',protectRoute,handleGetMaqaratStudents)
router.get('/getAllStudentsAndTeachers',protectRoute,handleGetAllStudentNames)

export default router;