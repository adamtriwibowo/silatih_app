const ok = (res, data, message = 'Berhasil', code = 200) =>
  res.status(code).json({ status: 'success', message, data });

const created = (res, data, message = 'Data berhasil dibuat') =>
  ok(res, data, message, 201);

const badRequest = (res, message = 'Data tidak valid', errors = null) =>
  res.status(400).json({ status: 'error', message, ...(errors && { errors }) });

const unauthorized = (res, message = 'Tidak terautentikasi') =>
  res.status(401).json({ status: 'error', message });

const forbidden = (res, message = 'Akses ditolak') =>
  res.status(403).json({ status: 'error', message });

const notFound = (res, message = 'Data tidak ditemukan') =>
  res.status(404).json({ status: 'error', message });

const conflict = (res, message = 'Data sudah ada') =>
  res.status(409).json({ status: 'error', message });

const serverError = (res, message = 'Terjadi kesalahan server') =>
  res.status(500).json({ status: 'error', message });

const errorHandler = (err, _req, res, _next) => {
  console.error('Unhandled Error:', err);
  return serverError(res);
};

module.exports = {
  ok, created, badRequest, unauthorized, forbidden,
  notFound, conflict, serverError, errorHandler,
};
