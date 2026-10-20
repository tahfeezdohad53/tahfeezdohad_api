import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.js";
import Obligation from "../models/obligation.js";
import Statistics from "../models/statistics.js";
import Receipt from "../models/receipt.js";
import Hub from "../models/hub.js";
import { getTerm } from "../helpers/getTerm.js";
import resend from "../libs/resend.js";
import { format } from "date-fns";
import { formatName } from "./leave.js";
import { formatCurrency } from "../helpers/formatCurrency.js";
import numberToWords from "number-to-words";
import ExcelJs from "exceljs";
import { sendExcel } from "../libs/xlsx.js";
import { receiptTemplate } from "../email_templates/receipt.js";

export const handleGetObligations = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { batch, status, page, its } = req.query;

  const skip = (page - 1) * 10;

  if (role !== "admin")
    return res.status(401).json({ message: "Not Authorized" });

  let query = {};

  if (its) {
    const student = await User.findOne({ its: Number(its), isActive: true })
      .select("_id its name")
      .lean();

    if (!student) {
      return res.status(200).json({ obligations: [], count: 0 });
    }

    const obligation = await Obligation.findOne({
      student: student._id,
    }).populate("student");

    if (!obligation) {
      return res.status(200).json({ obligation: obligations, count: 1 });
    }

    return res.status(200).json({
      obligations: [
        {
          _id: obligation._id,
          student: {
            its: student.its,
            name: student.name,
            _id: student._id,
          },
          batch: obligation.batch,
          allocatedHub: obligation.allocatedHub,
          term: obligation.term,
          year: obligation.year,
          status: obligation.status,
          amountPaid: obligation.amountPaid,
          createdAt: obligation.createdAt,
        },
      ],
      count: 1,
    });
  }

  if (status !== "all" && status) {
    query.status = status;
  }

  if (batch !== "all" && batch) {
    query.batch = batch;
  }

  // query.term = getTerm(new Date().getMonth() + 1);

  const [obligations, count] = await Promise.all([
    Obligation.find(query).populate("student").skip(skip).limit(10),

    Obligation.countDocuments(query),
  ]);

  res.status(200).json({
    ok: true,
    count,
    obligations,
  });
});

export const handleGetObligationStatistics = catchAsync(
  async (req, res, next) => {
    const { id, role } = req.user;

    const [
      totalStudents,
      hubPaidThisMonth,
      hubPendingThisMonth,
      partialHubThisMonth,
    ] = await Promise.all([
      Obligation.countDocuments(),

      Obligation.countDocuments({
        status: "paid",
      }),

      Obligation.countDocuments({
        status: "pending",
      }),
      Obligation.countDocuments({
        status: "partial",
      }),
    ]);

    const currentMonth = new Date().getMonth() + 1;
    // const term = getTerm(currentMonth);

    res.status(200).json({
      ok: true,
      totalStudents,
      hubPaidThisMonth,
      hubPendingThisMonth,
      partialHubThisMonth,
      // totalObligation,
    });
  },
);

export const handleUpdateObligation = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;

  const {
    amount,
    status,
    id: obligationId,
    transactionId,
    dates,
    batch,
    studentId,
    allocatedHub,
    paidAt,
  } = req.body;
  // console.log(req.body);
  // console.log(studentId)
  // return;
  // if (batch && allocatedHub) {
  //   let update = {};

  //   if (batch) update.batch = batch;
  //   if (allocatedHub) update.allocatedHub = Number(allocatedHub);
  //   // console.log(update);
  //   await Obligation.findByIdAndUpdate(obligationId, update);
  //   await User.findByIdAndUpdate(studentId, update);

  //   return res.status(200).json({ ok: true });
  // }

  const student = await User.findById(studentId);
  // console.log(student);
  if (!student?.contactEmail || !student?.address)
    return res
      .status(400)
      .json({ ok: false, message: "email or address is not entered!" });

  const obligation = await Obligation.findByIdAndUpdate(
    obligationId,
    {
      $inc: {
        amountPaid: amount,
      },
      status,
      transaction_id: transactionId,
    },
    {
      returnDocument: "after",
    },
  );

  // await Promise.all(
  //   dates.map((el) => {
  //     return Hub.create({
  //       student: obligation.student,
  //       batch: obligation.batch,
  //       transaction_id: transactionId,
  //       amountPaid: amount / dates.length,
  //       date: new Date(el),
  //       paidAt: new Date(paidAt),
  //     });
  //   }),
  // );

  const stats = await Statistics.findOneAndUpdate(
    {},
    { $inc: { receiptNumber: 1 } },
    { returnDocument: "after" },
  );
  const receiptNumber = stats.receiptNumber;
  const receipt = await Receipt.create({
    amountPaid: amount,
    student: obligation.student,
    batch: obligation.batch,
    transaction_id: transactionId,
    paidAt: new Date(paidAt),
    receiptNumber,
  });

  await resend.emails.send({
    from: "Tahfeez Dohad <noreply@tahfeezdohad.org>",

    to: student.contactEmail,

    subject: `Hub Receipt`,
    tags: [{ name: "receiptId", value: receipt._id }],
    html: receiptTemplate({student,paidAt,receiptNumber,amount,transactionId}),
  });
  res.status(200).json({ ok: true });
});

