import catchAsync from "../utils/catchAsync.js";
import User from '../models/user.js';
import Maqarat from '../models/maqaraat.js';

export const handleCreateMaqarat = catchAsync(async (req,res,next) => {
    const { id, role } = req.user;
    if(role !== 'admin') return res.status(401).json({ok:false,message:'you are not authorized for this action'});
    const {teacher,batch,students,juz,date} = req.body;
    await Maqarat.create({teacher,batch,students,juz,date});
    res.status(201).json({ok:true});
})

export const handleGetMaqarat = catchAsync(async (req,res,next) => {
    const {id,role} = req.user;
    const { batch } = req.query;
    let filter = {};
    if (role === "teacher") {
      filter.teacher = id;
    }

    if (role === "student") {
      filter.students = id;
    }

    if (batch) {
      filter.batch = batch;
    }
    const maqarat = await Maqarat.find(filter)
     .sort({ date: -1 })
     .limit(10)
     .populate("students")
     .populate("teacher");

    res.status(200).json({ok:true,maqarat});
})
