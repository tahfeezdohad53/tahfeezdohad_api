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
    // console.log('connecting')
    // console.log('socket id:',socket.id);
    const currentUser = await User.findByIdAndUpdate(socket.user._id,{status:'online'});
    if(currentUser.role === 'student') {
        user.set(socket.user._id, {
            role:currentUser.role,
          teacher: currentUser.teacher.toString(),
          socketId: socket.id,
        });
        console.log('user after student connect: ',user);
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
        console.log("user after teacher connect: ", user);

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
    socket.on("ice-restart-offer",({offer,to}) => {
       if (user.has(to)) {
         socket
           .to(user.get(to).socketId)
           .emit("ice-restart-offer", { offer });
       }
    });
      socket.on("ice-restart-answer", ({ answer, to }) => {
        if (user.has(to)) {
          socket.to(user.get(to).socketId).emit("ice-restart-answer", { answer });
        }
      });

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
      // console.log('disconnected id: ',socket.id);
      // console.log('reason disconnected: ',reason);
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

        const current = user.get(socket.user._id);

        if (current?.socketId === socket.id) {
          user.delete(socket.user._id);

          if (current.role !== "admin") {
            await User.findByIdAndUpdate(socket.user._id, {
              status: "offline",
            });
          }
        }
    })
})
// io.on("connection", (socket) => {
//   console.log("CONNECTED", socket.id);

