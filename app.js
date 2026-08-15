import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { configDotenv } from "dotenv";
import Recording from "./models/recording.js";
import multer from "multer";
import { Readable } from "stream";
import { v2 as cloudinary } from "cloudinary";
import User from "./models/user.js";
import authRoutes from "./routes/auth.js";
import studentRoutes from "./routes/student.js";
import recordingRoutes from "./routes/recording.js";
import teacherRoutes from "./routes/teacher.js";
import userRoutes from "./routes/user.js";
import maqaratRoutes from "./routes/maqarat.js";
import gurfahRoutes from "./routes/gurfah.js";
import leaveRoutes from "./routes/leave.js";
import messageRoutes from "./routes/message.js";
import aliveRoutes from "./routes/alive.js";
import mongoose from "mongoose";
import jsonwebtoken from "jsonwebtoken";
import cookieParser from "cookie-parser";
import axios from "axios";
import { protectRoute } from "./controller/auth.js";
import nodeCron from "node-cron";
configDotenv();
const app = express();
const server = http.createServer(app);
console.log(process.env.URL2);
const io = new Server(server, {
  cors: {
    origin: [process.env.URL2, process.env.URL],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.use(express.json());
app.use(cors({ origin: process.env.URL, credentials: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const user = new Map();
io.use((socket, next) => {
  try {
    const cookies = socket.handshake.headers.cookie;
    const jwt = cookies
      .split("; ")
      .find((el) => el.startsWith("jwt="))
      .split("=")[1];
    try {
      const decoded = jsonwebtoken.verify(jwt, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      console.log(err);
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

io.on("connection", async (socket) => {

  const currentUser = await User.findByIdAndUpdate(socket.user._id, {
    status: "online",
  });
  user.set(socket.user._id, {
    // role: currentUser.role,
    socketId: socket.id,
  });
  socket.broadcast.emit("online-broadcast", {
    id: currentUser._id,
    role: currentUser.role,
  });

  socket.on("incoming-call", ({ to, from, offer }) => {

    if (user.has(to)) { 
      socket
        .to(user.get(to).socketId)
        .emit("incoming-call", { caller: from, offer });
    }
    if (!user.has(to)) {
      socket.emit("not-online");
    }
  });
  socket.on("line-busy", ({ to }) => {
    if (user.has(to)) {
      socket.to(user.get(to).socketId).emit("line-busy");
    }
  });
  socket.on("ice-restart-offer", ({ offer, to }) => {
    if (user.has(to)) {
      socket.to(user.get(to).socketId).emit("ice-restart-offer", { offer });
    }
  });
  socket.on("ice-restart-answer", ({ answer, to }) => {
    if (user.has(to)) {
      socket.to(user.get(to).socketId).emit("ice-restart-answer", { answer });
    }
  });

  socket.on("call-accepted", ({ to, from, answer }) => {
    if (user.has(to)) {
      socket
        .to(user.get(to).socketId)
        .emit("call-accepted", { answerer: from, answer });
    }
  });
  socket.on("ice-candidate", ({ to, candidate }) => {
    if (user.has(to)) {
      socket.to(user.get(to).socketId).emit("ice-candidate", { candidate });
    }
  });
  socket.on("end-call", ({ to }) => {
    if (user.has(to)) {
      socket.to(user.get(to).socketId).emit("end-call");
    }
  });
  socket.on('to-dev',({rating,suggestion}) => {
    if(user.has('6a5b88719b8732dabd07a6f6')){
      socket.to(user.get("6a5b88719b8732dabd07a6f6").socketId).emit('to-dev',{rating,suggestion});
    }
    if(user.has('6a54f7f3dcf32777f8d23f74')){
      socket.to(user.get("6a54f7f3dcf32777f8d23f74").socketId).emit('to-dev',{rating,suggestion});
    }
    
  })

  socket.on(
    "message",
    ({ message, to, from, createdAt, senderName, profileImage }) => {
      if (user.has(to)) {
        socket.to(user.get(to).socketId).emit("message", {
          message,
          to,
          from,
          createdAt,
          senderName,
          profileImage,
        });
      }
    },
  );
  socket.on("disconnect", async (reason) => {

    const current = user.get(socket.user._id);
    if (!user.has(socket.user._id)) {
      socket.broadcast.emit("offline-broadcast", {
        id: socket.user?._id,
        role: socket.user?.role,
      });
    }
    if (current?.socketId === socket.id) {
      user.delete(socket.user._id);
      socket.broadcast.emit("offline-broadcast", {
        id: socket.user?._id,
        role: socket.user?.role,
      });

      await User.findByIdAndUpdate(socket.user._id, {
        status: "offline",
      });
    }
  });
});

async function fnn() {
  // await User.create({
  //   email: "tahfeezdohad2@gmail.com",
  //   password: "tahfeez2",
  //   its: '-',
  //   name: "- tahfeez dohad 2",
  //   role: "student",
  // });
  await Recording.updateMany(
    {},
    { $set: { evaluationStatus: "pending" } }
  );
  console.log('done')
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

const CACHE_TIME = 8 * 60 * 60 * 1000;
let CACHED_DATA = null;
let LAST_FETCHED_AT = 0;

async function fetchData(req, res, next) {
  const { id, role } = req.user;
  const now = Date.now();
  try {
    if (CACHED_DATA && now - LAST_FETCHED_AT < CACHE_TIME) {
      return res.status(200).json(CACHED_DATA);
    }
    await refetchCachedData(now);
    res.status(200).json(CACHED_DATA);
  } catch (err) {
    res.status(500).json({ ok: false });
  }
}

export async function refetchCachedData() {
  const students = await User.find({ role: "student" })
    .select("name teacher _id")
    .lean();
  const teachers = await User.find({ role: "teacher" })
    .select("name _id")
    .lean();
  CACHED_DATA = { ok: true, students, teachers };
  LAST_FETCHED_AT = Date.now();
}

app.get("/aggregate", async (req, res) => {
  const aggregate = await Recording.aggregate([
    {
      $group: {
        _id: "$teacherName",
        id: { $first: "$teacher" },
        totalDurationInMin: { $sum: "$duration" },
        recordingsSubmitted: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        id:1,
        totalDurationInMin: 1,
        recordingsSubmitted: 1,
        name: "$_id",
      },
    },
    {
      $match: {
        totalDurationInMin: { $gte: 60 },
      },
    },
    {
      $sort: {
        totalDurationInMin: -1,
      },
    },
  ]);
  res.status(200).json({ ok: true, aggregate });
});

nodeCron.schedule('0 0 * * *',async () => {
  try{
    await User.updateMany({role:'student'},{classDuration:0,classStatus:'pending'});
  }catch(err){
    console.log(err);
  }
},{
  timezone:'Asia/Kolkata'
})

app.get("/student/getAllStudentsAndTeachers", protectRoute, fetchData);
app.use("/auth", authRoutes);
app.use("/student", studentRoutes);
app.use("/recording", recordingRoutes);
app.use("/teacher", teacherRoutes);
app.use("/user", userRoutes);
app.use("/maqarat", maqaratRoutes);
app.use("/gurfah", gurfahRoutes);
app.use("/leave", leaveRoutes);
app.use("/message", messageRoutes);
app.use("/alive", aliveRoutes);

(async function () {
  try {
    const r = await mongoose.connect(process.env.MONGO_URI);
    console.log("connected");
  } catch (err) {
    console.log(err);
  }
})();
server.listen(process.env.PORT, () => {
  console.log("listening");
});
