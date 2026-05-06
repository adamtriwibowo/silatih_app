-- ============================================================
--  SiLatih — Database Schema
--  Jalankan: mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS silatih_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE silatih_db;

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INT          AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(100) NOT NULL,
  nik        VARCHAR(18)  NOT NULL,
  email      VARCHAR(100) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  no_hp      VARCHAR(20),
  instansi   VARCHAR(150),
  role       ENUM('peserta','admin') NOT NULL DEFAULT 'peserta',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email (email),
  UNIQUE KEY uq_nik   (nik)
);

-- ── PELATIHAN ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pelatihan (
  id                 INT          AUTO_INCREMENT PRIMARY KEY,
  judul              VARCHAR(200) NOT NULL,
  kategori           ENUM('teknologi','bisnis','desain','data','softskill') NOT NULL,
  tags               JSON,
  icon               VARCHAR(10)  DEFAULT '📚',
  gradient           VARCHAR(250) DEFAULT 'linear-gradient(135deg,#7c3aed,#3b82f6)',
  instruktur_nama    VARCHAR(100) NOT NULL,
  instruktur_jabatan VARCHAR(150),
  instruktur_warna   VARCHAR(20)  DEFAULT '#7c3aed',
  deskripsi          TEXT,
  mode               ENUM('online','offline','hybrid') NOT NULL DEFAULT 'online',
  jadwal             DATE         NOT NULL,
  durasi             VARCHAR(100),
  lokasi             VARCHAR(200),
  biaya              VARCHAR(50)  DEFAULT 'Gratis',
  kuota              INT          NOT NULL DEFAULT 30,
  kuota_terisi       INT          NOT NULL DEFAULT 0,
  status             ENUM('open','almost','full','soon','closed') NOT NULL DEFAULT 'soon',
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_kategori (kategori),
  INDEX idx_status   (status),
  INDEX idx_jadwal   (jadwal)
);

-- ── PENDAFTARAN ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pendaftaran (
  id            INT  AUTO_INCREMENT PRIMARY KEY,
  user_id       INT  NOT NULL,
  pelatihan_id  INT  NOT NULL,
  motivasi      TEXT,
  status        ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  catatan_admin VARCHAR(500),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)      REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (pelatihan_id) REFERENCES pelatihan(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_pelatihan (user_id, pelatihan_id),
  INDEX idx_user_id      (user_id),
  INDEX idx_pelatihan_id (pelatihan_id),
  INDEX idx_status       (status)
);
