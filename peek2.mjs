import ExcelJS from "exceljs";
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile("Data_Barang_19.xlsx");
const ws = wb.worksheets[0];
for (let r = 2; r <= Math.min(ws.rowCount, 1000); r++) {
  const row = ws.getRow(r);
  const name = row.getCell(2).value;
  const spec = row.getCell(4).value;
  const jumlah = row.getCell(5).value;
  if (String(jumlah).toLowerCase().includes("roll") || String(name).toLowerCase().includes("kabel")) {
    console.log(`Row ${r}: Name: ${name}, Spec: ${spec}, Jumlah: ${jumlah}`);
  }
}
