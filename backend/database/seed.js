require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db     = require('../src/config/database');

async function seed() {
  console.log('\n🌱 Seeding database SiLatih...\n');

  /* ── Admin ── */
  const adminPass = await bcrypt.hash('Admin@123', 12);
  await db.query(`
    INSERT IGNORE INTO users (nama, nik, email, password, role)
    VALUES ('Admin SiLatih', '0000000000000001', 'admin@silatih.go.id', ?, 'admin')
  `, [adminPass]);
  console.log('✅ Admin    → admin@silatih.go.id   / Admin@123');

  /* ── Peserta contoh ── */
  const pesertaPass = await bcrypt.hash('Peserta@123', 12);
  await db.query(`
    INSERT IGNORE INTO users (nama, nik, email, password, no_hp, instansi, role)
    VALUES ('Adam Tri Wibowo', '3201234567890001', 'adam@example.com', ?, '081234567890', 'Universitas Indonesia', 'peserta')
  `, [pesertaPass]);
  console.log('✅ Peserta  → adam@example.com       / Peserta@123');

  /* ── Pelatihan contoh ── */
  const trainings = [
    {
      judul: 'Full-Stack Web Development dengan React & Node.js',
      kategori: 'teknologi', tags: ['React','Node.js','MongoDB'],
      icon: '💻', gradient: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
      instruktur_nama: 'Dr. Budi Santoso', instruktur_jabatan: 'Senior Software Engineer', instruktur_warna: '#7c3aed',
      deskripsi: 'Program intensif pengembangan web full-stack menggunakan React dan Node.js. Peserta membangun proyek nyata dari awal hingga deployment.',
      mode: 'online', jadwal: '2026-05-12', durasi: '40 Jam (8 Pertemuan)',
      lokasi: 'Zoom Meeting', biaya: 'Gratis', kuota: 30, kuota_terisi: 14, status: 'open',
    },
    {
      judul: 'Data Science & Machine Learning untuk Pemula',
      kategori: 'data', tags: ['Python','Pandas','Scikit-learn'],
      icon: '🤖', gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
      instruktur_nama: 'Ir. Siti Rahmawati', instruktur_jabatan: 'Data Scientist Lead', instruktur_warna: '#0ea5e9',
      deskripsi: 'Belajar dasar-dasar data science dan machine learning menggunakan Python.',
      mode: 'hybrid', jadwal: '2026-05-15', durasi: '32 Jam (6 Pertemuan)',
      lokasi: 'Online + Gedung A Lt.3', biaya: 'Rp 200.000', kuota: 25, kuota_terisi: 22, status: 'almost',
    },
    {
      judul: 'UI/UX Design: Dari Figma ke Produk Nyata',
      kategori: 'desain', tags: ['Figma','Prototyping','User Research'],
      icon: '🎨', gradient: 'linear-gradient(135deg,#ec4899,#7c3aed)',
      instruktur_nama: 'Rina Kusuma, M.Ds.', instruktur_jabatan: 'Senior UI/UX Designer', instruktur_warna: '#ec4899',
      deskripsi: 'Kuasai proses desain produk digital dari riset pengguna hingga prototipe interaktif dengan Figma.',
      mode: 'online', jadwal: '2026-05-18', durasi: '24 Jam (6 Pertemuan)',
      lokasi: 'Google Meet', biaya: 'Gratis', kuota: 40, kuota_terisi: 11, status: 'open',
    },
    {
      judul: 'Project Management Professional (PMP) Bootcamp',
      kategori: 'bisnis', tags: ['Agile','Scrum','PMP'],
      icon: '📊', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)',
      instruktur_nama: 'Agung Pratama, PMP', instruktur_jabatan: 'Certified Project Manager', instruktur_warna: '#f59e0b',
      deskripsi: 'Bootcamp intensif 2 hari untuk persiapan sertifikasi PMP.',
      mode: 'offline', jadwal: '2026-05-20', durasi: '48 Jam (2 Hari)',
      lokasi: 'Hotel Grand Sahid, Jakarta', biaya: 'Rp 500.000', kuota: 30, kuota_terisi: 30, status: 'full',
    },
    {
      judul: 'Kepemimpinan & Komunikasi Efektif di Era Digital',
      kategori: 'softskill', tags: ['Leadership','Komunikasi','Presentasi'],
      icon: '🎤', gradient: 'linear-gradient(135deg,#10b981,#0ea5e9)',
      instruktur_nama: 'Prof. Hendra Wijaya', instruktur_jabatan: 'Leadership Coach', instruktur_warna: '#10b981',
      deskripsi: 'Program pengembangan soft skill kepemimpinan dan komunikasi publik.',
      mode: 'online', jadwal: '2026-05-25', durasi: '16 Jam (4 Pertemuan)',
      lokasi: 'Zoom Meeting', biaya: 'Gratis', kuota: 50, kuota_terisi: 0, status: 'soon',
    },
    {
      judul: 'Cyber Security Essentials & Ethical Hacking',
      kategori: 'teknologi', tags: ['Security','Kali Linux','Penetration Test'],
      icon: '🔐', gradient: 'linear-gradient(135deg,#1e1b4b,#7c3aed)',
      instruktur_nama: 'Fajar Nugraha, OSCP', instruktur_jabatan: 'Penetration Tester', instruktur_warna: '#6d28d9',
      deskripsi: 'Pelajari dasar keamanan siber dan teknik pengujian penetrasi secara etis.',
      mode: 'hybrid', jadwal: '2026-05-28', durasi: '36 Jam (6 Pertemuan)',
      lokasi: 'Online + Lab Komputer', biaya: 'Rp 300.000', kuota: 20, kuota_terisi: 7, status: 'open',
    },
  ];

  for (const t of trainings) {
    await db.query(`
      INSERT IGNORE INTO pelatihan
        (judul,kategori,tags,icon,gradient,instruktur_nama,instruktur_jabatan,instruktur_warna,
         deskripsi,mode,jadwal,durasi,lokasi,biaya,kuota,kuota_terisi,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [t.judul,t.kategori,JSON.stringify(t.tags),t.icon,t.gradient,
        t.instruktur_nama,t.instruktur_jabatan,t.instruktur_warna,
        t.deskripsi,t.mode,t.jadwal,t.durasi,t.lokasi,t.biaya,
        t.kuota,t.kuota_terisi,t.status]);
  }
  console.log(`✅ ${trainings.length} pelatihan contoh ditambahkan`);

  console.log('\n🎉 Seeding selesai!\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Seeding gagal:', err.message);
  process.exit(1);
});
