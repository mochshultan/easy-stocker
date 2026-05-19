import type { StockItem } from "../../shared/stock";

export const inventorySortKeys = ["name", "sku", "category", "location", "quantity", "status", "updatedAt"] as const;
export type InventorySortKey = (typeof inventorySortKeys)[number];
export type SortDirection = "asc" | "desc";

const statusRank: Record<StockItem["status"], number> = {
  OUT: 0,
  LOW: 1,
  OK: 2
};

export function sortInventoryItems(
  items: StockItem[],
  key: InventorySortKey,
  direction: SortDirection
): StockItem[] {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    const compared = compareByKey(left, right, key);
    if (compared !== 0) {
      return compared * multiplier;
    }

    return left.name.localeCompare(right.name, undefined, { sensitivity: "base", numeric: true });
  });
}

function compareByKey(left: StockItem, right: StockItem, key: InventorySortKey) {
  if (key === "quantity") {
    return left.quantity - right.quantity;
  }

  if (key === "status") {
    return statusRank[left.status] - statusRank[right.status];
  }

  return String(left[key] ?? "").localeCompare(String(right[key] ?? ""), undefined, {
    sensitivity: "base",
    numeric: true
  });
}
