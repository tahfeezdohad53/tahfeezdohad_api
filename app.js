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
import Report from "./models/report.js";
import Obligation from "./models/obligation.js";
import authRoutes from "./routes/auth.js";
import studentRoutes from "./routes/student.js";
import hubRoutes from "./routes/hub.js";
import recordingRoutes from "./routes/recording.js";
import teacherRoutes from "./routes/teacher.js";
import userRoutes from "./routes/user.js";
import maqaratRoutes from "./routes/maqarat.js";
import gurfahRoutes from "./routes/gurfah.js";
import leaveRoutes from "./routes/leave.js";
import messageRoutes from "./routes/message.js";
import reportRoutes from "./routes/report.js";
import teacherAttendanceRoutes from "./routes/teacherAttendance.js";
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
import { contactInfo } from "./utils/info.js";
configDotenv();
const app = express();
const server = http.createServer(app);
const allowedOrigins = process.env.URL.split(",");
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
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
  socket.on("broadcast", ({ message }) => {
    io.emit("broadcast", { message });
  });
  socket.on("to-dev", ({ rating, suggestion }) => {
    if (user.has("6a5b88719b8732dabd07a6f6")) {
      socket
        .to(user.get("6a5b88719b8732dabd07a6f6").socketId)
        .emit("to-dev", { rating, suggestion });
    }
    if (user.has("6a54f7f3dcf32777f8d23f74")) {
      socket
        .to(user.get("6a54f7f3dcf32777f8d23f74").socketId)
        .emit("to-dev", { rating, suggestion });
    }
  });

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
// const its7000 = [30919558];

async function fnn() {
  // await User.create({
  //   email: "tahfeezdohadadmin1@gmail.com",
  //   password: "admin5253@",
  //   its: 11111111,
  //   name: "- Tahfeez dohad admin 1",
  //   role: "student",
  //   allocatedHub:5000,
  // });
  // const students = await User.find({role:'student',name:{$not:{$regex:'tahfeez',$options:'i'}}}).select('_id batch allocatedHub');
  // const feeObligations = students.map(el => {
  //   return {
  //     student:el._id,
  //     batch:el.batch || '?',
  //     allocatedHub:el.allocatedHub || 0,
  //     term:4,
  //     year:2026,
  //   }
  // })
  // await Obligation.insertMany(feeObligations);
  // await Fee.updateMany({},{amountPaid:0,status:'pending'});
  // const u = await User.findOne({ its: 30911375 });
  // u.password = '1375';
  // await u.save();
  // await User.updateMany({role:'teacher'},{$unset:{teacherAttendanceStatus:1,teacherTotalMin:1,lastStatusTime:1}})
  // try{
  //   await User.updateMany(
  //     {
  //       its: {
  //         $in: [40183946],
  //       },
  //     },
  //     { allocatedHub: 10000 },
  //   );
  //   console.log('done');
  // }catch(err){
  //   console.log(err);
  // }
  // let operations = [];
  // contactInfo.forEach(el => {
  //   const obj = {updateOne:{
  //     filter:{its:el.its},
  //     update:{$set:{contactEmail:el.email,contactNumber:el.phone,address:el.address}},
  //   }}
  //   operations.push(obj);
  // })
  // console.log(operations.length);
  // await User.bulkWrite(operations);
  // const usersCount = await User.countDocuments({role:'student',name:{$not:{$regex:'tahfeez'}},contactEmail:{$exists:0}});
  // const users = await User.find({role:'student',name:{$not:{$regex:'tahfeez'}},contactEmail:{$exists:0}}).select('name');
  // users.forEach(el => {
  //   console.log(el.name);
  // })
  // console.log(usersCount);
  // const users = await User.find({
  //   its: {
  //     $in: [
  //       "40408003",
  //       "50491150",
  //       "40408631",
  //       "30461040",
  //       "40405485",
  //       "50403503",
  //       "40409120",
  //       "40409116",
  //       "30610118",
  //       "40905544",
  //       "50447489",
  //       "40408354",
  //       "40470950",
  //       "40920709",
  //       "40170573",
  //       "40918809",
  //       "50480818",
  //       "40184404",
  //     ],
  //   },
  // }).select('_id');
  // console.log(users)
  // const ids = users.map(el => el._id);
  // await Obligation.deleteMany({
  //   student: {
  //     $in: ids
  //   },
  // });
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
        id: 1,
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
});

