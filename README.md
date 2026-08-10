# UMKM Gear

## Informasi Tim
- **Nama Kelompok:** MAHIR (Mahasiswa Akhir)
- **Anggota Tim:**
  1. Tito Muhammad Athoriq
  2. Muhammad Rivaldi Setiawan 
  3. Raihan Dafa Alfarizi

## List Fitur
**Fitur Anggota**
- **Akun & Profil:** Login/Logout dan kelola profil UMKM.
- **Katalog:** Lihat ketersediaan dan cari alat.
- **Peminjaman Instan:** Pinjam langsung tanpa *approval* (maks 2 unit, durasi 1–5 hari).
- **Tracking:** Pantau pinjaman aktif, tanggal jatuh tempo, dan riwayat.

**Fitur Admin**
- **Master Data:** Kelola data alat, kategori, dan akun anggota.
- **Monitoring:** Pantau seluruh pinjaman aktif dan keterlambatan.
- **Pengembalian:** Proses *return*, catat kondisi, dan hitung denda otomatis.
- **Laporan:** Lihat dan cetak riwayat transaksi.

**Sistem Terintegrasi**
- **Keamanan:** Autentikasi JWT (*HttpOnly cookie*), *password hashing* (bcrypt), dan validasi input (Zod).
- **Integritas Data:** *Row locking* untuk mencegah *double-booking* alat yang sama, serta *soft delete* untuk riwayat.
- **Automasi:** Status alat (tersedia/dipinjam) diperbarui secara otomatis.

[![Thumbnail Video Demo](path/to/thumbnail-video.png)](https://link-ke-video-demo-anda.com)
