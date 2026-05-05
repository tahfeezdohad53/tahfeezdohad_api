import express from 'express';
import cors from 'cors';
import { configDotenv } from 'dotenv';
import Recording from './models/recording.js'
import multer from 'multer';
import {Readable} from 'stream';
import { v2 as cloudinary } from 'cloudinary';
configDotenv();
cloudinary.config({
  cloud_name: "dkqsfm61z",
  api_key: "377469745196739",
  api_secret: "IaUeU9_ML_2sf2Z3Ctg5Rgxnn9E", // Click 'View API Keys' above to copy your API secret
});
const app = express();
app.use(express.json());
app.use(cors({origin:process.env.URL}));
app.use(express.urlencoded({extended:true}));


const storage = multer.memoryStorage();
function filter(req,file,cb){
    if(file.mimetype.startsWith('audio/')){
        cb(null,true)
    }
}

const upload = multer({
    storage:storage,
    fileFilter:filter 
})

// async function n(){
//     await Recording.create({student:'n',muhaffiz:'n',audio:'sdfdsf'})
// }
// n();
app.post('/entry/recording',upload.single('audio'),async (req,res) => {
    const {student,muhaffiz} = req.body;
    const readable = new Readable();
    let secureUrl;
    readable.push(req.file.buffer);
    readable.push(null);
    const stream = cloudinary.uploader.upload_stream({resource_type:'auto'},async (err,result) => {
        if(err) res.status(400).json({ok:false});
        await Recording.create({ student, muhaffiz, audio: result.secure_url });
        res.status(200).json({ ok: true });
        
    }) 
    readable.pipe(stream);

})
app.get('/recording/get',async (req,res) => {
    const recordings = await Recording.find();
    res.status(200).json({ok:true,recordings});
})

export default app;