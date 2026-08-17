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
import Fee from "./models/fee.js";
import authRoutes from "./routes/auth.js";
import studentRoutes from "./routes/student.js";
import feeRoutes from "./routes/fee.js";
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
import resend from "./libs/resend.js";
import { formatName } from "./controller/leave.js";
import { format } from "date-fns";
configDotenv();
const app = express();
const server = http.createServer(app);
const allowedOrigins = process.env.URL.split(",");
const io = new Server(server, {
  cors: {
    origin:allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      // console.log("ORIGIN:", origin);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
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
  const students = await User.find({batch:'kibaar'}).select('_id batch');

  const feeObligations = students.map(el => {
    return {
      student:el._id,
      batch:el.batch,
      allocatedFee:4000,
      term:3,
      year:2026,
    }
  })
  // await Fee.insertMany(feeObligations);
  await Fee.updateMany({},{amountPaid:0,status:'pending'});

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
  res.status(200).json({ ok: true, teachersTotalMin });
})

nodeCron.schedule('0 0 * * *',async () => {
  try{
    await User.updateMany({role:'student'},{classDuration:0,classStatus:'pending'});
  }catch(err){
    console.log(err);
  }
},{
  timezone:'Asia/Kolkata'
})

nodeCron.schedule("0 19 * * *", async () => {
    try {
      const teachersTotalMin = await Recording.aggregate([
        {
          $match: {
            $expr: {
              $and: [
                { $eq: [{ $month: "$createdAt" }, new Date().getMonth() + 1] },
                { $eq: [{ $year: "$createdAt" }, new Date().getFullYear()] },
                { $eq: [{ $dayOfMonth: "$createdAt" }, new Date().getDate()] },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$teacher",
            name: { $first: "$teacherName" },
            duration: { $sum: "$duration" },
            date: { $first: "$createdAt" },
            studentName: { $push: "$studentName" },
          },
        },
        {
          $project: {
            id: "$_id",
            _id: 0,
            duration: 1,
            name: 1,
            date: 1,
            studentName: 1,
          },
        },
      ]);

      for (const el of teachersTotalMin) {
        const teacher = await User.findById(el.id)
          .select("contactEmail")
          .lean();
        await resend.emails.send({
          from: "Tahfeez Dohad Recording Management <noreply@tahfeezdohad.org>",
          to: teacher.contactEmail,
          subject: "Daily class recording report",
          html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Class Recording Summary</title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background-color: #f3f6fa;
    font-family: Arial, Helvetica, sans-serif;
    color: #17284a;
  "
>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background-color: #f3f6fa; padding: 30px 15px;"
  >
    <tr>
      <td align="center">

        <!-- Main Card -->
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width: 600px;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e5eaf0;
          "
        >

          <!-- Header -->
          <tr>
            <td
              style="
                padding: 28px 30px;
                background-color: #17284a;
                color: #ffffff;
              "
            >
              <h1
                style="
                  margin: 0;
                  font-size: 22px;
                  line-height: 1.4;
                  font-weight: 700;
                "
              >
                Class Recording Summary
              </h1>

              <p
                style="
                  margin: 6px 0 0;
                  font-size: 14px;
                  line-height: 1.5;
                  color: #dbe4f0;
                "
              >
                Daily recording report
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">

              <p
                style="
                  margin: 0 0 8px;
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                Salam e jameel,
              </p>

              <p
                style="
                  margin: 0 0 20px;
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                <strong>${formatName(el.name)}</strong>,
              </p>

              <p
                style="
                  margin: 0 0 25px;
                  font-size: 14px;
                  line-height: 1.7;
                  color: #5f6b7a;
                "
              >
                Here is your class recording summary for
                <strong style="color: #17284a;">
                  ${format(el.date, "dd MMM, yyyy")}
                </strong>.
              </p>

              <!-- Recording Summary -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background-color: #f5f8fc;
                  border: 1px solid #e1e8f0;
                  border-radius: 10px;
                "
              >
                <tr>
                  <td
                    align="center"
                    style="padding: 25px 20px;"
                  >

                    <p
                      style="
                        margin: 0 0 8px;
                        font-size: 13px;
                        font-weight: 600;
                        color: #667085;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                      "
                    >
                      Total Recording Time
                    </p>

                    <p
                      style="
                        margin: 0;
                        font-size: 36px;
                        line-height: 1.2;
                        font-weight: 700;
                        color: #17284a;
                      "
                    >
                      ${el.duration}
                    </p>

                    <p
                      style="
                        margin: 5px 0 0;
                        font-size: 14px;
                        color: #667085;
                      "
                    >
                      minutes
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Students Recorded -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin-top: 25px;
                  background-color: #ffffff;
                  border: 1px solid #e1e8f0;
                  border-radius: 10px;
                "
              >
                <tr>
                  <td style="padding: 20px;">

                    <p
                      style="
                        margin: 0 0 15px;
                        font-size: 14px;
                        font-weight: 700;
                        color: #17284a;
                      "
                    >
                      Students Recorded
                    </p>

                    ${el.studentName
                      .map(
                        (student, index) => `
                            <table
                              width="100%"
                              cellpadding="0"
                              cellspacing="0"
                              border="0"
                              style="
                                border-bottom: ${
                                  index === el.studentName.length - 1
                                    ? "none"
                                    : "1px solid #edf0f4"
                                };
                              "
                            >
                              <tr>
                                <td
                                  style="
                                    padding: 10px 0;
                                    font-size: 14px;
                                    color: #4b5563;
                                  "
                                >
                                  ${index + 1}. ${formatName(student)}
                                </td>

                                
                              </tr>
                            </table>
                          `,
                      )
                      .join("")}

                  </td>
                </tr>
              </table>

              <!-- Message -->
              <p
                style="
                  margin: 25px 0 0;
                  font-size: 14px;
                  line-height: 1.7;
                  color: #5f6b7a;
                "
              >
                 Please ensure all your classes are recorded and uploaded properly today. If you have missed recording any class today, please make sure to record and upload all your classes properly from tomorrow.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              style="
                padding: 20px 30px;
                background-color: #f8fafc;
                border-top: 1px solid #e5eaf0;
              "
            >
              <p
                style="
                  margin: 0;
                  font-size: 13px;
                  line-height: 1.5;
                  color: #667085;
                "
              >
                Regards,<br />
                <strong style="color: #17284a;">Tahfeez Dohad</strong>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`,
        });
        await new Promise((res) => {
          setTimeout(() => {
            res();
          }, 100);
        });
      }
    } catch (err) {
      console.log("failed to send daily emails");
    }
  },
  { timezone: "Asia/Kolkata" },
);

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
app.use("/fee", feeRoutes);
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
