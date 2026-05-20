# Quantity Parser - Format Breakdown Support

## Overview

Sistem inventory sekarang mendukung format quantity yang lebih fleksibel untuk menangani data dengan breakdown (jumlah box + isi per box).

## Format yang Didukung

### 1. **Bracket Format: `N (Mpcs)` atau `N(M)`**
Artinya: N box/paket, masing-masing berisi M pcs
```
10 (2pcs)    → 10 × 2 = 20 total
5 (3pcs)     → 5 × 3 = 15 total
100 (10pcs)  → 100 × 10 = 1000 total
```

### 2. **At Format: `N @ M` atau `N@M`**
Artinya: N quantity, masing-masing @ M
```
1 @ 2        → 1 × 2 = 2 total
2 @ 5        → 2 × 5 = 10 total
50 @ 4       → 50 × 4 = 200 total
```

### 3. **Multiply Format: `N x/*/× M`**
Artinya: N dikalikan M
```
10 x 2       → 10 × 2 = 20 total
10x2         → 10 × 2 = 20 total
10 * 2       → 10 × 2 = 20 total
10*2         → 10 × 2 = 20 total
15 × 3       → 15 × 3 = 45 total
```

### 4. **Divide Format: `N / M`**
Artinya: N dibagi M (jarang digunakan)
```
100 / 2      → 100 ÷ 2 = 50 total
50/5         → 50 ÷ 5 = 10 total
```

### 5. **Plain Numbers**
Format tradisional tetap didukung
```
100          → 100 total
50.5         → 50.5 total
50,5         → 50.5 total (menggunakan comma sebagai decimal separator)
```

## Contoh Penggunaan di Excel/CSV

### Import dari File

| SKU | Nama | Kategori | Qty | Notes |
|-----|------|----------|-----|-------|
| SKU001 | Botol Air | Minuman | 24 (1pcs) | 24 botol |
| SKU002 | Kertas A4 | Alat | 2 @ 500 | 2 rim (500 lembar per rim) |
| SKU003 | Pensil | Alat | 10 x 12 | 10 lusin |
| SKU004 | Buku | Alat | 1 @ 24 | 1 karton |

**Hasil parsing:**
- SKU001: 24 × 1 = **24** botol
- SKU002: 2 × 500 = **1000** lembar
- SKU003: 10 × 12 = **120** pensil
- SKU004: 1 × 24 = **24** buku

## Decimal Support dengan Comma

Parser juga mendukung desimal dengan comma (format Eropa):

```
10,5 (2pcs)  → 10.5 × 2 = 21 total
2,5 @ 4      → 2.5 × 4 = 10 total
0,5 @ 24     → 0.5 × 24 = 12 total (half box)
```

## Di Mana Berfungsi

Quantity parser digunakan di:
1. **Import dari XLSX/CSV**: Saat mengupload file inventory
2. **Form manual**: Ketika menambah/edit item melalui API
3. **Export**: Data diekspor dengan quantity hasil perhitungan

## Error Handling

- **Empty string atau whitespace**: Mengembalikan `0`
- **Division by zero** (misal: `100 / 0`): Mengembalikan `0`
- **Invalid format**: Fallback ke parsing angka biasa, ambil hanya digit
- **Mixed format**: Contoh `"10 (2pcs) - total"`  tetap bisa diparse → `20`

## Contoh Praktis

### Scenario 1: Import Data Gudang
File Excel berisi:
- 24 Box Susu (12 karton per box) → Input: `24 (12)`
- Output di database: `288 karton`

### Scenario 2: Restock Data
- 5 palet berisi 50 karton masing-masing → Input: `5 @ 50`
- Output di database: `250 karton`

### Scenario 3: Split Shipment
- 100 unit dari batch → Input: `100 / 2` (bagi 2 gudang)
- Output di database: `50 unit per gudang`

## Technical Details

Implementasi: [`server/services/importService.ts`](../server/services/importService.ts) - fungsi `parseQuantityFormat()`

Tests: [`tests/quantity-parser.test.ts`](../tests/quantity-parser.test.ts) - 31 test cases covering semua format

Parsing dilakukan saat:
1. File import via `POST /api/import`
2. Kolom quantity di-normalize oleh `numberValue()` function
