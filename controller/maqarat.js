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
    let maqarat;
    if(role === 'admin'){
        maqarat = await Maqarat.find().sort({date:-1}).limit(10).populate('students').populate('teacher')
    }
    if(role === 'teacher'){
        maqarat = await Maqarat.find({teacher:id}).sort({date:-1}).limit(10).populate('students').populate('teacher');
    }
    if(role === 'student'){
        maqarat = await Maqarat.find({students:id}).sort({date:-1}).limit(10).populate('students').populate('teacher');
    }

    res.status(200).json({ok:true,maqarat});
})
