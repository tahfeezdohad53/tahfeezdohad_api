import { hash } from "bcrypt";
import mongoose from "mongoose";


const schema = new mongoose.Schema({
    email:{
        type:String,
        unique:true,
        lowercase:true,
    },
    password:String,
    its:Number,
    juz:Number,
    nisf:Number,
    name:{
        type:String,
        lowercase:true,
    },
    batch:[
       { type:String,
        lowercase:true,}
    ],
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
    },
    newNizam:{
        type:Boolean,
    }
},{timestamps:true});

schema.pre('save',async function(next){
    // let NameOfTeacher;
    const hashedPass = await hash(this.password,10);
    this.password = hashedPass;
})

const model = mongoose.model('User',schema);

export default model;