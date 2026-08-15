import catchAsync from "../utils/catchAsync.js";
import Recording from "../models/recording.js";
import User from "../models/user.js";
import OnlineClass from "../models/onlineclass.js";
import { Readable } from "stream";
import cloudinary from "../libs/cloudinary.js";

import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "../utils/r2.js";
import ExcelJs from "exceljs";
import { format } from "date-fns";
import { formatName } from "./leave.js";
import resend from "../libs/resend.js";

export const handleCreateAudio = catchAsync(async (req, res, next) => {
  const { isOnline, url, duration } = req.body;
  const { studentId } = req.params;
  const { id, role } = req.user;
  if (role === "student")
    return res
      .status(200)
      .json({ ok: false, message: "you are not allowed for this action" });

  const recording = await Recording.create({
    uploaderRole: role,
    student: studentId,
    teacher: id,
    audio: url,
    duration: Math.ceil(duration),
    classMode: isOnline ? "online" : "in-person",
  });

  await User.findByIdAndUpdate(studentId, {
    classStatus: "recorded",
    $inc: { classDuration: Math.ceil(duration) },
  });
  // if (isOnline)
  //   await OnlineClass.create({
  //     student: studentId,
  //     teacher: id,
  //     duration: Math.ceil(duration),
  //     recording:recording._id,
  //   });
  res.status(200).json({ ok: true });
});
export const handleEvaluateClassRecording = catchAsync(
  async (req, res, next) => {
    const { id, role, name } = req.user;
    const { recordingId } = req.params;
    const {
      data: { talqeenMissed, makharijMissed, grade, remarks },
    } = req.body;

    if (role !== "admin")
      return res.status(401).json({ message: "not authorized" });

    const recording = await Recording.findByIdAndUpdate(
      recordingId,
      {
        evaluationStatus: "evaluated",
        evaluatedBy: formatName(name),
        evaluationDate: new Date(),
        talqeenMissed,
        makharijMissed,
        grade,
        remarks,
      },
      { returnDocument: "after" },
    );
    const teacher = await User.findById(recording.teacher);

    if (teacher.contactEmail)
      await resend.emails.send({
        from: "Tahfeez Dohad Leave Management <noreply@tahfeezdohad.org>",
        to: teacher.contactEmail,
        subject: "Recording evaluated",
        html: `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Recording Evaluation</title>
  </head>

  <body
    style="
  margin: 0;
  padding: 0;
  background-color: #f4f7f6;
  font-family: Arial, Helvetica, sans-serif;
  color: #1f2937;
"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="background-color: #f4f7f6; padding: 40px 15px;"
    >
      <tr>
        <td align="center">
          <!-- Main Container -->
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
          "
          >
            <!-- Header -->
            <tr>
              <td
                style="
              background-color: #166534;
              padding: 28px 30px;
              text-align: center;
            "
              >
                <h1
                  style="
                margin: 0;
                color: #ffffff;
                font-size: 24px;
                font-weight: 700;
              "
                >
                  Recording Evaluated
                </h1>

                <p
                  style="
                margin: 8px 0 0;
                color: #dcfce7;
                font-size: 14px;
              "
                >
                  One of your recording has been evaluated
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 30px;">
                <p
                  style="
                margin: 0 0 20px;
                font-size: 16px;
                line-height: 1.6;
              "
                >
                  Salam e jameel,
                </p>

                <p
                  style="
                margin: 0 0 25px;
                font-size: 15px;
                line-height: 1.6;
                color: #4b5563;
              "
                >
                   Here are the evaluation details:
                </p>

                <!-- Student Info -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                  background-color: #f9fafb;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  margin-bottom: 22px;
                "
                >
                  <tr>
                    <td style="padding: 16px 18px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td
                            style="
                          padding-bottom: 12px;
                          color: #6b7280;
                          font-size: 13px;
                        "
                          >
                            Student
                          </td>

                          <td
                            style="
                          padding-bottom: 12px;
                          text-align: right;
                          font-weight: 600;
                          font-size: 14px;
                          color: #111827;
                        "
                          >
                            ${formatName(recording.studentName)}
                          </td>
                        </tr>

                        <tr>
                          <td
                            style="
                          color: #6b7280;
                          font-size: 13px;
                        "
                          >
                            Duration
                          </td>

                          <td
                            style="
                          text-align: right;
                          font-weight: 600;
                          font-size: 14px;
                          color: #111827;
                        "
                          >
                            ${recording.duration} min
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Evaluation -->
                <h2
                  style="
                margin: 0 0 14px;
                font-size: 17px;
                color: #111827;
              "
                >
                  Evaluation Details
                </h2>

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  overflow: hidden;
                  margin-bottom: 22px;
                "
                >
                  <tr>
                    <td
                      style="
                    padding: 14px 16px;
                    background-color: #f9fafb;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 13px;
                    color: #6b7280;
                  "
                    >
                      Talqeen missed
                    </td>

                    <td
                      style="
                    padding: 14px 16px;
                    text-align: right;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 14px;
                    font-weight: 600;
                  "
                    >
                      ${talqeenMissed}
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                    padding: 14px 16px;
                    background-color: #f9fafb;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 13px;
                    color: #6b7280;
                  "
                    >
                      Missed Makharij
                    </td>

                    <td
                      style="
                    padding: 14px 16px;
                    text-align: right;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 14px;
                    font-weight: 600;
                  "
                    >
                      ${makharijMissed}
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                    padding: 14px 16px;
                    background-color: #f9fafb;
                    font-size: 13px;
                    color: #6b7280;
                  "
                    >
                      Grade
                    </td>

                    <td
                      style="
                    padding: 14px 16px;
                    text-align: right;
                    font-size: 18px;
                    font-weight: 700;
                    color: #166534;
                  "
                    >
                      ${grade.toUpperCase()}
                    </td>
                  </tr>
                </table>

                <!-- Remarks -->
                <h2
                  style="
                margin: 0 0 12px;
                font-size: 17px;
                color: #111827;
              "
                >
                  Remarks
                </h2>

                <div
                  style="
                background-color: #f0fdf4;
                border-left: 4px solid #166534;
                padding: 15px 16px;
                border-radius: 6px;
                margin-bottom: 25px;
              "
                >
                  <p
                    style="
                  margin: 0;
                  font-size: 14px;
                  line-height: 1.6;
                  color: #374151;
                "
                  >
                    ${remarks}
                  </p>
                </div>

                <p
                  style="
                margin: 0;
                font-size: 13px;
                line-height: 1.6;
                color: #6b7280;
              "
                >
                  Please review the evaluation and provide any necessary guidance to the student.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="
              padding: 20px 30px;
              background-color: #f9fafb;
              border-top: 1px solid #e5e7eb;
              text-align: center;
            "
              >
                <p
                  style="
                margin: 0;
                font-size: 12px;
                color: #9ca3af;
              "
                >
                  This is an automated notification from Tahfeez Dohad.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`,
      });
    res.status(200).json({ ok: true });
  },
);

