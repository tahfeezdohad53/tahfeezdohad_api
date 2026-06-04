import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    students: {
      required: true,
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
    },
    teacher: {
      required: true,
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    batch: {
      type: String,
      required: true,
    },
    juz: {
      required: true,
      type: String,
    },
    date: {
      required: true,
      type: Date,
    },
    monthDate:Number,
    month:Number,
    year:Number,
  },
  { timestamps: true },
);

schema.pre('save',function(){
  console.log('helloooo')
  const date = new Date(this.date);
  this.monthDate = date.getDate();
  this.month = date.getMonth();
  this.year = date.getFullYear();
})
const model = mongoose.model("Maqarat", schema);

export default model;
