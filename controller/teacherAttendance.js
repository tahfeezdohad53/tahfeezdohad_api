import catchAsync from "../utils/catchAsync.js";
import TeacherAttendance from '../models/teacherAttendance.js';
import User from '../models/user.js';
import { differenceInMinutes, format } from "date-fns";
import ExcelJs from "exceljs";
import { formatName } from "./leave.js";


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

    // user.teacherAttendanceStatus = 'checkedIn';
    // user.lastStatusTime = date;

    await User.findByIdAndUpdate(id,{teacherAttendanceStatus:'checkedIn',lastStatusTime:date});

    res.status(200).json({ok:true});
});

export const handleCheckOut = catchAsync(async (req, res, next) => {
    const {id,role} = req.user;
    const date = new Date();

    const hour = date.getHours();
    const min = date.getMinutes();

    // if(hour > 12 && hour < 15) return res.status(400).json({ok:false});

    // if((hour === 12 && min > 35) || (hour === 18 && min > 35)) return res.status(400).json({ok:false});

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

export const handleVerifyAttendance = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const {attendanceId} = req.body;

  if(role !== 'admin') return res.status(401).json({ok:false});
  
  await TeacherAttendance.findByIdAndUpdate(attendanceId,{isVerified:true});

  res.status(200).json({ ok: true});
});

export const handleGetAttendance = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
    const {page = 1,startDate,endDate,teacher} = req.query;

    const skip = (Number(page) - 1) * 10;
    let attendance;
    let count;
    let query = {};

    
    if(startDate && endDate) {
      const localStartDate = new Date(startDate);
      const localEndDate = new Date(endDate);
      localStartDate.setHours(0,0,0,0);
      localEndDate.setHours(23,59,59,999);
      query.$and = [
        {checkedIn:{$gte:localStartDate}},
        {checkedIn:{$lte:localEndDate}},
      ]
    }

    if(teacher) query.teacher = teacher;

    if(role === 'teacher') {
   attendance = await TeacherAttendance.find({ teacher: id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(10)
    count = await TeacherAttendance.countDocuments({ teacher: id });
    }

    if(role === 'admin') {
   attendance = await TeacherAttendance.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(10)
    .populate("teacher");
    count = await TeacherAttendance.countDocuments(query);
    }
  
  res.status(200).json({attendance,count});
});


export const handleGenerateExcel = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
    const {startDate,endDate,teacher} = req.query;

    let query = {};

    if(role === 'student') return res.status(401).json({ok:false});

    if(startDate && endDate) {
      const localStartDate = new Date(startDate);
      const localEndDate = new Date(endDate);
      localStartDate.setHours(0,0,0,0);
      localEndDate.setHours(23,59,59,999);
      query.$and = [
        {checkedIn:{$gte:localStartDate}},
        {checkedIn:{$lte:localEndDate}},
      ]
    }

    if(role === 'admin' && teacher) query.teacher = teacher;
    if(role === 'teacher') query.teacher = id;

    const attendance = await TeacherAttendance.find(query).populate({path:'teacher',select:'name its'}).lean();

    const workbook =  new ExcelJs.Workbook();
    
    const workSheet = workbook.addWorksheet('attendance');

    workSheet.columns = [
      {
        header:'ITS',
        key:'its',
        width:25
      },
      {
        header:'Name',
        key:'name',
        width:55,
      },
      {
        header:'Date',
        key:'date',
        width:25,
      },
      {
        header:'Checked_in',
        key:'checkedIn',
        width:25
      },
      {
        header:'Checked_out',
        key:'checkedOut',
        width:25
      },
      {
        header:'Batch',
        key:'batch',
        width:25
      },
      {
        header:'Min',
        key:'min'
      },
      {
        header:'Verification',
        key:'verification',
        width:25
      },
    ];

    workSheet.getColumn(1).font = {
      bold:true,
    };

    workSheet.getColumn(7).alignment = {
      horizontal:'left'
    }
    workSheet.getColumn(1).alignment = {
      horizontal:'left'
    }

    attendance.forEach(el => {
      workSheet.addRow({
        its: el.teacher.its,
        name: formatName(el.teacher.name),
        date: format(new Date(el.checkedIn), "dd MMM, yyyy"),
        checkedIn: format(new Date(el.checkedIn), "HH:mm"),
        checkedOut: el?.checkedOut ? format(new Date(el.checkedOut), "HH:mm") : '-',
        min: el.totalMin,
        batch: el.batch,
        verification: el.isVerified ? "done" : "pending",
      });
    })

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", "attachment; filename=attendance.xlsx");

    await workbook.xlsx.write(res);

    // Send your file buffer here
    res.end();
});
