const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../utils/response');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return unauthorized(res, 'Token tidak ditemukan. Silakan login terlebih dahulu.');

  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    return unauthorized(res, 'Token tidak valid atau sudah kedaluwarsa. Silakan login kembali.');
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return forbidden(res, 'Hanya admin yang dapat mengakses endpoint ini.');
  next();
};

module.exports = { authenticate, adminOnly };
