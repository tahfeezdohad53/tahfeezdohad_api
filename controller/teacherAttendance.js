import catchAsync from "../utils/catchAsync.js";
import TeacherAttendance from '../models/teacherAttendance.js';
import User from '../models/user.js';
import { differenceInMinutes } from "date-fns";

export const handleCheckIn = catchAsync(async (req, res, next) => {
    const {id,role} = req.user;
    const {batch} = req.body;

    const date = new Date();

    const user = await User.findById(id);

    if(user.teacherAttendanceStatus === 'checkedIn') return res.status(400).json({ok:false,message:'you cannot check in before checking out'});

    await TeacherAttendance.create({
        teacher:id,
        checkedIn:date,
        batch,
    })

    user.teacherAttendanceStatus = 'checkedIn';
    user.lastStatusTime = date;

    await user.save();

    res.status(200).json({ok:true});
});

export const handleCheckOut = catchAsync(async (req, res, next) => {
    const {id,role} = req.user;
    const date = new Date();

    const hour = date.getHours();
    const min = date.getMinutes();

    if(hour > 12 && hour < 15) return res.status(200).json({ok:false});

    if((hour === 12 && min > 35) || (hour === 18 && min > 35)) return res.status(400).json({ok:false});

    const latestAttendance = await TeacherAttendance.findOne({teacher:id}).sort({createdAt:-1});
    
    
    const diff = differenceInMinutes(
      date,
      new Date(latestAttendance.checkedIn),
    );
    
    latestAttendance.checkedOut = date;
    latestAttendance.totalMin = Number(diff);
    
    await latestAttendance.save();
    await User.findByIdAndUpdate(id,{teacherAttendanceStatus:"checkedOut",lastStatusTime:date,$inc:{teacherTotalMin:Number(diff)}});

    res.status(200).json({ok:true});
});


export const handleGetStatus = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  
  const user = await User.findById(id).select('teacherAttendanceStatus').lean();
  const lastStatus = user.teacherAttendanceStatus;
  const lastStatusTime = user.lastStatusTime;
  

  res.status(200).json({ ok: true, lastStatus , lastStatusTime});
});

export const handleGetAttendance = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
    const {page = 1} = req.query;

    const skip = (Number(page) - 1) * 10;

  const attendance = await TeacherAttendance.find({teacher:id}).sort({createdAt:-1}).skip(skip).limit(10);
  const count = await TeacherAttendance.countDocuments({teacher:id});
  res.status(200).json({attendance,count});
});
