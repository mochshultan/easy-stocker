import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { InventoryError } from "./inventoryService.js";
import type { StockDatabase } from "../storage/database.js";

/**
 * Simpan gambar yang diupload dengan kualitas asli (tanpa kompresi/resize).
 * Hanya melakukan auto-rotate berdasarkan EXIF, lalu copy ke imagesDir.
 * File original dipertahankan apa adanya.
 */
export async function preserveOriginalImage(filePath: string, imagesDir: string): Promise<string> {
  const parsed = path.parse(filePath);
  // Pertahankan ekstensi asli, atau simpan sebagai PNG jika tidak dikenal
  const ext = ['.jpg', '.jpeg', '.png', '.webp'].includes(parsed.ext.toLowerCase())
    ? parsed.ext.toLowerCase()
    : '.png';
  const fileName = `${parsed.name}-original${ext}`;
  const outputPath = path.join(imagesDir, fileName);

  // Hanya auto-rotate berdasarkan EXIF metadata — tidak ada resize, tidak ada kompresi ulang
  await sharp(filePath)
    .rotate()           // koreksi orientasi EXIF
    .toFile(outputPath); // simpan dengan codec & kualitas yang sama

  if (path.resolve(filePath) !== path.resolve(outputPath)) {
    await fsp.unlink(filePath).catch(() => undefined);
  }

  return `/uploads/images/${encodeURIComponent(fileName)}`;
}


export async function createThumbnail(context: StockDatabase, src: string, widthInput: number): Promise<string> {
  const sourcePath = resolveImagePath(context, src);
  const stats = await fsp.stat(sourcePath).catch(() => null);
  if (!stats?.isFile()) {
    throw new InventoryError("Image was not found", 404);
  }

  const width = clampWidth(widthInput);
  const cacheKey = crypto
    .createHash("sha256")
    .update(`${sourcePath}:${stats.mtimeMs}:${stats.size}:${width}`)
    .digest("hex")
    .slice(0, 32);
  const thumbnailPath = path.join(context.thumbnailsDir, `${cacheKey}.webp`);

  if (!fs.existsSync(thumbnailPath)) {
    await sharp(sourcePath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72, effort: 4 })
      .toFile(thumbnailPath);
  }

  return thumbnailPath;
}

function resolveImagePath(context: StockDatabase, src: string): string {
  const decoded = decodeURIComponent(src);

  if (decoded.startsWith("/source-images/")) {
    const fileName = path.basename(decoded.replace("/source-images/", ""));
    return path.join(process.cwd(), "img", fileName);
  }

  if (decoded.startsWith("/uploads/images/")) {
    const fileName = path.basename(decoded.replace("/uploads/images/", ""));
    return path.join(context.imagesDir, fileName);
  }

  throw new InventoryError("Image source is not allowed", 400);
}

function clampWidth(value: number): number {
  if (!Number.isFinite(value)) {
    return 160;
  }

  return Math.min(1200, Math.max(64, Math.round(value)));
}
