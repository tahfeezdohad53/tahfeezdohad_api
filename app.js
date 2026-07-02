import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { configDotenv } from 'dotenv';
import Recording from './models/recording.js'
import multer from 'multer';
import {Readable} from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import User from './models/user.js'
import authRoutes from './routes/auth.js'
import studentRoutes from './routes/student.js'
import recordingRoutes from './routes/recording.js'
import teacherRoutes from './routes/teacher.js'
import userRoutes from './routes/user.js'
import maqaratRoutes from './routes/maqarat.js'
import gurfahRoutes from './routes/gurfah.js'
import leaveRoutes from './routes/leave.js'
import aliveRoutes from './routes/alive.js'
import mongoose from 'mongoose';
import jsonwebtoken from 'jsonwebtoken'
import cookieParser from 'cookie-parser';
import axios from 'axios';
configDotenv();
const app = express();
const server = http.createServer(app);
const io = new Server(server,{
    cors:{
        origin:process.env.URL,
        methods:['GET','POST'],
        credentials:true
    }
});

app.use(express.json());
app.use(cors({origin:process.env.URL,credentials:true}));
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
const user = new Map();
io.use((socket, next) => {
    // console.log('tryinhg')
  try {
    const cookies = socket.handshake.headers.cookie
    const jwt = cookies.split('; ').find(el => el.startsWith('jwt=')).split('=')[1];
    // console.log('jwt', jwt)
    try{
        const decoded = jsonwebtoken.verify(jwt, process.env.JWT_SECRET);
    // console.log(decoded)
    socket.user = decoded;
    // console.log(decoded)
    next();
    }catch(err){
        console.log(err)
    }
    // console.log('socket auth');
    // if (!jwt) {
    //     console.log('Unauthorized')
    //   return next(new Error("Unauthorized"));
    // }
  } catch (err) {
    next(new Error("Unauthorized"));
  }
});

io.on('connection',async (socket) => {
    console.log('connecting')
    console.log('socket id:',socket.id);
    const currentUser = await User.findByIdAndUpdate(socket.user._id,{status:'online'});
    if(currentUser.role === 'student') {
        user.set(socket.user._id, {
            role:currentUser.role,
          teacher: currentUser.teacher.toString(),
          socketId: socket.id,
        });
       if(user.has(currentUser.teacher.toString())){
         socket.to(user.get(currentUser.teacher.toString()).socketId).emit("online", {
           name: currentUser.name,
           role: currentUser.role,
           id: currentUser._id.toString(),
         });
       }
    }
    if(currentUser.role === 'teacher') {
        // console.log(socket.id);
        const students = await User.find({
          role: "student",
          teacher: currentUser._id,
        });
        const studentsId = students.map(el => el._id.toString());
        user.set(socket.user._id, {
          role: currentUser.role,
          students: studentsId,
          socketId: socket.id,
        });
        students.forEach((el) => {
          if(user.has(el._id.toString())){
            socket.to(user.get(el._id.toString()).socketId).emit("online", {
              name: currentUser.name,
              role: currentUser.role,
              id: currentUser._id.toString(),
            });
          }
        });
    }
    if(currentUser.role === 'admin') {
        user.set(socket.user._id, {
          role: currentUser.role,
          socketId: socket.id,
        });
    }

    // if(currentUser.role === 'teacher'){
    //     const students = await User.find({role:'student',teacher:currentUser._id});
        
    // } 
    socket.on('incoming-call',({to,from,offer}) => {
        // console.log('incoming')
        // console.log(user);
        if(user.has(to)){
            // io.to(user.get(to)).emit('incoming-call',{caller:from,offer});
            socket.to(user.get(to).socketId).emit('incoming-call',{caller:from,offer});
            // console.log(offer);
        }
    })
    socket.on('line-busy',({to}) => {
        if(user.has(to)){
            socket.to(user.get(to).socketId).emit('line-busy');
        }
    })
    socket.on('call-accepted',({to,from,answer}) => {
        console.log(user.has(to));
        if(user.has(to)){
            // io.to(user.get(to)).emit('call-accepted',{caller:from,offer});
            socket.to(user.get(to).socketId).emit('call-accepted',{answerer:from,answer});
        }
    })
    socket.on('ice-candidate',({to,candidate}) => {
        // console.log(to);
        if(user.has(to)){
            // io.to(user.get(to)).emit('call-accepted',{caller:from,offer});
            socket.to(user.get(to).socketId).emit('ice-candidate',{candidate});
        }
    })
    socket.on('end-call',({to}) => {
        console.log('end call',user.has(to));
        if(user.has(to)){
            socket.to(user.get(to).socketId).emit('end-call');
        }
    })
    socket.on('disconnect',async (reason) => {
      console.log('disconnected id: ',socket.id);
      console.log('reason disconnected: ',reason);
        if(user.get(socket.user._id)?.role === 'student'){
            // console.log(user.get(user.get(socket.user._id).teacher).socketId);
            // console.log(user.get(socket.user._id).role);
            const curruser = user.get(socket.user._id).teacher;
            const teacherSocketId = user.get(curruser)?.socketId;
            // console.log(user.get(curruser).socketId);
            // console.log(user.has(curruser))
            if (user.has(curruser)){
                socket
                  .to(user.get(curruser).socketId)
                  .emit("offline", {
                    role: user.get(socket.user._id).role,
                    id: socket.user._id,
                  });

            }
        }
        if(user.get(socket.user._id)?.role === 'teacher'){
            user.get(socket.user._id).students.forEach((el) => {
              if (user.has(el)) {
                socket.to(user.get(el).socketId).emit("offline", {
                  role: user.get(socket.user._id).role,
                  id: socket.user._id,
                });
              }
            });
        }
        if (user.get(socket.user._id)?.role !== "admin") await User.findByIdAndUpdate(socket.user._id, { status: "offline" });
        user.delete(socket.user._id);
    })
})
// io.on("connection", (socket) => {
//   console.log("CONNECTED", socket.id);

//   socket.on("disconnect", (reason) => {
//     console.log("DISCONNECTED", socket.id, reason);
//   });
// });



app.get("/turn-credentials", async (req, res) => {
  const response = await axios.post(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${process.env.TURN_TOKEN_ID}/credentials/generate-ice-servers`,
    {
      ttl: 86400,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.TURN_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  );

  res.status(200).json(response.data);
});
app.use('/auth',authRoutes);
app.use('/student',studentRoutes);
app.use('/recording',recordingRoutes);
app.use('/teacher',teacherRoutes);
app.use('/user',userRoutes);
app.use('/maqarat',maqaratRoutes);
app.use('/gurfah',gurfahRoutes);
app.use('/leave',leaveRoutes);
app.use('/alive',aliveRoutes);

(async function(){
    try{
        const r = await mongoose.connect(process.env.MONGO_URI);
        console.log('connected');

    }catch(err){
        console.log(err);
    } 
})()
server.listen(process.env.PORT,() => {
    console.log('listening');
})
