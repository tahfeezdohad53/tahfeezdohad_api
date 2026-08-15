import express from 'express';
import { protectRoute } from '../controller/auth.js';
import {
  handleGetRecordings,
  handleGenerateSignedUrl,
  handleCreateAudio,
  handleCheckIsUploaded,
  handleGetRecordingsExcel,
  handleEvaluateClassRecording,
} from "../controller/recording.js";
import { uploadAudio } from '../libs/multer.js';

const router = new express.Router();

router.post('/create/:studentId',protectRoute,handleCreateAudio);
router.get('/isUploaded',handleCheckIsUploaded);
router.get("/signedToken/:name", protectRoute, handleGenerateSignedUrl);
// router.post("/create/:studentId", protectRoute, handleGenerateSignedUrl);
router.get('/getRecordings',protectRoute,handleGetRecordings);
router.get('/excel',protectRoute,handleGetRecordingsExcel);
router.patch("/evaluate/:recordingId", protectRoute, handleEvaluateClassRecording);

export default router;