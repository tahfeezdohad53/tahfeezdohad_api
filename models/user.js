import { hash } from "bcrypt";
import mongoose from "mongoose";


const schema = new mongoose.Schema({
    email:{
        type:String,
        unique:true,
        lowercase:true,
    },
    contactEmail:{
        type:String,
    },
    password:String,
    its:{
        type:Number,
        unique:true,
    },
    juz:Number,
    nisf:Number,
    name:{
        type:String,
        lowercase:true,
    }, 
    classStatus:{
        type:String,
        default:'pending',
        enum:['pending','recorded','absent'],
    },
    classDuration:{
        type:Number,
        default:0,
    },
    slots:[],
    batch:{
        type:String,
        // required:true,
        lowercase:true,
        enum:['yaqoot_mardo','yaqoot_bairo','baneen','banaat','kibaar','taheri_hall']
    },
    isActive:{
        type:Boolean,
        default:true,
    },
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