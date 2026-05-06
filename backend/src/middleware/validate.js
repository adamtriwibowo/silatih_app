const { validationResult } = require('express-validator');
const { badRequest } = require('../utils/response');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(
      res,
      'Validasi gagal. Periksa kembali data yang Anda masukkan.',
      errors.array().map(e => ({ field: e.path, message: e.msg }))
    );
  }
  next();
};

module.exports = { validate };
