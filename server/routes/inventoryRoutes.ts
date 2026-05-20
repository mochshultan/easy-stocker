import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import multer from "multer";
import path from "node:path";
import { ZodError } from "zod";
import {
  stockItemInputSchema,
  stockItemPatchSchema,
  stockMovementInputSchema,
  type ItemStatus
} from "../../shared/stock.js";
import { parseStockFile } from "../services/importService.js";
import { createAdminAuth } from "../services/adminAuth.js";
import { createThumbnail, preserveOriginalImage } from "../services/imageService.js";
import { createInventoryService, InventoryError } from "../services/inventoryService.js";
import type { StockDatabase } from "../storage/database.js";

const importExtensions = new Set([".csv", ".xlsx"]);
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function registerInventoryRoutes(app: Express, context: StockDatabase) {
  const service = createInventoryService(context);
  const adminAuth = createAdminAuth();
  const router = express.Router();

  const importUpload = multer({
    storage: multer.diskStorage({
      destination: context.importsDir,
      filename: (_request, file, callback) => callback(null, storedFileName(file.originalname))
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      callback(null, importExtensions.has(path.extname(file.originalname).toLowerCase()));
    }
  });

  const imageUpload = multer({
    storage: multer.diskStorage({
      destination: context.imagesDir,
      filename: (_request, file, callback) => callback(null, storedFileName(file.originalname))
    }),
    limits: { fileSize: 100 * 1024 * 1024 }, // Bypass ke 100MB untuk gambar PNG resolusi tinggi
    fileFilter: (_request, file, callback) => {
      callback(null, imageExtensions.has(path.extname(file.originalname).toLowerCase()));
    }
  });

  router.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  router.get("/metrics", (_request, response) => {
    response.json(service.getMetrics());
  });

  router.get("/images/thumb", async (request, response, next) => {
    try {
      const src = String(request.query.src ?? "");
      const width = Number(request.query.w ?? 160);
      const thumbnailPath = await createThumbnail(context, src, width);
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      response.type("image/webp");
      response.sendFile(thumbnailPath);
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/login", (request, response) => {
    const username = String(request.body?.username ?? "");
    const password = String(request.body?.password ?? "");
    const session = adminAuth.login(username, password);

    if (!session) {
      response.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    response.json({
      token: session.token,
      expiresAt: new Date(session.expiresAt).toISOString()
    });
  });

  router.get("/items", (request, response) => {
    response.json(
      service.listItems({
        search: String(request.query.search ?? ""),
        status: normalizeStatus(String(request.query.status ?? "ALL"))
      })
    );
  });

  router.post("/items", adminAuth.requireAdmin, (request, response) => {
    const parsed = stockItemInputSchema.parse(request.body);
    const result = service.upsertItem(parsed);
    response.status(result.created ? 201 : 200).json(result.item);
  });

  router.patch("/items/:id", adminAuth.requireAdmin, (request, response) => {
    const parsed = stockItemPatchSchema.parse(request.body);
    response.json(service.updateItem(String(request.params.id), parsed));
  });

  router.post("/items/:id/movements", adminAuth.requireAdmin, (request, response) => {
    const parsed = stockMovementInputSchema.parse(request.body);
    response.status(201).json(service.recordMovement(String(request.params.id), parsed));
  });

  router.get("/items/:id/movements", (request, response) => {
    response.json(service.listMovements(String(request.params.id)));
  });

  router.post("/items/:id/image", adminAuth.requireAdmin, imageUpload.single("image"), async (request, response, next) => {
    if (!request.file) {
      throw new InventoryError("A JPG, PNG, or WebP image is required", 400);
    }

    try {
      const imagePath = await preserveOriginalImage(request.file.path, context.imagesDir);
      response.json(service.attachImage(String(request.params.id), imagePath));
    } catch (error) {
      next(error);
    }
  });

  router.post("/import", adminAuth.requireAdmin, importUpload.single("file"), async (request, response, next) => {
    if (!request.file) {
      throw new InventoryError("A CSV or XLSX file is required", 400);
    }

    try {
      const records = await parseStockFile(request.file.path, request.file.originalname);
      response.status(201).json(service.importRecords(request.file.originalname, request.file.path, records));
    } catch (error) {
      next(error);
    }
  });

  router.get("/export.csv", (_request, response) => {
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="stock-export-${dateSlug()}.csv"`);
    response.send(service.exportCsv());
  });

  router.get("/export.xlsx", async (_request, response, next) => {
    try {
      const buffer = await service.exportXlsx();
      response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      response.setHeader("Content-Disposition", `attachment; filename="stock-export-${dateSlug()}.xlsx"`);
      response.send(buffer);
    } catch (error) {
      next(error);
    }
  });

  app.use("/api", router);
  app.use("/api", (_request, response) => {
    response.status(404).json({ error: "API route was not found" });
  });
  app.use(errorHandler);
}

function normalizeStatus(value: string): ItemStatus | "ALL" {
  return value === "OK" || value === "LOW" || value === "OUT" ? value : "ALL";
}

function storedFileName(originalName: string) {
  const extension = path.extname(originalName).toLowerCase();
  const base = path
    .basename(originalName, extension)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${Date.now()}-${crypto.randomUUID()}-${base || "file"}${extension}`;
}

function dateSlug() {
  return new Date().toISOString().slice(0, 10);
}

function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    response.status(422).json({
      error: "Validation failed",
      details: error.flatten()
    });
    return;
  }

  if (error instanceof InventoryError) {
    response.status(error.status).json({
      error: error.message,
      details: error.details
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    console.error("[Multer Error]", error);
    response.status(400).json({ error: error.message });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  console.error(error);
  console.error("[Internal Server Error]", error);
  response.status(500).json({ error: "Internal Server Error" });
}

export { InventoryError };
