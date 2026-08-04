import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.js";
import Leave from "../models/leave.js";
import resend from "../libs/resend.js";

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
    from: "Leave Management <noreply@tahfeezdohad.org>",
    to: [
      "murtazayudaipurwala@gmail.com",
      "adilaliasgar53@gmail.com",
      "huzefaratlam63@gmail.com",
    ], // or an array of emails
    subject: `Leave Request - ${name}`,
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
                <td style="padding:10px;border:1px solid #ddd;">${name}</td>
              </tr>
              <tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Role</td>
                <td style="padding:10px;border:1px solid #ddd;">${role}</td>
              </tr>
              ${batch && <tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Batch</td>
                <td style="padding:10px;border:1px solid #ddd;">${batch}</td>
              </tr>}
              <tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Leave Type</td>
                <td style="padding:10px;border:1px solid #ddd;">${type}</td>
              </tr>
              <tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">From</td>
                <td style="padding:10px;border:1px solid #ddd;">${from}</td>
              </tr>
              <tr>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">To</td>
                <td style="padding:10px;border:1px solid #ddd;">${to}</td>
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
              href="https://www.tahfeezdohad.org"
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
  await Leave.findByIdAndUpdate(leaveId, { status });

  return res.status(200).json({ ok: true });
});
