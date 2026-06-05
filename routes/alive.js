import express from 'express';

const router = new express.Router();

router.get("/wake",(req,res,next) => res.send('woked up'));
export default router;