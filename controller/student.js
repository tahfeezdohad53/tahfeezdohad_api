import catchAsync from "../utils/catchAsync.js";
import Student from '../models/student.js';

export const handleUpdateStudent = catchAsync(async (req,res,next) => {
    const {name} = req.body;
    const {id} = req.user;

    if(!name) return res.status(200).json({ok:true});

    await Student.findOneAndUpdate({_id:id},{name});
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
        adminStudents = await Student.find({teacher:id});
    }
    if(role === 'teacher') return res.status(200).json({ok:true,students});
    if(role === 'admin') return res.status(200).json({ok:true,students,adminStudents});
})

export const handleGetAllStudentNames = catchAsync(async (req,res,next) => {
    const {id,role} = req.user;
    const students = await Student.find();
    res.status(200).json({ok:true,students});
})