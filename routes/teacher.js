import express from 'express';
import { handleSignin, protectRoute } from '../controller/auth.js';
import { handleGetAllTeachers } from '../controller/teacher.js';

const router = new express.Router();


router.get('/getAllTeachers',protectRoute,handleGetAllTeachers)

export default router;