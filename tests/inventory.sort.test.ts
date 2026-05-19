import { describe, expect, it } from "vitest";
import { sortInventoryItems } from "../src/lib/inventorySort";
import type { StockItem } from "../shared/stock";

const items: StockItem[] = [
  makeItem("2", "Valve", 4, "OK"),
  makeItem("1", "Bearing", 12, "OK"),
  makeItem("3", "Cable", 0, "OUT")
];

describe("inventory sorting", () => {
  it("sorts names ascending and descending", () => {
    expect(sortInventoryItems(items, "name", "asc").map((item) => item.name)).toEqual(["Bearing", "Cable", "Valve"]);
    expect(sortInventoryItems(items, "name", "desc").map((item) => item.name)).toEqual(["Valve", "Cable", "Bearing"]);
  });

  it("sorts numeric quantity without string ordering", () => {
    expect(sortInventoryItems(items, "quantity", "asc").map((item) => item.quantity)).toEqual([0, 4, 12]);
    expect(sortInventoryItems(items, "quantity", "desc").map((item) => item.quantity)).toEqual([12, 4, 0]);
  });
});

function makeItem(id: string, name: string, quantity: number, status: StockItem["status"]): StockItem {
  return {
    id,
    sku: `SKU-${id}`,
    name,
    category: "General",
    location: "Rack",
    unit: "pcs",
    quantity,
    minQuantity: 1,
    status,
    imagePath: null,
    notes: null,
    createdAt: "2026-05-19T00:00:00.000Z",
    updatedAt: "2026-05-19T00:00:00.000Z"
  };
}
