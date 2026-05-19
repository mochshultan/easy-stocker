import { parse as parseCsv } from "csv-parse/sync";
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import type { ImportRecord } from "./inventoryService.js";

type RawRow = Record<string, unknown>;

const headerAliases = {
  sku: [
    "sku",
    "kode",
    "kode barang",
    "kode aset",
    "asset code",
    "inventory code",
    "no inventaris",
    "nomor inventaris"
  ],
  name: [
    "name",
    "nama",
    "nama barang",
    "item",
    "barang",
    "deskripsi",
    "uraian",
    "material"
  ],
  category: ["category", "kategori", "jenis", "kelompok", "class", "merk", "brand"],
  location: ["location", "lokasi", "ruang", "ruangan", "letak", "gudang", "area"],
  unit: ["unit", "satuan", "uom"],
  quantity: ["quantity", "qty", "stock", "stok", "jumlah", "kuantitas", "saldo", "tersedia"],
  minQuantity: [
    "minimum",
    "min",
    "min stock",
    "minimum stock",
    "stok minimal",
    "minimum stok",
    "reorder point"
  ],
  imagePath: ["image", "gambar", "foto", "photo", "file foto", "lampiran"],
  notes: ["notes", "catatan", "keterangan", "remarks", "kondisi", "condition"]
} as const;

export async function parseStockFile(filePath: string, originalName: string): Promise<ImportRecord[]> {
  const extension = path.extname(originalName).toLowerCase();
  const rows = extension === ".csv" ? parseCsvFile(filePath) : await parseWorkbook(filePath);
  return rows.map((row, index) => normalizeRow(row, index)).filter(Boolean) as ImportRecord[];
}

function parseCsvFile(filePath: string): RawRow[] {
  const content = fs.readFileSync(filePath, "utf8");
  return parseCsv(content, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as RawRow[];
}

async function parseWorkbook(filePath: string): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    headers[columnNumber] = cellText(cell.value);
  });

  const rows: RawRow[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const record: RawRow = {};
    let hasValues = false;

    headers.forEach((header, columnNumber) => {
      if (!header) {
        return;
      }
      const value = cellText(row.getCell(columnNumber).value);
      if (value) {
        hasValues = true;
      }
      record[header] = value;
    });

    if (hasValues) {
      rows.push(record);
    }
  }

  return rows;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "object") {
    if ("text" in value && value.text) {
      return String(value.text).trim();
    }
    if ("result" in value && value.result !== undefined) {
      return cellText(value.result as ExcelJS.CellValue);
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("hyperlink" in value && value.hyperlink) {
      return String(value.hyperlink).trim();
    }
  }

  return String(value).trim();
}

function normalizeRow(row: RawRow, index: number): ImportRecord | null {
  const nonEmptyValues = Object.values(row).filter((value) => String(value ?? "").trim() !== "");
  if (nonEmptyValues.length === 0) {
    return null;
  }

  const name = textValue(row, headerAliases.name);
  const skuFromFile = textValue(row, headerAliases.sku);
  const sku = skuFromFile || createSku(name, index);

  if (!name && !skuFromFile) {
    return null;
  }

  return {
    sku,
    name: name || sku,
    category: textValue(row, headerAliases.category) || "Uncategorized",
    location: textValue(row, headerAliases.location) || "Main Store",
    unit: textValue(row, headerAliases.unit) || "pcs",
    quantity: numberValue(row, headerAliases.quantity, 0),
    minQuantity: numberValue(row, headerAliases.minQuantity, 0),
    imagePath: resolveImageReference(textValue(row, headerAliases.imagePath)),
    notes: textValue(row, headerAliases.notes) || collectExtraNotes(row)
  };
}

function textValue(row: RawRow, aliases: readonly string[]): string {
  const normalized = normalizeKeys(row);
  for (const alias of aliases) {
    const value = normalized.get(normalizeHeader(alias));
    if (value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function numberValue(row: RawRow, aliases: readonly string[], fallback: number): number {
  const raw = textValue(row, aliases);
  if (!raw) {
    return fallback;
  }

  const numeric = raw.replace(/[^\d,.-]/g, "");
  const hasComma = numeric.includes(",");
  const hasDot = numeric.includes(".");
  const cleaned =
    hasComma && hasDot
      ? numeric.replace(/\./g, "").replace(",", ".")
      : hasComma
        ? numeric.replace(",", ".")
        : numeric;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeKeys(row: RawRow) {
  const mapped = new Map<string, unknown>();
  Object.entries(row).forEach(([key, value]) => {
    mapped.set(normalizeHeader(key), value);
  });
  return mapped;
}

function normalizeHeader(header: string) {
  return header
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/[^\w\s.]/g, "")
    .trim();
}

function createSku(name: string, index: number) {
  const prefix =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 18) || "ITEM";
  return `${prefix}-${String(index + 1).padStart(4, "0")}`;
}

function resolveImageReference(value: string): string | null {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("/uploads/") || value.startsWith("/source-images/")) {
    return value;
  }

  const fileName = path.basename(value);
  const sourcePath = path.join(process.cwd(), "img", fileName);
  if (fs.existsSync(sourcePath)) {
    return `/source-images/${encodeURIComponent(fileName)}`;
  }

  return value;
}

function collectExtraNotes(row: RawRow) {
  const known = new Set(
    Object.values(headerAliases)
      .flat()
      .map((alias) => normalizeHeader(alias))
  );
  const details = Object.entries(row)
    .filter(([key, value]) => !known.has(normalizeHeader(key)) && String(value ?? "").trim() !== "")
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${String(value).trim()}`);

  return details.join("; ") || null;
}
