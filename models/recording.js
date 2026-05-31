import mongoose from "mongoose";
// import Student from "../models/student.js";
// import Teacher from "../models/teacher.js";
import User from "../models/user.js";

const schema = new mongoose.Schema({
    studentName:String,
    teacherName:String,
    uploaderRole:String,
    teacher:mongoose.Schema.Types.ObjectId,
    student:mongoose.Schema.Types.ObjectId,
    audio:String,
    duration:Number,
},{timestamps:true});


schema.pre('save',async function(next){
    // let NameOfTeacher;
    const student = await User.findById(this.student);
    const NameOfStudent = student.name;
    const teacher = await User.findById(this.teacher);
    const nameOfTeacher = teacher.name;
    // if(this.uploaderRole === 'teacher'){
    //     const teacher = await Teacher.findById(this.teacher);
    //     NameOfTeacher = teacher.name;
    // }
    // if(this.uploaderRole === 'admin'){
    //     const teacher = await Admin.findById(this.teacher);
    //     NameOfTeacher = teacher.name;
    // }
    this.teacherName = nameOfTeacher;
    this.studentName = NameOfStudent
    // next();
})

const model = mongoose.model('Recording',schema);

export default model;
