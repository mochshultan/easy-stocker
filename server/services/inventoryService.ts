import { stringify } from "csv-stringify/sync";
import {
  deriveStatus,
  type DashboardMetrics,
  type ImportSummary,
  type ItemStatus,
  type MovementType,
  type StockItem,
  type StockItemInput,
  type StockItemPatch,
  stockItemInputSchema,
  stockItemPatchSchema,
  type StockMovement,
  type StockMovementInput,
  stockMovementInputSchema
} from "../../shared/stock.js";
import type { StockDatabase } from "../storage/database.js";
import path from "node:path";

type ItemRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  location: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  image_path: string | null;
  notes: string | null;
  source_file: string | null;
  created_at: string;
  updated_at: string;
};

type MovementRow = {
  id: string;
  item_id: string;
  type: MovementType;
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  reason: string;
  actor: string;
  created_at: string;
};

export class InventoryError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export type ListItemsOptions = {
  search?: string;
  status?: ItemStatus | "ALL";
};

export type ImportRecord = Partial<StockItemInput> & {
  sku?: string;
  name?: string;
};

export function createInventoryService(context: StockDatabase) {
  const { db } = context;

  function now() {
    return new Date().toISOString();
  }

  function rowToItem(row: ItemRow): StockItem {
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      location: row.location,
      unit: row.unit,
      quantity: Number(row.quantity),
      minQuantity: Number(row.min_quantity),
      status: deriveStatus(Number(row.quantity), Number(row.min_quantity)),
      imagePath: row.image_path,
      notes: row.notes,
      sourceFile: row.source_file,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function rowToMovement(row: MovementRow): StockMovement {
    return {
      id: row.id,
      itemId: row.item_id,
      type: row.type,
      quantity: Number(row.quantity),
      beforeQuantity: Number(row.before_quantity),
      afterQuantity: Number(row.after_quantity),
      reason: row.reason,
      actor: row.actor,
      createdAt: row.created_at
    };
  }

  function listItems(options: ListItemsOptions = {}): StockItem[] {
    const search = options.search?.trim();
    const clauses: string[] = [];
    const params: Record<string, string> = {};

    if (search) {
      clauses.push(
        "(LOWER(sku) LIKE LOWER(@search) OR LOWER(name) LIKE LOWER(@search) OR LOWER(category) LIKE LOWER(@search) OR LOWER(location) LIKE LOWER(@search) OR LOWER(COALESCE(notes, '')) LIKE LOWER(@search))"
      );
      params.search = `%${search}%`;
    }

    const sql = `
      SELECT * FROM items
      ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
      ORDER BY updated_at DESC, name ASC
    `;

    const items = db.prepare(sql).all(params).map((row) => rowToItem(row as ItemRow));

    if (options.status && options.status !== "ALL") {
      return items.filter((item) => item.status === options.status);
    }

    return items;
  }

  function getItem(id: string): StockItem {
    const row = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as ItemRow | undefined;
    if (!row) {
      throw new InventoryError("Item was not found", 404);
    }

    return rowToItem(row);
  }

  function getItemBySku(sku: string): StockItem | null {
    const row = db.prepare("SELECT * FROM items WHERE sku = ?").get(sku) as ItemRow | undefined;
    return row ? rowToItem(row) : null;
  }

  function upsertItem(rawInput: StockItemInput, sourceFile?: string): { item: StockItem; created: boolean } {
    const input = stockItemInputSchema.parse(rawInput);
    const existing = getItemBySku(input.sku);
    const timestamp = now();

    if (existing) {
      db.prepare(`
        UPDATE items
        SET name = @name,
            category = @category,
            location = @location,
            unit = @unit,
            quantity = @quantity,
            min_quantity = @minQuantity,
            image_path = @imagePath,
            notes = @notes,
            source_file = COALESCE(@sourceFile, source_file),
            updated_at = @updatedAt
        WHERE id = @id
      `).run({
        id: existing.id,
        name: input.name,
        category: input.category,
        location: input.location,
        unit: input.unit,
        quantity: input.quantity,
        minQuantity: input.minQuantity,
        imagePath: input.imagePath ?? existing.imagePath,
        notes: input.notes ?? null,
        sourceFile: sourceFile ?? null,
        updatedAt: timestamp
      });

      return { item: getItem(existing.id), created: false };
    }

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO items (
        id, sku, name, category, location, unit, quantity, min_quantity,
        image_path, notes, source_file, created_at, updated_at
      )
      VALUES (
        @id, @sku, @name, @category, @location, @unit, @quantity, @minQuantity,
        @imagePath, @notes, @sourceFile, @createdAt, @updatedAt
      )
    `).run({
      id,
      sku: input.sku,
      name: input.name,
      category: input.category,
      location: input.location,
      unit: input.unit,
      quantity: input.quantity,
      minQuantity: input.minQuantity,
      imagePath: input.imagePath ?? null,
      notes: input.notes ?? null,
      sourceFile: sourceFile ?? null,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return { item: getItem(id), created: true };
  }

  function updateItem(id: string, rawPatch: StockItemPatch): StockItem {
    const current = getItem(id);
    const patch = stockItemPatchSchema.parse(rawPatch);
    const next = {
      ...current,
      ...patch,
      imagePath: patch.imagePath === undefined ? current.imagePath : patch.imagePath,
      notes: patch.notes === undefined ? current.notes : patch.notes
    };

    const duplicate = next.sku !== current.sku ? getItemBySku(next.sku) : null;
    if (duplicate) {
      throw new InventoryError("SKU is already used by another item", 409);
    }

    db.prepare(`
      UPDATE items
      SET sku = @sku,
          name = @name,
          category = @category,
          location = @location,
          unit = @unit,
          quantity = @quantity,
          min_quantity = @minQuantity,
          image_path = @imagePath,
          notes = @notes,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      sku: next.sku,
      name: next.name,
      category: next.category,
      location: next.location,
      unit: next.unit,
      quantity: next.quantity,
      minQuantity: next.minQuantity,
      imagePath: next.imagePath,
      notes: next.notes,
      updatedAt: now()
    });

    const updated = getItem(id);
    return updated;
  }

  function recordMovement(itemId: string, rawInput: StockMovementInput): {
    item: StockItem;
    movement: StockMovement;
  } {
    const input = stockMovementInputSchema.parse(rawInput);

    return db.transaction(() => {
      const item = getItem(itemId);
      const beforeQuantity = item.quantity;
      const afterQuantity = calculateNextQuantity(beforeQuantity, input.type, input.quantity);

      if (afterQuantity < 0) {
        throw new InventoryError("Stock cannot be taken below zero", 409, {
          available: beforeQuantity,
          requested: input.quantity
        });
      }

      const movementId = crypto.randomUUID();
      const timestamp = now();

      db.prepare(`
        UPDATE items
        SET quantity = @quantity, updated_at = @updatedAt
        WHERE id = @id
      `).run({
        id: itemId,
        quantity: afterQuantity,
        updatedAt: timestamp
      });

      db.prepare(`
        INSERT INTO movements (
          id, item_id, type, quantity, before_quantity, after_quantity,
          reason, actor, created_at
        )
        VALUES (
          @id, @itemId, @type, @quantity, @beforeQuantity, @afterQuantity,
          @reason, @actor, @createdAt
        )
      `).run({
        id: movementId,
        itemId,
        type: input.type,
        quantity: input.quantity,
        beforeQuantity,
        afterQuantity,
        reason: input.reason,
        actor: input.actor,
        createdAt: timestamp
      });

      const updatedItem = getItem(itemId);

      return {
        item: updatedItem,
        movement: getMovement(movementId)
      };
    })();
  }

  function calculateNextQuantity(current: number, type: MovementType, amount: number) {
    if (type === "ADD") {
      return current + amount;
    }

    if (type === "TAKE") {
      return current - amount;
    }

    return amount;
  }

  function getMovement(id: string): StockMovement {
    const row = db.prepare("SELECT * FROM movements WHERE id = ?").get(id) as MovementRow | undefined;
    if (!row) {
      throw new InventoryError("Movement was not found", 404);
    }

    return rowToMovement(row);
  }

  function listMovements(itemId?: string): StockMovement[] {
    const rows = itemId
      ? db.prepare("SELECT * FROM movements WHERE item_id = ? ORDER BY created_at DESC LIMIT 100").all(itemId)
      : db.prepare("SELECT * FROM movements ORDER BY created_at DESC LIMIT 100").all();

    return rows.map((row) => rowToMovement(row as MovementRow));
  }

  function attachImage(itemId: string, imagePath: string): StockItem {
    getItem(itemId);
    db.prepare(`
      UPDATE items
      SET image_path = @imagePath, updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id: itemId,
      imagePath,
      updatedAt: now()
    });

    return getItem(itemId);
  }

  function importRecords(
    fileName: string,
    storedPath: string,
    rows: ImportRecord[]
  ): ImportSummary {
    const importId = crypto.randomUUID();
    const errors: ImportSummary["errors"] = [];
    let created = 0;
    let updated = 0;

    const runImport = db.transaction(() => {
      rows.forEach((row, index) => {
        try {
          const parsed = stockItemInputSchema.parse({
            sku: row.sku,
            name: row.name,
            category: row.category ?? "Uncategorized",
            location: row.location ?? "Main Store",
            unit: row.unit ?? "pcs",
            quantity: row.quantity ?? 0,
            minQuantity: row.minQuantity ?? 0,
            imagePath: row.imagePath ?? null,
            notes: row.notes ?? null
          });
          const result = upsertItem(parsed, storedPath);
          if (result.created) {
            created += 1;
          } else {
            updated += 1;
          }
        } catch (error) {
          errors.push({
            row: index + 2,
            message: error instanceof Error ? error.message : "Import row failed"
          });
        }
      });

      db.prepare(`
        INSERT INTO imports (
          id, file_name, file_type, row_count, created_count,
          updated_count, error_count, stored_path, created_at
        )
        VALUES (
          @id, @fileName, @fileType, @rowCount, @createdCount,
          @updatedCount, @errorCount, @storedPath, @createdAt
        )
      `).run({
        id: importId,
        fileName,
        fileType: fileName.split(".").pop()?.toLowerCase() ?? "unknown",
        rowCount: rows.length,
        createdCount: created,
        updatedCount: updated,
        errorCount: errors.length,
        storedPath,
        createdAt: now()
      });
    });

    runImport();

    return {
      importId,
      fileName,
      rowCount: rows.length,
      created,
      updated,
      errors
    };
  }

  function exportCsv(): string {
    const records = listItems().map((item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      location: item.location,
      unit: item.unit,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      status: item.status,
      imagePath: item.imagePath ?? "",
      notes: item.notes ?? "",
      updatedAt: item.updatedAt
    }));

    return stringify(records, {
      header: true,
      columns: [
        "sku",
        "name",
        "category",
        "location",
        "unit",
        "quantity",
        "minQuantity",
        "status",
        "imagePath",
        "notes",
        "updatedAt"
      ]
    });
  }

  async function exportXlsx(): Promise<Buffer> {
    const rawItems = listItems();
    
    // Urutkan berdasarkan merk (category) lalu nama barang
    const items = rawItems.sort((a, b) => {
      const catA = a.category || "";
      const catB = b.category || "";
      if (catA.toLowerCase() !== catB.toLowerCase()) {
        return catA.localeCompare(catB);
      }
      return (a.name || "").localeCompare(b.name || "");
    });

    const ExcelJSModule = await import("exceljs");
    const ExcelJS = ExcelJSModule.default || ExcelJSModule;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Inventory");

    worksheet.columns = [
      { header: "SKU", key: "sku", width: 15 },
      { header: "Nama", key: "name", width: 30 },
      { header: "Kategori", key: "category", width: 20 },
      { header: "Lokasi", key: "location", width: 20 },
      { header: "Satuan", key: "unit", width: 10 },
      { header: "Jumlah", key: "quantity", width: 10 },
      { header: "Minimum", key: "minQuantity", width: 10 },
      { header: "Keterangan", key: "notes", width: 30 },
      { header: "Image", key: "image", width: 15 }
    ];

    items.forEach((item, index) => {
      let imageHyperlink = "";
      if (item.imagePath) {
        try {
          const decodedPath = decodeURIComponent(item.imagePath);
          const filename = decodedPath.split("/").pop() || "";
          if (decodedPath.startsWith("/uploads/images/")) {
            imageHyperlink = path.join(process.cwd(), "storage", "images", filename);
          } else if (decodedPath.startsWith("/source-images/")) {
            imageHyperlink = path.join(process.cwd(), "img", filename);
          }
        } catch (e) {
          // Ignore
        }
      }

      const row = worksheet.addRow({
        sku: item.sku,
        name: item.name,
        category: item.category,
        location: item.location,
        unit: item.unit,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        notes: item.notes || ""
      });

      if (imageHyperlink) {
        row.getCell("image").value = {
          text: String(index + 1),
          hyperlink: `file:///${imageHyperlink.split("\\").join("/")}`,
          tooltip: imageHyperlink
        };
        row.getCell("image").font = {
          color: { argb: "FF0563C1" },
          underline: true
        };
      }
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" }
    };

    worksheet.getColumn("quantity").numFmt = "0.00";
    worksheet.getColumn("minQuantity").numFmt = "0.00";

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as any);
  }

  function getMetrics(): DashboardMetrics {
    const items = listItems();
    return {
      totalItems: items.length,
      totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
      lowStockItems: items.filter((item) => item.status === "LOW").length,
      outOfStockItems: items.filter((item) => item.status === "OUT").length,
      recentMovements: listMovements().slice(0, 8)
    };
  }

  return {
    attachImage,
    exportCsv,
    exportXlsx,
    getItem,
    getItemBySku,
    getMetrics,
    importRecords,
    listItems,
    listMovements,
    recordMovement,
    updateItem,
    upsertItem
  };
}
