import express from 'express';
import {
  handleGetObligations,
  handleGetObligationStatistics,
  handleUpdateObligation,
  handleGetReports,
  handleUpdateObligationData,
} from "../controller/hub.js";
import { protectRoute } from '../controller/auth.js';

const router = new express.Router();

router.get("/get", protectRoute,handleGetObligations);
router.get("/stats", protectRoute, handleGetObligationStatistics);
router.patch("/update", protectRoute, handleUpdateObligation);
router.patch("/updateData", protectRoute, handleUpdateObligationData);
router.get("/reports", protectRoute, handleGetReports);

export default router;