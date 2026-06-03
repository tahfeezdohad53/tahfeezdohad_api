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
  },
  { timestamps: true },
);

const model = mongoose.model("Maqarat", schema);

export default model;
