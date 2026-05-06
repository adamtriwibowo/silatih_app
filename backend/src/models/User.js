const db = require('../config/database');

const User = {
  async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.query(
      'SELECT id, nama, nik, email, no_hp, instansi, role, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async create({ nama, nik, email, password, no_hp, instansi, role = 'peserta' }) {
    const [result] = await db.query(
      'INSERT INTO users (nama, nik, email, password, no_hp, instansi, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nama, nik, email, password, no_hp || null, instansi || null, role]
    );
    return result.insertId;
  },

  async emailExists(email) {
    const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    return rows.length > 0;
  },

  async nikExists(nik) {
    const [rows] = await db.query('SELECT id FROM users WHERE nik = ?', [nik]);
    return rows.length > 0;
  },

  async findAll() {
    const [rows] = await db.query(
      'SELECT id, nama, nik, email, no_hp, instansi, role, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  },
};

module.exports = User;
