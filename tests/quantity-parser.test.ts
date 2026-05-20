import { describe, it, expect } from "vitest";

/**
 * Parse quantity format dengan breakdown
 * Contoh:
 * - "10 (2pcs)" → 10 * 2 = 20
 * - "1 @ 2" → 1 * 2 = 2
 * - "10 x 2" → 10 * 2 = 20
 * - "10*2" → 10 * 2 = 20
 * - "100" → 100
 */
function parseQuantityFormat(raw: string): number {
  const trimmed = String(raw).trim();
  
  // Pattern 1: "10 (2pcs)" atau "10(2)" - box quantity * content per box
  const bracketPattern = /^(\d+(?:[.,]\d+)?)\s*[a-zA-Z\s]*\(\s*(\d+(?:[.,]\d+)?)/;
  const bracketMatch = trimmed.match(bracketPattern);
  if (bracketMatch) {
    const boxQty = parseFloat(bracketMatch[1].replace(",", "."));
    const contentPerBox = parseFloat(bracketMatch[2].replace(",", "."));
    return Math.round(boxQty * contentPerBox * 100) / 100;
  }

  // Pattern 2: "1 @ 2" atau "1@2" - box quantity @ content per box
  const atPattern = /^(\d+(?:[.,]\d+)?)\s*[a-zA-Z\s]*@\s*(\d+(?:[.,]\d+)?)/;
  const atMatch = trimmed.match(atPattern);
  if (atMatch) {
    const boxQty = parseFloat(atMatch[1].replace(",", "."));
    const contentPerBox = parseFloat(atMatch[2].replace(",", "."));
    return Math.round(boxQty * contentPerBox * 100) / 100;
  }

  // Pattern 3: "10 x 2" atau "10x2" atau "10*2" - multiply operator
  const multiplyPattern = /^(\d+(?:[.,]\d+)?)\s*[a-zA-Z\s]*[x*×]\s*(\d+(?:[.,]\d+)?)/i;
  const multiplyMatch = trimmed.match(multiplyPattern);
  if (multiplyMatch) {
    const factor1 = parseFloat(multiplyMatch[1].replace(",", "."));
    const factor2 = parseFloat(multiplyMatch[2].replace(",", "."));
    return Math.round(factor1 * factor2 * 100) / 100;
  }

  // Pattern 4: "10 / 2" - divide operator (jarang tapi bisa saja)
  const dividePattern = /^(\d+(?:[.,]\d+)?)\s*[a-zA-Z\s]*\/\s*(\d+(?:[.,]\d+)?)/;
  const divideMatch = trimmed.match(dividePattern);
  if (divideMatch) {
    const numerator = parseFloat(divideMatch[1].replace(",", "."));
    const denominator = parseFloat(divideMatch[2].replace(",", "."));
    if (denominator !== 0) {
      return Math.round(numerator / denominator * 100) / 100;
    } else {
      return 0; // Avoid division by zero
    }
  }

  // Fallback: ambil angka di awal string
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

describe("parseQuantityFormat", () => {
  describe("Bracket format: N (Mpcs)", () => {
    it("should parse '10 (2pcs)' as 10 * 2 = 20", () => {
      expect(parseQuantityFormat("10 (2pcs)")).toBe(20);
    });

    it("should parse '10(2)' as 10 * 2 = 20", () => {
      expect(parseQuantityFormat("10(2)")).toBe(20);
    });

    it("should parse '5 (3pcs)' as 5 * 3 = 15", () => {
      expect(parseQuantityFormat("5 (3pcs)")).toBe(15);
    });

    it("should parse '100 (10pcs)' as 100 * 10 = 1000", () => {
      expect(parseQuantityFormat("100 (10pcs)")).toBe(1000);
    });
  });

  describe("@ format: N @ M", () => {
    it("should parse '1 @ 2' as 1 * 2 = 2", () => {
      expect(parseQuantityFormat("1 @ 2")).toBe(2);
    });

    it("should parse '1@2' as 1 * 2 = 2", () => {
      expect(parseQuantityFormat("1@2")).toBe(2);
    });

    it("should parse '2 @ 5' as 2 * 5 = 10", () => {
      expect(parseQuantityFormat("2 @ 5")).toBe(10);
    });

    it("should parse '50 @ 4' as 50 * 4 = 200", () => {
      expect(parseQuantityFormat("50 @ 4")).toBe(200);
    });
  });

  describe("Multiply format: N x/*/× M", () => {
    it("should parse '10 x 2' as 10 * 2 = 20", () => {
      expect(parseQuantityFormat("10 x 2")).toBe(20);
    });

    it("should parse '10x2' as 10 * 2 = 20", () => {
      expect(parseQuantityFormat("10x2")).toBe(20);
    });

    it("should parse '10 * 2' as 10 * 2 = 20", () => {
      expect(parseQuantityFormat("10 * 2")).toBe(20);
    });

    it("should parse '10*2' as 10 * 2 = 20", () => {
      expect(parseQuantityFormat("10*2")).toBe(20);
    });

    it("should parse '15 × 3' (unicode multiply) as 15 * 3 = 45", () => {
      expect(parseQuantityFormat("15 × 3")).toBe(45);
    });
  });

  describe("Divide format: N / M", () => {
    it("should parse '100 / 2' as 100 / 2 = 50", () => {
      expect(parseQuantityFormat("100 / 2")).toBe(50);
    });

    it("should parse '50/5' as 50 / 5 = 10", () => {
      expect(parseQuantityFormat("50/5")).toBe(10);
    });
  });

  describe("Decimal format with comma", () => {
    it("should parse '10,5 (2pcs)' as 10.5 * 2 = 21", () => {
      expect(parseQuantityFormat("10,5 (2pcs)")).toBe(21);
    });

    it("should parse '2,5 @ 4' as 2.5 * 4 = 10", () => {
      expect(parseQuantityFormat("2,5 @ 4")).toBe(10);
    });

    it("should parse '10.5 x 2' as 10.5 * 2 = 21", () => {
      expect(parseQuantityFormat("10.5 x 2")).toBe(21);
    });
  });

  describe("Plain numbers", () => {
    it("should parse '100' as 100", () => {
      expect(parseQuantityFormat("100")).toBe(100);
    });

    it("should parse '50,5' (with comma decimal) as 50.5", () => {
      expect(parseQuantityFormat("50,5")).toBe(50.5);
    });

    it("should parse '50.5' (with dot decimal) as 50.5", () => {
      expect(parseQuantityFormat("50.5")).toBe(50.5);
    });

    it("should parse '0' as 0", () => {
      expect(parseQuantityFormat("0")).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("should return 0 for empty string", () => {
      expect(parseQuantityFormat("")).toBe(0);
    });

    it("should return 0 for whitespace only", () => {
      expect(parseQuantityFormat("   ")).toBe(0);
    });

    it("should ignore non-numeric characters and parse numbers", () => {
      expect(parseQuantityFormat("100 units")).toBe(100);
    });

    it("should return 0 for division by zero", () => {
      expect(parseQuantityFormat("100 / 0")).toBe(0);
    });

    it("should handle complex format: '5 (2pcs)' with extra text", () => {
      expect(parseQuantityFormat("5 (2pcs) - total")).toBe(10);
    });
  });

  describe("Practical examples", () => {
    it("example: 24 bottle pack means 1 @ 24 = 24", () => {
      expect(parseQuantityFormat("1 @ 24")).toBe(24);
    });

    it("example: 50 sheets per ream, 2 reams = 2 @ 50 = 100", () => {
      expect(parseQuantityFormat("2 @ 50")).toBe(100);
    });

    it("example: box with 12 items each, 10 boxes = 10 (12) = 120", () => {
      expect(parseQuantityFormat("10 (12)")).toBe(120);
    });

    it("example: half box = 0.5 @ 24 = 12", () => {
      expect(parseQuantityFormat("0,5 @ 24")).toBe(12);
    });
  });
});
