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

const model = mongoose.model("OnlineClass", schema);

export default model;
