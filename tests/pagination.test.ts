import { describe, expect, it } from "vitest";
import { paginateItems } from "../src/lib/pagination";

describe("pagination", () => {
  it("returns the requested page slice and item range", () => {
    const result = paginateItems([1, 2, 3, 4, 5], 2, 2);

    expect(result.items).toEqual([3, 4]);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.startItem).toBe(3);
    expect(result.endItem).toBe(4);
  });

  it("clamps out-of-range pages", () => {
    expect(paginateItems([1, 2, 3], 99, 2).page).toBe(2);
    expect(paginateItems([1, 2, 3], -1, 2).page).toBe(1);
  });
});
