import express from 'express';
import { protectRoute } from '../controller/auth.js';
import {
  handleGetRecordings,
  handleGenerateSignedUrl,
  handleCreateAudio,
  handleCheckIsUploaded,
  handleGetRecordingsExcel,
  handleEvaluateClassRecording,
  handleGetLast15DaysRecDuration,
} from "../controller/recording.js";
import { uploadAudio } from '../libs/multer.js';
import { updateStatistics } from '../helpers/statistics.js';

const router = new express.Router();

router.post('/create/:studentId',protectRoute,handleCreateAudio);
router.get('/isUploaded',handleCheckIsUploaded);
router.post('/updateStats',protectRoute,updateStatistics);
router.get("/signedToken/:name", protectRoute, handleGenerateSignedUrl);
// router.post("/create/:studentId", protectRoute, handleGenerateSignedUrl);
router.get('/getRecordings',protectRoute,handleGetRecordings);
router.get('/excel',protectRoute,handleGetRecordingsExcel);
router.patch("/evaluate/:recordingId", protectRoute, handleEvaluateClassRecording);
router.get("/getLast15DaysRecDuration", handleGetLast15DaysRecDuration);

export default router;