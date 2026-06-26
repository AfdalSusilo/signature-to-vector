# ✍️ Signature to Vector

**Konversi gambar tanda tangan ke vektor SVG — 100% client-side, tanpa backend.**

Upload foto atau scan tanda tangan, lalu dapatkan SVG yang rapi, tajam, dan siap pakai di dokumen, PDF, website, atau aplikasi.

## 🚀 Demo Langsung

Buka `index.html` di browser, atau deploy ke layanan hosting statis favoritmu (GitHub Pages, Netlify, Vercel, dsb).

## ✨ Fitur

- 🖼️ **Drag & Drop** upload gambar (atau paste dari clipboard)
- 🎚️ **Quality slider** — atur ketelitian tracing dari 1 sampai 10
- 🧠 **Vectorization engine** — binary threshold → contour tracing → RDP simplification → smooth SVG paths
- 📋 **Copy SVG** langsung ke clipboard
- ⬇️ **Download SVG** satu klik (Ctrl+S juga bisa)
- 🌓 **Dark mode** tampilan modern
- 📱 **Responsif** — mobile & desktop
- 🔒 **100% privacy** — semua proses di browser, tidak ada data dikirim ke server

## 🛠️ Teknologi

- **Vanilla HTML/CSS/JS** — nol dependensi
- **Canvas API** — pemrosesan gambar
- **Contour tracing** — ekstraksi batas objek
- **Ramer–Douglas–Peucker** — penyederhanaan path
- **SVG** — output vektor siap pakai

## 📁 Struktur

```
signature-to-vector/
├── index.html      # Halaman utama
├── style.css       # Styling (dark theme, responsive)
├── script.js       # Engine vectorization
└── README.md       # Dokumentasi
```

## 🧪 Cara Kerja

1. **Upload** → gambar dimuat ke canvas
2. **Grayscale** → dikonversi ke hitam-putih
3. **Threshold** → binary threshold (bisa diatur slider)
4. **Contour tracing** → deteksi semua kontur tanda tangan
5. **RDP simplification** → penyederhanaan path (kurangi titik tanpa kehilangan bentuk)
6. **SVG generation** → path dikonversi ke SVG dengan quadratic bezier curves
7. **Output** → SVG siap diunduh atau disalin

## 🏗️ Deploy ke GitHub Pages

```bash
# Push ke GitHub
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/signature-to-vector.git
git push -u origin main

# Aktifkan GitHub Pages:
# Settings → Pages → Source: main branch → Save
```

## 📄 Lisensi

MIT — bebas pakai, modifikasi, dan distribusikan.

---

Dibuat dengan ❤️ oleh [Afdal](https://github.com/SiriusRac)
