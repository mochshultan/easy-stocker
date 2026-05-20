# 🏭 Warehouse Rack 3D Visualizer

Visualisasi 3D interaktif untuk rak gudang **180×60×180 cm** dengan sistem manajemen lokasi stok barang.

## 📦 Spesifikasi Rak

| Parameter     | Detail                          |
|---------------|---------------------------------|
| Dimensi       | 180 cm (L) × 60 cm (D) × 180 cm (T) |
| Jumlah Rak    | 4 Rak (A, B, C, D — kanan ke kiri) |
| Baris per Rak | 4 baris (bawah ke atas)         |
| Section/Baris | 8 section (4 kanan + 4 kiri)    |
| Total Section | 128 section                     |

## 🚀 Cara Menjalankan

```bash
# Install dependencies
npm install

# Jalankan dev server
npm run dev

# Build production
npm run build
```

Buka browser di: **http://localhost:5173**

## 🖱️ Cara Penggunaan

| Aksi                  | Fungsi                              |
|-----------------------|-------------------------------------|
| **Klik** section      | Toggle status Terisi / Kosong       |
| **Drag** (tahan klik) | Putar tampilan 3D                   |
| **Scroll**            | Zoom in / out                       |
| **Kanan panel**       | Statistik total occupancy           |
| **Kiri panel**        | Isi cepat / kosongkan per rak       |
| **Info panel**        | Detail section yang dipilih         |

## 🎨 Kode Warna Rak

| Rak | Warna  | Posisi   |
|-----|--------|----------|
| A   | Cyan   | Paling kanan |
| B   | Hijau  |          |
| C   | Oranye |          |
| D   | Pink   | Paling kiri  |

## 🔧 Struktur Kode

```
warehouse-rack-3d/
├── index.html         # HTML + UI panels
├── vite.config.js     # Vite config
├── package.json
└── src/
    ├── main.js        # Three.js 3D scene
    └── style.css      # UI styling
```

## 💡 Pengembangan Lebih Lanjut

- Sambungkan `stockState` ke database / API untuk data real-time
- Tambahkan input barcode untuk auto-highlight lokasi barang
- Export occupancy report ke PDF/Excel
- Tambahkan animasi path-finding saat picking barang