export const handleGetReceipts = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { page, from, to, its, batch } = req.query;

  if (role !== "admin") return res.status(401).json({ ok: false });

  const skip = (Number(page) - 1) * 10;
  let query = {};

  let hubReports;
  let hubReportsCount;
  if (batch && batch !== "all") query.batch = batch;

  if (its) {
    const user = await User.findOne({ its }).select("_id").lean();
    query.student = user._id;
    hubReports = await Receipt.find(query).populate("student");
    hubReportsCount = await Receipt.countDocuments(query);
    console.log(user);
  }

  if (from && !to) {
    const date = new Date(from);
    date.setHours(0, 0, 0, 0);

    query.paidAt = { $gte: date };
  }
  if (from && to) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    query.$and = [{ paidAt: { $gte: fromDate } }, { paidAt: { $lte: toDate } }];
  }

  hubReports = await Receipt.find(query)
    .populate("student")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(10);
  hubReportsCount = await Receipt.countDocuments(query);
  res.status(200).json({ ok: true, hubReports, hubReportsCount });
});

export const handleUpdateObligationData = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { batch, allocatedFee, obligationId, studentId } = req.query;
  if (role !== "admin") return res.status(401).json({ ok: false });

  let update = {};

  if (batch) update.batch = batch;
  if (allocatedFee) update.allocatedFee = Number(allocatedFee);

  await Obligation.findByIdAndUpdate(obligationId, update);
  await User.findByIdAndUpdate(studentId, update);
  res.status(200).json({ ok: true });
});

export const handleGetReportsExcel = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { page, from, to, its, batch } = req.query;
  if (role !== "admin") return res.status(401).json({ ok: false });

  const skip = (Number(page) - 1) * 10;
  let query = {};

  let hubReports;
  let hubReportsCount;
  if (batch && batch !== "all") query.batch = batch;

  if (its) {
    const user = await User.findOne({ its }).select("_id").lean();
    query.student = user._id;
    hubReports = await Hub.find(query).populate("student");
    // hubReportsCount = await Hub.countDocuments(query);
  }

  if (from && !to) {
    const date = new Date(from);
    date.setHours(0, 0, 0, 0);

    query.date = { $gte: date };
  }
  if (from && to) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    query.$and = [{ date: { $gte: fromDate } }, { date: { $lte: toDate } }];
  }

  hubReports = await Hub.find(query)
    .populate("student")
    .sort({ createdAt: -1 });

  const workbook = new ExcelJs.Workbook();

  const worksheet = workbook.addWorksheet("reports");

  worksheet.columns = [
    {
      key: "name",
      header: "Name",
      width: 50,
    },
    {
      key: "its",
      header: "ITS",
      width: 15,
    },
    {
      key: "amount",
      header: "Amount",
      width: 15,
    },
    {
      key: "date",
      header: "Date",
      width: 15,
    },
    {
      key: "paidAt",
      header: "Paid_At",
      width: 15,
    },
    {
      key: "batch",
      header: "Batch",
      width: 25,
    },
  ];

  hubReports.forEach((el) => {
    worksheet.addRow({
      name: formatName(el.student.name),
      its: el.student.its,
      amount: Math.round(el.amountPaid),
      date: format(new Date(el.date), "MMM, yyyy"),
      batch: el.batch,
      paidAt: el.paidAt || "-",
    });
  });

  worksheet.getColumn(1).font = {
    bold: true,
  };
  for (let i = 2; i < 5; i++) {
    worksheet.getColumn(i).alignment = {
      horizontal: "left",
    };
  }

  // await sendExcel({filename:'hubReports',res,workbook});
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  res.setHeader("Content-Disposition", "attachment; filename=hub_reports");

  await workbook.xlsx.write(res);

  res.end();
});

