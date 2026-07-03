import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    sender: {
      required: true,
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    receiver: {
      required: true,
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    message:{
        type:String,
        required:true,
    }
  },
  { timestamps: true },
);

const model = mongoose.model("Message", schema);

export default model;
