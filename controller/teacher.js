import catchAsync from "../utils/catchAsync.js";
import Teacher from '../models/teacher.js';

export const handleGetAllTeachers = catchAsync(async (req,res,next) => {
    const {id} = req.user;
    const teachers = await Teacher.find();
    // console.log(teachers);
    res.status(200).json({ok:true,teachers});
})
