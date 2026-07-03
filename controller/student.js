import catchAsync from "../utils/catchAsync.js";
import User from '../models/user.js';

export const handleUpdateStudent = catchAsync(async (req,res,next) => {
    const {name} = req.body;
    const {id} = req.user;

    if(!name) return res.status(200).json({ok:true});

    // await Student.findOneAndUpdate({_id:id},{name});
    // res.status(200).json({ok:true});
})

export const handleChangeDiary = catchAsync(async (req,res,next) => {
    const {teacherId,studentId} = req.query;
    const {id,role} = req.user;
    if(role !== 'admin') return res.status(400).json({ok:false,message:'you are not allowed for this action'});
    await User.findByIdAndUpdate(studentId,{teacher:teacherId});
    res.status(200).json({ok:true});
})

export const handleChangeMultipleDiary = catchAsync(async (req,res,next) => {
    const {teacherId,studentsId} = req.body;
    const {id,role} = req.user;
    if(role !== 'admin') return res.status(400).json({ok:false,message:'you are not allowed for this action'});
    await User.updateMany({role:'student',_id:{$in:studentsId}},{teacher:teacherId});
    res.status(200).json({ok:true});
})
export const handleAssignMultipleProxies = catchAsync(async (req,res,next) => {
    const {teacherId,studentsId} = req.body;
    const {id,role} = req.user;
    if(role !== 'admin') return res.status(400).json({ok:false,message:'you are not allowed for this action'});
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
    const {batch} = req.query;
    let students;
    let adminStudents;
    if(role === 'teacher'){
        students = await User.find({$or:[
            {teacher:id},
            {proxyTeacher:id}
        ],role:'student'}).populate('teacher proxyTeacher');
    }
    if(role === 'admin'){
        let filter = {role:'student'};
        if(batch) filter.batch = batch;
        students = await User.find(filter).populate('teacher proxyTeacher');
        // adminStudents = await Student.find({teacher:id}).populate('teacher proxyTeacher');
    }
    // if(role === 'teacher') return res.status(200).json({ok:true,students});
    // if(role === 'admin') return res.status(200).json({ok:true,students,adminStudents});
    res.status(200).json({ok:true,students});
})

export const handleGetAllStudentNames = catchAsync(async (req,res,next) => {
    const {id,role} = req.user;
    const students = await User.find({role:'student'});
    const teachers = await User.find({role:'teacher'});
    const admins = await User.find({role:'admin'});
    res.status(200).json({ok:true,students,teachers:[...teachers,...admins]});
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
        });
    }  
    else if(Number(juz) === 29 && Number(nisf) === 2){
        students = await User.find({
          role: "student",
          batch: batch,
          juz: { $lte: Number(juz) },
          nisf: { $lte: Number(nisf) },
        });
    }  
    else {
        students = await User.find({
          role: "student",
          batch: batch,
          $or: [
            { juz: { $lt: Number(juz),$gte:26 } },
            { juz: { $eq: Number(juz) }, nisf: { $lt: Number(nisf) } },
          ],
        });
    }
    
    res.status(200).json({ok:true,students});
})