export const handleGetHubReceiptsExcel = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { its, batch, from, to } = req.query;
  if (role !== "admin") return res.status(401).json({ ok: false });

  let query = {};

  let hubReceipts;
  let hubReceiptsCount;
  if (batch && batch !== "all") query.batch = batch;

  if (its?.length === 8) {
    console.log(its);
    const user = await User.findOne({ its }).select("_id").lean();
    query.student = user._id;
    hubReceipts = await Receipt.find(query).populate("student");
    // hubReceiptsCount = await Hub.countDocuments(query);
  }

  if (from && !to) {
    const date = new Date(from);
    date.setHours(0, 0, 0, 0);
    query.paidAt = { $gte: date };
  }
  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
    query.$and = [{ paidAt: { $gte: fromDate } }, { paidAt: { $lte: toDate } }];
  }

  hubReceipts = await Receipt.find(query)
    .populate("student")
    .sort({ createdAt: 1 });

  const workbook = new ExcelJs.Workbook();

  const worksheet = workbook.addWorksheet("reports");

  worksheet.columns = [
    {
      key: "receiptNumber",
      header: "Receipt Number",
      width: 18,
    },
    {
      key: "year",
      header: "Year",
      width: 15,
    },
    {
      key: "name",
      header: "Name",
      width: 50,
    },
    {
      key: "its",
      header: "ITS",
      width: 15,
    },
    {
      key: "amount",
      header: "Amount",
      width: 15,
    },
    {
      key: "term",
      header: "Term",
      width: 10,
    },
    {
      key: "paidAt",
      header: "Paid_At",
      width: 15,
    },
    {
      key: "createdAt",
      header: "Created_At",
      width: 15,
    },
    {
      key: "batch",
      header: "Batch",
      width: 25,
    },
  ];

  hubReceipts.forEach((el) => {
    worksheet.addRow({
      name: formatName(el.student.name),
      its: el.student.its,
      amount: Math.round(el.amountPaid),
      receiptNumber: el.receiptNumber || "-",
      // date: format(new Date(el.date),"MMM, yyyy"),
      year: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
      term: getTerm(new Date().getMonth() + 1),
      batch: el.batch,
      paidAt: format(new Date(el.paidAt), "dd MMM, yyyy") || "-",
      createdAt: format(new Date(el.createdAt), "dd MMM, yyyy"),
    });
  });

  worksheet.getColumn(1).font = {
    bold: true,
  };
  worksheet.getColumn(5).alignment = {
    horizontal: "left",
  };
  worksheet.getColumn(6).alignment = {
    horizontal: "left",
  };
  worksheet.getColumn(7).alignment = {
    horizontal: "left",
  };
  for (let i = 1; i < 5; i++) {
    worksheet.getColumn(i).alignment = {
      horizontal: "left",
    };
  }

  // await sendExcel({filename:'hubReceipts',res,workbook});
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  res.setHeader("Content-Disposition", "attachment; filename=hub_reports");

  await workbook.xlsx.write(res);

  res.end();
});

export const handleDeleteReceipt = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const {receiptId} = req.params;
  if(role !== 'admin') return res.status(401).json({ok:false});
  
    const receipt = await Receipt.findByIdAndUpdate(receiptId,{amountPaid:0},{returnDocument:'before'});
    const obligation = await Obligation.findOne({student:receipt.student});
    obligation.amountPaid = obligation.amountPaid - receipt.amountPaid;

    if (obligation.amountPaid - receipt.amountPaid > 0) obligation.status = "partial";
    if (obligation.amountPaid - receipt.amountPaid <= 0) obligation.status = "pending";

    await obligation.save();

    res.status(200).json({ok:true});
});

export const handleResendReceipt = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const {receiptId} = req.params;
  if(role !== 'admin') return res.status(401).json({ok:false});

    const receipt = await Receipt.findById(receiptId);
    const student = await User.findById(receipt.student);

     await resend.emails.send({
       from: "Tahfeez Dohad <noreply@tahfeezdohad.org>",

       to: student.contactEmail,

       subject: `Hub Receipt`,
       tags: [{ name: "receiptId", value: receipt._id }],
       html: receiptTemplate({
         student,
         paidAt:receipt.paidAt,
         receiptNumber:receipt.receiptNumber,
         amount:receipt.amountPaid,
         transactionId:receipt.transaction_id,
       }),
     });

    res.status(200).json({ok:true});
});