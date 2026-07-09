import catchAsync from "../utils/catchAsync.js";
import Recording from "../models/recording.js";
import User from "../models/user.js";
import OnlineClass from "../models/onlineclass.js";
import { Readable } from "stream";
import cloudinary from "../libs/cloudinary.js";

import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "../utils/r2.js";

export const handleCreateAudio = catchAsync(async (req, res, next) => {
  const { isOnline,url,duration } = req.body;
  const { studentId } = req.params;
  const { id, role } = req.user;
  if (role === "student")
    return res
      .status(200)
      .json({ ok: false, message: "you are not allowed for this action" });
  
     const recording = await Recording.create({
        uploaderRole: role,
        student: studentId,
        teacher: id,
        audio: url,
        duration: Math.ceil(duration),
      });
      if (isOnline)
        await OnlineClass.create({
          student: studentId,
          teacher: id,
          duration: Math.ceil(duration),
          recording:recording._id,
        });
      res.status(200).json({ ok: true });

});

export const handleGetRecordings = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { page = 1, startDate, endDate, student, teacher } = req.query;
  const skip = (Number(page) - 1) * 10;
  let recordings;
  let totalResults;
  if (role === "admin") {
    let query = {};
    if (student) query.studentName = student;
    if (teacher) query.teacherName = teacher;
    recordings = await Recording.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(10);
    totalResults = await Recording.countDocuments(query);
  }
  if (role === "teacher") {
    let query = { teacher: id };
    if (student && student !== "all") query.studentName = student;
    if (startDate && endDate) {
      const endTime = new Date(endDate);
      endTime.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endTime) };
    }
    recordings = await Recording.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(10);
    console.log(recordings);
    totalResults = await Recording.countDocuments({ teacher: id });
  }
  if (role === "student") {
    recordings = await Recording.find({ student: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(10);
    totalResults = await Recording.countDocuments({ student: id });
  }
  // recordings = await Recording.find({teacher:id}).sort({createdAt:-1}).skip(skip).limit(10);
  res.status(200).json({ ok: true, recordings, totalResults });
});

export const handleGenerateSignedUrl = catchAsync(async (req, res) => {
  const key = `${crypto.randomUUID()}.webm`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: "audio/webm",
  });

  const signedUrl = await getSignedUrl(r2, command, {
    expiresIn: 60,
  });
  const url = `${process.env.R2_PUBLIC_URL}/${key}`;

  res.status(200).json({
    signedUrl,
    key,
    url,
    fileUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
  });
});