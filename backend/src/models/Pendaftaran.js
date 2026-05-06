const db = require('../config/database');

const Pendaftaran = {
  async findByUserId(userId) {
    const [rows] = await db.query(
      `SELECT pd.*,
              p.judul, p.jadwal, p.mode, p.lokasi, p.biaya,
              p.instruktur_nama, p.status AS pelatihan_status,
              p.gradient, p.icon, p.kuota, p.kuota_terisi
       FROM pendaftaran pd
       JOIN pelatihan p ON pd.pelatihan_id = p.id
       WHERE pd.user_id = ?
       ORDER BY pd.created_at DESC`,
      [userId]
    );
    return rows;
  },

  async findByPelatihanId(pelatihanId) {
    const [rows] = await db.query(
      `SELECT pd.*, u.nama, u.email, u.nik, u.no_hp, u.instansi
       FROM pendaftaran pd
       JOIN users u ON pd.user_id = u.id
       WHERE pd.pelatihan_id = ?
       ORDER BY pd.created_at ASC`,
      [pelatihanId]
    );
    return rows;
  },

  async findAll({ status, pelatihan_id } = {}) {
    let q = `
      SELECT pd.*,
             u.nama  AS peserta_nama,  u.email AS peserta_email,
             u.nik   AS peserta_nik,   u.instansi AS peserta_instansi,
             p.judul AS pelatihan_judul, p.jadwal, p.mode
      FROM pendaftaran pd
      JOIN users    u ON pd.user_id      = u.id
      JOIN pelatihan p ON pd.pelatihan_id = p.id
      WHERE 1=1`;
    const params = [];
    if (status)       { q += ' AND pd.status = ?';       params.push(status); }
    if (pelatihan_id) { q += ' AND pd.pelatihan_id = ?'; params.push(pelatihan_id); }
    q += ' ORDER BY pd.created_at DESC';
    const [rows] = await db.query(q, params);
    return rows;
  },

  async findOne(userId, pelatihanId) {
    const [rows] = await db.query(
      'SELECT * FROM pendaftaran WHERE user_id = ? AND pelatihan_id = ?',
      [userId, pelatihanId]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM pendaftaran WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ user_id, pelatihan_id, motivasi }) {
    const [result] = await db.query(
      'INSERT INTO pendaftaran (user_id, pelatihan_id, motivasi) VALUES (?, ?, ?)',
      [user_id, pelatihan_id, motivasi || null]
    );
    return result.insertId;
  },

  async updateStatus(id, status, catatan_admin = null) {
    const [r] = await db.query(
      'UPDATE pendaftaran SET status = ?, catatan_admin = ? WHERE id = ?',
      [status, catatan_admin, id]
    );
    return r.affectedRows > 0;
  },

  async cancel(id, userId) {
    const [r] = await db.query(
      'UPDATE pendaftaran SET status = "cancelled" WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return r.affectedRows > 0;
  },
};

module.exports = Pendaftaran;
