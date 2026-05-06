const db           = require('../config/database');
const Pendaftaran  = require('../models/Pendaftaran');
const Pelatihan    = require('../models/Pelatihan');
const { ok, created, badRequest, forbidden, notFound, conflict, serverError } = require('../utils/response');
const { kirimKonfirmasiPendaftaran } = require('../utils/mailer');

exports.daftar = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { pelatihan_id, motivasi } = req.body;
    const user_id = req.user.id;

    const pelatihan = await Pelatihan.findById(pelatihan_id);
    if (!pelatihan)
      return notFound(res, 'Pelatihan tidak ditemukan.');
    if (pelatihan.status === 'full')
      return badRequest(res, 'Maaf, kuota pelatihan ini sudah penuh.');
    if (pelatihan.status === 'closed')
      return badRequest(res, 'Pendaftaran pelatihan ini sudah ditutup.');

    const existing = await Pendaftaran.findOne(user_id, pelatihan_id);
    if (existing)
      return conflict(res, 'Anda sudah mendaftar pelatihan ini sebelumnya.');

    const id = await Pendaftaran.create({ user_id, pelatihan_id, motivasi });

    if (pelatihan.status !== 'soon') {
      await Pelatihan.incrementKuota(pelatihan_id, conn);
    }

    await conn.commit();

    /* kirim email konfirmasi (non-blocking) */
    kirimKonfirmasiPendaftaran({
      email:     req.user.email,
      nama:      req.user.nama || '',
      pelatihan: pelatihan.judul,
      jadwal:    pelatihan.jadwal,
    }).catch(console.error);

    return created(res, { id, pelatihan_id, status: 'pending' },
      'Pendaftaran berhasil! Menunggu konfirmasi dari admin.');
  } catch (err) {
    await conn.rollback();
    console.error('daftar:', err);
    return serverError(res);
  } finally {
    conn.release();
  }
};

exports.getSaya = async (req, res) => {
  try {
    const pendaftaran = await Pendaftaran.findByUserId(req.user.id);
    return ok(res, { total: pendaftaran.length, pendaftaran });
  } catch (err) {
    return serverError(res);
  }
};

exports.batalkan = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const data = await Pendaftaran.findById(req.params.id);
    if (!data)
      return notFound(res, 'Pendaftaran tidak ditemukan.');
    if (data.user_id !== req.user.id)
      return forbidden(res, 'Anda tidak memiliki akses ke pendaftaran ini.');
    if (data.status === 'cancelled')
      return badRequest(res, 'Pendaftaran ini sudah dibatalkan sebelumnya.');

    await Pendaftaran.cancel(req.params.id, req.user.id);

    if (data.status === 'approved') {
      await Pelatihan.decrementKuota(data.pelatihan_id, conn);
    }

    await conn.commit();
    return ok(res, null, 'Pendaftaran berhasil dibatalkan.');
  } catch (err) {
    await conn.rollback();
    console.error('batalkan:', err);
    return serverError(res);
  } finally {
    conn.release();
  }
};
