import mongoose from "mongoose";


const schema = new mongoose.Schema({
    email:String,
    name:String,
    teacher:mongoose.Schema.Types.ObjectId,
    profileImage:String,
    role:{
        type:String,
        default:'student',
        enum:['student','teacher','admin']
    }
},{timestamps:true});

const model = mongoose.model('Student',schema);

export default model;
