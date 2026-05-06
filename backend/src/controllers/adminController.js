const db          = require('../config/database');
const Pelatihan   = require('../models/Pelatihan');
const Pendaftaran = require('../models/Pendaftaran');
const User        = require('../models/User');
const { ok, created, badRequest, notFound, serverError } = require('../utils/response');
const { kirimStatusPendaftaran } = require('../utils/mailer');

/* ── DASHBOARD ──────────────────────────────────────────── */
exports.getDashboard = async (_req, res) => {
  try {
    const [[sp]] = await db.query(`
      SELECT
        COUNT(*)                                              AS total_pelatihan,
        COALESCE(SUM(kuota_terisi), 0)                       AS total_peserta,
        SUM(status = 'open')                                  AS pelatihan_open,
        SUM(status = 'almost')                                AS pelatihan_almost,
        SUM(status = 'full')                                  AS pelatihan_full,
        SUM(status = 'soon')                                  AS pelatihan_soon
      FROM pelatihan`);

    const [[sd]] = await db.query(`
      SELECT
        COUNT(*)              AS total,
        SUM(status='pending') AS pending,
        SUM(status='approved') AS approved,
        SUM(status='rejected') AS rejected,
        SUM(status='cancelled') AS cancelled
      FROM pendaftaran`);

    const [recent] = await db.query(`
      SELECT pd.id, pd.status, pd.created_at,
             u.nama AS peserta_nama, p.judul AS pelatihan_judul
      FROM pendaftaran pd
      JOIN users u    ON pd.user_id      = u.id
      JOIN pelatihan p ON pd.pelatihan_id = p.id
      ORDER BY pd.created_at DESC LIMIT 8`);

    return ok(res, { pelatihan: sp, pendaftaran: sd, recent });
  } catch (err) {
    console.error('dashboard:', err);
    return serverError(res);
  }
};

/* ── PELATIHAN CRUD ──────────────────────────────────────── */
exports.getAllPelatihan = async (req, res) => {
  try {
    const pelatihan = await Pelatihan.findAll(req.query);
    return ok(res, { total: pelatihan.length, pelatihan });
  } catch (err) { return serverError(res); }
};

exports.createPelatihan = async (req, res) => {
  try {
    const id        = await Pelatihan.create(req.body);
    const pelatihan = await Pelatihan.findById(id);
    return created(res, { pelatihan }, 'Pelatihan berhasil ditambahkan.');
  } catch (err) {
    console.error('createPelatihan:', err);
    return serverError(res);
  }
};

exports.updatePelatihan = async (req, res) => {
  try {
    const exists = await Pelatihan.findById(req.params.id);
    if (!exists) return notFound(res, 'Pelatihan tidak ditemukan.');
    await Pelatihan.update(req.params.id, req.body);
    const updated = await Pelatihan.findById(req.params.id);
    return ok(res, { pelatihan: updated }, 'Pelatihan berhasil diperbarui.');
  } catch (err) { return serverError(res); }
};

exports.deletePelatihan = async (req, res) => {
  try {
    const exists = await Pelatihan.findById(req.params.id);
    if (!exists) return notFound(res, 'Pelatihan tidak ditemukan.');
    await Pelatihan.delete(req.params.id);
    return ok(res, null, 'Pelatihan berhasil dihapus.');
  } catch (err) { return serverError(res); }
};

/* ── PENDAFTARAN (admin) ─────────────────────────────────── */
exports.getAllPendaftaran = async (req, res) => {
  try {
    const pendaftaran = await Pendaftaran.findAll(req.query);
    return ok(res, { total: pendaftaran.length, pendaftaran });
  } catch (err) { return serverError(res); }
};

exports.getPendaftaranByPelatihan = async (req, res) => {
  try {
    const exists = await Pelatihan.findById(req.params.id);
    if (!exists) return notFound(res, 'Pelatihan tidak ditemukan.');
    const pendaftaran = await Pendaftaran.findByPelatihanId(req.params.id);
    return ok(res, { total: pendaftaran.length, pelatihan: exists.judul, pendaftaran });
  } catch (err) { return serverError(res); }
};

exports.updateStatusPendaftaran = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { status, catatan_admin } = req.body;
    const VALID = ['approved', 'rejected', 'pending'];
    if (!VALID.includes(status))
      return badRequest(res, `Status tidak valid. Pilihan: ${VALID.join(', ')}`);

    const data = await Pendaftaran.findById(req.params.id);
    if (!data) return notFound(res, 'Pendaftaran tidak ditemukan.');

    const prev = data.status;
    await Pendaftaran.updateStatus(req.params.id, status, catatan_admin || null);

    /* update kuota hanya jika status approved berubah */
    if (status === 'approved' && prev !== 'approved') {
      await Pelatihan.incrementKuota(data.pelatihan_id, conn);
    } else if (prev === 'approved' && status !== 'approved') {
      await Pelatihan.decrementKuota(data.pelatihan_id, conn);
    }

    await conn.commit();

    /* kirim email notifikasi jika approved/rejected */
    if (['approved', 'rejected'].includes(status)) {
      const user      = await User.findById(data.user_id);
      const pelatihan = await Pelatihan.findById(data.pelatihan_id);
      if (user && pelatihan) {
        kirimStatusPendaftaran({
          email:    user.email,
          nama:     user.nama,
          pelatihan: pelatihan.judul,
          status,
          catatan:  catatan_admin,
        }).catch(console.error);
      }
    }

    return ok(res, null, `Status pendaftaran diperbarui menjadi "${status}".`);
  } catch (err) {
    await conn.rollback();
    console.error('updateStatus:', err);
    return serverError(res);
  } finally {
    conn.release();
  }
};

/* ── USERS ───────────────────────────────────────────────── */
exports.getAllUsers = async (_req, res) => {
  try {
    const users = await User.findAll();
    return ok(res, { total: users.length, users });
  } catch (err) { return serverError(res); }
};
