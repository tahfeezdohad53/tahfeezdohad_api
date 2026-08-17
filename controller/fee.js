import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.js";
import Fee from "../models/fee.js";
import { getTerm } from "../helpers/getTerm.js";
import resend from "../libs/resend.js";
import { format } from "date-fns";
import { formatName } from "./leave.js";
import { formatCurrency } from "../helpers/formatCurrency.js";
import numberToWords from "number-to-words";

export const handleGetFeeObligations = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { batch, status, page, its } = req.query;
  const skip = (page - 1) * 10;
  if (role !== "admin")
    return res.status(401).json({ message: "Not Authorized" });

  let query = {};

  if (its) {
    const studentt = await User.findOne({ its: Number(its) })
      .select("_id its name")
      .lean();
    const obligations = await Fee.findOne({ student: studentt._id }).populate(
      "student",
    );
   
    return res
      .status(200)
      .json({
        obligations: [
          {
            _id: obligations._id,
            student: { its: studentt.its, name: studentt.name },
            batch: obligations.batch,
            allocatedFee: obligations.allocatedFee,
            term: obligations.term,
            year: obligations.year,
            status: obligations.status,
            amountPaid: obligations.amountPaid,
            createdAt: obligations.createdAt,
          },
        ],
        count: 1,
      });
  }

  if (status !== "all" && status) query.status = status;
  if (batch !== "all" && batch) query.batch = batch;
  query.term = getTerm(new Date().getMonth() + 1);
  const [obligations, count] = await Promise.all([
    await Fee.find(query).populate("student").skip(skip).limit(10),
    await Fee.countDocuments(query),
  ]);

  res.status(200).json({ ok: true, count, obligations });
});

