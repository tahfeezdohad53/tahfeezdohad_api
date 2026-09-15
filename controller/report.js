import catchAsync from "../utils/catchAsync.js";
import Report from "../models/report.js";
import User from "../models/user.js";


import ExcelJs from "exceljs";
import { format } from "date-fns";
import { formatName } from "./leave.js";
import resend from "../libs/resend.js";

export const handleCreateReport = catchAsync(async (req, res) => {
    const {id} = req.user;
    const {studentId,juz,page,tambeeh,talqeen,questions,from,to,makharij,remarks,classMode,classType} = req.body;

    const totalTalqeen = Math.round(Number(tambeeh) / 2) + Number(talqeen);
    console.log('total talqeen: ',totalTalqeen);
    const hifzMarks = ((3 * Number(questions) + 2) - totalTalqeen) + 35;
    console.log('hifz marks: ',hifzMarks);
    let hifzGrade;
    if (hifzMarks > 85) hifzGrade = "A+";
    if (hifzMarks > 75 && hifzMarks <= 85) hifzGrade = "A";
    if (hifzMarks > 65 && hifzMarks <= 75) hifzGrade = "B+";
    if (hifzMarks > 60 && hifzMarks <= 65) hifzGrade = "B";

    const noOfMakharij = makharij.trim().split(' ').length;

    let makharijGrade;
    if(noOfMakharij <= 1) makharijGrade = "A+";
    if(noOfMakharij === 2) makharijGrade = "B+";
    if(noOfMakharij === 3) makharijGrade = "B";
    if(noOfMakharij > 3) makharijGrade = "D";

    await Report.create({...req.body,teacher:id,makharijGrade,hifzGrade});
    res.status(201).json({ok:true});
});

export const handleGetReports = catchAsync(async (req, res) => {
    const {id} = req.user;
    
    const reports = await Report.find().sort({createdAt:-1}).populate('teacher student').lean();

    res.status(200).json({ok:true, reports});
});