export const handleCheckIsUploaded = catchAsync(async (req, res, next) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      message: "Recording URL is required",
    });
  }

  try {
    const objectUrl = new URL(url);

    // Remove the leading "/"
    const key = objectUrl.pathname.substring(1);

    await r2.send(
      new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      }),
    );

    return res.status(200).json({
      uploaded: true,
    });
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return res.status(200).json({
        uploaded: false,
      });
    }

    return next(error);
  }
});

export const handleGetRecordings = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { page = 1, startDate, endDate, student, teacher } = req.query;
  console.log(startDate);
  const skip = (Number(page) - 1) * 10;
  let recordings;
  let totalResults;
  let query = {};

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    query.$and = [{ createdAt: { $gte: start } }, { createdAt: { $lte: end } }];
  }
  if (student) query.studentName = student;
  if (teacher) query.teacherName = teacher;
  if (role === "admin") {
    recordings = await Recording.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(10);
    totalResults = await Recording.countDocuments(query);
  }
  if (role === "teacher") {
    let query = { teacher: id };
    if (student && student !== "all") query.studentName = student;
    if (startDate && endDate) {
      const endTime = new Date(endDate);
      endTime.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endTime) };
    }
    recordings = await Recording.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(10);
    totalResults = await Recording.countDocuments({ teacher: id });
  }
  if (role === "student") {
    recordings = await Recording.find({ student: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(10);
    totalResults = await Recording.countDocuments({ student: id });
  }
  // recordings = await Recording.find({teacher:id}).sort({createdAt:-1}).skip(skip).limit(10);
  res.status(200).json({ ok: true, recordings, totalResults });
});

export const handleGetRecordingsExcel = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { page = 1, startDate, endDate, student, teacher } = req.query;
  const skip = (Number(page) - 1) * 10;
  let recordings;
  let totalResults;
  let query = {};

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    query.$and = [{ createdAt: { $gte: start } }, { createdAt: { $lte: end } }];
  }
  if (student) query.studentName = student;
  if (teacher) query.teacherName = teacher;
  if (role === "admin") {
    recordings = await Recording.find(query).sort({ createdAt: -1 });
  }

  const workbook = new ExcelJs.Workbook();

  const worksheet = workbook.addWorksheet("classes");

  worksheet.columns = [
    { header: "Date", key: "date", width: 20 },
    {
      header: "Time",
      key: "time",
      width: 15,
    },
    {
      header: "Student_ITS",
      key: "its",
      width: 20,
    },
    {
      header: "Student Name",
      key: "student_name",
      width: 50,
    },
    {
      header: "Recorded By",
      key: "teacher_name",
      width: 50,
    },
    {
      header: "Duration (min)",
      key: "duration",
      width: 15,
    },
    {
      header: "Mode",
      key: "mode",
      width: 15,
    },
  ];

  worksheet.getColumn("duration").alignment = {
    horizontal: "left",
  };

  for (const recording of recordings) {
    worksheet.addRow({
      date: format(recording.createdAt, "MMM d, yyyy"),
      time: format(recording.createdAt, "HH:mm"),
      its: recording.studentName.split(" ")[0],
      student_name: formatName(recording.studentName),
      teacher_name: formatName(recording.teacherName),
      duration: recording.duration,
      mode: recording.classMode,
    });
  }

  worksheet.getRow(1).font = {
    bold: true,
  };

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  res.setHeader("Content-Disposition", "attachment; filename=classes.xlsx");

  await workbook.xlsx.write(res);

  res.end();
});

export const handleGenerateSignedUrl = catchAsync(async (req, res) => {
  const { name } = req.params;
  const date = new Date()
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .replace(/,?\s/g, "-");
  const key = `${name}-${date}-${crypto.randomUUID()}.webm`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: "audio/webm",
  });

  const signedUrl = await getSignedUrl(r2, command, {
    expiresIn: 60,
  });
  const url = `${process.env.R2_PUBLIC_URL}/${key}`;

  res.status(200).json({
    signedUrl,
    key,
    url,
    fileUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
  });
});
