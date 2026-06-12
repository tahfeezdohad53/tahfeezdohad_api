import express from 'express';
import {protectRoute} from "../controller/auth.js";
import { handleGetLeaves,handleCreateLeave, handleGetLeaveStatistics, handleUpdateLeave } from '../controller/leave.js';

const router = new express.Router();

router.get("/get",protectRoute,handleGetLeaves)
router.get("/getStatistics",protectRoute,handleGetLeaveStatistics)
router.post("/create",protectRoute,handleCreateLeave)
router.post("/update",protectRoute,handleUpdateLeave)
export default router;