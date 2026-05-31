import express from 'express';
import { protectRoute } from '../controller/auth.js';
import {
  handleUploadAudio,
  handleGetRecordings,
} from "../controller/recording.js";
import { uploadAudio } from '../libs/multer.js';

const router = new express.Router();

router.post('/upload/:studentId',protectRoute,uploadAudio.single('recording'),handleUploadAudio);
router.get('/getRecordings',protectRoute,handleGetRecordings);

export default router;