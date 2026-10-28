import catchAsync from "../utils/catchAsync.js";
import TeacherAttendance from '../models/teacherAttendance.js';
import User from '../models/user.js';
import { differenceInMinutes, format } from "date-fns";
import ExcelJs from "exceljs";
import { formatName } from "./leave.js";
import mongoose from "mongoose";


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
    if(latestAttendance.checkedOut) return res.status(200).json({ok:true});
    
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

export const handleManualCheckout = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const {checkOutDate,attendanceId,teacherId,type} = req.body;
  // return console.log(checkoutHour,checkoutMinute);
  

    if (role !== "admin") return res.status(401).json({ ok: false });

    console.log(checkOutDate);
  
  

  // if(hour > 12 && hour < 15) return res.status(400).json({ok:false});

  // if((hour === 12 && min > 35) || (hour === 18 && min > 35)) return res.status(400).json({ok:false});
  const latestAttendance = await TeacherAttendance.findById(attendanceId).select('checkedIn checkedOut').lean();
  let diff;
console.log(type)
  
  if(type === 'checkIn') {
    diff = differenceInMinutes(new Date(latestAttendance.checkedOut),checkOutDate);
  }
  // return console.log(console.log(diff));
 if(type === 'checkOut'){
   const attendance = await TeacherAttendance.findById(attendanceId);
    const isCheckedOut = attendance.checkedOut;
    const checkedInDate = new Date(attendance.checkedIn).getDate();
    console.log(checkedInDate);
    const checkedInMonth = new Date(attendance.checkedIn).getMonth();
   const formattedDate = new Date(checkOutDate);
   formattedDate.setDate(checkedInDate);
   formattedDate.setMonth(checkedInMonth);
   if(type === 'checkOut') {
    diff = differenceInMinutes(formattedDate, new Date(latestAttendance.checkedIn));
  }
   attendance.checkedOut = formattedDate;
   console.log(formattedDate);
   attendance.totalMin = Number(diff);

   await attendance.save();
   await User.findByIdAndUpdate(teacherId, {
     teacherAttendanceStatus: "checkedOut",
     lastStatusTime: checkOutDate,
     $inc: { teacherTotalMin: isCheckedOut ? 0 : Number(diff) },
   });
 }

 if(type === 'checkIn'){
  await TeacherAttendance.findByIdAndUpdate(attendanceId, {
    checkedIn: checkOutDate,
    totalMin: Number(diff),
  });

  // latestAttendance.checkedOut = date;
  // latestAttendance.totalMin = Number(diff);

  // await latestAttendance.save();
  await User.findByIdAndUpdate(teacherId, {
    $inc: { teacherTotalMin: Number(diff) },
  });
 }

  res.status(200).json({ ok: true });
});


