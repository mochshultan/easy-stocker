// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createThumbnail, preserveOriginalImage } from "../server/services/imageService";
import { createStockDatabase, type StockDatabase } from "../server/storage/database";

let tempRoot = "";
let context: StockDatabase;

beforeEach(() => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kaizen-image-"));
  context = createStockDatabase({ storageRoot: path.join(tempRoot, "storage") });
});

afterEach(async () => {
  context.close();
  sharp.cache(false);
  await new Promise((resolve) => setTimeout(resolve, 150));
  fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
});

describe("image service", () => {
  it("preserves original JPEG quality without re-compression", async () => {
    const sourcePath = path.join(context.imagesDir, "upload.jpg");
    await sharp({ create: { width: 64, height: 64, channels: 3, background: "#ffffff" } }).jpeg({ quality: 100 }).toFile(sourcePath);
    const originalSize = fs.statSync(sourcePath).size;

    const publicPath = await preserveOriginalImage(sourcePath, context.imagesDir);

    // Harus mempertahankan ekstensi asli (.jpg), bukan dikonversi ke .webp
    expect(publicPath).toMatch(/\/uploads\/images\/upload-original\.jpg$/);
    const savedFile = path.join(context.imagesDir, "upload-original.jpg");
    expect(fs.existsSync(savedFile)).toBe(true);
    // File original harus dihapus setelah dipindahkan
    expect(fs.existsSync(sourcePath)).toBe(false);
    // Ukuran file tidak boleh turun drastis (tidak ada re-kompresi lossy)
    const savedSize = fs.statSync(savedFile).size;
    expect(savedSize).toBeGreaterThan(originalSize * 0.8);
  });

  it("preserves original PNG quality without re-compression", async () => {
    const sourcePath = path.join(context.imagesDir, "capture.png");
    // Simulasi capture kamera (PNG lossless)
    await sharp({ create: { width: 1280, height: 720, channels: 3, background: "#aabbcc" } }).png().toFile(sourcePath);

    const publicPath = await preserveOriginalImage(sourcePath, context.imagesDir);

    expect(publicPath).toMatch(/\/uploads\/images\/capture-original\.png$/);
    const savedFile = path.join(context.imagesDir, "capture-original.png");
    expect(fs.existsSync(savedFile)).toBe(true);
  });

  it("creates cached thumbnails for uploaded image paths", async () => {
    const uploadPath = path.join(context.imagesDir, "asset.webp");
    await sharp({ create: { width: 120, height: 90, channels: 3, background: "#ffffff" } }).webp().toFile(uploadPath);

    const thumbnailPath = await createThumbnail(context, "/uploads/images/asset.webp", 80);

    expect(thumbnailPath.endsWith(".webp")).toBe(true);
    expect(fs.existsSync(thumbnailPath)).toBe(true);
  });
});
