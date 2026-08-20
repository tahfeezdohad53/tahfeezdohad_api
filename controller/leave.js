import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.js";
import Leave from "../models/leave.js";
import resend from "../libs/resend.js";

export function formatName(name) {
  if (!name) return "";
  const firstChar = name
    .split(" ")[1]
    .slice(0, 1)
    .toUpperCase()
    .concat(name.split(" ")[1].slice(1));
  const formattedName = firstChar.concat(
    " " + name.split(" ").slice(2).join(" "),
  );
  return formattedName;
}

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export const handleCreateLeave = catchAsync(async (req, res, next) => {
  const { id, role, batch, name } = req.user;
  const { type, reason, from, to, days } = req.body;
  if (batch)
    await Leave.create({
      reason,
      from,
      to,
      days,
      user: id,
      role,
      batch,
      name,
      type,
    });
  await resend.emails.send({
    from: "Tahfeez Dohad Leave Management <noreply@tahfeezdohad.org>",
    to: ["murtazayudaipurwala@gmail.com", "huzefaratlam63@gmail.com"], // or an array of emails
    subject: `Leave Request - ${formatName(name)}`,
    html: `
    <!DOCTYPE html>
    <html>
      <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;border:1px solid #e5e5e5;overflow:hidden;">
          
          <div style="background:#2563eb;color:#fff;padding:20px;text-align:center;">
            <h2 style="margin:0;">Leave Request</h2>
          </div>

          <div style="padding:24px;">
            <p>Dear Admin,</p>

            <p>A new leave request has been submitted.</p>

            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Name</td>
                <td style="padding:10px;border:1px solid #ddd;">${formatName(name)}</td>
              </tr>
              <tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Role</td>
                <td style="padding:10px;border:1px solid #ddd;">${role}</td>
              </tr>
              ${
                batch
                  ? `<tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Batch</td>
                <td style="padding:10px;border:1px solid #ddd;">${batch}</td>
              </tr>`
                  : ""
              }
              <tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Leave Type</td>
                <td style="padding:10px;border:1px solid #ddd;">${type}</td>
              </tr>
              <tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">From</td>
                <td style="padding:10px;border:1px solid #ddd;">${formatDate(from)}</td>
              </tr>
              <tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">To</td>
                <td style="padding:10px;border:1px solid #ddd;">${formatDate(to)}</td>
              </tr>
              <tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Days</td>
                <td style="padding:10px;border:1px solid #ddd;">${days}</td>
              </tr>
              <tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Reason</td>
                <td style="padding:10px;border:1px solid #ddd;">${reason}</td>
              </tr>
            </table>

            <p style="margin:0;padding:0;margin-top:24px;margin-bottom:16px;">
              Please review this leave request at your earliest convenience.
            </p>

            <a
              href="https://www.tahfeezdohad.org/leave"
              target="_blank"
              style="
                display:inline-block;
                background:#2563eb;
                color:#ffffff;
                text-decoration:none;
                padding:12px 20px;
                border-radius:6px;
                font-weight:600;
              "
            >
              Review Leave Request
            </a>

            <p style="margin:24px 0 0;">
              Regards,<br>
              <strong>Leave Management System</strong>
            </p>
          </div>

        </div>
      </body>
    </html>
  `,
  });
  if (!batch)
    await Leave.create({ reason, from, to, days, user: id, role, name, type });
  res.status(201).json({ ok: true });
});

export const handleGetLeaves = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { user, status, page } = req.query;
  const skip = (Number(page) - 1) * 10;

  let filter = {};

  if (role !== "admin") {
    filter.user = id;
    if (status && status !== "all") filter.status = status;

    if (status && status === "all") {
      const leaves = await Leave.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("user");
    }
    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("user");
    return res.status(200).json({ ok: true, leaves });
  }
  let limit = !status ? 10 : 500;
  if (user) filter.user = user;
  if (status && status !== "all") filter.status = status;
  const leaves = await Leave.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user");
  return res.status(200).json({ ok: true, leaves });
});

export const handleGetLeaveStatistics = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { user, status } = req.query;
  let filter = {};
  const stats = {
    upcoming: 0,
    accepted: 0,
    rejected: 0,
    pending: 0,
  };
  if (role !== "admin") {
    const leaves = await Leave.find({ user: id });
    leaves.forEach((el) => {
      stats[el.status]++;
    });
    return res.status(200).json({ ok: true, ...stats });
  }

  filter.user = user;
  const leaves = await Leave.find();
  leaves.forEach((el) => {
    stats[el.status]++;
  });
  return res.status(200).json({ ok: true, ...stats });
});

