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

### 3. Konfigurasi Environment (`.env` & PM2)
Salin file template `.env.example` ke `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi sesuai kebutuhan server.
> ⚠️ **PENTING (Keamanan Server Production)**:
> Pada mode produksi (`NODE_ENV=production`), server **mewajibkan** variabel `ADMIN_PIN` dan `PRODUCTION_PIN` disetel dengan PIN rahasia unik (server akan menolak berjalan jika kosong atau masih memakai default `1234`).

Contoh di `.env`:
```env
PORT=3000
NODE_ENV=production
ADMIN_PIN=8899
PRODUCTION_PIN=5566
```

### 4. Menjalankan dengan PM2 (Direkomendasikan)
Tersedia konfigurasi [`ecosystem.config.js`](file:///c:/Users/rifqi.hidayat_hijrah/Documents/PlanCraft/ecosystem.config.js) untuk deployment production yang stabil:
```bash
# Build production bundle
npm run build

# Start atau restart via PM2
pm2 start ecosystem.config.js
# atau
pm2 restart plancraft --update-env
```

---

## 🔐 Akun & Hak Akses Pengguna

| Username | Role | Konfigurasi PIN | Akses & Wewenang |
| :--- | :--- | :--- | :--- |
| `admin` | Admin PPIC | Via `ADMIN_PIN` di `.env` / PM2 | Akses penuh (Dashboard, Monitoring, Input Plan, Master SKU, Hapus Log, Edit Tanggal Bebas) |
| `produksi` | Tim Produksi | Via `PRODUCTION_PIN` di `.env` / PM2 | Monitoring & Input Real-time Log Produksi (Tanggal otomatis terkunci ke hari ini, dilarang ubah target/SKU/active plan) |

> **Catatan Keamanan**: PIN disimpan dalam bentuk hash scrypt dengan salt acak 16-byte di SQLite server. Setiap kali `ADMIN_PIN` atau `PRODUCTION_PIN` diperbarui di PM2 / `.env`, sistem akan otomatis menyinkronkan hash PIN ke database server.

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
