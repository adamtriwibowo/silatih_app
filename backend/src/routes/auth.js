const router   = require('express').Router();
const { body } = require('express-validator');
const { validate }  = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { register, login, me } = require('../controllers/authController');

router.post('/register', [
  body('nama').trim().isLength({ min: 3 }).withMessage('Nama minimal 3 karakter'),
  body('nik').matches(/^\d{10,18}$/).withMessage('NIK/NIP harus 10–18 digit angka'),
  body('email').isEmail().normalizeEmail().withMessage('Format email tidak valid'),
  body('password').isLength({ min: 8 }).withMessage('Password minimal 8 karakter'),
  body('no_hp').matches(/^0\d{8,13}$/).withMessage('No HP harus diawali 0 dan 9–14 digit'),
], validate, register);

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Format email tidak valid'),
  body('password').notEmpty().withMessage('Password wajib diisi'),
], validate, login);

router.get('/me', authenticate, me);

module.exports = router;
