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
import messageRoutes from './routes/message.js'
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
          teacher: currentUser?.teacher?.toString(),
          proxyTeacher:currentUser?.proxyTeacher?.toString(),
          socketId: socket.id,
        });
        // console.log('user after student connect: ',user);
       if(user.has(currentUser?.teacher?.toString())){
         socket.to(user.get(currentUser?.teacher?.toString())?.socketId).emit("online", {
           name: currentUser.name,
           role: currentUser.role,
           id: currentUser._id.toString(),
         });
       }
       if(user.has(currentUser?.proxyTeacher?.toString())){
         socket.to(user.get(currentUser?.proxyTeacher?.toString())?.socketId).emit("online", {
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
          $or:[
            {teacher: currentUser._id},
            {proxyTeacher:currentUser._id}
          ]
        });
        const studentsId = students?.map(el => el?._id?.toString());
        user.set(socket.user._id, {
          role: currentUser.role,
          students: studentsId,
          socketId: socket.id,
        });

        if(students.length > 0){
          students?.forEach((el) => {
            if (user.has(el?._id?.toString())) {
              socket
                .to(user.get(el?._id?.toString())?.socketId)
                .emit("online", {
                  name: currentUser.name,
                  role: currentUser.role,
                  id: currentUser._id.toString(),
                });
            }
          });
        }
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
        }
        if(!user.has(to)){
            // io.to(user.get(to)).emit('incoming-call',{caller:from,offer});
            socket.emit('not-online');
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
        // console.log(user.has(to));
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

    socket.on('message',({message,to,from,createdAt}) => {
      if(user.has(to)){
        socket.to(user.get(to).socketId).emit('message',{message,to,from,createdAt})
      }
    })
    socket.on('disconnect',async (reason) => {
      // console.log('disconnected id: ',socket.id);
      // console.log('reason disconnected: ',reason);
        if(user.get(socket.user._id)?.role === 'student'){
            // console.log(user.get(user.get(socket.user._id).teacher).socketId);
            // console.log(user.get(socket.user._id).role);
            const curruser = user.get(socket.user._id)?.teacher;
            const proxyTeacher = user.get(socket.user._id)?.proxyTeacher;
            const teacherSocketId = user.get(curruser)?.socketId;
            // console.log(user.get(curruser).socketId);
            // console.log(user.has(curruser))
            if (user.has(curruser)){
                if(user.get(socket.user._id).socketId === socket.id) {
                  socket.to(user.get(curruser).socketId).emit("offline", {
                    role: user.get(socket.user._id).role,
                    id: socket.user._id,
                  });
                }

            }
            if (user.has(proxyTeacher)){
                if(user.get(socket.user._id).socketId === socket.id) {
                  socket.to(user.get(proxyTeacher).socketId).emit("offline", {
                    role: user.get(socket.user._id).role,
                    id: socket.user._id,
                  });
                }

            }
        }
        const studentsArr = user.get(socket.user._id)?.students;
        
        if(user.get(socket.user._id)?.role === 'teacher'){
          if(studentsArr?.length > 0){
            studentsArr.forEach((el) => {
              if (user.has(el) && user.get(socket.user._id).socketId === socket.id) {
                socket.to(user.get(el).socketId).emit("offline", {
                  role: user.get(socket.user._id).role,
                  id: socket.user._id,
                });
              }
            });
          }
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
// {
//       its: 40153993,
//       name: "40153993 Mohammed bhai Shaikh Murtaza bhai Udaipurwala",
//       email: "40153993@gmail.com",
//       batch: "baneen",
//       juz: 16,
//       password: "3993",

//       its: 40153993,
//       name: "Mohammed bhai Shaikh Murtaza bhai Udaipurwala",
//       email: "40153993@gmail.com",
//       batch: "baneen",
//       teacher: "6a0c95c24c87ffea1503058d",
//       juz: 16,
//       password: "3993",
//     },
async function fnn(){
  await User.create([
    {
      email: "40451272@gmail.com",
      password: "1272",
      its: 40451272,
      name: "40451272 fatema bai aliasgar bhai japan",
      role: "teacher",
    },
    {
      email: "50405280@gmail.com",
      password: "5280",
      its: 50405280,
      name: "50405280 zahabiyah bai moiz bhai chharchhodawala",
      role: "teacher",
    },
    {
      email: "30908633@gmail.com",
      password: "8633",
      its: 30908633,
      name: "30908633 ammar bhai burhanuddin bhai jhabuawala",
      role: "teacher",
    },
    {
      email: "30704850@gmail.com",
      password: "4850",
      its: 30704850,
      name: "30704850 mustansir bhai mulla mustafa bhai badri",
      role: "teacher",
    },
    {
      email: "40408422@gmail.com",
      password: "8422",
      its: 40408422,
      name: "40408422 sakina bai taher bhai challawala",
      role: "teacher",
    },
    {
      email: "30910058@gmail.com",
      password: "0058",
      its: 30910058,
      name: "30910058 sarrah bai nooruddin bhai challawala",
      role: "teacher",
    },
    {
      email: "40403723@gmail.com",
      password: "3723",
      its: 40403723,
      name: "40403723 ummulkiraam bai saifuddin bhai chunawala",
      role: "teacher",
    },
    {
      email: "30611748@gmail.com",
      password: "1748",
      its: 30611748,
      name: "30611748 batul bai mulla adnan bhai motor wala",
      role: "teacher",
    },
    {
      email: "40700151@gmail.com",
      password: "0151",
      its: 40700151,
      name: "40700151 husain bhai murtaza bhai namliwala",
      role: "teacher",
    },
    {
      email: "30710659@gmail.com",
      password: "0659",
      its: 30710659,
      name: "30710659 ummehani bai mustafa bhai moraswala",
      role: "teacher",
    },
    {
      email: "40900756@gmail.com",
      password: "0756",
      its: 40900756,
      name: "40900756 fatema bai ammar bhai kotawala",
      role: "teacher",
    },
    {
      email: "30702671@gmail.com",
      password: "2671",
      its: 30702671,
      name: "30702671 fakhruddin bhai mohammed bhai charchodawala",
      role: "teacher",
    },
    {
      email: "60417783@gmail.com",
      password: "7783",
      its: 60417783,
      name: "60417783 shireen bai mulla shabbir bhai hoshangabadwala",
      role: "teacher",
    },
    {
      email: "30387346@gmail.com",
      password: "7346",
      its: 30387346,
      name: "30387346 fatema bai shakirhusain bhai sathalia",
      role: "teacher",
    },
    {
      email: "50491173@gmail.com",
      password: "1173",
      its: 50491173,
      name: "50491173 tasneem bai ibrahim bhai baji",
      role: "teacher",
    },
    {
      email: "40900124@gmail.com",
      password: "0124",
      its: 40900124,
      name: "40900124 tasneem bai saifuddin bhai vasanwala",
      role: "teacher",
    },
    {
      email: "30905398@gmail.com",
      password: "5398",
      its: 30905398,
      name: "30905398 nafisa bai burhanuddin bhai malvasi",
      role: "teacher",
    },
    {
      email: "50442530@gmail.com",
      password: "2530",
      its: 50442530,
      name: "50442530 aliasgar bhai huzaifa bhai hasam",
      role: "teacher",
    },
    {
      email: "40405351@gmail.com",
      password: "5351",
      its: 40405351,
      name: "40405351 aliakbar bhai abbas bhai tinwala",
      role: "teacher",
    },
    {
      email: "50405145@gmail.com",
      password: "5145",
      its: 50405145,
      name: "50405145 ummekulsum bai hatim bhai chinch",
      role: "teacher",
    },
    {
      email: "30908575@gmail.com",
      password: "8575",
      its: 30908575,
      name: "30908575 murtaza bhai abizer bhai gulamaliwala",
      role: "teacher",
    },
    {
      email: "30500319@gmail.com",
      password: "0319",
      its: 30500319,
      name: "30500319 tasnim bai abdeali bhai mullamithawala",
      role: "teacher",
    },
    {
      email: "50451053@gmail.com",
      password: "1053",
      its: 50451053,
      name: "50451053 zainab bai juzer bhai pipaliawala",
      role: "teacher",
    },
    {
      email: "50424962@gmail.com",
      password: "4962",
      its: 50424962,
      name: "50424962 ajab bai hatim bhai khakhariyawala",
      role: "teacher",
    },
    {
      email: "30702709@gmail.com",
      password: "2709",
      its: 30702709,
      name: "30702709 fatema bai huzaifa bhai kachiya",
      role: "teacher",
    },
    {
      email: "30500373@gmail.com",
      password: "0373",
      its: 30500373,
      name: "30500373 husaina bai mannan bhai dudhiyawla",
      role: "teacher",
    },
    {
      email: "30911375@gmail.com",
      password: "1375",
      its: 30911375,
      name: "30911375 burhanuddin bhai mustafa bhai kapadiya",
      role: "teacher",
    },
    {
      email: "50435385@gmail.com",
      password: "5385",
      its: 50435385,
      name: "50435385 jamila bai hatim bhai khumri",
      role: "teacher",
    },
    {
      email: "50405588@gmail.com",
      password: "5588",
      its: 50405588,
      name: "50405588 zainab bai hasan bhai limdiwala",
      role: "teacher",
    },
    {
      email: "30350719@gmail.com",
      password: "0719",
      its: 30350719,
      name: "30350719 rabab bai fakhruddin bhai kanchwala",
      role: "teacher",
    },
    {
      email: "30702684@gmail.com",
      password: "2684",
      its: 30702684,
      name: "30702684 rashida bai murtaza bhai bhabhrawala",
      role: "teacher",
    },
    {
      email: "30710648@gmail.com",
      password: "0648",
      its: 30710648,
      name: "30710648 husaina bai firoz bhai kaydawala",
      role: "teacher",
    },
    {
      email: "50451946@gmail.com",
      password: "1946",
      its: 50451946,
      name: "50451946 mariyah bai abdullah bhai zabuawala",
      role: "teacher",
    },
    {
      email: "50478428@gmail.com",
      password: "8428",
      its: 50478428,
      name: "50478428 umaima bai saifuddin bhai ezzy",
      role: "teacher",
    },
    {
      email: "40403661@gmail.com",
      password: "3661",
      its: 40403661,
      name: "40403661 ummesalma bai burhanuddin bhai kazi",
      role: "teacher",
    },
    {
      email: "60485900@gmail.com",
      password: "5900",
      its: 60485900,
      name: "60485900 mulla burhanuddin bhai abdeali bhai lokhandwala",
      role: "teacher",
    },
    {
      email: "30917429@gmail.com",
      password: "7429",
      its: 30917429,
      name: "30917429 murtaza bhai khuzaima bhai kushalgadhwala",
      role: "teacher",
    },
    {
      email: "40403296@gmail.com",
      password: "3296",
      its: 40403296,
      name: "40403296 arwa bai burhanuddin bhai jhabuawala",
      role: "teacher",
    },
    {
      email: "30920607@gmail.com",
      password: "0607",
      its: 30920607,
      name: "30920607 abbas bhai yusuf bhai jiniya",
      role: "teacher",
    },
    {
      email: "40906652@gmail.com",
      password: "6652",
      its: 40906652,
      name: "40906652 idris bhai zakirhusain bhai jesawadwala",
      role: "teacher",
    },
    {
      email: "30704936@gmail.com",
      password: "4936",
      its: 30704936,
      name: "30704936 mulla mustafa bhai qaidjoher bhai burhani",
      role: "teacher",
    },
    {
      email: "50478427@gmail.com",
      password: "8427",
      its: 50478427,
      name: "50478427 zainab bai saifuddin bhai ezzy",
      role: "teacher",
    },
    {
      email: "30500994@gmail.com",
      password: "0994",
      its: 30500994,
      name: "30500994 sakina bai burhanuddin bhai limdiwala",
      role: "teacher",
    },
    {
      email: "40904173@gmail.com",
      password: "4173",
      its: 40904173,
      name: "40904173 fatema bai ilyas bhai katvarawala",
      role: "teacher",
    },
    {
      email: "30710821@gmail.com",
      password: "0821",
      its: 30710821,
      name: "30710821 rashida bai siraj bhai ranapurwala",
      role: "teacher",
    },
    {
      email: "30610120@gmail.com",
      password: "0120",
      its: 30610120,
      name: "30610120 zainab bai aamir bhai limdiwala",
      role: "teacher",
    },
    {
      email: "40409556@gmail.com",
      password: "9556",
      its: 40409556,
      name: "40409556 samina bai husain bhai bhurka",
      role: "teacher",
    },
    {
      email: "40491204@gmail.com",
      password: "1204",
      its: 40491204,
      name: "40491204 zainab bai mustafa bhai ghadiyali",
      role: "teacher",
    },
    {
      email: "30348084@gmail.com",
      password: "8084",
      its: 30348084,
      name: "30348084 insiyah bai burhanuddin bhai cyclewala",
      role: "teacher",
    },
    {
      email: "40904794@gmail.com",
      password: "4794",
      its: 40904794,
      name: "40904794 tasneem bai aliasgar bhai malek",
      role: "teacher",
    },
    {
      email: "40910446@gmail.com",
      password: "0446",
      its: 40910446,
      name: "40910446 amatullah bai yunus bhai makkajiwala",
      role: "teacher",
    },
    {
      email: "30918370@gmail.com",
      password: "8370",
      its: 30918370,
      name: "30918370 mohammed bhai murtaza bhai dalalwala",
      role: "teacher",
    },
    {
      email: "30917982@gmail.com",
      password: "7982",
      its: 30917982,
      name: "30917982 sakina bai burhanuddin bhai sodawala",
      role: "teacher",
    },
    {
      email: "30702624@gmail.com",
      password: "2624",
      its: 30702624,
      name: "30702624 zainab bai aarif bhai boriwala",
      role: "teacher",
    },
    {
      email: "50424616@gmail.com",
      password: "4616",
      its: 50424616,
      name: "50424616 jamila bai nooruddin bhai ravat",
      role: "teacher",
    },
    {
      email: "40468784@gmail.com",
      password: "8784",
      its: 40468784,
      name: "40468784 zainab bai abbas bhai dudhiawala",
      role: "teacher",
    },
    {
      email: "30464265@gmail.com",
      password: "4265",
      its: 30464265,
      name: "30464265 mulla husain bhai alinasir bhai taj",
      role: "teacher",
    },
    {
      email: "40801249@gmail.com",
      password: "1249",
      its: 40801249,
      name: "40801249 umaima bai husain bhai mandliwala",
      role: "teacher",
    },
    {
      email: "40902138@gmail.com",
      password: "2138",
      its: 40902138,
      name: "40902138 aliasgar bhai moiz bhai dudhiyawala",
      role: "teacher",
    },
    {
      email: "50447169@gmail.com",
      password: "7169",
      its: 50447169,
      name: "50447169 jamila bai murtaza bhai borkiwala",
      role: "teacher",
    },
    {
      email: "30500391@gmail.com",
      password: "0391",
      its: 30500391,
      name: "30500391 ummesalma bai ammar bhai jambughodawala",
      role: "teacher",
    },
    {
      email: "60482390@gmail.com",
      password: "2390",
      its: 60482390,
      name: "60482390 jamila bai qutbuddin bhai mandliwala",
      role: "teacher",
    },
    {
      email: "burhanuddinsaifee@gmail.com",
      password: "3456",
      its: 123456,
      name: "- burhanuddin bhai saifee",
      role: "teacher",
    },
    {
      email: "azhar@gmail.com",
      password: "3455",
      its: 123455,
      name: "- azhar bhai limdi",
      role: "teacher",
    },
  ]);
  console.log('saved');
  // await User.updateMany({batch:{$size:0}},{$:{batch:'baneen'}});
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

// async function update(){
//   try{
//     await User.updateMany({},[
//     {$set:{
//       batch:['$batch']
//     }}
//   ],{updatePipeline:true});
//   }catch(err){
//     console.log(err);
//   }
// }
// update();
app.use('/auth',authRoutes);
app.use('/student',studentRoutes);
app.use('/recording',recordingRoutes);
app.use('/teacher',teacherRoutes);
app.use('/user',userRoutes);
app.use('/maqarat',maqaratRoutes);
app.use('/gurfah',gurfahRoutes);
app.use('/leave',leaveRoutes);
app.use('/message',messageRoutes);
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
