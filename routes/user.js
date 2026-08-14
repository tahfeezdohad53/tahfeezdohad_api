import express from 'express';
import { protectRoute } from '../controller/auth.js';
import User from "../models/user.js";

import {
  handleGetUser,
  handleUpdatePassword,
  handleImageUpdate,
  handleCreateUser,
  handleGetAccounts,
  handleAddContactEmail,
} from "../controller/user.js";
import {uploadImage} from '../libs/multer.js';

const router = new express.Router();


router.patch('/contactEmail',protectRoute,handleAddContactEmail);
router.patch("/updatePassword", protectRoute, handleAddContactEmail);
router.post('/create',protectRoute,handleCreateUser);
router.get('/getUser',protectRoute,handleGetUser);
router.get('/getAccounts',protectRoute,handleGetAccounts);
router.get('/totalAccounts',protectRoute,async (req,res) => {
  try{
    const [teacherTotalCount,studentTotalCount] = await Promise.all([
      await User.countDocuments({role:'teacher'}),
      await User.countDocuments({role:'student'})
    ])
    res.status(200).json({ok:true,teacherTotalCount,studentTotalCount})
  }catch(err){
    res.status(400).json({ok:false});
  }
});
router.post('/image',protectRoute, uploadImage.single('image') ,handleImageUpdate);

export default router;