import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { InventoryError } from "./inventoryService.js";
import type { StockDatabase } from "../storage/database.js";

export async function optimizeUploadedImage(filePath: string, imagesDir: string): Promise<string> {
  const parsed = path.parse(filePath);
  const fileName = `${parsed.name}-optimized.webp`;
  const outputPath = path.join(imagesDir, fileName);

  await sharp(filePath)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(outputPath);

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
