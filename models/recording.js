import mongoose from "mongoose";


const schema = new mongoose.Schema({
    student:String,
    muhaffiz:String,
    audio:String,
},{timestamps:true});

const model = mongoose.model('Recording',schema);

export default model;
