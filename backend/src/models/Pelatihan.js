const db = require('../config/database');

const parseTags = (p) => ({
  ...p,
  tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : (p.tags || []),
});

const Pelatihan = {
  async findAll({ kategori, status, mode, search } = {}) {
    let q = 'SELECT * FROM pelatihan WHERE 1=1';
    const p = [];
    if (kategori) { q += ' AND kategori = ?';                              p.push(kategori); }
    if (status)   { q += ' AND status = ?';                                p.push(status); }
    if (mode)     { q += ' AND mode = ?';                                  p.push(mode); }
    if (search)   { q += ' AND (judul LIKE ? OR deskripsi LIKE ?)';        p.push(`%${search}%`, `%${search}%`); }
    q += ' ORDER BY jadwal ASC';
    const [rows] = await db.query(q, p);
    return rows.map(parseTags);
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM pelatihan WHERE id = ?', [id]);
    return rows[0] ? parseTags(rows[0]) : null;
  },

  async create(data) {
    const {
      judul, kategori, tags, icon, gradient,
      instruktur_nama, instruktur_jabatan, instruktur_warna,
      deskripsi, mode, jadwal, durasi, lokasi, biaya, kuota, status,
    } = data;
    const [result] = await db.query(
      `INSERT INTO pelatihan
        (judul, kategori, tags, icon, gradient, instruktur_nama, instruktur_jabatan,
         instruktur_warna, deskripsi, mode, jadwal, durasi, lokasi, biaya, kuota, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [judul, kategori, JSON.stringify(tags || []), icon || '📚',
       gradient || 'linear-gradient(135deg,#7c3aed,#3b82f6)',
       instruktur_nama, instruktur_jabatan || null, instruktur_warna || '#7c3aed',
       deskripsi || null, mode, jadwal, durasi || null, lokasi || null,
       biaya || 'Gratis', kuota, status || 'soon']
    );
    return result.insertId;
  },

  async update(id, data) {
    const allowed = [
      'judul','kategori','tags','icon','gradient','instruktur_nama',
      'instruktur_jabatan','instruktur_warna','deskripsi','mode',
      'jadwal','durasi','lokasi','biaya','kuota','status',
    ];
    const fields = [], values = [];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'tags' ? JSON.stringify(data[key]) : data[key]);
      }
    }
    if (!fields.length) return false;
    values.push(id);
    const [r] = await db.query(`UPDATE pelatihan SET ${fields.join(', ')} WHERE id = ?`, values);
    return r.affectedRows > 0;
  },

  async delete(id) {
    const [r] = await db.query('DELETE FROM pelatihan WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },

  /* Naikan kuota_terisi dan update status otomatis */
  async incrementKuota(id, conn = db) {
    await conn.query(
      `UPDATE pelatihan
       SET kuota_terisi = kuota_terisi + 1,
           status = CASE
             WHEN (kuota_terisi + 1) >= kuota THEN 'full'
             WHEN (kuota_terisi + 1) / kuota >= 0.85 THEN 'almost'
             ELSE status
           END
       WHERE id = ?`,
      [id]
    );
  },

  /* Turunkan kuota_terisi dan update status otomatis */
  async decrementKuota(id, conn = db) {
    await conn.query(
      `UPDATE pelatihan
       SET kuota_terisi = GREATEST(0, kuota_terisi - 1),
           status = CASE
             WHEN status = 'full' AND (kuota_terisi - 1) / kuota < 1   THEN 'almost'
             WHEN status = 'almost' AND (kuota_terisi - 1) / kuota < 0.85 THEN 'open'
             ELSE status
           END
       WHERE id = ?`,
      [id]
    );
  },
};

module.exports = Pelatihan;
