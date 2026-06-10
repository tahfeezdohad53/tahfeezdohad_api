import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    student: {
      required: true,
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    teacher: {
      required: true,
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    duration:{
        type:Number,
        required:true,
    }
  },
  { timestamps: true },
);

// schema.pre('save',function(){
//   console.log('helloooo')
//   const date = new Date(this.date);
//   this.monthDate = date.getDate();
//   this.month = date.getMonth();
//   this.year = date.getFullYear();
// })
const model = mongoose.model("OnlineClass", schema);

export default model;
