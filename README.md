# SiLatih — Sistem Pelatihan Digital

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white"/>
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white"/>
  <img src="https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vanilla_JS-Frontend-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/>
</div>

<br/>

> **SiLatih** adalah aplikasi web sistem manajemen pelatihan digital berbasis REST API yang memungkinkan peserta mendaftar pelatihan, memantau status pendaftaran, dan admin mengelola seluruh data pelatihan secara terpusat.

---

## Tampilan Aplikasi

| Halaman Utama | Dashboard Admin |
|---|---|
| Katalog pelatihan dengan filter & kuota real-time | Statistik, CRUD pelatihan, approve/reject pendaftaran |

---

## Fitur Utama

### Peserta
- **Katalog Pelatihan** — filter kategori, status kuota, mode (online/offline/hybrid), dan pencarian
- **Quota Real-time** — progress bar ketersediaan kursi (open → hampir penuh → penuh)
- **Pendaftaran Online** — formulir dengan validasi NIK, email, motivasi
- **Autentikasi JWT** — register & login, sesi tersimpan di localStorage
- **Pendaftaran Saya** — riwayat dan status pendaftaran tiap peserta

### Admin
- **Dashboard** — statistik total pelatihan, peserta, status pendaftaran + chart
- **Manajemen Pelatihan** — CRUD lengkap (tambah, edit, hapus) dengan preview gradient & icon
- **Manajemen Pendaftaran** — approve / reject dengan catatan admin + notifikasi email otomatis
- **Data Pengguna** — daftar semua user dengan filter role
- **Laporan & Statistik** — 4 jenis chart (Chart.js), tabel ringkasan, export CSV, cetak

---

## Teknologi

| Layer | Stack |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES2020) |
| **Backend** | Node.js 18+, Express.js 4.x |
| **Database** | MySQL 8.0 via `mysql2/promise` (connection pool) |
| **Auth** | JSON Web Token (`jsonwebtoken`) + `bcryptjs` |
| **Validasi** | `express-validator` |
| **Keamanan** | `helmet`, `cors`, `express-rate-limit` |
| **Email** | `nodemailer` (opsional, SMTP) |
| **Charts** | Chart.js 4 (CDN) |

---

## Struktur Proyek

```
project_silatih_v6/
├── index.html          # Halaman utama peserta
├── style.css           # Stylesheet halaman utama
├── app.js              # JavaScript halaman utama (API client)
├── admin.html          # Dashboard admin
├── admin.css           # Stylesheet admin
├── admin.js            # JavaScript dashboard admin
└── backend/
    ├── server.js           # Entry point Express
    ├── .env.example        # Template environment variables
    ├── package.json
    ├── database/
    │   ├── schema.sql      # DDL tabel users, pelatihan, pendaftaran
    │   └── seed.js         # Data awal (admin + 6 pelatihan contoh)
    └── src/
        ├── config/
        │   └── database.js     # MySQL connection pool
        ├── middleware/
        │   ├── auth.js         # JWT authenticate + adminOnly
        │   └── validate.js     # express-validator error formatter
        ├── models/
        │   ├── User.js
        │   ├── Pelatihan.js    # include auto-status dari kuota
        │   └── Pendaftaran.js
        ├── controllers/
        │   ├── authController.js
        │   ├── pelatihanController.js
        │   ├── pendaftaranController.js
        │   └── adminController.js
        ├── routes/
        │   ├── auth.js
        │   ├── pelatihan.js
        │   ├── pendaftaran.js
        │   └── admin.js
        └── utils/
            ├── response.js     # Helper respons API seragam
            └── mailer.js       # Notifikasi email HTML
```

---

## Instalasi & Menjalankan

### Prasyarat
- **Node.js** v18 atau lebih baru
- **MySQL** 8.0 atau lebih baru
- **npm** v9+

### 1. Clone Repository

```bash
git clone https://github.com/adamtriwibowo/silatih_app.git
cd silatih_app
```

### 2. Setup Database

