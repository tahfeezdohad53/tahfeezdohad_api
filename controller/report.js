import catchAsync from "../utils/catchAsync.js";
import Report from "../models/report.js";
import User from "../models/user.js";


import ExcelJs from "exceljs";
import { format } from "date-fns";
import { formatName } from "./leave.js";
import resend from "../libs/resend.js";

export const handleCreateReport = catchAsync(async (req, res) => {
    const {id} = req.user;
    const {studentId,juz,page,tambeeh,talqeen,questions,grade,ahkaam,makharij,remarks,classMode,classType} = req.body;
    await Report.create({...req.body,teacher:id});
    res.status(201).json({ok:true});
});