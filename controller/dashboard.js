import catchAsync from "../utils/catchAsync.js";
import User from '../models/user.js';

export const handleGetBatchesCount = catchAsync(async (req, res, next) => {
    const {id,role} = req.user;
    if(role !== 'admin') return res.sendStatus(401);

    const batches = await User.aggregate([
        {
            $match:{
                isActive:true,
                role:'student',
            }
        },
        {
            $group:{
                _id:'$batch',
                count:{$sum:1}
            }
        },
        {
            $project:{
                count:1,
                batch:'$_id',
                _id:0,
            }
        }
    ])
    
    res.status(200).json({ok:true,batches});
});