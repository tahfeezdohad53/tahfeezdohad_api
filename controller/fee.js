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
  console.log(batch, status, page);
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
    console.log(obligations);
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
  console.log(totalFee);
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
            "adilaliasgar53@gmail.com",
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
  <title>Receipt Preview</title>
</head>

<body
  bgcolor="#f2f2f2"
  style="
    margin:0;
    padding:20px;
    background-color:#f2f2f2 !important;
    font-family:Arial,sans-serif;
    color:#000000;
  "
>

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    bgcolor="#f2f2f2"
    style="background-color:#f2f2f2 !important;"
  >
    <tr>
      <td align="center">

        <!-- Receipt -->
        <table
          width="700"
          cellpadding="0"
          cellspacing="0"
          border="0"
          bgcolor="#ffffff"
          style="
            background-color:#ffffff !important;
            border:1px solid #dcdcdc;
            padding:40px;
            color:#000000;
          "
        >

          <!-- Header -->
          <tr>
            <td align="center">

              <div style="font-size:13px;">
                DAWOODI BOHRA JAMAAT ANJUMAN E MOHAMMEDI
              </div>

              <div
                style="
                  font-size:28px;
                  font-weight:bold;
                  margin-top:8px;
                "
              >
                DAWOODI BOHRA JAMAT ANJUMAN-E-MOHAMMEDI, DAHOD
              </div>

              <div
                style="
                  margin-top:18px;
                  font-weight:bold;
                "
              >
                TRUST REGN NO :- B/5(DAHOD)
              </div>

              <div
                style="
                  margin-top:12px;
                  font-weight:bold;
                "
              >
                MANAGED BY :- ANJUMAN-E-MOHAMMEDI
              </div>

            </td>
          </tr>

          <!-- Date / Receipt No -->
          <tr>
            <td style="padding-top:40px;">

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>

    <!-- Date -->
    <td width="50%" valign="top">
      <b style="font-size:18px;">Date</b>

      <div
        style="
          width:170px;
          border-bottom:2px solid #000;
          padding-top:6px;
          padding-bottom:5px;
          font-size:16px;
        "
      >
        ${format(new Date(), "dd MMM yyyy")}
      </div>
    </td>

    <!-- Receipt Number -->
    <td width="50%" valign="top" align="right">

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
              padding-right:18px;
              font-size:18px;
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
              border-bottom:2px solid #000;
              padding-top:6px;
              padding-bottom:5px;
              text-align:center;
              font-size:16px;
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

            </td>
          </tr>

          <!-- Student Details -->
          <tr>
            <td>

              <table
                width="100%"
                cellpadding="10"
                cellspacing="0"
                border="0"
              >

                <tr>
                  <td width="90">
                    <b>Name</b>
                  </td>

                  <td style="border-bottom:2px solid #000; color:#fff">
                    ${formatName(student.name)}
                  </td>
                </tr>

                <tr>
                  <td>
                    <b>ITS ID.</b>
                  </td>

                  <td style="border-bottom:2px solid #000;">
                    ${student.its}
                  </td>
                </tr>

                <tr>
                  <td>
                    <b>Add.</b>
                  </td>

                  <td style="border-bottom:2px solid #000;">
                    -
                  </td>
                </tr>

              </table>

            </td>
          </tr>

          <!-- Amount in Words -->
          <tr>
            <td
              align="center"
              style="
                padding:35px 0 10px;
                font-size:28px;
                font-weight:bold;
              "
            >
              ${numberToWords
                .toWords(Number(String(fee.amountPaid).replace(/,/g, "")))
                .replace(/\b\w/g, (char) => char.toUpperCase())}
            </td>
          </tr>

          <!-- Amount -->
          <tr>
            <td>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>

                  <td align="right" width="70%">
                    Only
                  </td>

                  <td
                    align="right"
                    style="border-bottom:2px solid #000;"
                  >
                    <b>
                      ${formatCurrency().format(fee.amountPaid)}
                    </b>
                  </td>

                </tr>
              </table>

            </td>
          </tr>

          <!-- Payment Details -->
          <tr>
            <td
              style="
                padding-top:25px;
                font-size:16px;
              "
            >
              By Online
              (Dt.:${format(fee.updatedAt, "dd MMM yyyy")},
              Ref.No.:${fee.transaction_id})
            </td>
          </tr>

          <!-- Receipt Type -->
          <tr>
            <td style="padding-top:25px;">

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>

                  <td width="160">
                    <b>Receipt Type</b>
                  </td>

                  <td>
                    <b>Donation</b>
                  </td>

                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td>

              <hr
                style="
                  border:none;
                  border-top:2px solid #000;
                  margin:50px 0 10px;
                "
              >

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              align="center"
              style="
                color:#666666;
                font-size:13px;
              "
            >
              This is a computer-generated receipt.
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