export const handleGetFeeStatistics = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;

  const [totalStudents, feePaidThisMonth, feePendingThisMonth] =
    await Promise.all([
      await User.countDocuments({
        $and: [
          { role: "student" },
          { name: { $not: { $regex: "tahfeez", $options: "i" } } },
        ],
      }),
      await Fee.countDocuments({ status: "paid" }),
      await Fee.countDocuments({
        $or: [{ status: "pending" }, { status: "partial" }],
      }),
    ]);

  const currentMonth = new Date().getMonth() + 1;
  const term = getTerm(currentMonth);

  const totalFee = await Fee.aggregate([
    {
      $match: { term: term },
    },
    {
      $group: {
        _id: "status",
        paid: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ["$status", "paid"] },
                  { $eq: ["$status", "partial"] },
                ],
              },
              "$amountPaid",
              0,
            ],
          },
        },

        pending: {
          $sum: {
            $cond: [{ $eq: ["$status", "pending"] }, "$allocatedFee", 0],
          },
        },
      },
    },
  ]);
  // console.log(totalFee);
  res
    .status(200)
    .json({
      ok: true,
      totalStudents,
      feePaidThisMonth,
      feePendingThisMonth,
      totalFee,
    });
});
export const handleUpdateFee = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { amount, status, id: feeId,transactionId } = req.body;

  const fee = await Fee.findByIdAndUpdate(
    feeId,
    { $inc:{amountPaid:amount}, status,transaction_id:transactionId },
    { returnDocument: "after" },
  );
  const student = await User.findById(fee.student)
    .select("contactEmail name its")
    .lean();

  // if (student.contactEmail)
    await resend.emails.send({
      from: "Tahfeez Dohad  <noreply@tahfeezdohad.org>",
      to: student.contactEmail
        ? [
            "huzefaratlam63@gmail.com",
            // "adilaliasgar53@gmail.com",
            student.contactEmail,
          ]
        : ["huzefaratlam63@gmail.com", "adilaliasgar53@gmail.com"], // or an array of emails
      subject: `Donation received`,
      html: `
          <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>Receipt</title>

  <style>
    @media only screen and (max-width: 720px) {
      body {
        padding: 10px !important;
      }

      .receipt-container {
        width: 100% !important;
      }

      .receipt-padding {
        padding: 25px 20px !important;
      }

      .main-title {
        font-size: 21px !important;
        line-height: 28px !important;
      }

      .amount-words {
        font-size: 20px !important;
        line-height: 28px !important;
      }

      .label-column {
        width: 110px !important;
      }

      .date-column,
      .receipt-column {
        width: 50% !important;
      }
    }
  </style>
</head>

<body
  bgcolor="#f2f2f2"
  style="
    margin:0;
    padding:20px;
    background-color:#f2f2f2 !important;
    font-family:Arial, Helvetica, sans-serif;
    color:#000000;
  "
>

  <!-- Background -->
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
      <td
        align="center"
        valign="top"
      >

        <!-- Receipt -->
        <table
          class="receipt-container"
          width="700"
          cellpadding="0"
          cellspacing="0"
          border="0"
          bgcolor="#ffffff"
          style="
            width:700px;
            max-width:700px;
            background-color:#ffffff !important;
            border:1px solid #dcdcdc;
            color:#000000;
          "
        >

          <!-- Receipt Padding -->
          <tr>
            <td
              class="receipt-padding"
              style="
                padding:40px;
                color:#000000;
              "
            >

              <!-- ================= HEADER ================= -->

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
              >
                <tr>
                  <td
                    align="center"
                    style="
                      color:#000000;
                    "
                  >

                    <div
                      style="
                        font-size:13px;
                        line-height:18px;
                      "
                    >
                      DAWOODI BOHRA JAMAAT ANJUMAN E MOHAMMEDI
                    </div>

                    <div
                      class="main-title"
                      style="
                        font-size:28px;
                        line-height:36px;
                        font-weight:bold;
                        margin-top:8px;
                      "
                    >
                      DAWOODI BOHRA JAMAT ANJUMAN-E-MOHAMMEDI, DAHOD
                    </div>

                    <div
                      style="
                        margin-top:18px;
                        font-size:16px;
                        line-height:22px;
                        font-weight:bold;
                      "
                    >
                      TRUST REGN NO :- B/5(DAHOD)
                    </div>

                    <div
                      style="
                        margin-top:12px;
                        font-size:16px;
                        line-height:22px;
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
                  margin-top:40px;
                  table-layout:fixed;
                "
              >
                <tr>

                  <!-- Date -->
                  <td
                    class="date-column"
                    width="50%"
                    valign="top"
                    style="
                      width:50%;
                      padding-right:10px;
                    "
                  >

                    <div
                      style="
                        font-size:18px;
                        line-height:22px;
                        font-weight:bold;
                      "
                    >
                      Date
                    </div>

                    <div
                      style="
                        width:170px;
                        max-width:100%;
                        border-bottom:2px solid #000000;
                        padding-top:6px;
                        padding-bottom:5px;
                        font-size:16px;
                        line-height:20px;
                      "
                    >
                      ${format(new Date(), "dd MMM yyyy")}
                    </div>

                  </td>


                  <!-- Receipt Number -->
                  <td
                    class="receipt-column"
                    width="50%"
                    valign="top"
                    align="right"
                    style="
                      width:50%;
                      padding-left:10px;
                    "
                  >

                    <table
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      align="right"
                    >
                      <tr>

                        <td
                          valign="bottom"
                          style="
                            padding-right:12px;
                            font-size:18px;
                            line-height:22px;
                            font-weight:bold;
                            white-space:nowrap;
                          "
                        >
                          Receipt No.
                        </td>

                        <td
                          valign="bottom"
                          style="
                            width:120px;
                            border-bottom:2px solid #000000;
                            padding-top:6px;
                            padding-bottom:5px;
                            text-align:center;
                            font-size:16px;
                            line-height:20px;
                            white-space:nowrap;
                          "
                        >
                          ${fee._id}
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
                  margin-top:30px;
                  table-layout:fixed;
                "
              >

                <!-- Name -->
                <tr>

                  <td
                    class="label-column"
                    width="90"
                    valign="middle"
                    style="
                      width:90px;
                      padding:9px 15px 9px 0;
                      font-size:16px;
                      line-height:20px;
                      font-weight:bold;
                      white-space:nowrap;
                    "
                  >
                    Name
                  </td>

                  <td
                    valign="middle"
                    style="
                      padding:9px 0;
                      border-bottom:2px solid #000000;
                      color:#000000;
                      font-size:16px;
                      line-height:20px;
                    "
                  >
                    ${formatName(student.name)}
                  </td>

                </tr>


                <!-- ITS ID -->
                <tr>

                  <td
                    class="label-column"
                    width="90"
                    valign="middle"
                    style="
                      width:90px;
                      padding:9px 15px 9px 0;
                      font-size:16px;
                      line-height:20px;
                      font-weight:bold;
                      white-space:nowrap;
                    "
                  >
                    ITS ID.
                  </td>

                  <td
                    valign="middle"
                    style="
                      padding:9px 0;
                      border-bottom:2px solid #000000;
                      font-size:16px;
                      line-height:20px;
                    "
                  >
                    ${student.its}
                  </td>

                </tr>


                <!-- Address -->
                <tr>

                  <td
                    class="label-column"
                    width="90"
                    valign="middle"
                    style="
                      width:90px;
                      padding:9px 15px 9px 0;
                      font-size:16px;
                      line-height:20px;
                      font-weight:bold;
                      white-space:nowrap;
                    "
                  >
                    Add.
                  </td>

                  <td
                    valign="middle"
                    style="
                      padding:9px 0;
                      border-bottom:2px solid #000000;
                      font-size:16px;
                      line-height:20px;
                    "
                  >
                    -
                  </td>

                </tr>

              </table>


              <!-- ================= AMOUNT IN WORDS ================= -->

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin-top:30px;
                "
              >
                <tr>

                  <td
                    class="amount-words"
                    align="center"
                    style="
                      padding:0 0 15px;
                      font-size:28px;
                      line-height:36px;
                      font-weight:bold;
                      color:#000000;
                    "
                  >
                    ${numberToWords
                      .toWords(Number(String(fee.amountPaid).replace(/,/g, "")))
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </td>

                </tr>
              </table>


              <!-- ================= AMOUNT ================= -->

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  table-layout:fixed;
                "
              >
                <tr>

                  <td
                    width="70%"
                    valign="middle"
                    align="right"
                    style="
                      width:70%;
                      padding-right:15px;
                      font-size:16px;
                      line-height:22px;
                    "
                  >
                    Only
                  </td>

                  <td
                    width="30%"
                    valign="middle"
                    align="right"
                    style="
                      width:30%;
                      border-bottom:2px solid #000000;
                      padding:0 5px 5px;
                      font-size:17px;
                      line-height:22px;
                      white-space:nowrap;
                    "
                  >
                    <b>
                      ${formatCurrency().format(fee.amountPaid)}
                    </b>
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
                  margin-top:25px;
                "
              >
                <tr>

                  <td
                    style="
                      font-size:16px;
                      line-height:24px;
                      color:#000000;
                    "
                  >
                    By Online
                    (Dt.: ${format(fee.updatedAt, "dd MMM yyyy")},
                    Ref.No.: ${fee.transaction_id})
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
                  margin-top:25px;
                  table-layout:fixed;
                "
              >
                <tr>

                  <!-- Label -->
                  <td
                    width="180"
                    valign="top"
                    style="
                      width:180px;
                      padding-right:20px;
                      font-size:16px;
                      line-height:22px;
                      font-weight:bold;
                      white-space:nowrap;
                    "
                  >
                    Receipt Type - 
                  </td>

                  <!-- Value -->
                  <td
                    valign="top"
                    style="
                      padding-left:10px;
                      font-size:16px;
                      line-height:22px;
                      font-weight:bold;
                      color:#000000;
                    "
                  >
                    Donation
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
                  margin-top:50px;
                "
              >
                <tr>

                  <td
                    style="
                      border-top:2px solid #000000;
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
                  margin-top:10px;
                "
              >
                <tr>

                  <td
                    align="center"
                    style="
                      color:#666666;
                      font-size:13px;
                      line-height:18px;
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
</html>
`,
    });
  res.status(200).json({ ok: true });
});
