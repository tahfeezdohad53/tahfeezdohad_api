import express from 'express';
import {
  handleGoogleSignin,
  handleLogout,
  handlePasswordSignin,
  protectRoute,
} from "../controller/auth.js";

const router = new express.Router();

router.post("/googleSignin", handleGoogleSignin);
router.post("/emailSignin",handlePasswordSignin)
router.get("/logout",handleLogout)
export default router;