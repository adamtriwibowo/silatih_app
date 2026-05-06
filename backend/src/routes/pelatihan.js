const router = require('express').Router();
const { getAll, getById } = require('../controllers/pelatihanController');

/* Public — tidak perlu token */
router.get('/',    getAll);
router.get('/:id', getById);

module.exports = router;
