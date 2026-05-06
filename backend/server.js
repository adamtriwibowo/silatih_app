require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const authRoutes        = require('./src/routes/auth');
const pelatihanRoutes   = require('./src/routes/pelatihan');
const pendaftaranRoutes = require('./src/routes/pendaftaran');
const adminRoutes       = require('./src/routes/admin');
const { errorHandler }  = require('./src/utils/response');

const app = express();

/* ── Security ────────────────────────────────────────────── */
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/* ── Rate limit ──────────────────────────────────────────── */
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Terlalu banyak request. Coba lagi dalam 15 menit.' },
}));

/* ── Body parser ─────────────────────────────────────────── */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Routes ──────────────────────────────────────────────── */
app.use('/api/auth',        authRoutes);
app.use('/api/pelatihan',   pelatihanRoutes);
app.use('/api/pendaftaran', pendaftaranRoutes);
app.use('/api/admin',       adminRoutes);

/* ── Health check ────────────────────────────────────────── */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'SiLatih API berjalan', timestamp: new Date() });
});

/* ── 404 ─────────────────────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Endpoint tidak ditemukan' });
});

/* ── Global error handler ────────────────────────────────── */
app.use(errorHandler);

/* ── Start ───────────────────────────────────────────────── */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n⚡  SiLatih API running`);
  console.log(`    Local : http://localhost:${PORT}/api`);
  console.log(`    Mode  : ${process.env.NODE_ENV || 'development'}\n`);
});
