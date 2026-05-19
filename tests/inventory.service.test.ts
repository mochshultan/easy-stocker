// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInventoryService, InventoryError } from "../server/services/inventoryService";
import { createStockDatabase, type StockDatabase } from "../server/storage/database";

let tempRoot = "";
let context: StockDatabase;
let service: ReturnType<typeof createInventoryService>;

beforeEach(() => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kaizen-stock-"));
  context = createStockDatabase({ storageRoot: tempRoot });
  service = createInventoryService(context);
});

afterEach(() => {
  context.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe("inventory service", () => {
  it("records add and take movements without allowing negative stock", () => {
    const { item } = service.upsertItem({
      sku: "PUMP-SEAL-01",
      name: "Pump seal",
      category: "Mechanical",
      location: "Line A",
      unit: "pcs",
      quantity: 5,
      minQuantity: 2,
      imagePath: null,
      notes: null
    });

    expect(item.status).toBe("OK");

    const added = service.recordMovement(item.id, {
      type: "ADD",
      quantity: 3,
      reason: "Receiving",
      actor: "QA"
    });
    expect(added.item.quantity).toBe(8);

    const taken = service.recordMovement(item.id, {
      type: "TAKE",
      quantity: 6,
      reason: "Issued to maintenance",
      actor: "Operator"
    });
    expect(taken.item.quantity).toBe(2);
    expect(taken.item.status).toBe("LOW");

    expect(() =>
      service.recordMovement(item.id, {
        type: "TAKE",
        quantity: 99,
        reason: "Invalid issue",
        actor: "Operator"
      })
    ).toThrow(InventoryError);

    expect(service.listMovements(item.id)).toHaveLength(2);
  });

  it("imports rows as upserts and exports normalized CSV", () => {
    const summary = service.importRecords("stock.csv", "stock.csv", [
      {
        sku: "CUTTER-01",
        name: "Cutting blade",
        category: "Tooling",
        location: "Rack 2",
        unit: "pcs",
        quantity: 0,
        minQuantity: 4
      },
      {
        sku: "CUTTER-01",
        name: "Cutting blade A",
        category: "Tooling",
        location: "Rack 2",
        unit: "pcs",
        quantity: 12,
        minQuantity: 4
      }
    ]);

    expect(summary.created).toBe(1);
    expect(summary.updated).toBe(1);
    expect(summary.errors).toEqual([]);

    const item = service.getItemBySku("CUTTER-01");
    expect(item?.name).toBe("Cutting blade A");
    expect(item?.status).toBe("OK");

    const csv = service.exportCsv();
    expect(csv).toContain("sku,name,category,location,unit,quantity,minQuantity,status");
    expect(csv).toContain("CUTTER-01");
  });
});
