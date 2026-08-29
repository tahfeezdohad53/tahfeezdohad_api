import Statistics from '../models/statistics.js';
export async function updateStatistics(req,res,next){
    const {status} = req.body;
    try{
        if(status === 'fail')await Statistics.findOneAndUpdate(
          { type: "recording" },
          { $inc: { count: 1, fail: 1 } },
          { upsert: true },
        );
        if(status === 'success')await Statistics.findOneAndUpdate(
          { type: "recording" },
          { $inc: { count: 1, success: 1 } },
          { upsert: true },
        );
        res.status(200).json({ok:true});
    }catch(err){
        res.status(200).json({ ok: true });
    }
}