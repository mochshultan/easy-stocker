import { describe, expect, it } from "vitest";
import type { StockItem } from "../shared/stock";
import { buildInventorySuggestions } from "../src/lib/suggestions";

describe("inventory suggestions", () => {
  it("deduplicates and sorts reusable item values", () => {
    const suggestions = buildInventorySuggestions([
      makeItem("2", "Valve", "CKD", "Rack B", "pcs"),
      makeItem("1", "Bearing", "Omron", "Rack A", "set"),
      makeItem("3", "Valve", "CKD", "Rack B", "pcs")
    ]);

    expect(suggestions.names).toEqual(["Bearing", "Valve"]);
    expect(suggestions.categories).toEqual(["CKD", "Omron"]);
    expect(suggestions.locations).toEqual(["Rack A", "Rack B"]);
    expect(suggestions.units).toEqual(["pcs", "set"]);
  });
});

function makeItem(id: string, name: string, category: string, location: string, unit: string): StockItem {
  return {
    id,
    sku: `SKU-${id}`,
    name,
    category,
    location,
    unit,
    quantity: 1,
    minQuantity: 0,
    status: "OK",
    imagePath: null,
    notes: null,
    createdAt: "2026-05-19T00:00:00.000Z",
    updatedAt: "2026-05-19T00:00:00.000Z"
  };
}
