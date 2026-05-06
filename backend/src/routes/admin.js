const router       = require('express').Router();
const { body }     = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, adminOnly } = require('../middleware/auth');
const {
  getDashboard,
  getAllPelatihan, createPelatihan, updatePelatihan, deletePelatihan,
  getAllPendaftaran, getPendaftaranByPelatihan, updateStatusPendaftaran,
  getAllUsers,
} = require('../controllers/adminController');

router.use(authenticate, adminOnly); /* semua route admin-only */

/* Dashboard */
router.get('/dashboard', getDashboard);

/* Users */
router.get('/users', getAllUsers);

/* Pelatihan */
router.get('/pelatihan',     getAllPelatihan);
router.post('/pelatihan', [
  body('judul').trim().notEmpty().withMessage('Judul wajib diisi'),
  body('kategori').isIn(['teknologi','bisnis','desain','data','softskill']).withMessage('Kategori tidak valid'),
  body('jadwal').isDate().withMessage('Format jadwal harus YYYY-MM-DD'),
  body('kuota').isInt({ min: 1 }).withMessage('Kuota minimal 1 orang'),
  body('instruktur_nama').trim().notEmpty().withMessage('Nama instruktur wajib diisi'),
  body('mode').isIn(['online','offline','hybrid']).withMessage('Mode tidak valid'),
], validate, createPelatihan);
router.put('/pelatihan/:id',    updatePelatihan);
router.delete('/pelatihan/:id', deletePelatihan);

/* Pendaftaran */
router.get('/pendaftaran',                    getAllPendaftaran);
router.get('/pendaftaran/pelatihan/:id',      getPendaftaranByPelatihan);
router.put('/pendaftaran/:id/status', [
  body('status').isIn(['approved','rejected','pending']).withMessage('Status tidak valid'),
], validate, updateStatusPendaftaran);

module.exports = router;
