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

export const handleGetObligations = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { batch, status, page, its } = req.query;

  const skip = (page - 1) * 10;

  if (role !== "admin")
    return res.status(401).json({ message: "Not Authorized" });

  let query = {};

  if (its) {
    const student = await User.findOne({ its: Number(its) })
      .select("_id its name")
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const obligation = await Obligation.findOne({
      student: student._id,
    }).populate("student");

    if (!obligation) {
      return res.status(404).json({ message: "Obligation not found" });
    }

    return res.status(200).json({
      obligations: [
        {
          _id: obligation._id,
          student: {
            its: student.its,
            name: student.name,
            _id:student._id
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
    const term = getTerm(currentMonth);

    // const totalObligation = await Obligation.aggregate([
    //   {
    //     $match: {
    //       term: term,
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "status",

    //       paid: {
    //         $sum: {
    //           $cond: [
    //             {
    //               $or: [
    //                 { $eq: ["$status", "paid"] },
    //                 { $eq: ["$status", "partial"] },
    //               ],
    //             },
    //             "$amountPaid",
    //             0,
    //           ],
    //         },
    //       },

    //       pending: {
    //         $sum: {
    //           $cond: [{ $eq: ["$status", "pending"] }, "$allocatedHub", 0],
    //         },
    //       },
    //     },
    //   },
    // ]);

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
  if (!student?.contactEmail || !student?.address) return res.status(400).json({ ok: false, message: "email not found" });
  
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

  await Promise.all(
    dates.map((el) => {
      return Hub.create({
        student: obligation.student,
        batch: obligation.batch,
        transaction_id: transactionId,
        amountPaid: amount / dates.length,
        date: new Date(el),
        paidAt: new Date(paidAt),
      });
    }),
  );

  await Receipt.create({
    amountPaid:amount,
    student:obligation.student,
    batch:obligation.batch,
    transaction_id:transactionId,
    paidAt:new Date(paidAt),
  })

  const stats = await Statistics.findOneAndUpdate({},{$inc:{receiptNumber:1}},{returnDocument:'after'});
  const receiptNumber = stats.receiptNumber;
  
  

  await resend.emails.send({
    from: "Tahfeez Dohad <noreply@tahfeezdohad.org>",

    to: student.contactEmail,
    

    subject: `Hub Receipt`,
    html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>Receipt</title>

    <style>
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
      }

      body {
        background-color: #f2f2f2 !important;
        font-family: Arial, Helvetica, sans-serif;
        color: #000000;
      }

      table {
        border-collapse: collapse;
      }

      .receipt-container {
        width: 100% !important;
        max-width: 700px !important;
        background-color: #ffffff !important;
        border: 1px solid #dcdcdc;
      }

      .receipt-padding {
        padding: 30px;
      }

      .main-title {
        font-size: 16px;
        line-height: 21px;
        font-weight: bold;
      }

      .amount-words {
        font-size: 15px;
        line-height: 20px;
        font-weight: bold;
      }

      .receipt-id {
        width: 100px;
        max-width: 100px;
        border-bottom: 1px solid #000000;
        padding-top: 4px;
        padding-bottom: 3px;
        text-align: center;
        font-size: 11px;
        line-height: 14px;
        word-break: break-all;
        overflow-wrap: anywhere;
      }

      .receipt-type-label {
        width: 120px;
        padding-right: 10px;
        font-size: 11px;
        line-height: 16px;
        font-weight: bold;
      }

      .urdu {
        direction: rtl;
        unicode-bidi: embed;
      }

      @media only screen and (max-width: 720px) {
        body {
          padding: 0 !important;
        }

        .receipt-container {
          width: 100% !important;
          max-width: 100% !important;
        }

        .receipt-padding {
          padding: 18px 12px !important;
        }

        .main-title {
          font-size: 15px !important;
          line-height: 20px !important;
        }

        .amount-words {
          font-size: 14px !important;
          line-height: 19px !important;
        }

        .date-column,
        .receipt-column {
          width: 50% !important;
        }

        .date-column {
          padding-right: 4px !important;
        }

        .receipt-column {
          padding-left: 4px !important;
        }

        .receipt-column table {
          width: 100% !important;
        }

        .receipt-column td {
          white-space: normal !important;
        }

        .receipt-id {
          width: 75px !important;
          max-width: 75px !important;
          font-size: 10px !important;
          line-height: 13px !important;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
        }

        .label-column {
          width: 50px !important;
          padding-right: 7px !important;
        }

        .receipt-type-label {
          width: 80px !important;
          padding-right: 7px !important;
          white-space: normal !important;
        }

        .receipt-type-value {
          padding-left: 0 !important;
        }

        .header-small {
          font-size: 9px !important;
          line-height: 13px !important;
        }

        .header-info {
          font-size: 11px !important;
          line-height: 16px !important;
        }

        .receipt-label {
          font-size: 11px !important;
          line-height: 15px !important;
        }

        .receipt-value {
          font-size: 11px !important;
          line-height: 15px !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }

        .payment-details {
          font-size: 11px !important;
          line-height: 16px !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }
      }

      @media only screen and (max-width: 380px) {
        .receipt-padding {
          padding: 15px 10px !important;
        }

        .main-title {
          font-size: 14px !important;
          line-height: 18px !important;
        }

        .amount-words {
          font-size: 13px !important;
          line-height: 18px !important;
        }

        .receipt-id {
          width: 65px !important;
          max-width: 65px !important;
          font-size: 9px !important;
          line-height: 12px !important;
        }

        .receipt-type-label {
          width: 70px !important;
        }
      }
    </style>
  </head>

  <body
    bgcolor="#f2f2f2"
    style="
    margin:0;
    padding:20px;
    width:100%;
    background-color:#f2f2f2 !important;
    font-family:Arial, Helvetica, sans-serif;
    color:#000000;
  "
  >
    <!-- BACKGROUND -->
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      bgcolor="#f2f2f2"
      style="
      width:100%;
      background-color:#f2f2f2 !important;
    "
    >
      <tr>
        <td align="center" valign="top">
          <!-- RECEIPT -->
          <table
            class="receipt-container"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            bgcolor="#ffffff"
            style="
            width:100%;
            max-width:700px;
            background-color:#ffffff !important;
            border:1px solid #dcdcdc;
            color:#000000;
          "
          >
            <tr>
              <td
                class="receipt-padding"
                style="
                padding:30px;
                color:#000000;
              "
              >
                <!-- ================= HEADER ================= -->

                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="color:#000000;">
                      <div
                        class="header-small"
                        style="
                        font-size:10px;
                        line-height:14px;
                      "
                      >
                        DAWOODI BOHRA JAMAAT ANJUMAN E MOHAMMEDI
                      </div>

                      <div
                        class="main-title"
                        style="
                        margin-top:5px;
                        font-size:16px;
                        line-height:21px;
                        font-weight:bold;
                      "
                      >
                        DAWOODI BOHRA JAMAT ANJUMAN-E-MOHAMMEDI, DAHOD
                      </div>

                      <div
                        class="header-info"
                        style="
                        margin-top:12px;
                        font-size:11px;
                        line-height:16px;
                        font-weight:bold;
                      "
                      >
                        TRUST REGN NO :- B/5(DAHOD)
                      </div>

                      <div
                        class="header-info"
                        style="
                        margin-top:7px;
                        font-size:11px;
                        line-height:16px;
                        font-weight:bold;
                      "
                      >
                        MANAGED BY :- ANJUMAN-E-MOHAMMEDI
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- ================= DATE / RECEIPT NO ================= -->

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                  width:100%;
                  margin-top:25px;
                  table-layout:fixed;
                "
                >
                  <tr>
                    <!-- DATE -->
                    <td
  class="date-column"
  width="50%"
  valign="middle"
  style="
    width:50%;
    padding-right:5px;
  "
>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
  >
    <tr>

      <!-- DATE -->
      <td
        valign="middle"
        style="
          
          line-height:16px;
          font-weight:bold;
          
        "
      >
        تاريخ
      </td>

      <!-- DATE VALUE -->
      <td
        valign="middle"
        style="
          
          border-bottom:1px solid #000000;
          padding:4px 0 3px;
          font-size:11px;
          line-height:15px;
          white-space:nowrap;
        "
      >
        ${format(paidAt, "dd MMM yyyy")}
      </td>

    </tr>
  </table>
</td>

                    <!-- RECEIPT NUMBER -->
                    <td
                      class="receipt-column"
                      width="50%"
                      valign="top"
                      align="right"
                      style="
                      width:50%;
                      padding-left:5px;
                    "
                    >
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" align="right">
                        <tr>
                          <td
                            valign="bottom"
                            align="right"
                            style="
                            padding-right:5px;
                            font-size:12px;
                            line-height:16px;
                            font-weight:bold;
                            white-space:nowrap;
                          "
                          >
                            <span class="urdu"> رسید نمبر </span>
                          </td>

                          <td
                            valign="bottom"
                            class="receipt-id"
                            style="
                            width:100px;
                            max-width:100px;
                            border-bottom:1px solid #000000;
                            padding-top:4px;
                            padding-bottom:3px;
                            text-align:center;
                            font-size:11px;
                            line-height:14px;
                            word-break:break-all;
                            overflow-wrap:anywhere;
                          "
                          >
                            ${String(receiptNumber).padStart(3,'0')}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- ================= STUDENT DETAILS ================= -->

                <table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    width:100%;
    margin-top:20px;
  "
>
  <!-- ================= NAME ================= -->
  <tr>

    <!-- ARABIC TEXT -->
    <td
      valign="middle"
      style="
        width:130px;
        padding:6px 8px 6px 0;
        font-size:12px;
        line-height:16px;
        white-space:nowrap;
      "
    >
      <span class="urdu">
        (حفظه الله تعالى)
      </span>
    </td>

    <!-- NAME FIELD -->
    <td
      class="receipt-value"
      valign="middle"
      style="
        padding:6px 0;

        border-bottom:1px solid #000000;
        font-size:12px;
        line-height:16px;
        overflow-wrap:anywhere;
        word-break:break-word;
      "
    >
      ${formatName(student.name)}
    </td>

    <!-- NAME LABEL -->
    <td
      valign="middle"
      style="
        width:45px;
        padding:6px 0 6px 8px;
        font-size:12px;
        line-height:16px;
        font-weight:bold;
        white-space:nowrap;
      "
    >
      <span class="urdu">
        نام
      </span>
    </td>

  </tr>


  <!-- ================= ITS ID ================= -->
  <tr>

    <!-- ITS LABEL -->
    <td
      valign="middle"
      style="
        padding:6px 8px 6px 0;
        font-size:12px;
        line-height:16px;
        font-weight:bold;
        white-space:nowrap;
      "
    >
      ITS ID.
    </td>

    <!-- ITS FIELD -->
    <td
      class="receipt-value"
      valign="middle"
      style="
        padding:6px 0;
        border-bottom:1px solid #000000;
        font-size:12px;
        line-height:16px;
        overflow-wrap:anywhere;
        word-break:break-word;
      "
    >
      ${student.its}
    </td>

    <!-- EMPTY RIGHT CELL -->
    <td
      style="
        width:45px;
      "
    >
    </td>

  </tr>


  <!-- ================= ADDRESS ================= -->
  <tr>

    <!-- ADDRESS LABEL -->
    <td
      valign="middle"
      style="
        width:130px;
        padding:6px 8px 6px 0;
        font-size:12px;
        line-height:16px;
        font-weight:bold;
        white-space:nowrap;
      "
    >
      Add.
    </td>

    <!-- ADDRESS FIELD -->
    <td
      class="receipt-value"
      valign="middle"
      style="
        padding:6px 0;
        border-bottom:1px solid #000000;
        font-size:12px;
        line-height:16px;
        overflow-wrap:anywhere;
        word-break:break-word;
      "
    >
      ${student.address}
    </td>

    <!-- EMPTY RIGHT CELL -->
    <td
      style="
        width:45px;
      "
    >
    </td>

  </tr>

</table>


<!-- ================= SALAM ================= -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    width:100%;
    margin-top:22px;
  "
>
  <tr>
    <td
      align="center"
      class="urdu"
      style="
        font-size:20px;
        line-height:30px;
        font-weight:bold;
      "
    >
      بعد السلام الجميل
    </td>
  </tr>
</table>

                <!-- ================= AMOUNT IN WORDS ================= -->




<!-- ================= AMOUNT ================= -->

<!-- ================= AMOUNT ================= -->

<!-- ================= AMOUNT ================= -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    width:100%;
    margin-top:18px;
  "
>
  <tr>

    <!-- AMOUNT IN WORDS -->
    <td
      valign="middle"
      align="right"
      style="
        padding:0 5px 8px 0;
        border-bottom:1px solid #000000;
        font-size:15px;
        line-height:20px;
        font-weight:normal;
        white-space:nowrap;
      "
    >
      ${numberToWords
        .toWords(Number(String(obligation.amountPaid).replace(/,/g, "")))
        .replace(/\b\w/g, (char) => char.toUpperCase())} Only
    </td>

    <!-- ANKH -->
    <td
      valign="middle"
      align="center"
      style="
        width:45px;
        padding:0 4px 8px;
        font-size:13px;
        line-height:20px;
        font-weight:bold;
        white-space:nowrap;
      "
    >
      <span class="urdu">
        انکە
      </span>
    </td>

    <!-- AMOUNT -->
    <td
      valign="middle"
      align="right"
      style="
        width:120px;
        padding:0 4px 8px;
        border-bottom:1px solid #000000;
        font-size:14px;
        line-height:20px;
        white-space:nowrap;
      "
    >
      <b>${formatCurrency().format(amount)}</b>
    </td>

    <!-- آپ طرف سے -->
    <td
      valign="middle"
      align="right"
      style="
        width:95px;
        padding:0 0 8px 10px;
        font-size:12px;
        line-height:20px;
        white-space:nowrap;
      "
    >
      <span class="urdu">
        آپ طرف سے
      </span>
    </td>

  </tr>
</table>


<!-- ================= PAYMENT DETAILS ================= -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    width:100%;
    margin-top:12px;
  "
>
  <tr>
    <td
      class="payment-details"
      style="
        font-size:11px;
        line-height:16px;
        color:#000000;
        overflow-wrap:anywhere;
        word-break:break-word;
        text-align:left;
      "
    >
      By Online (Dt.: ${format(paidAt, "dd MMM yyyy")}, Ref.No.: ${obligation.transaction_id})
    </td>
  </tr>
</table>


<!-- ================= RECEIPT TYPE ================= -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    width:100%;
    margin-top:20px;
  "
>
  <tr>
    <td
      align="center"
      style="
        font-size:0;
        line-height:0;
        white-space:nowrap;
      "
    >

      <span
        class="urdu"
        style="
          display:inline-block;
          vertical-align:middle;
          font-size:16px;
          line-height:22px;
          font-weight:bold;
          margin-right:35px;
        "
      >
        طریقے وصول کیا ہے
      </span>

      <span
        style="
          display:inline-block;
          vertical-align:middle;
          font-size:16px;
          line-height:22px;
          font-weight:bold;
          color:#000000;
        "
      >
        Donation
      </span>

    </td>
  </tr>

  <tr>
    <td
      align="center"
      style="
        padding-top:22px;
        font-size:0;
        line-height:0;
      "
    >
      <span
        class="urdu"
        style="
          font-size:16px;
          line-height:22px;
          font-weight:bold;
        "
      >
        (وصول کرنا فی صحیح) عبد سیدنا طع
      </span>
    </td>
  </tr>
</table>


<!-- ================= DIVIDER ================= -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    width:100%;
    margin-top:30px;
  "
>
  <tr>
    <td
      style="
        border-top:1px solid #000000;
        font-size:0;
        line-height:0;
      "
    >
      &nbsp;
    </td>
  </tr>
</table>

                <!-- ================= FOOTER ================= -->

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                  width:100%;
                  margin-top:7px;
                "
                >
                  <tr>
                    <td
                      align="center"
                      style="
                      color:#666666;
                      font-size:10px;
                      line-height:14px;
                    "
                    >
                      This is a computer-generated receipt.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  });
  res.status(200).json({ ok: true });
});

export const handleGetReports = catchAsync(async (req, res, next) => {
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
    hubReportsCount = await Hub.countDocuments(query);
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
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(10);
  hubReportsCount = await Hub.countDocuments(query);
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
      date: format(new Date(el.date),"MMM, yyyy"),
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
