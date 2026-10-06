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
    transaction_id:{
        type:String,
    },
    amountPaid:{
        type:Number,
        default:0,
    },
    paidAt:{
        type:Date,
    },
  },
  { timestamps: true },
);

const model = mongoose.model("Receipt", schema);

export default model;