export const handleUpdateLeave = catchAsync(async (req, res, next) => {
  const { id, role } = req.user;
  const { leaveId, status } = req.body;
  if (role !== "admin")
    return res
      .status(400)
      .json({ message: "you are not allowed for this action" });
      const approved = status === "accepted";
  const leave = await Leave.findByIdAndUpdate(
    leaveId,
    { status },
    { new: true }, // or { returnDocument: "after" } if you're using the MongoDB driver
  );

  const user = await User.findById(leave.user);

  if(approved) await resend.emails.send({
    from: "Tahfeez Dohad Leave Management <noreply@tahfeezdohad.org>",
    to: [
      "adilaliasgar53@gmail.com",
      "abbas.mahesri@gmail.com",
      "huzefaratlam63@gmail.com",
    ],
    subject: "Your Leave Request Has Been Approved",
    html: `<!DOCTYPE html>
<html>
  <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;border:1px solid #e5e5e5;overflow:hidden;">

      <div style="background:#16a34a;color:#fff;padding:20px;text-align:center;">
        <h2 style="margin:0;">Leave Approved</h2>
      </div>

      <div style="padding:24px;">
        <p>Dear Head Teacher,</p>

        <p>
          This is to inform you that the following leave request has been
          <strong>approved by the Admin</strong>.
        </p>

        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Teacher</td>
            <td style="padding:10px;border:1px solid #ddd;">${formatName(user.name)}</td>
          </tr>

          ${user?.batch ? `<tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Batch</td>
            <td style="padding:10px;border:1px solid #ddd;">${leave.batch}</td>
          </tr>` : ''}

          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Leave Type</td>
            <td style="padding:10px;border:1px solid #ddd;">${leave.type}</td>
          </tr>

          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">From</td>
            <td style="padding:10px;border:1px solid #ddd;">${formatDate(leave.from)}</td>
          </tr>

          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">To</td>
            <td style="padding:10px;border:1px solid #ddd;">${formatDate(leave.to)}</td>
          </tr>

          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Duration</td>
            <td style="padding:10px;border:1px solid #ddd;">${leave.days} day${leave.days > 1 ? "s" : ""}</td>
          </tr>

          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Reason</td>
            <td style="padding:10px;border:1px solid #ddd;">${leave.reason}</td>
          </tr>

          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Status</td>
            <td style="padding:10px;border:1px solid #ddd;color:#16a34a;font-weight:bold;">
              Approved
            </td>
          </tr>
        </table>

        <p style="margin:24px 0 16px;">
          Please make the necessary arrangements for the teacher's absence during
          the approved leave period.
        </p>

        <a
          href="https://www.tahfeezdohad.org/leave"
          target="_blank"
          style="
            display:inline-block;
            background:#16a34a;
            color:#ffffff;
            text-decoration:none;
            padding:12px 20px;
            border-radius:6px;
            font-weight:600;
          "
        >
          View Leave Details
        </a>

        <p style="margin:24px 0 0;">
          Regards,<br>
          <strong>Leave Management System</strong>
        </p>
      </div>

    </div>
  </body>
</html>`,
  });

  await resend.emails.send({
    from: "Tahfeez Dohad Leave Management <noreply@tahfeezdohad.org>",
    to: user.contactEmail,
    subject: `Your Leave Request Has Been ${approved ? "Approved" : "Rejected"}`,
    html: `
<!DOCTYPE html>
<html>
  <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;border:1px solid #e5e5e5;overflow:hidden;">

      <div style="background:${approved ? "#16a34a" : "#dc2626"};color:#fff;padding:20px;text-align:center;">
        <h2 style="margin:0;">Leave ${approved ? "Approved" : "Rejected"}</h2>
      </div>

      <div style="padding:24px;">
        <p>Salam e Jameel,</p>

        <p>${formatName(user.name)}</p>

        <p>
          ${
            approved
              ? `We are pleased to inform you that your leave request has been
                 <strong>approved by the Admin</strong>.`
              : `We regret to inform you that your leave request has been
                 <strong>rejected by the Admin</strong>.`
          }
        </p>

        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Leave Type</td>
            <td style="padding:10px;border:1px solid #ddd;">${leave.type}</td>
          </tr>

          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">From</td>
            <td style="padding:10px;border:1px solid #ddd;">${formatDate(leave.from)}</td>
          </tr>

          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">To</td>
            <td style="padding:10px;border:1px solid #ddd;">${formatDate(leave.to)}</td>
          </tr>

          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Duration</td>
            <td style="padding:10px;border:1px solid #ddd;">
              ${leave.days} day${leave.days > 1 ? "s" : ""}
            </td>
          </tr>

          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Reason</td>
            <td style="padding:10px;border:1px solid #ddd;">${leave.reason}</td>
          </tr>

          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Status</td>
            <td style="padding:10px;border:1px solid #ddd;color:${approved ? "#16a34a" : "#dc2626"};font-weight:bold;">
              ${approved ? "Approved" : "Rejected"}
            </td>
          </tr>
        </table>

        <p style="margin:24px 0 16px;">
          ${
            approved
              ? `Your leave has been approved for the period mentioned above.
                 Please ensure that any necessary work or responsibilities are
                 properly handed over before your leave begins.`
              : `Unfortunately, your leave request could not be approved for the
                 period mentioned above. Please contact the Admin if you require
                 further clarification regarding this decision.`
          }
        </p>

        <a
          href="https://www.tahfeezdohad.org/leave"
          target="_blank"
          style="
            display:inline-block;
            background:${approved ? "#16a34a" : "#dc2626"};
            color:#ffffff;
            text-decoration:none;
            padding:12px 20px;
            border-radius:6px;
            font-weight:600;
          "
        >
          View Leave Details
        </a>

        <p style="margin:24px 0 0;">
          Regards,<br>
          <strong>Leave Management System</strong>
        </p>
      </div>

    </div>
  </body>
</html>
`,
  });
  //   await resend.emails.send({
  //     from: "Leave Management <noreply@tahfeezdohad.org>",
  //     to: user.email, // or an array of emails
  //     subject: `Your leave request`,
  //     html: `<!DOCTYPE html>
  // <html lang="en">
  // <head>
  //   <meta charset="UTF-8" />
  //   <title>Leave Request Update</title>
  // </head>
  // <body style="margin:0;padding:24px;background:#f5f5f5;font-family:Arial,sans-serif;color:#333;">
  //   <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;">

  //     <div style="background:${approved ? "#16a34a" : "#dc2626"};padding:20px;text-align:center;">
  //       <h2 style="margin:0;color:#fff;">
  //         Leave Request ${approved ? "Approved" : "Rejected"}
  //       </h2>
  //     </div>

  //     <div style="padding:24px;">
  //       <p>Dear ${formatName(user.name)},</p>

  //       <p>
  //         Your leave request has been
  //         <strong style="color:${approved ? "#16a34a" : "#dc2626"};">
  //           ${approved ? "APPROVED" : "REJECTED"}
  //         </strong>.
  //       </p>

  //       <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
  //         <tr>
  //           <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Leave Type</td>
  //           <td style="padding:10px;border:1px solid #ddd;">${leave.type}</td>
  //         </tr>
  //         <tr>
  //           <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">From</td>
  //           <td style="padding:10px;border:1px solid #ddd;">${formatDate(leave.from)}</td>
  //         </tr>
  //         <tr>
  //           <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">To</td>
  //           <td style="padding:10px;border:1px solid #ddd;">${formatDate(leave.to)}</td>
  //         </tr>
  //         <tr>
  //           <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Days</td>
  //           <td style="padding:10px;border:1px solid #ddd;">${leave.days}</td>
  //         </tr>
  //         <tr>
  //           <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Reason</td>
  //           <td style="padding:10px;border:1px solid #ddd;">${leave.reason}</td>
  //         </tr>
  //       </table>

  //       ${
  //         approved
  //           ? `
  //       <p style="margin:24px 0 16px;">
  //         Your leave has been approved. Please ensure your responsibilities are appropriately managed before your leave begins.
  //       </p>`
  //           : `
  //       <p style="margin:24px 0 16px;">
  //         Unfortunately, your leave request could not be approved at this time. If you have any questions, please contact your tahfeez masool.
  //       </p>`
  //       }

  //       <a
  //         href="https://www.tahfeezdohad.org/leave"
  //         target="_blank"
  //         style="
  //           display:inline-block;
  //           background:${approved ? "#16a34a" : "#dc2626"};
  //           color:#fff;
  //           text-decoration:none;
  //           padding:12px 20px;
  //           border-radius:6px;
  //           font-weight:bold;
  //         "
  //       >
  //         View Leave Status
  //       </a>

  //       <p style="margin:24px 0 0;">
  //         Regards,<br>
  //         <strong>Leave Management System</strong>
  //       </p>
  //     </div>

  //   </div>
  // </body>
  // </html>`,
  //   });

  return res.status(200).json({ ok: true });
});
