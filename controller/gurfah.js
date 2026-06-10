import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.js";
import OnlineClass from "../models/onlineclass.js";

export const handleGetGurfahData = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const {userId} = req.params;
  let classes;
  let user;
  if(role === 'student'){
    classes = await OnlineClass.find({student:id,teacher:userId});
    user = await User.findById(userId);

  }
  else{
     classes = await OnlineClass.find({ student: userId, teacher: id });
     user = await User.findById(userId);

  }

  res.status(200).json({ ok: true,classes,user });
});
