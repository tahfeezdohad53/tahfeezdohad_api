import catchAsync from "../utils/catchAsync.js";
import User from '../models/user.js';

export const handleUpdateUser = catchAsync(async (req,res,next) => {
    const {name} = req.body;
    const {id} = req.user;

    if(!name) return res.status(200).json({ok:true});

    await User.findOneAndUpdate({_id:id},{name});
    res.status(200).json({ok:true});
})