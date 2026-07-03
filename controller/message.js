import catchAsync from "../utils/catchAsync.js";
import Message from "../models/message.js";


export const handleSendMessage = catchAsync(async (req,res,next) => {
    const {id} = req.user;
    const {message,to} = req.body;
    await Message.create({sender:id,receiver:to,message});
    res.status(200).json({ok:true});
})


export const handleGetMessages = catchAsync(async (req, res, next) => {
    console.log('incoming')
  const { id } = req.user;
  const { userId } = req.query;
  const messages = await Message.find({$or:[
    {sender:id,receiver:userId},
    {sender:userId,receiver:id},
  ]})
  console.log(messages)
  res.status(200).json({ ok: true,messages });
});
