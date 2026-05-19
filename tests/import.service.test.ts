// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseStockFile } from "../server/services/importService";

describe("stock file import parser", () => {
  it("maps Indonesian CSV headers into stock records", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kaizen-import-"));
    const filePath = path.join(tempRoot, "barang.csv");
    fs.writeFileSync(
      filePath,
      "Kode Barang,Nama Barang,Kategori,Lokasi,Jumlah,Satuan,Stok Minimal\nBRG-001,Bearing 6204,Spare Part,Gudang A,12,pcs,3\n",
      "utf8"
    );

    try {
      const records = await parseStockFile(filePath, "barang.csv");
      expect(records).toEqual([
        {
          sku: "BRG-001",
          name: "Bearing 6204",
          category: "Spare Part",
          location: "Gudang A",
          unit: "pcs",
          quantity: 12,
          minQuantity: 3,
          imagePath: null,
          notes: null
        }
      ]);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
