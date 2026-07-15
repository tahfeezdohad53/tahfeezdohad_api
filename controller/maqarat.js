import catchAsync from "../utils/catchAsync.js";
import User from '../models/user.js';
import Maqarat from '../models/maqaraat.js';

export const handleCreateMaqarat = catchAsync(async (req,res,next) => {
    const { id, role } = req.user;
    if(role !== 'admin') return res.status(401).json({ok:false,message:'you are not authorized for this action'});
    const {teacher,batch,students,juz,date} = req.body;
    const formattedJuz = juz?.nisf.length > 0 ? `juz ${juz.juz} (nisf ${juz.nisf})` : `juz ${juz.juz}`
    await Maqarat.create({teacher,batch,students,juz:formattedJuz,date});
    res.status(201).json({ok:true});
})

export const handleGetMaqarat = catchAsync(async (req,res,next) => {
    const {id,role} = req.user;
    const { batch,status } = req.query;
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
    if(status === 'ended'){
      const date = new Date();
      filter.$and = [
      {monthDate:{$lt:date.getDate()}},
      {month:{$lte:date.getMonth()}},
      {year:{$lte:date.getFullYear()}},
    ]
    }
    if(status === 'upcoming'){
      const date = new Date();
      filter.$and = [
      {monthDate:{$gt:date.getDate()}},
      {month:{$gte:date.getMonth()}},
      {year:{$gte:date.getFullYear()}},
    ]
    }
    if(status === 'today'){
      const date = new Date();
      filter.$and = [
      {monthDate:{$eq:date.getDate()}},
      {month:{$eq:date.getMonth()}},
      {year:{$eq:date.getFullYear()}},
    ]
    }
    const maqarat = await Maqarat.find(filter)
     .sort({ date: -1 })
     .limit(10)
     .populate("students")
     .populate("teacher");
    res.status(200).json({ok:true,maqarat});
})
