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
    await User.updateMany({role:'student',_id:{$in:teacherId}},{teacher:teacherId});
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
    let students;
    let adminStudents;
    if(role === 'teacher'){
        students = await User.find({$or:[
            {teacher:id},
            {proxyTeacher:id}
        ],role:'student'}).populate('teacher proxyTeacher');
    }
    if(role === 'admin'){
        students = await User.find({role:'student'}).populate('teacher proxyTeacher');
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