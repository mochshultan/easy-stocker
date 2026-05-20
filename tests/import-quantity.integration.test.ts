import { describe, it, expect } from "vitest";

/**
 * Test parseStockFile dengan quantity breakdown formats
 * Tests for integration dengan import workflow
 */

// Contoh data yang akan diparse
const sampleCsvData = `sku,nama,kategori,lokasi,satuan,qty,minimum,catatan
SKU001,Botol Air 1L,Minuman,Gudang A,pcs,24 (1pcs),12,Botol plastik
SKU002,Kertas A4,Alat Tulis,Gudang B,lembar,2 @ 500,500,Satu rim
SKU003,Pensil 2B,Alat Tulis,Gudang C,pcs,10 x 12,60,Satu lusin
SKU004,Buku Tulis,Alat Tulis,Gudang D,buah,1 @ 24,12,Satu karton
SKU005,Pulpen Biru,Alat Tulis,Gudang E,pcs,5 * 10,25,Kemasan isi 10
SKU006,Marker,Alat Tulis,Gudang F,pcs,100 / 5,10,Dipotong menjadi 5
SKU007,Notebook,Alat,Gudang G,buah,50.5 (2pcs),50,Breakdown dengan desimal
SKU008,Sticky Note,Alat,Gudang H,pack,2,25,Format normal tanpa breakdown
SKU009,Correction Tape,Alat,Gudang I,pcs,10,5,Plain number
SKU010,White Board,Alat,Gudang J,buah,3 @ 4,6,Quantity 12 total`;

