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
    date:{
        type:Date,
    }
  },
  { timestamps: true },
);

// schema.index({student:1,term:1,year:1},{unique:true})
schema.removeIndex({student:1,term:1,year:1});
const model = mongoose.model("Fee", schema);

export default model;
