import express from 'express';
import {
  handleGetObligations,
  handleGetObligationStatistics,
  handleUpdateObligation,
} from "../controller/obligation.js";
import { protectRoute } from '../controller/auth.js';

const router = new express.Router();

router.get("/get", protectRoute,handleGetObligations);
router.get("/stats", protectRoute, handleGetObligationStatistics);
router.patch("/update", protectRoute, handleUpdateObligation);

export default router;