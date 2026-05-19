// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createThumbnail, optimizeUploadedImage } from "../server/services/imageService";
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
  it("optimizes uploaded images into webp files", async () => {
    const sourcePath = path.join(context.imagesDir, "upload.jpg");
    await sharp({ create: { width: 64, height: 64, channels: 3, background: "#ffffff" } }).jpeg().toFile(sourcePath);

    const publicPath = await optimizeUploadedImage(sourcePath, context.imagesDir);

    expect(publicPath).toMatch(/\/uploads\/images\/upload-optimized\.webp$/);
    expect(fs.existsSync(path.join(context.imagesDir, "upload-optimized.webp"))).toBe(true);
    expect(fs.existsSync(sourcePath)).toBe(false);
  });

  it("creates cached thumbnails for uploaded image paths", async () => {
    const uploadPath = path.join(context.imagesDir, "asset.webp");
    await sharp({ create: { width: 120, height: 90, channels: 3, background: "#ffffff" } }).webp().toFile(uploadPath);

    const thumbnailPath = await createThumbnail(context, "/uploads/images/asset.webp", 80);

    expect(thumbnailPath.endsWith(".webp")).toBe(true);
    expect(fs.existsSync(thumbnailPath)).toBe(true);
  });
});