nodeCron.schedule(
  "0 0 * * *",
  async () => {
    try {
      await User.updateMany(
        { role: "student" },
        { classDuration: 0, classStatus: "pending", slots: [] },
      );
      await User.updateMany(
        { $or: [{ role: "teacher" }, { role: "admin" }] },
        { teacherTotalMin: 0 },
      );
    } catch (err) {
      console.log(err);
    }
  },
  {
    timezone: "Asia/Kolkata",
  },
);

nodeCron.schedule(
  "0 19 * * *",
  async () => {
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

export function formatName2(name) {
  if (!name) return;
  const formattedName = name
    .split(" ")
    .slice(1)
    .map((el) => el.slice(0, 1).toUpperCase() + el.slice(1))
    .join(" ");
  return formattedName;
}

nodeCron.schedule(
  "0 0 1 1,4,7,10 *",
  async () => {
    const students = await User.find({
      name: { $not: { $regex: "tahfeez", $options: "i" } },
    }).select("_id batch allocatedHub");
    const obligations = students.map((el) => {
      return {
        student: el._id,
        batch: el.batch,
        allocatedFee: 4000,
        term: 3,
        year: 2026,
      };
    });
    await Obligation.insertMany(obligations);
  },
  { timezone: "Asia/Kolkata" },
);

nodeCron.schedule('0 19 * * *',async () => {
  await sendReportsEmail();
},{timezone:'Asia/Kolkata'});


async function sendReportsEmail() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);

  // const reports = await Report.find({
  //   $and: [{ createdAt: { $gte: from } }, { createdAt: { $lte: to } }],
  // });

  const reports = await Report.aggregate([
    // 1. Filter reports by date
    {
      $match: {
        createdAt: {
          $gte: from,
          $lte: to,
        },
      },
    },

    // 2. Populate student
    {
      $lookup: {
        from: "users",
        localField: "student",
        foreignField: "_id",
        as: "student",
      },
    },

    {
      $unwind: "$student",
    },

    // 3. Group reports by teacher
    {
      $group: {
        _id: "$teacher",

        reports: {
          $push: {
            studentName: "$student.name",
            from: "$from",
            to: "$to",
            hifzGrade: "$hifzGrade",
            makharijGrade: "$makharijGrade",
            makharij: "$makharij",
            remarks: "$remarks",
          },
        },
      },
    },

    // 4. Populate teacher
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "teacher",
      },
    },

    {
      $unwind: "$teacher",
    },

    // 5. Return only what the email needs
    {
      $project: {
        _id: 0,
        teacherName: "$teacher.name",
        reports: 1,
      },
    },
  ]);
  // console.log(reports[0].reports)

    const html = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Student Progress Report</title>

  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      font-family: Arial, Helvetica, sans-serif;
      background-color: #f4f4f4;
      color: #222222;
    }

    * {
      box-sizing: border-box;
    }

    .email-wrapper {
      width: 100%;
      padding: 30px 15px;
    }

    .email-container {
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #dddddd;
      border-radius: 8px;
      overflow: hidden;
    }

    .content {
      padding: 30px;
    }

    .teacher-section {
      margin-bottom: 35px;
    }

    .teacher-name {
      text-align: center;
      font-size: 22px;
      line-height: 28px;
      font-weight: bold;
      margin-bottom: 25px;
    }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .report-table th {
      background-color: #f1f1f1;
      border: 1px solid #cccccc;
      padding: 11px 8px;
      font-size: 13px;
      line-height: 17px;
      text-align: center;
      font-weight: bold;
    }

    .report-table td {
      border: 1px solid #cccccc;
      padding: 11px 8px;
      font-size: 13px;
      line-height: 18px;
      text-align: center;
      vertical-align: middle;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .report-table th:first-child,
    .report-table td:first-child {
      width: 27%;
      text-align: left;
    }

    .report-table th:nth-child(2),
    .report-table td:nth-child(2) {
      width: 13%;
    }

    .report-table th:nth-child(3),
    .report-table td:nth-child(3) {
      width: 13%;
    }

    .report-table th:nth-child(4),
    .report-table td:nth-child(4) {
      width: 17%;
    }

    .report-table th:last-child,
    .report-table td:last-child {
      width: 30%;
      text-align: left;
    }

    .footer {
      margin-top: 25px;
      text-align: center;
      font-size: 11px;
      line-height: 16px;
      color: #777777;
    }

    @media only screen and (max-width: 600px) {

      .email-wrapper {
        padding: 10px 5px;
      }

      .email-container {
        border-radius: 5px;
      }

      .content {
        padding: 18px 8px;
      }

      .teacher-section {
        margin-bottom: 25px;
      }

      .teacher-name {
        font-size: 19px;
        line-height: 25px;
        margin-bottom: 18px;
      }

      .report-table th {
        padding: 8px 4px;
        font-size: 11px;
        line-height: 14px;
      }

      .report-table td {
        padding: 9px 4px;
        font-size: 11px;
        line-height: 15px;
      }

      .report-table th:first-child,
      .report-table td:first-child {
        width: 25%;
      }

      .report-table th:nth-child(2),
      .report-table td:nth-child(2) {
        width: 14%;
      }

      .report-table th:nth-child(3),
      .report-table td:nth-child(3) {
        width: 13%;
      }

      .report-table th:nth-child(4),
      .report-table td:nth-child(4) {
        width: 17%;
      }

      .report-table th:last-child,
      .report-table td:last-child {
        width: 31%;
      }

      .footer {
        margin-top: 18px;
        font-size: 10px;
      }
    }

    @media only screen and (max-width: 380px) {

      .content {
        padding: 15px 5px;
      }

      .teacher-name {
        font-size: 17px;
        line-height: 22px;
      }

      .report-table th {
        padding: 7px 3px;
        font-size: 10px;
      }

      .report-table td {
        padding: 8px 3px;
        font-size: 10px;
        line-height: 14px;
      }
    }
  </style>
</head>

<body>

  <div class="email-wrapper">

    <div class="email-container">

      <div class="content">

        ${reports
          .map(
            (teacherReport) => `
            
            <div class="teacher-section">

              <div class="teacher-name">
                ${formatName2(teacherReport.teacherName)}
              </div>

              <table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="1"
  style="
    width:100%;
    border-collapse:collapse;
    border:1px solid #cccccc;
  "
>
  <thead>
    <tr>
      <th style="
        border:1px solid #cccccc;
        background-color:#f1f1f1;
        padding:11px 8px;
        font-size:13px;
        text-align:center;
      ">
        Student Name
      </th>

      <th style="
        border:1px solid #cccccc;
        background-color:#f1f1f1;
        padding:11px 8px;
        font-size:13px;
        text-align:center;
      ">
        Juz
      </th>

      <th style="
        border:1px solid #cccccc;
        background-color:#f1f1f1;
        padding:11px 8px;
        font-size:13px;
        text-align:center;
      ">
        Hifz
      </th>

      <th style="
        border:1px solid #cccccc;
        background-color:#f1f1f1;
        padding:11px 8px;
        font-size:13px;
        text-align:center;
      ">
        Makharij
      </th>

      <th style="
        border:1px solid #cccccc;
        background-color:#f1f1f1;
        padding:11px 8px;
        font-size:13px;
        text-align:center;
      ">
        Remarks
      </th>
    </tr>
  </thead>

  <tbody>

    ${teacherReport.reports
      .map(
        (report) => `
          <tr>

            <td style="
              border:1px solid #cccccc;
              padding:11px 8px;
              font-size:13px;
              text-align:left;
            ">
              ${formatName2(report.studentName)}
            </td>

            <td style="
              border:1px solid #cccccc;
              padding:11px 8px;
              font-size:13px;
              text-align:center;
            ">
              ${report.from} - ${report.to}
            </td>

            <td style="
              border:1px solid #cccccc;
              padding:11px 8px;
              font-size:13px;
              text-align:center;
            ">
              ${report.hifzGrade}
            </td>

            <td style="
              border:1px solid #cccccc;
              padding:11px 8px;
              font-size:13px;
              text-align:center;
            ">
              ${report.makharijGrade}
            </td>

            <td style="
              border:1px solid #cccccc;
              padding:11px 8px;
              font-size:13px;
              text-align:left;
              max-width:180px;
            ">
              ${report.remarks}
            </td>

          </tr>
        `,
      )
      .join("")}

  </tbody>
</table>

            </div>

          `,
          )
          .join("")}

        <div class="footer">
          This is a computer-generated report.
        </div>

      </div>

    </div>

  </div>

</body>

</html>
`;

    await resend.emails.send({
      from: "Tahfeez Dohad Reports Management <noreply@tahfeezdohad.org>",

      to: [
        "murtazayudaipurwala@gmail.com",
        "aliasgar.adil@mahadalzahra.com",
        "abbasmahesri@gmail.com",
        "huzefaratlam63@gmail.com",
      ],

      subject: "Daily Tamreen Report",

      html,
    });
  }



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
app.use("/report", reportRoutes);
app.use("/hub", hubRoutes);
app.use("/teacherAttendance", teacherAttendanceRoutes);
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
