import express from "express";
import {
  handleCheckIn,
  handleCheckOut,
  handleGetStatus,
  handleGetAttendance,
  handleVerifyAttendance,
  handleGenerateExcel,
  handleManualCheckout,
} from "../controller/teacherAttendance.js";
import {protectRoute} from '../controller/auth.js'
const router =  express.Router();

router.post('/checkIn',protectRoute,handleCheckIn);
router.post('/checkOut',protectRoute,handleCheckOut);
router.get('/status',protectRoute,handleGetStatus);
router.get('/get',protectRoute,handleGetAttendance);
router.post("/verify", protectRoute, handleVerifyAttendance);
router.patch("/manualCheckout", protectRoute, handleManualCheckout);
router.get("/excel", protectRoute, handleGenerateExcel);

export default router;