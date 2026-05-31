import express from 'express';
import { protectRoute } from '../controller/auth.js';
import {
  handleGetAllTeachers,
  handleGetMyTeachers,
} from "../controller/teacher.js";

const router = new express.Router();


router.get('/getAllTeachers',protectRoute,handleGetAllTeachers)
router.get('/getMyTeachers',protectRoute,handleGetMyTeachers);
export default router;