```bash
# Buat database dan tabel
mysql -u root -p < backend/database/schema.sql
```

Atau jalankan langsung di MySQL client:
```sql
SOURCE backend/database/schema.sql;
```

### 3. Konfigurasi Environment

```bash
cd backend
cp .env.example .env
```

Edit file `.env`:
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5500

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=silatih_db

JWT_SECRET=ganti_dengan_string_panjang_dan_acak_minimal_32_karakter
JWT_EXPIRES_IN=7d

# Opsional — SMTP untuk notifikasi email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### 4. Install Dependencies

```bash
cd backend
npm install
```

### 5. Seed Data Awal

```bash
npm run seed
```

Output:
```
✅ Admin    → admin@silatih.go.id   / Admin@123
✅ Peserta  → adam@example.com       / Peserta@123
✅ 6 pelatihan contoh ditambahkan
```

### 6. Jalankan Backend

```bash
npm run dev     # development (nodemon)
# atau
npm start       # production
```

API berjalan di: `http://localhost:3001/api`

### 7. Jalankan Frontend

```bash
# Dari folder root project
npx serve . -p 5500
```

Buka browser:
- **Halaman Peserta** → `http://localhost:5500`
- **Dashboard Admin** → `http://localhost:5500/admin.html`

---

## Akun Default

| Role | Email | Password |
|---|---|---|
| Admin | `admin@silatih.go.id` | `Admin@123` |
| Peserta | `adam@example.com` | `Peserta@123` |

> ⚠️ **Ganti password default** setelah setup di lingkungan produksi.

---

## API Endpoints

### Auth
| Method | Endpoint | Keterangan |
|---|---|---|
| `POST` | `/api/auth/register` | Registrasi peserta baru |
| `POST` | `/api/auth/login` | Login (return JWT) |
| `GET`  | `/api/auth/me` | Info user dari token |

### Pelatihan (Publik)
| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/pelatihan` | Daftar semua pelatihan |
| `GET` | `/api/pelatihan/:id` | Detail pelatihan |

### Pendaftaran (Auth Required)
| Method | Endpoint | Keterangan |
|---|---|---|
| `POST`   | `/api/pendaftaran` | Daftar pelatihan |
| `GET`    | `/api/pendaftaran/saya` | Riwayat pendaftaran sendiri |
| `DELETE` | `/api/pendaftaran/:id` | Batalkan pendaftaran |

### Admin (Admin Only)
| Method | Endpoint | Keterangan |
|---|---|---|
| `GET`    | `/api/admin/dashboard` | Statistik ringkasan |
| `GET`    | `/api/admin/pelatihan` | Semua pelatihan |
| `POST`   | `/api/admin/pelatihan` | Tambah pelatihan |
| `PUT`    | `/api/admin/pelatihan/:id` | Edit pelatihan |
| `DELETE` | `/api/admin/pelatihan/:id` | Hapus pelatihan |
| `GET`    | `/api/admin/pendaftaran` | Semua pendaftaran |
| `PUT`    | `/api/admin/pendaftaran/:id/status` | Approve / reject |
| `GET`    | `/api/admin/users` | Semua pengguna |

---

## Keamanan

- Password di-hash menggunakan **bcryptjs** (12 salt rounds)
- JWT disimpan di `localStorage` (frontend) dan diverifikasi setiap request
- **Helmet** untuk HTTP security headers
- **CORS** dikonfigurasi hanya untuk `FRONTEND_URL`
- **Rate limiting** — 200 request per 15 menit per IP
- Transaksi database untuk update kuota agar konsisten di akses bersamaan

---

## Kontribusi

Pull request dan issue sangat diterima. Untuk perubahan besar, buka issue terlebih dahulu.

---

## Lisensi

MIT License — bebas digunakan untuk keperluan akademik dan non-komersial.

---

<div align="center">
  Dibuat oleh <strong>Adam Tri Wibowo</strong> — Tugas Perancangan Sistem Informasi
</div>
