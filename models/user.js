import mongoose from "mongoose";


const schema = new mongoose.Schema({
    email:String,
    password:String,
    name:String,
    batch:String,
    fees:Number,
    teacher:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    proxyTeacher:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    profileImage:String,
    role:{
        type:String,
        default:'student',
        enum:['student','teacher','admin']
    },
    status:{
        type:String,
        enum:['online','offline'],
        default:'offline'
    }
},{timestamps:true});

const model = mongoose.model('User',schema);

export default model;