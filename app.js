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
      console.log('reason disconnected: ',reason);
        console.log('disconnected');
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
// io.on('connection',async (socket) => {
//     // console.log('connecting')
//     user.set(socket.user._id,socket.id);
//     const currentUser = await User.findByIdAndUpdate(socket.user._id,{status:'online'});
//     if(currentUser.role === 'student') {
//         console.log(user.get(currentUser.teacher.toString()))
//         socket
//           .to(user.get(currentUser.teacher.toString()))
//           .emit("online", {
//             name: currentUser.name,
//             role: currentUser.role,
//             id: currentUser._id.toString(),
//           });
//     }
//     if(currentUser.role === 'teacher'){
//         const students = await User.find({role:'student',teacher:currentUser._id});
//         students.forEach(el => {
//             socket
//               .to(user.get(el._id.toString()))
//               .emit("online", {
//                 name: currentUser.name,
//                 role: currentUser.role,
//                 id:currentUser._id.toString()
//               });
//         })
//     } 
//     socket.on('incoming-call',({to,from,offer}) => {
//         // console.log('incoming')
//         // console.log(user);
//         if(user.get(to)){
//             // io.to(user.get(to)).emit('incoming-call',{caller:from,offer});
//             socket.to(user.get(to)).emit('incoming-call',{caller:from,offer});
//             // console.log(offer);
//         }
//     })
//     socket.on('call-accepted',({to,from,answer}) => {
//         if(user.get(to)){
//             // io.to(user.get(to)).emit('call-accepted',{caller:from,offer});
//             socket.to(user.get(to)).emit('call-accepted',{answerer:from,answer});
//         }
//     })
//     socket.on('ice-candidate',({to,candidate}) => {
//         // console.log(to);
//         if(user.get(to)){
//             // io.to(user.get(to)).emit('call-accepted',{caller:from,offer});
//             socket.to(user.get(to)).emit('ice-candidate',{candidate});
//         }
//     })
//     socket.on('end-call',({to}) => {
//         if(user.get(to)){
//             socket.to(user.get(to)).emit('end-call');
//         }
//     })
//     socket.on('disconnect',async () => {
//         await User.findByIdAndUpdate(socket.user._id,{status:'offline'});
//         user.delete(socket.user._id);
//     })
// })

