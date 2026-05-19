# Kaizen Stock Control

Industrial stock data dashboard for maintaining item quantities, CSV/XLSX imports, CSV export, image references, and stock movement history.

## Run

```powershell
npm start
```

Open `http://localhost:4174`.

Admin mode uses:

- ID: `admin`
- Password: `admin`

For development:

```powershell
npm run dev
```

## Data

- SQLite database: `storage/stock.db`
- Uploaded images: `storage/images`
- Imported files: `storage/imports`
- Cached thumbnails: `storage/thumbnails`
- Existing source photos: `img`
- CSV export: `http://localhost:4174/api/export.csv`

The current `Data_Barang_19.xlsx` file has been imported into `storage/stock.db`.

Images in the inventory table use cached WebP thumbnails from `/api/images/thumb` so each page does not load full camera photos. New image uploads are optimized to WebP before being attached to an item.

## Quality Gates

```powershell
npm test
npm run typecheck
npm run build
npm audit --audit-level=high
```

The test suite covers stock movement rules, CSV import mapping, CSV export, and an automated WCAG smoke test with `jest-axe`.
