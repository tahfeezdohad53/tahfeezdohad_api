import express from "express";
import {
  handleCheckIn,
  handleCheckOut,
  handleGetStatus,
  handleGetAttendance,
  handleVerifyAttendance,
} from "../controller/teacherAttendance.js";
import {protectRoute} from '../controller/auth.js'
const router =  express.Router();

router.post('/checkIn',protectRoute,handleCheckIn);
router.post('/checkOut',protectRoute,handleCheckOut);
router.get('/status',protectRoute,handleGetStatus);
router.get('/get',protectRoute,handleGetAttendance);
router.post("/verify", protectRoute, handleVerifyAttendance);

export default router;