//   socket.on("disconnect", (reason) => {
//     console.log("DISCONNECTED", socket.id, reason);
//   });
// });
// /////////////////////////////////////////////////////////////////////////////////////////////
async function fnn(){
  await User.create([
    {
      its: 40153993,
      name: "Mohammed bhai Shaikh Murtaza bhai Udaipurwala",
      email: "40153993@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 16,
      password: "3993",
    },
    {
      its: 30114886,
      name: "Jabir bhai Khuzaima bhai Bhabhrawala",
      email: "30114886@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 15,
      password: "4886",
    },
    {
      its: 30152209,
      name: "Hasan bhai Mufaddal bhai Challawala",
      email: "30152209@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 15,
      password: "2209",
    },
    {
      its: 40153435,
      name: "Burhanuddin bhai Hamza bhai Pitolwala",
      email: "40153435@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 13,
      password: "3435",
    },
    {
      its: 40913515,
      name: "Taha bhai Murtaza bhai Zhabuawala",
      email: "40913515@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 13,
      password: "3515",
    },
    {
      its: 30160886,
      name: "Burhanuddin bhai Murtaza bhai Gangardiwala",
      email: "30160886@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 13,
      password: "0886",
    },
    {
      its: 30153437,
      name: "Burhanuddin bhai Mohammed bhai Kusalghadwala",
      email: "30153437@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 12,
      password: "3437",
    },
    {
      its: 40910391,
      name: "Ammar bhai Saifuddin bhai Dohadwala",
      email: "40910391@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 11,
      password: "0391",
    },
    {
      its: 40150394,
      name: "Yusuf bhai Mustansir bhai Naya",
      email: "40150394@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 10,
      password: "0394",
    },
    {
      its: 40920701,
      name: "Burhanuddin bhai Mustafa bhai Kapadia",
      email: "40920701@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 9,
      password: "0701",
    },
    {
      its: 50161771,
      name: "Burhanuddin bhai Juzer bhai Bhatiyawala",
      email: "50161771@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 9,
      password: "1771",
    },
    {
      its: 40170573,
      name: "Burhanuddin bhai Hatim bhai Bagichawala",
      email: "40170573@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 9,
      password: "0573",
    },
    {
      its: 40161634,
      name: "Mohamed bhai Aziz bhai Ambawala",
      email: "40161634@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 4,
      password: "1634",
    },
    {
      its: 40155190,
      name: "Mufaddal bhai Aliasgar bhai Kharodawala",
      email: "40155190@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 4,
      password: "5190",
    },
    {
      its: 40918741,
      name: "Mustafa bhai Murtaza bhai Gundarwala",
      email: "40918741@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 3,
      password: "8741",
    },
    {
      its: 40151886,
      name: "Burhanuddin bhai Ammar bhai Sodawala",
      email: "40151886@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 3,
      password: "1886",
    },
    {
      its: 40155850,
      name: "Ali Asgar bhai Husain bhai Alirajpurwala",
      email: "40155850@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 3,
      password: "5850",
    },
    {
      its: 40155210,
      name: "Burhanuddin bhai Mulla Abbas bhai Chatiwala",
      email: "40155210@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 2,
      password: "5210",
    },
    {
      its: 40183715,
      name: "Mohammed bhai Taher bhai Zabuawala",
      email: "40183715@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 2,
      password: "3715",
    },
    {
      its: 40163639,
      name: "Burhanuddin bhai Murtaza bhai Sidhpurwala",
      email: "40163639@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 1,
      password: "3639",
    },
    {
      its: 40181249,
      name: "Burhanuddin bhai Mohammed bhai Mandliwala",
      email: "40181249@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 1,
      password: "1249",
    },
    {
      its: 40152626,
      name: "Burhanuddin bhai Taher bhai Kacheriwala",
      email: "40152626@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 27,
      nisf: 1,
      password: "2626",
    },
    {
      its: 40920709,
      name: "Hamza bhai Shabbir bhai Sakir",
      email: "40920709@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 27,
      nisf: 2,
      password: "0709",
    },
    {
      its: 50172820,
      name: "Mohammed bhai Shaikh Juzer bhai Kheriwala",
      email: "50172820@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 27,
      nisf: 1,
      password: "2820",
    },
    {
      its: 40161626,
      name: "Taha bhai Taher bhai Mundala",
      email: "40161626@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 27,
      nisf: 1,
      password: "1626",
    },
    {
      its: 40155884,
      name: "Mufaddal bhai Huzaifa bhai Kagdi",
      email: "40155884@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 27,
      nisf: 1,
      password: "5884",
    },
    {
      its: 40154500,
      name: "Taha bhai Saifuddin bhai Zhabuawala",
      email: "40154500@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 27,
      nisf: 1,
      password: "4500",
    },
    {
      its: 40181949,
      name: "Burhanuddin bhai Mustafa bhai Gundarwala",
      email: "40181949@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 27,
      nisf: 1,
      password: "1949",
    },
    {
      its: 40163616,
      name: "Burhanuddin bhai Zohair bhai Javrawala",
      email: "40163616@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 27,
      nisf: 2,
      password: "3616",
    },
    {
      its: 40910474,
      name: "Mansoor bhai Moiz bhai Vasanwala",
      email: "40910474@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 26,
      nisf: 1,
      password: "0474",
    },
    {
      its: 30116829,
      name: "Burhanuddin bhai Zakiuddin bhai Hasam",
      email: "30116829@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 26,
      nisf: 1,
      password: "6829",
    },
    {
      its: 40181243,
      name: "Burhanuddin bhai Husain bhai Jadliwala",
      email: "40181243@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 26,
      nisf: 1,
      password: "1243",
    },
    {
      its: 50202207,
      name: "Saifuddin bhai Hatim bhai Bagichawala",
      email: "50202207@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 26,
      nisf: 1,
      password: "2207",
    },
    {
      its: 40184866,
      name: "Joone bhai Murtaza bhai Gundarwala",
      email: "40184866@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 26,
      nisf: 1,
      password: "4866",
    },
    {
      its: 40183703,
      name: "Shabbir bhai Qaidjoher bhai Naya",
      email: "40183703@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 26,
      nisf: 2,
      password: "3703",
    },
    {
      its: 40161128,
      name: "Saifuddin bhai Aliasgar bhai Dudhiawala",
      email: "40161128@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 26,
      nisf: 2,
      password: "1128",
    },
    {
      its: 30140690,
      name: "Adnan bhai Mansoor bhai Patrawala",
      email: "30140690@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 26,
      nisf: 2,
      password: "0690",
    },
    {
      its: 40913358,
      name: "Kinana bhai Yusuf bhai Hasamwala",
      email: "40913358@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 29,
      nisf: 2,
      password: "3358",
    },
    {
      its: 30117462,
      name: "Shabbir bhai Aliasgar bhai Bariyawala",
      email: "30117462@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 29,
      nisf: 2,
      password: "7462",
    },
    {
      its: 40155206,
      name: "Burhanuddin bhai Nasir bhai Kagdi",
      email: "40155206@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 29,
      nisf: 2,
      password: "5206",
    },
    {
      its: 30141401,
      name: "Husain bhai Aliasgar bhai Mamji wala",
      email: "30141401@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 29,
      nisf: 1,
      password: "1401",
    },
    {
      its: 40918817,
      name: "Burhanuddin bhai Saifuddin bhai Gadriwala",
      email: "40918817@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 29,
      nisf: 2,
      password: "8817",
    },
    {
      its: 40184129,
      name: "Burhanuddin bhai Shabbir bhai Dhanpurwala",
      email: "40184129@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 29,
      nisf: 1,
      password: "4129",
    },
    {
      its: 40180041,
      name: "Burhanuddin bhai Huzaifa bhai Pitolwala",
      email: "40180041@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 29,
      nisf: 2,
      password: "0041",
    },
    {
      its: 40918792,
      name: "Burhanuddin bhai Nooruddin bhai Baji",
      email: "40918792@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 29,
      nisf: 2,
      password: "8792",
    },
    {
      its: 40183297,
      name: "Ibrahim bhai Taher bhai Ambawala",
      email: "40183297@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 29,
      nisf: 2,
      password: "3297",
    },
    {
      its: 40202025,
      name: "Abizer bhai Taher bhai Kacheriwala",
      email: "40202025@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 29,
      nisf: 2,
      password: "2025",
    },
    {
      its: 40917522,
      name: "Hatim bhai Mustafa bhai Petrolwala",
      email: "40917522@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 1,
      password: "7522",
    },
    {
      its: 40184707,
      name: "Burhanuddin bhai Taher bhai Dahodwala",
      email: "40184707@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 1,
      password: "4707",
    },
    {
      its: 40161613,
      name: "Taher bhai Burhanuddin bhai Ranapurwala",
      email: "40161613@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 1,
      password: "1613",
    },
    {
      its: 40907699,
      name: "Husain bhai Yusuf bhai Rangwala",
      email: "40907699@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 2,
      password: "7699",
    },
    {
      its: 40155876,
      name: "Ali Asgar bhai Shoeb bhai Lanwala",
      email: "40155876@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 2,
      password: "5876",
    },
    {
      its: 40915314,
      name: "Moiz bhai Husain bhai Noorbhaiwala",
      email: "40915314@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 1,
      password: "5314",
    },
    {
      its: 30117469,
      name: "Qusai bhai Kausar bhai Lanewala",
      email: "30117469@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 2,
      password: "7469",
    },
    {
      its: 40170213,
      name: "Burhanuddin bhai Mohammed bhai Shayarwala",
      email: "40170213@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 1,
      password: "0213",
    },
    {
      its: 50172518,
      name: "Qusai bhai Murtaza bhai Kanjwaniwala",
      email: "50172518@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 2,
      password: "2518",
    },
    {
      its: 40917050,
      name: "Mustafa bhai Mohammed bhai Nayawala",
      email: "40917050@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 2,
      password: "7050",
    },
    {
      its: 40152629,
      name: "Shabbir bhai Hasanji bhai Zaloadwala",
      email: "40152629@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 1,
      password: "2629",
    },
    {
      its: 40180420,
      name: "Abizer bhai Huzaifa bhai Bhatia",
      email: "40180420@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 1,
      password: "0420",
    },
    {
      its: 40162864,
      name: "Burhanuddin bhai Husain bhai Nagdi",
      email: "40162864@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 28,
      nisf: 2,
      password: "2864",
    },
    {
      its: 50192539,
      name: "Husain bhai Murtaza bhai Gangardiwala",
      email: "50192539@gmail.com",
      batch: "baneen",
      teacher: "6a0c95c24c87ffea1503058d",
      juz: 30,
      nisf: 1,
      password: "2539",
    },
  ]);
}
// fnn();

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
