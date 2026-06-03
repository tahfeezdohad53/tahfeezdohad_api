import express from 'express';
import {protectRoute} from "../controller/auth.js";
import { handleCreateMaqarat, handleGetMaqarat } from '../controller/maqarat.js';

const router = new express.Router();

router.post("/create",protectRoute, handleCreateMaqarat);
router.get("/get",protectRoute,handleGetMaqarat)
export default router;