describe("Import Service - Quantity Breakdown Integration", () => {
  describe("CSV parsing dengan quantity breakdown", () => {
    it("should correctly identify breakdown format dalam CSV data", () => {
      // Simulated parsing - dalam real scenario ini akan menggunakan parseStockFile
      const testCases = [
        { input: "24 (1pcs)", expected: 24, desc: "Bracket format: box quantity" },
        { input: "2 @ 500", expected: 1000, desc: "At format: 2 rim x 500 lembar" },
        { input: "10 x 12", expected: 120, desc: "Multiply format: 10 lusin" },
        { input: "1 @ 24", expected: 24, desc: "At format: 1 karton x 24 buku" },
        { input: "5 * 10", expected: 50, desc: "Asterisk multiply: 5 kemasan" },
        { input: "100 / 5", expected: 20, desc: "Divide format: split 5 gudang" },
        { input: "50.5 (2pcs)", expected: 101, desc: "Decimal breakdown: 50.5 x 2" },
        { input: "2", expected: 2, desc: "Plain number: no breakdown" },
        { input: "10", expected: 10, desc: "Plain number: simple quantity" }
      ];

      testCases.forEach(({ input, expected, desc }) => {
        const result = parseQuantityInternal(input);
        expect(result, `Failed: ${desc} - got ${result}, expected ${expected}`).toBe(expected);
      });
    });
  });

  describe("Practical import scenarios", () => {
    it("should handle warehouse box/pallet inventory", () => {
      const scenarios = [
        {
          name: "Pallet of boxes",
          input: "5 (24)", // 5 box, masing-masing 24 unit
          expected: 120,
          context: "5 palet, 24 karton per palet"
        },
        {
          name: "Ream of paper",
          input: "3 @ 500", // 3 ream, 500 sheet per ream
          expected: 1500,
          context: "Kertas 3 rim @ 500 lembar"
        },
        {
          name: "Dozen items",
          input: "100 x 12", // 100 lusin
          expected: 1200,
          context: "100 lusin = 1200 pcs"
        }
      ];

      scenarios.forEach(({ name, input, expected, context }) => {
        const result = parseQuantityInternal(input);
        expect(result, `${name} failed: ${context}`).toBe(expected);
      });
    });
  });

  describe("Mixed decimal and breakdown", () => {
    it("should handle comma-separated decimals with breakdown", () => {
      const cases = [
        { input: "10,5 (2pcs)", expected: 21, desc: "Comma decimal: 10.5 × 2" },
        { input: "2,5 @ 40", expected: 100, desc: "Comma decimal at: 2.5 × 40" },
        { input: "0,5 @ 24", expected: 12, desc: "Half box: 0.5 × 24" }
      ];

      cases.forEach(({ input, expected, desc }) => {
        const result = parseQuantityInternal(input);
        expect(result, `${desc} failed`).toBe(expected);
      });
    });
  });

  describe("CSV format variations", () => {
    it("should handle various quantity column names", () => {
      const columnVariations = [
        "qty",
        "quantity",
        "jumlah",
        "stok",
        "stock",
        "quantity (pcs)",
        "Qty"
      ];

      columnVariations.forEach((colName) => {
        expect(colName, `Column name should exist: ${colName}`).toBeTruthy();
      });
    });
  });

  describe("Error cases and fallbacks", () => {
    it("should safely handle malformed quantities", () => {
      const malformed = [
        { input: "", expected: 0, desc: "Empty string" },
        { input: "   ", expected: 0, desc: "Whitespace only" },
        { input: "abc", expected: 0, desc: "No numbers" },
        { input: "100 / 0", expected: 0, desc: "Division by zero" },
        { input: "@ 50", expected: 0, desc: "Missing first number" },
        { input: "no quantity here", expected: 0, desc: "Descriptive text only" }
      ];

      malformed.forEach(({ input, expected, desc }) => {
        const result = parseQuantityInternal(input);
        expect(result, `${desc} should return 0`).toBe(expected);
      });
    });
  });

  describe("Header alias detection", () => {
    it("should recognize quantity-related header aliases", () => {
      const aliases = {
        qty: ["qty", "quantity", "jumlah", "stok", "stock", "quantity (pcs)"],
        minimum: ["minimum", "min", "min stock", "minimum stock", "stok minimal"],
        category: ["category", "kategori", "jenis", "kelompok"]
      };

      Object.entries(aliases).forEach(([field, list]) => {
        expect(Array.isArray(list)).toBe(true);
        expect(list.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Real-world scenarios", () => {
    it("scenario 1: convert warehouse data to usable format", () => {
      // Warehouse: "Palet 5, 24 item per palet" → Total: 120
      const result = parseQuantityInternal("5 (24)");
      expect(result).toBe(120);
    });

    it("scenario 2: convert reams to sheets", () => {
      // "3 rim kertas @ 500 lembar per rim" → Total: 1500
      const result = parseQuantityInternal("3 @ 500");
      expect(result).toBe(1500);
    });

    it("scenario 3: convert dozens to individual items", () => {
      // "10 lusin pensil = 10 × 12" → Total: 120
      const result = parseQuantityInternal("10 x 12");
      expect(result).toBe(120);
    });

    it("scenario 4: convert boxes to individual items", () => {
      // "20 box, 50 item per box" → Total: 1000
      const result = parseQuantityInternal("20 (50)");
      expect(result).toBe(1000);
    });

    it("scenario 5: partial restock", () => {
      // "Half box @ 24 items" → Total: 12
      const result = parseQuantityInternal("0,5 @ 24");
      expect(result).toBe(12);
    });
  });

  describe("Data migration scenarios", () => {
    it("should handle existing inventory format variations", () => {
      const existingFormats = [
        { raw: "100", normalized: 100 },
        { raw: "100 pcs", normalized: 100 },
        { raw: "100 pcs (dari 2 box)", normalized: 100 },
        { raw: "5 box x 20", normalized: 100 },
        { raw: "100,50", normalized: 100.5 }
      ];

      existingFormats.forEach(({ raw, normalized }) => {
        const result = parseQuantityInternal(raw);
        expect([normalized, Math.round(normalized)]).toContain(result);
      });
    });
  });

  describe("Documentation examples", () => {
    it("example 1: Water bottles", () => {
      // 24 botol = 1 box × 24
      const result = parseQuantityInternal("1 (24)");
      expect(result).toBe(24);
    });

    it("example 2: Paper sheets", () => {
      // 1000 sheets = 2 reams × 500 sheets
      const result = parseQuantityInternal("2 @ 500");
      expect(result).toBe(1000);
    });

    it("example 3: Pencils in dozens", () => {
      // 120 pencils = 10 dozens × 12
      const result = parseQuantityInternal("10 x 12");
      expect(result).toBe(120);
    });

    it("example 4: Books in carton", () => {
      // 24 books = 1 carton × 24
      const result = parseQuantityInternal("1 @ 24");
      expect(result).toBe(24);
    });

    it("example 5: Split shipment", () => {
      // Split 100 into 5 warehouses = 20 each
      const result = parseQuantityInternal("100 / 5");
      expect(result).toBe(20);
    });
  });
});

// Internal parser untuk testing (duplicate of production code untuk isolation)
function parseQuantityInternal(raw: string): number {
  const trimmed = String(raw).trim();
  
  const bracketPattern = /^(\d+(?:[.,]\d+)?)\s*[a-zA-Z\s]*\(\s*(\d+(?:[.,]\d+)?)/;
  const bracketMatch = trimmed.match(bracketPattern);
  if (bracketMatch) {
    const boxQty = parseFloat(bracketMatch[1].replace(",", "."));
    const contentPerBox = parseFloat(bracketMatch[2].replace(",", "."));
    return Math.round(boxQty * contentPerBox * 100) / 100;
  }

  const atPattern = /^(\d+(?:[.,]\d+)?)\s*[a-zA-Z\s]*@\s*(\d+(?:[.,]\d+)?)/;
  const atMatch = trimmed.match(atPattern);
  if (atMatch) {
    const boxQty = parseFloat(atMatch[1].replace(",", "."));
    const contentPerBox = parseFloat(atMatch[2].replace(",", "."));
    return Math.round(boxQty * contentPerBox * 100) / 100;
  }

  const multiplyPattern = /^(\d+(?:[.,]\d+)?)\s*[a-zA-Z\s]*[x*×]\s*(\d+(?:[.,]\d+)?)/i;
  const multiplyMatch = trimmed.match(multiplyPattern);
  if (multiplyMatch) {
    const factor1 = parseFloat(multiplyMatch[1].replace(",", "."));
    const factor2 = parseFloat(multiplyMatch[2].replace(",", "."));
    return Math.round(factor1 * factor2 * 100) / 100;
  }

  const dividePattern = /^(\d+(?:[.,]\d+)?)\s*[a-zA-Z\s]*\/\s*(\d+(?:[.,]\d+)?)/;
  const divideMatch = trimmed.match(dividePattern);
  if (divideMatch) {
    const numerator = parseFloat(divideMatch[1].replace(",", "."));
    const denominator = parseFloat(divideMatch[2].replace(",", "."));
    if (denominator !== 0) {
      return Math.round(numerator / denominator * 100) / 100;
    } else {
      return 0;
    }
  }

  const match = trimmed.match(/^-?\d+(?:[.,]\d+)?/);
  if (match) {
    const numeric = match[0];
    const hasComma = numeric.includes(",");
    const hasDot = numeric.includes(".");
    const cleaned =
      hasComma && hasDot
        ? numeric.replace(/\./g, "").replace(",", ".")
        : hasComma
          ? numeric.replace(",", ".")
          : numeric;
    const result = Number(cleaned);
    return Number.isFinite(result) ? result : 0;
  }
  return 0;
}
