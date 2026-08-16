import excelJs from 'exceljs';

export function createExcel(sheetName="",columns=[],rows={},res){
    const workbook = new excelJs.Workbook();

    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns;

    worksheet.addRows(rows);

    worksheet.getRow(1).font = {
        bold:true,
    }

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    
      res.setHeader(`Content-Disposition", "attachment; filename=${sheetName}.xlsx`);
    
      await workbook.xlsx.write(res);

    res.end();
    
}