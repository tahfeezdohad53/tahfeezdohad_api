import catchAsync from "../utils/catchAsync.js";
import Recording from "../models/recording.js";
import User from "../models/user.js";
import OnlineClass from "../models/onlineclass.js";
import { Readable } from "stream";
import cloudinary from "../libs/cloudinary.js";

export const handleUploadAudio = catchAsync(async (req, res, next) => {
  const {isOnline} = req.body;
  const { studentId } = req.params;
  const { id, role } = req.user;
  if (role === "student")
    return res
      .status(200)
      .json({ ok: false, message: "you are not allowed for this action" });
  const readable = new Readable();
  let secureUrl;
  readable.push(req.file.buffer);
  readable.push(null);
  const stream = cloudinary.uploader.upload_stream(
    { resource_type: "auto" },
    async (err, result) => {
      if (err) res.status(400).json({ ok: false });
      console.log(result);
      await User.findOneAndUpdate({_id:studentId,role:'student'},{proxyTeacher:null});
      await Recording.create({
        uploaderRole: role,
        student: studentId,
        teacher: id,
        audio: result.secure_url,
        duration: Math.ceil(result.duration / 60),
      });
      if(isOnline) await OnlineClass.create({student:studentId,teacher:id,duration:Math.ceil(result.duration / 60)});
      res.status(200).json({ ok: true });
    },
  );
  readable.pipe(stream);
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
    let query = {teacher:id};
    if (student && student !== 'all') query.studentName=student;
    if(startDate && endDate) {
        const endTime = new Date(endDate);
        endTime.setHours(23,59,59,999);
        query.createdAt = { $gte: new Date(startDate), $lte: new Date(endTime) }
    };
      recordings = await Recording.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(10);
    console.log(recordings)
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
