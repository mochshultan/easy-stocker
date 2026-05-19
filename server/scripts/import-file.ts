import path from "node:path";
import { parseStockFile } from "../services/importService.js";
import { createInventoryService } from "../services/inventoryService.js";
import { createStockDatabase } from "../storage/database.js";

const input = process.argv[2] ?? "Data_Barang_19.xlsx";
const filePath = path.resolve(process.cwd(), input);
const context = createStockDatabase();
const service = createInventoryService(context);

try {
  const records = await parseStockFile(filePath, path.basename(filePath));
  const summary = service.importRecords(path.basename(filePath), filePath, records);
  console.log(JSON.stringify(summary, null, 2));
} finally {
  context.close();
}
