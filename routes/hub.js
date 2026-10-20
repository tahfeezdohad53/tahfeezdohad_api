import express from 'express';
import {
  handleGetObligations,
  handleGetObligationStatistics,
  handleUpdateObligation,
  handleUpdateObligationData,
  handleGetReportsExcel,
  handleGetHubReceiptsExcel,
  handleGetReceipts,
  handleDeleteReceipt,
  handleResendReceipt
} from "../controller/hub.js";
import { protectRoute } from '../controller/auth.js';

const router = new express.Router();

router.get("/get", protectRoute,handleGetObligations);
router.get("/stats", protectRoute, handleGetObligationStatistics);
router.patch("/update", protectRoute, handleUpdateObligation);
router.patch("/updateData", protectRoute, handleUpdateObligationData);
router.get("/receipts", protectRoute, handleGetReceipts);
router.delete("/receipts/:receiptId", protectRoute, handleDeleteReceipt);
router.get("/receipt/resend/:receiptId", protectRoute, handleResendReceipt);
router.get("/reports/excel", protectRoute, handleGetReportsExcel);
router.get("/receipts/excel", protectRoute, handleGetHubReceiptsExcel);

export default router;