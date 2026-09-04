import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    juz: {
      required: true,
      type: Number,
    },
    page: {
      required: true,
      type: Number,
    },
    from: {
      type: Number,
      required: true,
    },
    to: {
      type: Number,
      required: true,
    },
    audio: String,
    duration: Number,
    hifzGrade: {
      type: String,
      uppercase: true,
    },
    makharijGrade: {
      type: String,
      uppercase: true,
    },
    remarks: String,
    talqeen: Number,
    tambeeh: Number,
    makharij: String,
    classMode: {
      type: String,
      default: "in-person",
      enum: ["in-person", "online"],
    },
    classType: {
      type: String,
      enum: ["jz", "t1", "t2", "t3", "t4", "t5", "jz-mj", "jd", "tm", "mj"],
    },
  },
  { timestamps: true },
);

const model = mongoose.model('Report',schema);

export default model;
