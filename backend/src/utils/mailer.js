const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const baseLayout = (content) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#f8f7ff;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.1)">
    <div style="background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:28px 32px">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">⚡ SiLatih</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px">Sistem Pelatihan Digital</p>
    </div>
    <div style="padding:32px">${content}</div>
    <div style="background:#1a1a2e;padding:16px 32px;text-align:center">
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0">© 2026 SiLatih · info@silatih.go.id</p>
    </div>
  </div>`;

const kirimKonfirmasiPendaftaran = async ({ email, nama, pelatihan, jadwal }) => {
  if (!process.env.SMTP_HOST) return;
  await transporter.sendMail({
    from: `"SiLatih" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Konfirmasi Pendaftaran: ${pelatihan}`,
    html: baseLayout(`
      <h2 style="color:#1a1a2e;margin:0 0 12px">Halo, ${nama}! 👋</h2>
      <p style="color:#6b7280;line-height:1.7">Pendaftaran Anda telah <strong style="color:#059669">berhasil dikirim</strong> dan sedang dalam proses review oleh admin.</p>
      <div style="background:#fff;border-radius:12px;padding:20px;margin:20px 0;border:1px solid rgba(124,58,237,0.12)">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Detail Pelatihan</p>
        <p style="margin:0 0 8px;color:#1a1a2e;font-size:17px;font-weight:700">${pelatihan}</p>
        <p style="margin:0;color:#7c3aed;font-weight:600">📅 ${jadwal}</p>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.7">Anda akan menerima email konfirmasi kembali setelah admin memproses pendaftaran Anda.</p>
    `),
  });
};

const kirimStatusPendaftaran = async ({ email, nama, pelatihan, status, catatan }) => {
  if (!process.env.SMTP_HOST) return;
  const cfg = status === 'approved'
    ? { label: 'Disetujui ✅', color: '#059669', bg: 'rgba(16,185,129,0.08)', pesan: 'Selamat! Pendaftaran Anda telah <strong style="color:#059669">disetujui</strong>.' }
    : { label: 'Ditolak ❌',   color: '#dc2626', bg: 'rgba(239,68,68,0.08)',   pesan: 'Maaf, pendaftaran Anda <strong style="color:#dc2626">tidak dapat diproses</strong> saat ini.' };

  await transporter.sendMail({
    from: `"SiLatih" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Status Pendaftaran ${cfg.label} — ${pelatihan}`,
    html: baseLayout(`
      <h2 style="color:#1a1a2e;margin:0 0 12px">Halo, ${nama}!</h2>
      <p style="color:#6b7280;line-height:1.7">${cfg.pesan}</p>
      <div style="background:${cfg.bg};border-radius:12px;padding:20px;margin:20px 0;border:1px solid ${cfg.color}33">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700">${pelatihan}</p>
        <p style="margin:0;color:${cfg.color};font-weight:700;font-size:15px">${cfg.label}</p>
        ${catatan ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280">Catatan: <em>${catatan}</em></p>` : ''}
      </div>
    `),
  });
};

module.exports = { kirimKonfirmasiPendaftaran, kirimStatusPendaftaran };
