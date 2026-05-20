import ExcelJS from "exceljs";
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile("Data_Barang_19.xlsx");
const ws = wb.worksheets[0];
for (let r = 2; r <= Math.min(ws.rowCount, 1000); r++) {
  const row = ws.getRow(r);
  const name = row.getCell(2).value;
  const jumlah = String(row.getCell(5).value).trim().toLowerCase();
  if (jumlah && isNaN(Number(jumlah.replace(/,/g, ".")))) {
    console.log(`Row ${r}: Name: ${name}, Jumlah: ${jumlah}`);
  }
}
