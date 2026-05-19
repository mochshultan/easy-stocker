import cors from "cors";
import express from "express";
import path from "node:path";
import { registerInventoryRoutes } from "./routes/inventoryRoutes.js";
import { createStockDatabase } from "./storage/database.js";

const app = express();
const port = Number(process.env.PORT ?? 4174);
const context = createStockDatabase();

app.disable("x-powered-by");
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads/images", express.static(context.imagesDir, { fallthrough: false }));
app.use("/source-images", express.static(path.join(process.cwd(), "img"), { fallthrough: true }));

registerInventoryRoutes(app, context);

const clientDist = path.resolve(process.cwd(), "dist", "client");
app.use(express.static(clientDist));
app.use((request, response, next) => {
  if (request.method !== "GET") {
    next();
    return;
  }

  response.sendFile(path.join(clientDist, "index.html"));
});

const server = app.listen(port, () => {
  console.log(`Kaizen Stock Control API listening on http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    context.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { app };
