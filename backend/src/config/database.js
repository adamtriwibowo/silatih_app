const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  port:             process.env.DB_PORT     || 3306,
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || '',
  database:         process.env.DB_NAME     || 'silatih_db',
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
  dateStrings:      true,
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅  Database MySQL terhubung');
    conn.release();
  } catch (err) {
    console.error('❌  Gagal koneksi database:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;
