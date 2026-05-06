const Pelatihan = require('../models/Pelatihan');
const { ok, notFound, serverError } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const { kategori, status, mode, search } = req.query;
    const pelatihan = await Pelatihan.findAll({ kategori, status, mode, search });
    return ok(res, { total: pelatihan.length, pelatihan });
  } catch (err) {
    console.error('getAll pelatihan:', err);
    return serverError(res);
  }
};

exports.getById = async (req, res) => {
  try {
    const pelatihan = await Pelatihan.findById(req.params.id);
    if (!pelatihan) return notFound(res, 'Pelatihan tidak ditemukan.');
    return ok(res, { pelatihan });
  } catch (err) {
    return serverError(res);
  }
};
