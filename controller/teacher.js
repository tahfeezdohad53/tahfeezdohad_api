import catchAsync from "../utils/catchAsync.js";
import User from '../models/user.js';

export const handleGetAllTeachers = catchAsync(async (req,res,next) => {
    const {id} = req.user;
    const teachers = await User.find({role:'teacher'});
    // console.log(teachers);
    res.status(200).json({ok:true,teachers});
})

export const handleGetMyTeachers = catchAsync(async (req,res,next) => {
    const {id,teacher,proxyTeacher=null} = req.user;
    const user = await User.findById(id);
    const teachers = await User.find({$or:[
        {_id:teacher},
        {_id:user.proxyTeacher},
    ]});
    res.status(200).json({ok:true,teachers});
})
