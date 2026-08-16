import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    student: {
      required: true,
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    batch:{
        type:String,
        required:true,
    },
    allocatedFee:{
        type:Number,
        required:true,
    },
    term:{
        type:Number,
        required:true
    },
    year:{
        type:Number,
        required:true,
    },
    transaction_id:{
        type:String,
    },
    status:{
        type:String,
        default:'pending',
        enum:['pending','partial','paid'],
    },
    amountPaid:{
        type:Number,
        default:0,
    }
  },
  { timestamps: true },
);

schema.index({student:1,term:1,year:1},{unique:true})

const model = mongoose.model("Fee", schema);

export default model;
