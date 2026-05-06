const router       = require('express').Router();
const { body }     = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { daftar, getSaya, batalkan } = require('../controllers/pendaftaranController');

router.use(authenticate); /* semua route butuh login */

router.post('/', [
  body('pelatihan_id').isInt({ min: 1 }).withMessage('ID pelatihan tidak valid'),
  body('motivasi').trim().isLength({ min: 20 }).withMessage('Motivasi minimal 20 karakter'),
], validate, daftar);

router.get('/saya',  getSaya);
router.delete('/:id', batalkan);

module.exports = router;
