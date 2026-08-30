import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    type:String,
    count:Number,
    success:Number,
    fail:Number,
    saveFailed:Number,
},{timestamps:true});

const model = mongoose.model('Statistics',schema);
export default model;