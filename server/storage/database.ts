import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type StockDatabase = {
  db: Database.Database;
  storageRoot: string;
  imagesDir: string;
  importsDir: string;
  thumbnailsDir: string;
  close: () => void;
};

export type StockDatabaseOptions = {
  storageRoot?: string;
  dbPath?: string;
};

export function createStockDatabase(options: StockDatabaseOptions = {}): StockDatabase {
  const storageRoot = options.storageRoot ?? path.join(process.cwd(), "storage");
  const imagesDir = path.join(storageRoot, "images");
  const importsDir = path.join(storageRoot, "imports");
  const thumbnailsDir = path.join(storageRoot, "thumbnails");
  const dbPath = options.dbPath ?? path.join(storageRoot, "stock.db");

  fs.mkdirSync(storageRoot, { recursive: true });
  fs.mkdirSync(imagesDir, { recursive: true });
  fs.mkdirSync(importsDir, { recursive: true });
  fs.mkdirSync(thumbnailsDir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);

  return {
    db,
    storageRoot,
    imagesDir,
    importsDir,
    thumbnailsDir,
    close: () => db.close()
  };
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity REAL NOT NULL CHECK (quantity >= 0),
      min_quantity REAL NOT NULL CHECK (min_quantity >= 0),
      image_path TEXT,
      notes TEXT,
      source_file TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Try adding source_file if it doesn't exist (migration for existing DBs)
    CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_items_location ON items(location);

    CREATE TABLE IF NOT EXISTS movements (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('ADD', 'TAKE', 'ADJUST')),
      quantity REAL NOT NULL CHECK (quantity > 0),
      before_quantity REAL NOT NULL,
      after_quantity REAL NOT NULL CHECK (after_quantity >= 0),
      reason TEXT NOT NULL,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_movements_item_id ON movements(item_id);
    CREATE INDEX IF NOT EXISTS idx_movements_created_at ON movements(created_at);

    CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      created_count INTEGER NOT NULL,
      updated_count INTEGER NOT NULL,
      error_count INTEGER NOT NULL,
      stored_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  try {
    db.exec(`ALTER TABLE items ADD COLUMN source_file TEXT;`);
  } catch (error) {
    // Abaikan jika kolom sudah ada
  }
}
