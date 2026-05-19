import mongoose from "mongoose";


const schema = new mongoose.Schema({
    students:{
        type:[mongoose.Schema.Types.ObjectId],
        ref:'Student'
    },
    teacher:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Teacher'
    },
    juz:String,
    date:Date,
},{timestamps:true});

const model = mongoose.model('Maqaraat',schema);

export default model;
