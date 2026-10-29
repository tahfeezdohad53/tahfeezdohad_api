import catchAsync from "../utils/catchAsync.js";
import Report from "../models/report.js";
import User from "../models/user.js";


import ExcelJs from "exceljs";
import { format } from "date-fns";
import { formatName } from "./leave.js";
import resend from "../libs/resend.js";

export const handleCreateReport = catchAsync(async (req, res) => {
    const {id,name} = req.user;
    const {student:studentId,juz,page,tambeeh,talqeen,questions,from,to,makharij,remarks,classMode,classType} = req.body;

    const totalTalqeen = Math.round(Number(tambeeh) / 2) + Number(talqeen);
    console.log('total talqeen: ',totalTalqeen);
    const hifzMarks = ((3 * Number(questions) + 2) - totalTalqeen) + 35;
    console.log('Student: ',studentId);
    console.log('hifz marks: ',hifzMarks);
    let hifzGrade;
     if (hifzMarks > 59) hifzGrade = "A+";
     else if (hifzMarks > 54) hifzGrade = "A";
     else if (hifzMarks > 49) hifzGrade = "B+";
     else if (hifzMarks > 39) hifzGrade = "B";
     else if (hifzMarks > 34) hifzGrade = "C";
     else hifzGrade = "D";
    console.log("hifz grade: ", hifzGrade);

    const noOfMakharij = makharij.trim().split(' ').length;

    let makharijGrade;
    if(noOfMakharij <= 1) makharijGrade = "A+";
    if(noOfMakharij === 2) makharijGrade = "B+";
    if(noOfMakharij === 3) makharijGrade = "B";
    if(noOfMakharij > 3) makharijGrade = "D";

    await Report.create({ ...req.body, teacher: id, makharijGrade, hifzGrade,questions,hifzMarks });
    if (remarks) {
      const student = await User.findById(studentId);
      const date = format(new Date(), "dd MMM, yyyy");
      const studentName = formatName(student.name);
      const teacherName = formatName(name);
      if (student.contactEmail)
        try {
          await resend.emails.send({
            from: "Tahfeez Dohad <noreply@tahfeezdohad.org>",
            to: student.contactEmail,
            // to: ["huzefaratlam63@gmail.com"],
            subject: `Ikhtebaar Report for ${studentName} – ${date}`,
            html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ikhtebaar Result</title>
</head>

<body style="margin:0; padding:0; background-color:#f7f5f2; font-family:Arial, Helvetica, sans-serif; color:#2f2a26;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
    style="background-color:#f7f5f2; margin:0; padding:18px 10px;">

    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="max-width:580px; background-color:#ffffff; border-radius:9px; overflow:hidden; border:1px solid #e6e0d9;">

          <!-- Header -->
          <tr>
            <td style="background-color:#795548; padding:18px 20px; text-align:center;">

              <h1 style="margin:0; color:#ffffff; font-size:20px; line-height:26px; font-weight:700;">
                Ikhtebaar Result
              </h1>

              <p style="margin:4px 0 0; color:#eee5df; font-size:12px; line-height:18px;">
                Hifz Assessment
              </p>

            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:18px 20px 10px;">

              <p style="margin:0 0 7px; font-size:13px; line-height:20px;">
                Salam e Jameel,
              </p>

              <p style="margin:0; font-size:13px; line-height:20px; color:#5f5852;">
                The Ikhtebaar for the following student has been completed.
                Please find the assessment details below.
              </p>

            </td>
          </tr>

          <!-- Ikhtebaar Details -->
          <tr>
            <td style="padding:8px 20px 5px;">

              <h2 style="margin:0 0 9px; font-size:15px; line-height:20px; color:#795548;">
                Ikhtebaar Details
              </h2>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="border-collapse:collapse; border:1px solid #e6e0d9;">

                <tr>
                  <td style="padding:9px 11px; background:#faf8f6; width:42%; font-size:12px; font-weight:600;">
                    Date
                  </td>

                  <td style="padding:9px 11px; font-size:12px;">
                    ${date}
                  </td>
                </tr>

                <tr>
                  <td style="padding:9px 11px; background:#faf8f6; font-size:12px; font-weight:600;">
                    Juz
                  </td>

                  <td style="padding:9px 11px; font-size:12px;">
                    ${from + " - " + to}
                  </td>
                </tr>

                <tr>
                  <td style="padding:9px 11px; background:#faf8f6; font-size:12px; font-weight:600;">
                    Student Name
                  </td>

                  <td style="padding:9px 11px; font-size:12px;">
                    ${studentName}
                  </td>
                </tr>

                <tr>
                  <td style="padding:9px 11px; background:#faf8f6; font-size:12px; font-weight:600;">
                    Mukhtabir Name
                  </td>

                  <td style="padding:9px 11px; font-size:12px;">
                    ${teacherName}
                  </td>
                </tr>

              </table>

            </td>
          </tr>

          <!-- Result -->
          <tr>
            <td style="padding:15px 20px 5px;">

              <h2 style="margin:0 0 9px; font-size:15px; line-height:20px; color:#795548;">
                Result
              </h2>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="border-collapse:collapse; border:1px solid #e6e0d9;">

                <tr>
                  <td style="padding:9px 11px; background:#faf8f6; width:42%; font-size:12px; font-weight:600;">
                    Hifz Grade
                  </td>

                  <td style="padding:9px 11px; font-size:12px; font-weight:700; color:#795548;">
                    ${hifzGrade}
                  </td>
                </tr>

                <tr>
                  <td style="padding:9px 11px; background:#faf8f6; font-size:12px; font-weight:600;">
                    Makharij Grade
                  </td>

                  <td style="padding:9px 11px; font-size:12px; font-weight:700; color:#795548;">
                    ${makharijGrade}
                  </td>
                </tr>

                <tr>
                  <td style="padding:9px 11px; background:#faf8f6; font-size:12px; font-weight:600;">
                    Makharij
                  </td>

                  <td style="padding:9px 11px; font-size:12px; line-height:18px;">
                    ${makharij}
                  </td>
                </tr>

              </table>

            </td>
          </tr>

          <!-- Remarks -->
          <tr>
            <td style="padding:15px 20px 18px;">

              <h2 style="margin:0 0 9px; font-size:15px; line-height:20px; color:#795548;">
                Remarks
              </h2>

              <div style="padding:11px 12px; background:#faf8f6; border:1px solid #e6e0d9; font-size:12px; line-height:18px; color:#5f5852;">
                ${remarks}
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:11px 20px; background:#faf8f6; border-top:1px solid #e6e0d9; text-align:center;">

              <p style="margin:0; font-size:11px; line-height:17px; color:#756c65;">
                JazakAllahu Khairan.
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
        } catch (err) {
          console.log(err);
          console.log("failed to send reports email");
        }
    }
    res.status(201).json({ok:true});
});

export const handleGetReports = catchAsync(async (req, res) => {
    const {id} = req.user;
    const {student,startDate,endDate} = req.query;
    const query = {};
    if(student) query.student = student;
    const refactoredStartDate = new Date(startDate);
    refactoredStartDate.setHours(0,0,0,0);
    if(startDate){
      query.createdAt = {$gte:refactoredStartDate};
    } 
    if(startDate && endDate){
      const refactoredEndDate = new Date(endDate);
      refactoredEndDate.setHours(23,59,59,999);
      query.$and = [
        {createdAt: {$gte:refactoredStartDate}},
        {createdAt: {$lte:refactoredEndDate}},
      ]
    } 
    let reports;

    if(!student && !startDate && !endDate) reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .populate("teacher student")
      .limit(50)
      .lean();
    else reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .populate("teacher student")
      .lean();
    
    res.status(200).json({ok:true, reports});
});

export const handleGenerateReportsExcel = catchAsync(async (req, res) => {
    const {id} = req.user;
    const {student,startDate,endDate} = req.query;
    const query = {};
    if(student) query.student = student;
    const refactoredStartDate = new Date(startDate);
    refactoredStartDate.setHours(0,0,0,0);
    if(startDate){
      query.createdAt = {$gte:refactoredStartDate};
    } 
    if(startDate && endDate){
      const refactoredEndDate = new Date(endDate);
      refactoredEndDate.setHours(23,59,59,999);
      query.$and = [
        {createdAt: {$gte:refactoredStartDate}},
        {createdAt: {$lte:refactoredEndDate}},
      ]
    } 
    const reports = (await Report.find(query).sort({createdAt:-1}).populate('teacher student').lean());

    const workbook = new ExcelJs.Workbook();

    const worksheet = workbook.addWorksheet('reports');

    worksheet.columns = [
      {
        header:'Student_ITS',
        key:'studentITS',
        width:18,
      },
      {
        header:'Student_Name',
        key:'studentName',
        width:50,
      },
      {
        header:'Mukhtabir_Name',
        key:'teacherName',
        width:55,
      },
      {
        header:'Currently_At',
        key:'currentlyAt',
        width:18,
      },
      {
        header:'From-To-Juz',
        key:'juz',
        width:18,
      },
      {
        header:'Questions',
        key:'questions',
      },
      {
        header:'Tambeeh',
        key:'tambeeh',
      },
      {
        header:'Talqeen',
        key:'talqeen',
      },
      {
        header:'Hifz_Marks',
        key:'hifzMarks',
        width:18,
      },
      {
        header:'Hifz_Grade',
        key:'hifzGrade',
        width:18,
      },
      {
        header:'Makharij_Grade',
        key:'makharijGrade',
        width:18,
      },
      {
        header:'Makharij',
        key:'makharij',
        width:30,
      },
      {
        header:'Remarks',
        key:'remarks',
        width:60
      },
    ]

    worksheet.getColumn(1).font = {
      bold:true,
    }
    worksheet.getColumn(1).alignment = {
      horizontal:'left'
    }
    worksheet.getColumn(6).alignment = {
      horizontal:'left'
    }
    worksheet.getColumn(7).alignment = {
      horizontal:'left'
    }
    worksheet.getColumn(8).alignment = {
      horizontal:'left'
    }
    worksheet.getColumn(9).alignment = {
      horizontal:'left'
    }
    worksheet.getRow(1).font = {
      bold:true,
    }

    reports.forEach(el => {
      worksheet.addRow({
        studentITS: el.student.its,
        studentName: formatName(el.student.name),
        teacherName: formatName(el.teacher.name),
        currentlyAt: `juz ${el.juz} page ${el.page}`,
        juz: `${el.from}-${el.to}`,
        questions: el.questions,
        tambeeh: el.tambeeh,
        talqeen: el.talqeen,
        hifzMarks: el.hifzMarks,
        hifzGrade: el.hifzGrade,
        makharijGrade: el.makharijGrade,
        makharij: el.makharij,
        remarks: el.remarks,
      });
    })

     res.setHeader(
       "Content-Type",
       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
     );

     res.setHeader(
       "Content-Disposition",
       "attachment; filename=reports.xlsx",
     );

     await workbook.xlsx.write(res);

     // Send your file buffer here
     res.end();
    
});