export const handleGetStatus = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  let previousMonthMin;
  let thisMonthMin;

  const user = await User.findById(id).select('teacherAttendanceStatus').lean();
  const lastStatus = user.teacherAttendanceStatus;
  const lastStatusTime = user.lastStatusTime;

  const date = new Date();
  const startDate = new Date();

  if(date.getDate() > 1 && date.getDate() < 26) startDate.setMonth(date.getMonth() - 2);
  if(date.getDate() > 25 && date.getDate() < 32) startDate.setMonth(date.getMonth() - 1);
  startDate.setHours(0,0,0,0);
  startDate.setDate(26);

  const endDate = new Date();

  endDate.setDate(25);
  if(date.getDate() >= 1 && date.getDate() < 26) endDate.setMonth(date.getDate() - 1);
  endDate.setHours(23,59,59,999);

  try{
previousMonthMin = await TeacherAttendance.aggregate([
  {
    $match: {
      teacher: user._id,
      checkedIn: {
        $gte: startDate,
        $lte: endDate,
      },
    },
  },
  {
    $group: {
      _id:'$teacher',
      totalMin: { $sum: "$totalMin" },
    },
  },
]);

startDate.setDate(26);
if(date.getDate() > 25) startDate.setMonth(date.getMonth());
if(date.getDate() > 1 && date.getDate() < 26) {
  startDate.setMonth(date.getDate() - 1);
}

thisMonthMin = await TeacherAttendance.aggregate([
  {
    $match: {
      teacher: user._id,
      checkedIn: {
        $gte: startDate,
      },
    },
  },
  {
    $group: {
      _id: "$teacher",
      totalMin: { $sum: "$totalMin" },
    },
  },
]);


  }catch(err){
    console.log(err);
  }

  res.status(200).json({ ok: true, lastStatus , lastStatusTime, previousMonthMin:previousMonthMin[0]?.totalMin, thisMonthMin:thisMonthMin[0]?.totalMin});
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
    const {page = 1,startDate,endDate,teacher,batch,status} = req.query;

    const skip = (Number(page) - 1) * 10;
    let attendance;
    let count;
    let query = {};
  
    if(status === 'pending'){
      query.isVerified = {$exists:0};
    }
    let localStartDate;
    let localEndDate;
    if(startDate && endDate) {
      localStartDate = new Date(startDate);
      localEndDate = new Date(endDate);
      localStartDate.setHours(0,0,0,0);
      localEndDate.setHours(23,59,59,999);
      query.$and = [
        {checkedIn:{$gte:localStartDate}},
        {checkedIn:{$lte:localEndDate}},
      ]
    }

    if(teacher) query.teacher = teacher;
    if(batch && batch !=='all') query.batch = batch;

    if(role === 'teacher') {
      query.teacher = id;
   attendance = await TeacherAttendance.find(query)
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
 let localStartDate;
 let localEndDate;
    if(startDate && endDate) {
      localStartDate = new Date(startDate);
      localEndDate = new Date(endDate);
      localStartDate.setHours(0,0,0,0);
      localEndDate.setHours(23,59,59,999);
      query.$and = [
        {checkedIn:{$gte:localStartDate}},
        {checkedIn:{$lte:localEndDate}},
      ]
    }
    let attendance;

    // if(role === 'admin'){
    //    attendance = await TeacherAttendance.aggregate([
    //     {
    //       $match:{
    //         createdAt:{$gte:localStartDate},
    //         createdAt:{$lte:localEndDate},
    //         isVerified:true,
    //       }
    //     },
    //      {
    //        $lookup: {
    //          foreignField: "_id",
    //          as: "teacherData",
    //          from: "users",
    //          localField: "teacher",
    //        },
    //      },
    //      {
    //        $unwind: {
    //          path: "$teacher",
    //        },
    //      },
    //      {
    //        $group: {
    //          _id: "$teacher",
    //          name: { $first: "$teacherData.name" },
    //          min: { $sum: "$totalMin" },
    //          // ma:{}
    //        },
    //      },
    //      {
    //        $project: {
    //          name: 1,
    //          min: { $divide: ["$min", 60] },
    //        },
    //      },
    //      {
    //        $project: {
    //          _id: 0,
    //          name: 1,
    //          hours: "$min",
    //        },
    //      },
    //      {
    //        $unwind: {
    //          path: "$name",
    //        },
    //      },
    //    ]);
    //    console.log(attendance);

    //        const workbook = new ExcelJs.Workbook();

    //        const workSheet = workbook.addWorksheet("attendance");

    //        workSheet.columns = [
    //          {
    //            header: "ITS",
    //            key: "ITS",
    //            width: 40,
    //          },
    //          {
    //            header: "Name",
    //            key: "name",
    //            width: 55,
    //          },
    //          {
    //            header: "Hours",
    //            key: "hours",
    //          },
    //        ];

    //        workSheet.getColumn(1).font = {
    //          bold: true,
    //        };

    //       //  workSheet.getColumn(7).alignment = {
    //       //    horizontal: "left",
    //       //  };
    //       //  workSheet.getColumn(8).alignment = {
    //       //    horizontal: "left",
    //       //  };
    //       //  workSheet.getColumn(1).alignment = {
    //       //    horizontal: "left",
    //       //  };

    //        attendance.forEach((el) => {
    //          workSheet.addRow({
    //            ITS: el.name.split(" ")[0],
    //            name: formatName(el.name),
    //            hours: Math.ceil(el.hours),
    //          });
    //        });
    //        res.setHeader(
    //          "Content-Type",
    //          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    //        );

    //        res.setHeader(
    //          "Content-Disposition",
    //          "attachment; filename=attendance.xlsx",
    //        );

    //        await workbook.xlsx.write(res);

    //        // Send your file buffer here
    //        res.end();
    //        return;
    // }

    if(role === 'admin' && teacher) query.teacher = teacher;
    if(role === 'teacher') query.teacher = id;

    attendance = await TeacherAttendance.find(query)
      .populate({ path: "teacher", select: "name its" })
      .lean();

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
        header:'Recording_min',
        key:'recMin',
        width:15,
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
    workSheet.getColumn(8).alignment = {
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
        checkedIn: format(new Date(el.checkedIn), "HH:mm a"),
        checkedOut: el?.checkedOut ? format(new Date(el.checkedOut), "HH:mm a") : '-',
        min: el.totalMin,
        recMin: el.recordingMin,
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
