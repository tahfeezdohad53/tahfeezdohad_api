import mongoose from "mongoose";


const schema = new mongoose.Schema({
    email:String,
    name:String,
    muhaffiz:String,
    profile:String,
    role:{
        type:String,
        default:'student',
        enum:['student','teacher','admin']
    }
},{timestamps:true});

const model = mongoose.model('User',schema);

export default model;
