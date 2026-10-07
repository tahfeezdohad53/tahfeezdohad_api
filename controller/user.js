import { hash } from "bcrypt";
import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.js";
import Obligation from "../models/obligation.js";
import { memoryStorage } from "multer";
import cloudinary from "../libs/cloudinary.js";
import { Readable } from "stream";
import { refetchCachedData } from "../app.js";
import { getTerm } from "../helpers/getTerm.js";


export const handleUpdatePassword = catchAsync(async (req, res, next) => {
  const { id } = req.user;
  const { password } = req.body;
  console.log("update");
  const hashedPassword = await hash(password, 10);
  await User.findByIdAndUpdate(id, { password: hashedPassword });
  res.status(200).json({ ok: true, message: "password updated" });
});

export const handleAddContactEmail = catchAsync(async (req, res, next) => {
  const { id } = req.user;
  const { contactEmail,contactNumber } = req.body;
  await User.findByIdAndUpdate(id, {contactEmail,contactNumber});
  res.status(200).json({ ok: true, message: "contact email added updated" });
});
export const handleGetAccounts = catchAsync(async (req, res, next) => {
  const { id,role:currUserRole } = req.user;
  const {role,batch,page} = req.query;
  const skip = (page - 1) * 10;
  if(currUserRole !== 'admin') return res.status(401).json({ok:false,message:'you are not authorized for this action'});
  if(role === 'teacher'){
    const accounts = await User.find({role:'teacher',isActive:true}).skip(skip).limit(10).select('_id name its role').lean();
    const totalRes = await User.countDocuments({role:'teacher',isActive:true});
    return res.status(200).json({accounts,totalRes});
  }
  if(role === 'student'){
    const accounts = await User.find({role:'student',isActive:true,batch,name:{$not:{$regex:'tahfeez',$options:'i'}}}).skip(skip).limit(10).select('_id name its role batch allocatedHub contactEmail').lean();
    const totalRes = await User.countDocuments({
      role: "student",
      isActive:true,
      batch,
      name: { $not: { $regex: "tahfeez", $options: "i" } },
    });

    return res.status(200).json({accounts,totalRes});
  }
  if(role === 'admin'){
    const accounts = await User.find({role:'admin',isActive:true}).skip(skip).limit(10).select('_id name its role').lean();
    const totalRes = await User.countDocuments({ role: "admin",isActive:true });

    return res.status(200).json({accounts,totalRes});
  }
});

export const handleGetUser = catchAsync(async (req, res, next) => {
  const { id } = req.user;
  const user = await User.findById(id);
  if (!user) return res.status(400).json({ ok: false });
  res.status(200).json({ ok: true, user });
});

export const handleCreateUser = catchAsync(async (req, res, next) => {
  // console.log('hello')
  const { id,role:currUserRole } = req.user;
  const {role,its,name,batch,teacher,allocatedHub,contactNumber,contactEmail,address,} = req.body;
  // if(role === 'student' && !teacher) return res.status(400).json({ok:false,message:'teacher is required'})
  const user = {role,its,name:`${its} ${name}`,email:`${its}@gmail.com`,password:`${its.slice(4)}`};
  if(role === 'student') {
    user.batch = batch;
    // user.teacher = teacher;
    user.allocatedHub = allocatedHub;
    user.contactNumber = contactNumber;
    user.contactEmail = contactEmail;
    user.address = address;
    // console.log(user)
    const student = await User.create(user);
    await Obligation.create({student:student._id,batch,allocatedHub,term:getTerm(new Date().getMonth() + 1),year:new Date().getFullYear()});
    return res.status(200).json({ ok: true, user });
  
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