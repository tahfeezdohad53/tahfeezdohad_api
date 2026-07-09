import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.js";
import Leave from "../models/leave.js";

export const handleCreateLeave = catchAsync(async (req, res, next) => {
  const { id, role, batch='yaqoot', name } = req.user;
  const {type,reason,from,to,days} = req.body;
  await Leave.create({reason,from,to,days,user:id,role,batch,name});
  res.status(201).json({ok:true});
});

export const handleGetLeaves = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { user,status,page } = req.query;
  const skip = (Number(page) - 1) * 10;

  let filter = {};

  if(role !== 'admin'){
    filter.user = id;
    if (status && status !== 'all') filter.status = status;

    if (status && status === 'all') {
    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("user");
    }
    const leaves = await Leave.find(filter).sort({createdAt:-1}).limit(100).populate('user');
    return res.status(200).json({ok:true,leaves});
  }
  let limit = !status ? 10 : 500;
  if(user) filter.user = user;
  if(status && status !== 'all') filter.status = status;
  const leaves = await Leave.find(filter).sort({createdAt:-1}).limit(limit).populate('user');
  return res.status(200).json({ ok: true, leaves });
});

export const handleGetLeaveStatistics = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { user,status } = req.query;
  let filter = {};
  const stats = {
    upcoming: 0,
    accepted: 0,
    rejected: 0,
    pending: 0,
  };
  if(role !== 'admin'){
    const leaves = await Leave.find({user:id});
    leaves.forEach(el => {
      stats[el.status]++
    })
    return res.status(200).json({ok:true,...stats});
  }

  filter.user = user;
  const leaves = await Leave.find();
  leaves.forEach((el) => {
    stats[el.status]++;
  });
  return res.status(200).json({ ok: true, ...stats });
});

export const handleUpdateLeave = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const {leaveId,status} = req.body;
  if(role !== 'admin') return res.status(400).json({message:'you are not allowed for this action'});
  await Leave.findByIdAndUpdate(leaveId,{status});

  return res.status(200).json({ ok: true});
});
