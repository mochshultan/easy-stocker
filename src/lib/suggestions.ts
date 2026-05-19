import type { StockItem } from "../../shared/stock";

export type InventorySuggestions = {
  names: string[];
  categories: string[];
  locations: string[];
  units: string[];
  notes: string[];
};

export function buildInventorySuggestions(items: StockItem[], limit = 80): InventorySuggestions {
  return {
    names: uniqueSorted(items.map((item) => item.name), limit),
    categories: uniqueSorted(items.map((item) => item.category), limit),
    locations: uniqueSorted(items.map((item) => item.location), limit),
    units: uniqueSorted(items.map((item) => item.unit), limit),
    notes: uniqueSorted(items.map((item) => item.notes ?? ""), Math.min(limit, 30))
  };
}

function uniqueSorted(values: string[], limit: number) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base", numeric: true }))
    .slice(0, limit);
}
