import ExcelJS from "exceljs";
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile("Data_Barang_19.xlsx");
const ws = wb.worksheets[0];
const row = ws.getRow(1);
const h = [];
row.eachCell((c) => h.push(c.value));
console.log(h);
