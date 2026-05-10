import catchAsync from "../utils/catchAsync.js";
import User from '../models/user.js'
import { signJwt } from "../helpers/singJwt.js";
export const handleSignin = catchAsync(async (req,res,next) => {
    const {email,name} = req.body;
    const user = await User.findOne({email});
    if(!user){
        const newUser = await User.create({email,name});
        const token = await signJwt(newUser.email,newUser._id);
        return res.status(200).json({ok:true,jwt:token})
    }

    const token = await signJwt(user.email, user._id);
    res.status(200).json({ ok: true, jwt: token });
})