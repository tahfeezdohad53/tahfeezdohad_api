import catchAsync from "../utils/catchAsync.js";
import User from '../models/user.js';
import xlsx from "exceljs";
import { formatName } from "./leave.js";

export const handleUpdateStudent = catchAsync(async (req,res,next) => {
    const {name} = req.body;
    const {id} = req.user;

    if(!name) return res.status(200).json({ok:true});

    // await Student.findOneAndUpdate({_id:id},{name});
    // res.status(200).json({ok:true});
})
export const handleMarkAbsent = catchAsync(async (req, res, next) => {
  const { id,role } = req.user;
  const {studentId} = req.body;
  if(role === 'student') return res.status(401).json({ok:false});


  await User.findOneAndUpdate({_id:studentId},{classStatus:"absent"});
  res.status(200).json({ok:true});
});
export const handleGetStudentsExcel = catchAsync(async (req, res, next) => {
//   const { name } = req.body;
  const { id } = req.user;

  const workbook = new xlsx.Workbook();

  const worksheet = workbook.addWorksheet('students');

  worksheet.columns = [
    {
      header: "ITS",
      key: "its",
      width: 10,
    },
    {
      header: "student Name",
      key: "name",
      width: 50,
    },
    {
      header: "Email",
      key: "email",
      width: 25,
    },
  ];

  const students = await User.find({role:'student'}).select('name its email').lean();

  for(const student of students){
    worksheet.addRow({
      its: student.its,
      name: formatName(student.name),
      email: student.email,
    });
  }

  worksheet.getRow(1).font = {
    bold:true,
  }
  worksheet.getColumn('its').alignment = {
    horizontal:'left'
  }
  worksheet.getRow(1).alignment = {
    horizontal:'center',
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  res.setHeader("Content-Disposition", "attachment; filename=students.xlsx");

  await workbook.xlsx.write(res);

  res.end();
});

export const handleChangeDiary = catchAsync(async (req,res,next) => {
    const {teacherId,studentId} = req.query;
    const {id,role} = req.user;
    
    await User.findByIdAndUpdate(studentId,{teacher:teacherId});
    res.status(200).json({ok:true});
})

export const handleChangeMultipleDiary = catchAsync(async (req,res,next) => {
    const {teacherId,studentsId} = req.body;
    const {id,role} = req.user;
    
    await User.updateMany({role:'student',_id:{$in:studentsId}},{teacher:teacherId});
    res.status(200).json({ok:true});
})
export const handleAssignMultipleProxies = catchAsync(async (req,res,next) => {
    const {teacherId,studentsId} = req.body;
    const {id,role} = req.user;
    
    await User.updateMany({role:'student',_id:{$in:studentsId}},{proxyTeacher:teacherId});
    res.status(200).json({ok:true});
})

export const handleAssignProxy = catchAsync(async (req,res,next) => {
    const {teacherId,studentId} = req.query;
    const {id,role} = req.user;
    const user = await User.findById(teacherId);
    if(user.role === 'admin') return res.status(400).json({ok:false,message:"can't assign proxy to admins"});
    await User.findOneAndUpdate({_id:studentId},{proxyTeacher:teacherId});
    res.status(200).json({ok:true});
})

export const handleGetStudents = catchAsync(async (req,res,next) => {
    const {id,role} = req.user;
    const {batch,classStatus} = req.query;
    let students;
    let adminStudents;
    let count;
    if(role === 'teacher'){
      const filter = {};
        if(classStatus && classStatus !== 'all') filter.classStatus = classStatus;
        filter.$or = [
            {teacher:id},
            {proxyTeacher:id}
        ]
        filter.role = 'student';
        students = await User.find(filter).populate('teacher proxyTeacher');
    }
    if(role === 'admin'){
        let filter = {role:'student'};
        if(batch) filter.batch = batch;
        if(classStatus && classStatus !== 'all') filter.classStatus = classStatus;
        students = await User.find(filter).populate('teacher proxyTeacher');
        count = students.length;
    }
   
    res.status(200).json({ok:true,students,count});
})

export const handleGetAllStudentNames = catchAsync(async (req,res,next) => {
    const {id,role} = req.user;
    const students = await User.find({role:'student'}).select('name teacher _id').lean();
    const teachers = await User.find({$or:[
        {role:'teacher'},
        {role:'admin'},
    ]}).select('name _id').lean();
    // const admins = await User.find({role:'admin'});
    res.status(200).json({ok:true,students,teachers});
})

export const handleGetMaqaratStudents = catchAsync(async (req,res,next) => {
    const {id,role} = req.user;
    const {batch,juz,nisf} = req.query;
    let students;
    if(Number(juz) >= 1 && Number(juz) <= 25) {
    students = await User.find({role:'student',batch:batch,juz:{$lt:Number(juz)},nisf:{$exists:false}});
    }
    else if(Number(juz) === 26 && Number(nisf) === 1){
        students = await User.find({
          role: "student",
          batch: batch,
          juz: { $eq: Number(juz) },
          nisf: { $eq: Number(nisf) },
          newNizam:true,
        });
    }  
    else if(Number(juz) === 29 && Number(nisf) === 2){
        students = await User.find({
          role: "student",
          batch: batch,
          juz: { $lte: Number(juz) },
          nisf: { $lte: Number(nisf) },
          newNizam:true,
        });
    }  
    else {
        students = await User.find({
          role: "student",
          batch: batch,
          $or: [
            { juz: { $lt: Number(juz),$gte:26 },newNizam:true },
            { juz: { $eq: Number(juz) }, nisf: { $lt: Number(nisf) },newNizam:true },
          ],
        });
    }
    
    res.status(200).json({ok:true,students});
})