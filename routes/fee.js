import express from 'express';
import {
  handleGetFeeObligations,
  handleGetFeeStatistics,
  handleUpdateFee,
} from "../controller/fee.js";
import { protectRoute } from '../controller/auth.js';

const router = new express.Router();

router.get("/obligations", protectRoute,handleGetFeeObligations);
router.get("/stats", protectRoute, handleGetFeeStatistics);
router.patch("/update", protectRoute, handleUpdateFee);

export default router;