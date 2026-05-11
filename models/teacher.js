import mongoose from "mongoose";


const schema = new mongoose.Schema({
    email:String,
    name:String,
    profileImage:String,
    students:[mongoose.Schema.Types.ObjectId],
    role:{
        type:String,
        default:'teacher',
    }
},{timestamps:true});

const model = mongoose.model('Teacher',schema);

export default model;