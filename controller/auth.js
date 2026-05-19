import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.js";
import { signJwt } from "../helpers/singJwt.js";
import jsonwebtoken from "jsonwebtoken";

export const handleSignin = catchAsync(async (req, res, next) => {
    // console.log('hello');
  const signedToken = req.headers?.authorization?.split(" ")[1];
  const { email, name, role } = jsonwebtoken.verify(
    signedToken,
    process.env.FRONTEND_JWT_SECRET,
  );
  console.log(email, name, role);
  let jwt;
  let user;

  const isUser = await User.findOne({email,role});
  console.log(isUser)
  if(isUser){
    jwt = signJwt(isUser.email,isUser._id,isUser.role);
    user = isUser;
  }else{
    return res.status(400).json({ ok: false, message: "account not found" });
  }
  // if(role === 'student'){
  //   const student = await Student.findOne({ email });
  //   if (!student) {
  //     const newStudent = await Student.create({ email, name });
  //     const signedToken = signJwt(newStudent.email, newStudent._id, "student");
  //     return res.status(200).json({ ok: true, jwt: signedToken,user:newStudent });
  //   }
  //   jwt = signJwt(student.email, student._id, "student");
  //   user = student;
  // }
  // if(role === 'teacher'){
  //   const teacher = await Teacher.findOne({email});
  //   if(teacher) {
  //       jwt = signJwt(teacher.email, teacher._id, "teacher");
  //       user = teacher;
  //   }
  //   else return res.status(400).json({ok:false,message:'account not found'});
  // }
  // if(role === 'admin'){
  //   const admin = await Admin.findOne({email});
  //   if(admin) {
  //       jwt = signJwt(admin.email, admin._id, "admin");
  //       user = admin;
  //   }
  //   else return res.status(400).json({ok:false,message:'account not found'});
  // }
  
// console.log(token);
  res.status(200).json({ ok: true, jwt,user });
});

export const protectRoute = catchAsync(async (req, res, next) => {
  const jwt = req.headers?.authorization?.split(" ")[1];
  try{
    const { email, id, role } = jsonwebtoken.verify(
    jwt,
    process.env.JWT_SECRET,
  );

  const isUser = await User.findById(id);
  if(isUser){
    req.user = {id:isUser._id,role:isUser.role};
    return next();
  }
  else res.status(400).json({ok:false,message:'account not found'});

  // if (role === "student") {
  //   const student = await Student.findById(id);
  //   if(student) {
  //       req.user = {id:student._id,role:student.role}
  //       return next();
  //   }
  //   else res.status(400).json({ok:false,message:'account not found'});
  // }
  // if (role === "teacher") {
  //   const teacher = await Teacher.findById(id);
  //   if (teacher) {
  //       req.user = {id:teacher._id,role:teacher.role}
  //       return next();
  //   }
  //   else res.status(400).json({ok:false,message:'account not found'});
  // }
  // if (role === "admin") {
  //   const admin = await Admin.findById(id);
  //   if (admin)  {
  //       req.user = {id:admin._id,role:admin.role}
  //       return next();
  //   }
  //   else res.status(400).json({ok:false,message:'account not found'});
  // }

  }catch(err){
    res.status(400).json({message:'you are not authenticated'});
  }
});