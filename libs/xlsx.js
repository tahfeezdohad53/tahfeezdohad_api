export async function sendExcel({res,filename,workbook}){
     try{
      res.setHeader(
       "Content-Type",
       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
     );

     res.setHeader(`Content-Disposition", "attachment; filename=${filename}`);

     await workbook.xlsx.write(res);

     res.end();
     }catch(err){
      console.log(err);
     }
}