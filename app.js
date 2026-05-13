import express from 'express';
import cors from 'cors';
import { configDotenv } from 'dotenv';
import Recording from './models/recording.js'
import multer from 'multer';
import {Readable} from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import authRoutes from './routes/auth.js'
import studentRoutes from './routes/student.js'
import recordingRoutes from './routes/recording.js'
import teacherRoutes from './routes/teacher.js'
configDotenv();

const app = express();
app.use(express.json());
app.use(cors({origin:process.env.URL}));
app.use(express.urlencoded({extended:true}));


app.use('/auth',authRoutes);
app.use('/student',studentRoutes);
app.use('/recording',recordingRoutes);
app.use('/teacher',teacherRoutes);

app.use('/wake',async (req,res) => {
    res.status(200).send('alive!');
})

export default app;