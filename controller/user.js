import { hash } from "bcrypt";
import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.js";
import { memoryStorage } from "multer";
import cloudinary from "../libs/cloudinary.js";
import { Readable } from "stream";
import { refetchCachedData } from "../app.js";


export const handleUpdatePassword = catchAsync(async (req, res, next) => {
  const { id } = req.user;
  const { password } = req.body;
  console.log("update");
  const hashedPassword = await hash(password, 10);
  await User.findByIdAndUpdate(id, { password: hashedPassword });
  res.status(200).json({ ok: true, message: "password updated" });
});

export const handleGetUser = catchAsync(async (req, res, next) => {
  const { id } = req.user;
  const user = await User.findById(id);
  if (!user) return res.status(400).json({ ok: false });
  res.status(200).json({ ok: true, user });
});

export const handleCreateUser = catchAsync(async (req, res, next) => {
  const { id,role:currUserRole } = req.user;
  const {role,its,name,batch,teacher} = req.body;
  if(role === 'student' && !teacher) return res.status(400).json({ok:false,message:'teacher is required'})
  const user = {role,its,name:`${its} ${name}`,email:`${its}@gmail.com`,password:`${its.slice(4)}`};
  if(role === 'student') {
    user.batch = batch;
    user.teacher = teacher;
  }
  if(currUserRole !== 'admin') return res.status(401).json({ok:false,message:'you are not allowed to perform this action'});
  await User.create(user);
  await refetchCachedData()
  res.status(200).json({ ok: true, user });
});


export const handleImageUpdate = catchAsync(async (req, res, next) => {
  const { id } = req.user;
  // const user = await User.findById(id);
  const readable = new Readable();
  let secureUrl;
  readable.push(req.file.buffer);
  readable.push(null);
  const stream = cloudinary.uploader.upload_stream(
    { resource_type: "auto" },
    async (err, result) => {
      if (err) res.status(400).json({ ok: false });
      // console.log(result);
      await User.findOneAndUpdate(
        { _id: id},
        { profileImage:result.secure_url },
      );
      res.status(200).json({ ok: true });
    },
  );
  readable.pipe(stream);
});