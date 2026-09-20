import express from 'express';
import {
  handleGetObligations,
  handleGetObligationStatistics,
  handleUpdateObligation,
  handleGetReports,
  handleUpdateObligationData,
  handleGetReportsExcel,
} from "../controller/hub.js";
import { protectRoute } from '../controller/auth.js';

const router = new express.Router();

router.get("/get", protectRoute,handleGetObligations);
router.get("/stats", protectRoute, handleGetObligationStatistics);
router.patch("/update", protectRoute, handleUpdateObligation);
router.patch("/updateData", protectRoute, handleUpdateObligationData);
router.get("/reports", protectRoute, handleGetReports);
router.get("/reports/excel", protectRoute, handleGetReportsExcel);

export default router;