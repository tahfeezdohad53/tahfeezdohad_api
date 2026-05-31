import express from 'express';
import { protectRoute } from '../controller/auth.js';
import { handleGetUser, handleUpdatePassword } from '../controller/user.js';

const router = new express.Router();


router.patch('/updatePassword',protectRoute,handleUpdatePassword);
router.get('/getUser',protectRoute,handleGetUser);

export default router;