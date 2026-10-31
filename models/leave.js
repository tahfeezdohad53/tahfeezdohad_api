import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    user: {
      required: true,
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type:{
      type:String,
      required:true,
      enum:['casual','sick','half-day']
    },
    from: {
      required: true,
      type: Date,
    },
    to:{
        type:Date,
        required:true,
    },
    days:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    reason:{
        type:String,
        required:true,
    },
    status:{
      type:String,
      default:'pending'
    },
    role:{
      type:String,
      required:true,
    },
    fromTime:String,
    toTime:String
  },
  { timestamps: true },
);

const model = mongoose.model("Leave", schema);

export default model;
