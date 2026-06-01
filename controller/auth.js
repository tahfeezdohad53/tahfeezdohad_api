import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.js";
import { signJwt } from "../helpers/singJwt.js";
import jsonwebtoken from "jsonwebtoken";
import { compare } from "bcrypt";

export const handleGoogleSignin = catchAsync(async (req, res, next) => {
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
    jwt = signJwt(isUser.toObject());
    user = isUser;
  }else{
    return res.status(400).json({ ok: false, message: "account not found" });
  }
  res.status(200).json({ ok: true, jwt,user });
});


export const handlePasswordSignin = catchAsync(async (req, res, next) => {
 
  const {email,password,role} = req.body;
console.log(email,password)
  const isUser = await User.findOne({email,role});
    if (!isUser) return res.status(400).json({ok:false,message:'account not found'});
    if(!isUser.password) return res.status(400).json({ok:false,message:"You haven't set a password yet"})
    const isPasswordCorrect = await compare(password,isUser.password);
    if(!isPasswordCorrect) return res.status(400).json({ok:false,message:'password incorrect'});
    const jwt = signJwt(isUser.toObject());
    res.cookie('jwt',jwt,{
    sameSite:'none',
    httpOnly:true,
    secure:false,
    maxAge:10 * 24 * 60 * 60 * 1000
  })
  res.status(200).json({ ok: true });
});

export const protectRoute = catchAsync(async (req, res, next) => {
  const {jwt} = req.cookies;
  // const jwt = req.headers?.authorization?.split(" ")[1];
  if(!jwt) return console.log('no token')
  try{
    const user = jsonwebtoken.verify(
    jwt,
    process.env.JWT_SECRET,
  );

  const isUser = await User.findById(user._id);
  if(isUser){
    req.user = {...user,id:user._id};
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