async function f(){
    await User.create([
      {
        its: 40153993,
        name: "Mohammed bhai Shaikh Murtaza bhai Udaipurwala",
        juz: 16,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40153993@gmail.com",
      },
      {
        its: 30114886,
        name: "Jabir bhai Khuzaima bhai Bhabhrawala",
        juz: 15,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "30114886@gmail.com",
      },
      {
        its: 30152209,
        name: "Hasan bhai Mufaddal bhai Challawala",
        juz: 15,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "30152209@gmail.com",
      },
      {
        its: 40153435,
        name: "Burhanuddin bhai Hamza bhai Pitolwala",
        juz: 13,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40153435@gmail.com",
      },
      {
        its: 40913515,
        name: "Taha bhai Murtaza bhai Zhabuawala",
        juz: 13,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40913515@gmail.com",
      },
      {
        its: 30160886,
        name: "Burhanuddin bhai Murtaza bhai Gangardiwala",
        juz: 13,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "30160886@gmail.com",
      },
      {
        its: 30153437,
        name: "Burhanuddin bhai Mohammed bhai Kusalghadwala",
        juz: 12,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "30153437@gmail.com",
      },
      {
        its: 40910391,
        name: "Ammar bhai Saifuddin bhai Dohadwala",
        juz: 11,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40910391@gmail.com",
      },
      {
        its: 40150394,
        name: "Yusuf bhai Mustansir bhai Naya",
        juz: 10,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40150394@gmail.com",
      },
      {
        its: 40920701,
        name: "Burhanuddin bhai Mustafa bhai Kapadia",
        juz: 9,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40920701@gmail.com",
      },
      {
        its: 50161771,
        name: "Burhanuddin bhai Juzer bhai Bhatiyawala",
        juz: 9,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "50161771@gmail.com",
      },
      {
        its: 40170573,
        name: "Burhanuddin bhai Hatim bhai Bagichawala",
        juz: 9,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40170573@gmail.com",
      },
      {
        its: 40161634,
        name: "Mohamed bhai Aziz bhai Ambawala",
        juz: 4,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40161634@gmail.com",
      },
      {
        its: 40155190,
        name: "Mufaddal bhai Aliasgar bhai Kharodawala",
        juz: 4,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40155190@gmail.com",
      },
      {
        its: 40918741,
        name: "Mustafa bhai Murtaza bhai Gundarwala",
        juz: 3,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40918741@gmail.com",
      },
      {
        its: 40151886,
        name: "Burhanuddin bhai Ammar bhai Sodawala",
        juz: 3,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40151886@gmail.com",
      },
      {
        its: 40155850,
        name: "Ali Asgar bhai Husain bhai Alirajpurwala",
        juz: 3,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40155850@gmail.com",
      },
      {
        its: 40155210,
        name: "Burhanuddin bhai Mulla Abbas bhai Chatiwala",
        juz: 2,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40155210@gmail.com",
      },
      {
        its: 40183715,
        name: "Mohammed bhai Taher bhai Zabuawala",
        juz: 2,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40183715@gmail.com",
      },
      {
        its: 40163639,
        name: "Burhanuddin bhai Murtaza bhai Sidhpurwala",
        juz: 1,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40163639@gmail.com",
      },
      {
        its: 40181249,
        name: "Burhanuddin bhai Mohammed bhai Mandliwala",
        juz: 1,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40181249@gmail.com",
      },
      {
        its: 40152626,
        name: "Burhanuddin bhai Taher bhai Kacheriwala",
        juz: 27,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40152626@gmail.com",
      },
      {
        its: 40920709,
        name: "Hamza bhai Shabbir bhai Sakir",
        juz: 27,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40920709@gmail.com",
      },
      {
        its: 50172820,
        name: "Mohammed bhai Shaikh Juzer bhai Kheriwala",
        juz: 27,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "50172820@gmail.com",
      },
      {
        its: 40161626,
        name: "Taha bhai Taher bhai Mundala",
        juz: 27,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40161626@gmail.com",
      },
      {
        its: 40155884,
        name: "Mufaddal bhai Huzaifa bhai Kagdi",
        juz: 27,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40155884@gmail.com",
      },
      {
        its: 40154500,
        name: "Taha bhai Saifuddin bhai Zhabuawala",
        juz: 27,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40154500@gmail.com",
      },
      {
        its: 40181949,
        name: "Burhanuddin bhai Mustafa bhai Gundarwala",
        juz: 27,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40181949@gmail.com",
      },
      {
        its: 40163616,
        name: "Burhanuddin bhai Zohair bhai Javrawala",
        juz: 27,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40163616@gmail.com",
      },
      {
        its: 40910474,
        name: "Mansoor bhai Moiz bhai Vasanwala",
        juz: 26,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40910474@gmail.com",
      },
      {
        its: 30116829,
        name: "Burhanuddin bhai Zakiuddin bhai Hasam",
        juz: 26,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "30116829@gmail.com",
      },
      {
        its: 40181243,
        name: "Burhanuddin bhai Husain bhai Jadliwala",
        juz: 26,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40181243@gmail.com",
      },
      {
        its: 50202207,
        name: "Saifuddin bhai Hatim bhai Bagichawala",
        juz: 26,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "50202207@gmail.com",
      },
      {
        its: 40184866,
        name: "Joone bhai Murtaza bhai Gundarwala",
        juz: 26,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40184866@gmail.com",
      },
      {
        its: 40183703,
        name: "Shabbir bhai Qaidjoher bhai Naya",
        juz: 26,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40183703@gmail.com",
      },
      {
        its: 40161128,
        name: "Saifuddin bhai Aliasgar bhai Dudhiawala",
        juz: 26,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40161128@gmail.com",
      },
      {
        its: 30140690,
        name: "Adnan bhai Mansoor bhai Patrawala",
        juz: 26,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "30140690@gmail.com",
      },
      {
        its: 40913358,
        name: "Kinana bhai Yusuf bhai Hasamwala",
        juz: 29,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40913358@gmail.com",
      },
      {
        its: 30117462,
        name: "Shabbir bhai Aliasgar bhai Bariyawala",
        juz: 29,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "30117462@gmail.com",
      },
      {
        its: 40155206,
        name: "Burhanuddin bhai Nasir bhai Kagdi",
        juz: 29,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40155206@gmail.com",
      },
      {
        its: 30141401,
        name: "Husain bhai Aliasgar bhai Mamji wala",
        juz: 29,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "30141401@gmail.com",
      },
      {
        its: 40918817,
        name: "Burhanuddin bhai Saifuddin bhai Gadriwala",
        juz: 29,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40918817@gmail.com",
      },
      {
        its: 40184129,
        name: "Burhanuddin bhai Shabbir bhai Dhanpurwala",
        juz: 29,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40184129@gmail.com",
      },
      {
        its: 40180041,
        name: "Burhanuddin bhai Huzaifa bhai Pitolwala",
        juz: 29,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40180041@gmail.com",
      },
      {
        its: 40918792,
        name: "Burhanuddin bhai Nooruddin bhai Baji",
        juz: 29,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40918792@gmail.com",
      },
      {
        its: 40183297,
        name: "Ibrahim bhai Taher bhai Ambawala",
        juz: 29,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40183297@gmail.com",
      },
      {
        its: 40202025,
        name: "Abizer bhai Taher bhai Kacheriwala",
        juz: 29,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40202025@gmail.com",
      },
      {
        its: 40917522,
        name: "Hatim bhai Mustafa bhai Petrolwala",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40917522@gmail.com",
      },
      {
        its: 40184707,
        name: "Burhanuddin bhai Taher bhai Dahodwala",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40184707@gmail.com",
      },
      {
        its: 40161613,
        name: "Taher bhai Burhanuddin bhai Ranapurwala",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40161613@gmail.com",
      },
      {
        its: 40907699,
        name: "Husain bhai Yusuf bhai Rangwala",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40907699@gmail.com",
      },
      {
        its: 40155876,
        name: "Ali Asgar bhai Shoeb bhai Lanwala",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40155876@gmail.com",
      },
      {
        its: 40915314,
        name: "Moiz bhai Husain bhai Noorbhaiwala",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40915314@gmail.com",
      },
      {
        its: 30117469,
        name: "Qusai bhai Kausar bhai Lanewala",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "30117469@gmail.com",
      },
      {
        its: 40170213,
        name: "Burhanuddin bhai Mohammed bhai Shayarwala",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40170213@gmail.com",
      },
      {
        its: 50172518,
        name: "Qusai bhai Murtaza bhai Kanjwaniwala",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "50172518@gmail.com",
      },
      {
        its: 40917050,
        name: "Mustafa bhai Mohammed bhai Nayawala",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40917050@gmail.com",
      },
      {
        its: 40152629,
        name: "Shabbir bhai Hasanji bhai Zaloadwala",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40152629@gmail.com",
      },
      {
        its: 40180420,
        name: "Abizer bhai Huzaifa bhai Bhatia",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40180420@gmail.com",
      },
      {
        its: 40162864,
        name: "Burhanuddin bhai Husain bhai Nagdi",
        juz: 28,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "40162864@gmail.com",
      },
      {
        its: 50192539,
        name: "Husain bhai Murtaza bhai Gangardiwala",
        juz: 30,
        batch: "baneen",
        teacher: "6a0c95c24c87ffea1503058d",
        email: "50192539@gmail.com",
      },
    ]);
}
// f()

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

// app.get('/wake',(req,res,next) => {
//     res.status(200).send('alive!');
//     next()
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
