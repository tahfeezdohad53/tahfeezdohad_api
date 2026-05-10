import catchAsync from "../utils/catchAsync.js";
import User from '../models/user.js'
import { signJwt } from "../helpers/singJwt.js";
import jsonwebtoken from 'jsonwebtoken';

export const handleSignin = catchAsync(async (req,res,next) => {
    const signedToken = req.headers?.authorization?.split(' ')[1];
    const {email,name} = jsonwebtoken.verify(signedToken,process.env.FRONTEND_JWT_SECRET)
    console.log(email,name);
    const user = await User.findOne({email});
    if(!user){
        const newUser = await User.create({email,name});
        const token = await signJwt(newUser.email,newUser._id);
        return res.status(200).json({ok:true,jwt:token})
    }

    const token = await signJwt(user.email, user._id);
    res.status(200).json({ ok: true, jwt: token });
})