import express from 'express';
import {protectRoute} from "../controller/auth.js";
import { handleGetBatchesCount } from '../controller/dashboard.js';

const router = new express.Router();

router.get("/batches-count",protectRoute, handleGetBatchesCount);

export default router;