import express from 'express';
import { protectRoute } from '../controller/auth.js';
import {
  handleCreateReport,
  handleGenerateReportsExcel,
  handleGetReports
} from "../controller/report.js";
import { uploadAudio } from '../libs/multer.js';

const router = new express.Router();

router.post('/create',protectRoute,handleCreateReport);
router.get('/get',protectRoute,handleGetReports);
router.get('/excel',protectRoute,handleGenerateReportsExcel);

export default router;