import express from 'express';
import { protectRoute } from '../controller/auth.js';
import { handleSendMessage, handleGetMessages } from "../controller/message.js";

const router = new express.Router();


router.post('/send',protectRoute, handleSendMessage);
router.get('/get',protectRoute ,handleGetMessages);

export default router;