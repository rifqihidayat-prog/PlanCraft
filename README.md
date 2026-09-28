# PlanCraft - Production Planning & Real-Time Logging

A lightweight, mobile-first Production Planning and Daily Output Logging application designed for meat processing plants (1 Line, 1 Shift). Built with Next.js 16 (App Router), Tailwind CSS, TypeScript, and SQLite.

---

## 🚀 Fitur Utama

1. **Autentikasi Server-Side & Session Management**:
   - Berbasis sesi server yang tersimpan di database SQLite (`sessions` table).
   - Session token dikirim melalui **HTTP-Only Cookies** dengan proteksi `SameSite=Lax` dan fallback **Authorization: Bearer <token>** untuk kompatibilitas lintas perangkat / jaringan lokal.
   - Enkripsi PIN pengguna menggunakan **Scrypt Hashing (`crypto.scryptSync`)** dengan salt acak 16-byte (`salt:hex_hash`).

2. **Role-Based Access Control (RBAC) pada API Server**:
   - **Admin PPIC (`role: admin`)**:
     - Akses penuh membaca & menulis seluruh endpoint (`/api/data`, `/api/plans`, `/api/logs`, `/api/skus`, `/api/migrate`).
     - Pengelolaan master data SKU dan input/edit target produksi mingguan.
   - **Tim Produksi (`role: production`)**:
     - Akses baca `/api/data`, `/api/plans`, `/api/skus`, `/api/plans/active`.
     - Akses tulis input log real-time ke `/api/logs`.
     - Pembatasan ketat: Mencoba mengubah target plan (`POST /api/plans`) atau master SKU (`POST /api/skus`) langsung ditolak server dengan `403 Forbidden`.
   - **Unauthenticated Users**:
     - Seluruh endpoint data dilindungi dan mengembalikan `401 Unauthorized`.

3. **Migrasi Otomatis Data Browser ke SQLite Server (`/api/migrate`)**:
   - Perangkat yang sebelumnya menyimpan data di `localStorage` browser akan otomatis memindahkan seluruh data (rencana mingguan, log produksi, SKU lokal) ke database SQLite server saat pertama kali login.
   - Menggunakan mekanisme deduplikasi (`INSERT OR IGNORE` dan update) sehingga data tidak hilang ataupun terduplikasi.

---

## 🛠️ Instalasi & Menjalankan di Server Sendiri

### 1. Prasyarat
- Node.js versi 18+ atau 20+ (LTS disarankan)
- Git

### 2. Clone & Setup Repository
```bash
git clone https://github.com/rifqihidayat-prog/PlanCraft.git
cd PlanCraft
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file template `.env.example` ke `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi sesuai kebutuhan server (misal PORT=3000).

### 4. Build & Jalankan Aplikasi
```bash
# Build production bundle
npm run build

# Menjalankan server production
npm run start
```
Aplikasi akan berjalan di `http://localhost:3000` (atau port yang ditentukan).

---

## 🔐 Akun Bawaan (Default Seed Accounts)

| Username | Role | Default PIN | Akses |
| :--- | :--- | :--- | :--- |
| `admin` | Admin PPIC | `1234` | Full access (Dashboard, Monitoring, Input Plan, Master SKU) |
| `produksi` | Operator / Tim Produksi | `1234` | Monitoring & Input Real-time Log Produksi |

> **Catatan Keamanan**: PIN disimpan dalam bentuk hash scrypt di SQLite server. Setelah deployment, disarankan mengubah PIN master melalui database SQLite atau dashboard manajemen.

---

## 📡 Ringkasan API Endpoints

| Endpoint | Method | Role Minimum | Deskripsi |
| :--- | :--- | :--- | :--- |
| `/api/auth` | `POST` | Publik | Login dengan username & PIN, membuat sesi server |
| `/api/auth/me` | `GET` | Authenticated | Mengecek status sesi pengguna saat ini |
| `/api/auth/logout` | `POST` | Authenticated | Menghapus sesi server & membersihkan cookie |
| `/api/data` | `GET` | Authenticated | Mengambil seluruh data awal (SKU, Plan, Log, Info User) |
| `/api/plans` | `GET` | Authenticated | Mengambil daftar rencana mingguan |
| `/api/plans` | `POST` | `admin` (403 for prod) | Menyimpan / memperbarui target rencana mingguan |
| `/api/plans/active` | `POST` | `admin` (403 for prod) | Mengaktifkan rencana kerja minggu berjalan |
| `/api/logs` | `GET`, `POST` | Authenticated | Membaca riwayat & mencatat log hasil produksi |
| `/api/logs` | `DELETE` | `admin` | Menghapus entri log produksi |
| `/api/skus` | `GET` | Authenticated | Membaca master data SKU |
| `/api/skus` | `POST` | `admin` (403 for prod) | Menambah / memperbarui master data SKU |
| `/api/migrate` | `POST` | Authenticated | Memigrasikan data legacy `localStorage` ke server SQLite |
