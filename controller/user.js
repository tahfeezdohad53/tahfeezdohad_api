import { hash } from "bcrypt";
import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.js";

export const handleUpdatePassword = catchAsync(async (req, res, next) => {
  const { id } = req.user;
  const { password } = req.body;
  console.log("update");
  const hashedPassword = await hash(password, 10);
  await User.findByIdAndUpdate(id, { password: hashedPassword });
  res.status(200).json({ ok: true, message: "password updated" });
});

export const handleGetUser = catchAsync(async (req, res, next) => {
  console.log('getting user')
  const { id } = req.user;
  const user = await User.findById(id);
  if (!user) return res.status(400).json({ ok: false });
  res.status(200).json({ ok: true, user });
});