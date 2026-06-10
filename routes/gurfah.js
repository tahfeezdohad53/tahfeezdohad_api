import express from 'express';
import {protectRoute} from "../controller/auth.js";
import { handleGetGurfahData } from '../controller/gurfah.js';

const router = new express.Router();

router.get("/get/:userId",protectRoute,handleGetGurfahData)
export default router;