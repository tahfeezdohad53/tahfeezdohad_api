import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
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
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken'
configDotenv();
const app = express();
const server = http.createServer(app);
const io = new Server(server,{
    cors:{
        origin:process.env.URL,
        methods:['GET','POST']
    }
});

app.use(express.json());
app.use(cors({origin:process.env.URL}));
app.use(express.urlencoded({extended:true}));

const user = new Map();
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.jwt;
    if (!token) {
        console.log('Unauthorized')
      return next(new Error("Unauthorized"));
    }
    // console.log('socket auth',token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded;

    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
});

io.on('connection',(socket) => {
    user.set(socket.user.id,socket.id);
    socket.on('incoming-call',({to,from,offer}) => {
        if(user.get(to)){
            // io.to(user.get(to)).emit('incoming-call',{caller:from,offer});
            socket.to(user.get(to)).emit('incoming-call',{caller:from,offer});
            // console.log(offer);
        }
    })
    socket.on('call-accepted',({to,from,answer}) => {
        if(user.get(to)){
            // io.to(user.get(to)).emit('call-accepted',{caller:from,offer});
            socket.to(user.get(to)).emit('call-accepted',{answerer:from,answer});
        }
    })
    socket.on('ice-candidate',({to,candidate}) => {
        console.log(to);
        if(user.get(to)){
            // io.to(user.get(to)).emit('call-accepted',{caller:from,offer});
            socket.to(user.get(to)).emit('ice-candidate',{candidate});
        }
    })
    socket.on('end-call',({to}) => {
        if(user.get(to)){
            socket.to(user.get(to)).emit('end-call');
        }
    })
})

app.use('/auth',authRoutes);
app.use('/student',studentRoutes);
app.use('/recording',recordingRoutes);
app.use('/teacher',teacherRoutes);

// app.use('/wake',async (req,res) => {
//     res.status(200).send('alive!');
// })

(async function(){
    try{
        const r = await mongoose.connect(process.env.MONGO_URI);
        console.log('connected');

    }catch(err){
        console.log(err);
    } 
})()
server.listen(4000,() => {
    console.log('listening');
})
