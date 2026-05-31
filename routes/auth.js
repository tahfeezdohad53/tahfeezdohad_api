import express from 'express';
import {
  handleGoogleSignin,
  handlePasswordSignin,
  protectRoute,
} from "../controller/auth.js";

const router = new express.Router();

router.post("/googleSignin", handleGoogleSignin);
router.post("/emailSignin",handlePasswordSignin)
export default router;