import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    teacher:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
    },
    checkedIn:{
        type:Date,
    },
    checkedOut:{
        type:Date,
    },
    totalMin:{
        type:Number,
    },
    isVerified:{
        type:Boolean,
    },
    batch:{
        type:String,
        required:true,
        enum:['yaqoot_mardo','yaqoot_bairo','kibaar','sigaar','atfaal','taheri_hall'],
    }
},{timestamps:true});


const modal = mongoose.model("TeacherAttendance",schema);

export default modal;