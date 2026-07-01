import express from 'express';
import { protectRoute } from '../controller/auth.js';
import {
  handleGetRecordings,
  handleGenerateSignedUrl,
  handleCreateAudio,
} from "../controller/recording.js";
import { uploadAudio } from '../libs/multer.js';

const router = new express.Router();

router.post('/create/:studentId',protectRoute,handleCreateAudio);
router.get("/signedToken", protectRoute, handleGenerateSignedUrl);
// router.post("/create/:studentId", protectRoute, handleGenerateSignedUrl);
router.get('/getRecordings',protectRoute,handleGetRecordings);

export default router;