import express from 'express';
import { protectRoute } from '../controller/auth.js';
import {
  handleCreateReport
} from "../controller/report.js";
import { uploadAudio } from '../libs/multer.js';

const router = new express.Router();

router.post('/create',protectRoute,handleCreateReport);

export default router;