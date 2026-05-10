import express from 'express';
import { handleSignin } from '../controller/auth.js';

const router = new express.Router();

router.post('/signin',handleSignin)

export default router;