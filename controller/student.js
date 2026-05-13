import catchAsync from "../utils/catchAsync.js";
import Student from '../models/student.js';
import Teacher from '../models/teacher.js';
import Admin from '../models/admin.js';

export const handleUpdateStudent = catchAsync(async (req,res,next) => {
    const {name} = req.body;
    const {id} = req.user;

    if(!name) return res.status(200).json({ok:true});

    await Student.findOneAndUpdate({_id:id},{name});
    res.status(200).json({ok:true});
})

export const handleChangeDiary = catchAsync(async (req,res,next) => {
    const {teacherId,studentId} = req.query;
    const {id,role} = req.user;
    if(role !== 'admin') return res.status(400).json({ok:false,message:'you are not allowed for this action'});
    await Promise.all([
        Student.findOneAndUpdate({_id:studentId},{teacher:teacherId}),
        Teacher.findOneAndUpdate({students:studentId},{$pull:{students:studentId}}),
        Teacher.findOneAndUpdate({_id:teacherId},{$push:{students:studentId}})
    ])
    res.status(200).json({ok:true});
})

export const handleGetStudents = catchAsync(async (req,res,next) => {
    const {id,role} = req.user;
    let students;
    let adminStudents;
    if(role === 'teacher'){
        students = await Student.find({teacher:id});
    }
    if(role === 'admin'){
        students = await Student.find();
        adminStudents = await Student.find({teacher:id}).populate('teacher');
    }
    if(role === 'teacher') return res.status(200).json({ok:true,students});
    if(role === 'admin') return res.status(200).json({ok:true,students,adminStudents});
})

export const handleGetAllStudentNames = catchAsync(async (req,res,next) => {
    const {id,role} = req.user;
    const students = await Student.find();
    const teachers = await Teacher.find();
    const admins = await Admin.find();
    res.status(200).json({ok:true,students,teachers:[...teachers,...admins]});
})