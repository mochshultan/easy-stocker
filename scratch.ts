import { createStockDatabase } from './server/storage/database.js';
import { createInventoryService } from './server/services/inventoryService.js';

async function run() {
  const context = createStockDatabase();
  const service = createInventoryService(context);
  try {
    const buf = await service.exportXlsx();
    console.log('SUCCESS, buffer size:', buf.length);
  } catch(e) {
    console.error('ERROR:', e);
  } finally {
    context.close();
  }
}

run();
