/* ══════════════════════════════════════════════════════════
   SiLatih — Admin Dashboard JavaScript
══════════════════════════════════════════════════════════ */

const API = 'http://localhost:3001/api';

/* ── Auth state ── */
let adminToken = localStorage.getItem('silatih_admin_token') || null;
let adminUser  = JSON.parse(localStorage.getItem('silatih_admin_user') || 'null');

/* ── Data cache ── */
let dataPelatihan   = [];
let dataPendaftaran = [];
let dataUsers       = [];

/* ── Chart instances (destroy before re-render) ── */
const charts = {};

/* ══════════════════════════════════════════════════════════
   API HELPER
══════════════════════════════════════════════════════════ */
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  const res  = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

/* ══════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════════════════ */
function toast(msg, type = 'success') {
  const icon = type === 'success' ? '✅' : '❌';
  const el   = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
const initials = (n) => (n || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

function formatTgl(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(s, type = 'pelatihan') {
  const maps = {
    pelatihan:  { open:'Dibuka', almost:'Hampir Penuh', full:'Penuh', soon:'Segera', closed:'Ditutup' },
    pendaftaran:{ pending:'Pending', approved:'Disetujui', rejected:'Ditolak', cancelled:'Dibatalkan' },
    role:       { admin:'Admin', peserta:'Peserta' },
  };
  const labels = maps[type] || maps.pelatihan;
  return `<span class="badge badge-${s}">${labels[s] || s}</span>`;
}

function modeBadge(m) {
  return ({ online:'🌐 Online', offline:'📍 Offline', hybrid:'🔀 Hybrid' })[m] || m;
}

function normTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (!tags) return [];
  try { return JSON.parse(tags); } catch { return String(tags).split(/[, ]+/).filter(Boolean); }
}

/* ══════════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════════ */
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const email    = document.getElementById('lEmail').value.trim();
  const password = document.getElementById('lPassword').value;
  const btn      = document.getElementById('btnLoginSubmit');
  const errEl    = document.getElementById('lErrGeneral');

  errEl.textContent = '';
  btn.textContent   = 'Memeriksa…';
  btn.disabled      = true;

  try {
    const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (res.data.user.role !== 'admin') {
      errEl.textContent = 'Akun Anda tidak memiliki hak akses admin.';
      return;
    }
    adminToken = res.data.token;
    adminUser  = res.data.user;
    localStorage.setItem('silatih_admin_token', adminToken);
    localStorage.setItem('silatih_admin_user',  JSON.stringify(adminUser));
    initApp();
  } catch (err) {
    errEl.textContent = err?.message || 'Login gagal. Periksa email & password.';
  } finally {
    btn.textContent = 'Masuk ke Dashboard';
    btn.disabled    = false;
  }
});

/* ══════════════════════════════════════════════════════════
   INIT APP
══════════════════════════════════════════════════════════ */
function initApp() {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('adminApp').style.display     = 'flex';

  /* Fill user info */
  const name = adminUser?.nama || 'Admin';
  document.getElementById('sidebarName').textContent   = name;
  document.getElementById('sidebarAvatar').textContent = initials(name);
  document.getElementById('greetName').textContent     = name.split(' ')[0];
  document.getElementById('headerDate').textContent    = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  /* Nav items */
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      goPage(this.dataset.page);
    });
  });

  /* Sidebar toggle (mobile) */
  document.getElementById('btnMenuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  /* Logout */
  document.getElementById('btnLogout').addEventListener('click', doLogout);

  /* Modal peserta filter */
  document.getElementById('searchPesertaModal')?.addEventListener('input',  renderPesertaModal);
  document.getElementById('filterStatusPeserta')?.addEventListener('change', renderPesertaModal);
  document.getElementById('btnExportPeserta')?.addEventListener('click', exportPesertaCSV);

  /* Password toggle on login form */
  document.querySelectorAll('.btn-toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      inp.type        = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? '👁' : '🙈';
    });
  });

  /* Filters */
  ['searchPelatihan','fpKategori','fpStatus'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderPelatihanTable);
    document.getElementById(id)?.addEventListener('change', renderPelatihanTable);
  });
  ['searchPendaftaran','fdStatus'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderPendaftaranTable);
    document.getElementById(id)?.addEventListener('change', renderPendaftaranTable);
  });
  ['searchUsers','fuRole'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderUsersTable);
    document.getElementById(id)?.addEventListener('change', renderUsersTable);
  });

  /* Pelatihan form */
  document.getElementById('formPelatihan').addEventListener('submit', submitPelatihan);

  goPage('dashboard');
}

function doLogout() {
  adminToken = null;
  adminUser  = null;
  localStorage.removeItem('silatih_admin_token');
  localStorage.removeItem('silatih_admin_user');
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('adminApp').style.display     = 'none';
}

/* ══════════════════════════════════════════════════════════
   PAGE ROUTING
══════════════════════════════════════════════════════════ */
const pageNames = {
  dashboard:   'Dashboard',
  pelatihan:   'Manajemen Pelatihan',
  pendaftaran: 'Manajemen Pendaftaran',
  users:       'Data Pengguna',
  laporan:     'Laporan & Statistik',
};

function goPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page${capitalize(name)}`);
  const navEl  = document.querySelector(`.nav-item[data-page="${name}"]`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');

  document.getElementById('headerBreadcrumb').textContent = pageNames[name] || name;

  if (name === 'dashboard')   loadDashboard();
  if (name === 'pelatihan')   loadPelatihan();
  if (name === 'pendaftaran') loadPendaftaran();
  if (name === 'users')       loadUsers();
  if (name === 'laporan')     loadLaporan();
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ══════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const res = await api('/admin/dashboard');
    const { pelatihan: sp, pendaftaran: sd, recent } = res.data;

    document.getElementById('dTotalPelatihan').textContent = sp.total_pelatihan ?? 0;
    document.getElementById('dTotalPeserta').textContent   = sp.total_peserta ?? 0;
    document.getElementById('dPending').textContent        = sd.pending ?? 0;
    document.getElementById('dApproved').textContent       = sd.approved ?? 0;

    /* Badge pending on nav */
    const badge = document.getElementById('badgePending');
    badge.textContent    = sd.pending ?? 0;
    badge.style.display  = (sd.pending ?? 0) > 0 ? 'inline-flex' : 'none';

    renderChartStatusPelatihan(sp);
    renderChartStatusPendaftaran(sd);
    renderRecentTable(recent || []);
  } catch (err) {
    console.error('dashboard:', err);
  }
}

function renderRecentTable(rows) {
  const tb = document.getElementById('recentTable');
  if (!rows.length) { tb.innerHTML = '<tr><td colspan="5" class="table-empty">Belum ada pendaftaran</td></tr>'; return; }
  tb.innerHTML = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.peserta_nama}</strong></td>
      <td>${r.pelatihan_judul}</td>
      <td>${formatTgl(r.created_at)}</td>
      <td>${statusBadge(r.status, 'pendaftaran')}</td>
    </tr>`).join('');
}

function mkChart(id, type, data, options = {}) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, { type, data, options: { responsive: true, maintainAspectRatio: false, ...options } });
}

function renderChartStatusPelatihan(sp) {
  mkChart('chartStatusPelatihan', 'doughnut', {
    labels: ['Dibuka', 'Hampir Penuh', 'Penuh', 'Segera'],
    datasets: [{ data: [sp.pelatihan_open, sp.pelatihan_almost, sp.pelatihan_full, sp.pelatihan_soon], backgroundColor: ['#10b981','#f59e0b','#ef4444','#6366f1'], borderWidth: 0 }],
  }, { plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, boxWidth: 12, padding: 14 } } } });
}

function renderChartStatusPendaftaran(sd) {
  mkChart('chartStatusPendaftaran', 'doughnut', {
    labels: ['Pending', 'Disetujui', 'Ditolak', 'Dibatalkan'],
    datasets: [{ data: [sd.pending, sd.approved, sd.rejected, sd.cancelled], backgroundColor: ['#f59e0b','#10b981','#ef4444','#9ca3af'], borderWidth: 0 }],
  }, { plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, boxWidth: 12, padding: 14 } } } });
}

/* ══════════════════════════════════════════════════════════
   PELATIHAN
══════════════════════════════════════════════════════════ */
async function loadPelatihan() {
  try {
    const res    = await api('/admin/pelatihan');
    dataPelatihan = (res.data.pelatihan || []).map(p => ({ ...p, tags: normTags(p.tags) }));
    renderPelatihanTable();
  } catch (err) {
    document.getElementById('pelatihanTable').innerHTML = `<tr><td colspan="8" class="table-empty">Gagal memuat data</td></tr>`;
  }
}

function renderPelatihanTable() {
  const q   = (document.getElementById('searchPelatihan')?.value || '').toLowerCase();
  const kat = document.getElementById('fpKategori')?.value || '';
  const st  = document.getElementById('fpStatus')?.value || '';

  const list = dataPelatihan.filter(p =>
    (!q   || p.judul.toLowerCase().includes(q)) &&
    (!kat || p.kategori === kat) &&
    (!st  || p.status   === st)
  );

  document.getElementById('pelatihanSub').textContent = `${list.length} pelatihan`;

  const tb = document.getElementById('pelatihanTable');
  if (!list.length) { tb.innerHTML = '<tr><td colspan="8" class="table-empty">Tidak ada data</td></tr>'; return; }

  tb.innerHTML = list.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div style="font-weight:600;color:var(--text-head)">${p.icon || '📚'} ${p.judul}</div>
        <div style="font-size:12px;color:var(--text-muted)">${p.instruktur_nama}</div>
      </td>
      <td><span class="badge badge-${p.kategori}" style="background:#f3f4f6;color:var(--text-body)">${p.kategori}</span></td>
      <td>${formatTgl(p.jadwal)}</td>
      <td>
        <div>${p.kuota_terisi}/${p.kuota}</div>
        <div class="mini-progress"><div class="mini-fill" style="width:${p.kuota ? Math.round(p.kuota_terisi/p.kuota*100) : 0}%"></div></div>
      </td>
      <td>${modeBadge(p.mode)}</td>
      <td>${statusBadge(p.status)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-xs btn-xs-edit"   onclick="openModalPelatihan(${p.id})">Edit</button>
          <button class="btn-xs btn-xs-delete" onclick="confirmDelete(${p.id},'${escHtml(p.judul)}')">Hapus</button>
        </div>
      </td>
    </tr>`).join('');
}

/* ── Modal Pelatihan ── */
let editingPelatihanId = null;

function openModalPelatihan(id = null) {
  editingPelatihanId = id;
  document.getElementById('modalPelatihanTitle').textContent = id ? 'Edit Pelatihan' : 'Tambah Pelatihan';
  document.getElementById('pErr').textContent = '';
  document.getElementById('btnSavePelatihan').textContent = id ? 'Simpan Perubahan' : 'Tambah Pelatihan';

  if (id) {
    const p = dataPelatihan.find(x => x.id === id);
    if (!p) return;
    document.getElementById('pId').value              = p.id;
    document.getElementById('pJudul').value           = p.judul;
    document.getElementById('pKategori').value        = p.kategori;
    document.getElementById('pMode').value            = p.mode;
    document.getElementById('pJadwal').value          = p.jadwal?.split('T')[0] || '';
    document.getElementById('pDurasi').value          = p.durasi || '';
    document.getElementById('pLokasi').value          = p.lokasi || '';
    document.getElementById('pBiaya').value           = p.biaya || '';
    document.getElementById('pKuota').value           = p.kuota;
    document.getElementById('pStatus').value          = p.status;
    document.getElementById('pIcon').value            = p.icon || '';
    document.getElementById('pInstrukturNama').value    = p.instruktur_nama;
    document.getElementById('pInstrukturJabatan').value = p.instruktur_jabatan || '';
    document.getElementById('pInstrukturWarna').value   = p.instruktur_warna || '#7c3aed';
    document.getElementById('pTags').value            = (p.tags || []).join(', ');
    document.getElementById('pGradient').value        = p.gradient || '';
    document.getElementById('pDeskripsi').value       = p.deskripsi || '';
  } else {
    document.getElementById('formPelatihan').reset();
    document.getElementById('pInstrukturWarna').value = '#7c3aed';
    document.getElementById('pStatus').value = 'soon';
  }

  document.getElementById('modalPelatihanOverlay').classList.add('active');
}

function closeModalPelatihan() {
  document.getElementById('modalPelatihanOverlay').classList.remove('active');
}

async function submitPelatihan(e) {
  e.preventDefault();
  const btn     = document.getElementById('btnSavePelatihan');
  const errEl   = document.getElementById('pErr');
  errEl.textContent = '';
  btn.disabled  = true;
  btn.textContent = 'Menyimpan…';

  const tagsRaw = document.getElementById('pTags').value.trim();
  const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const body = {
    judul:              document.getElementById('pJudul').value.trim(),
    kategori:           document.getElementById('pKategori').value,
    mode:               document.getElementById('pMode').value,
    jadwal:             document.getElementById('pJadwal').value,
    durasi:             document.getElementById('pDurasi').value.trim(),
    lokasi:             document.getElementById('pLokasi').value.trim(),
    biaya:              document.getElementById('pBiaya').value.trim() || 'Gratis',
    kuota:              parseInt(document.getElementById('pKuota').value, 10),
    status:             document.getElementById('pStatus').value,
    icon:               document.getElementById('pIcon').value.trim() || '📚',
    instruktur_nama:    document.getElementById('pInstrukturNama').value.trim(),
    instruktur_jabatan: document.getElementById('pInstrukturJabatan').value.trim(),
    instruktur_warna:   document.getElementById('pInstrukturWarna').value,
    tags,
    gradient:           document.getElementById('pGradient').value.trim() || 'linear-gradient(135deg,#7c3aed,#3b82f6)',
    deskripsi:          document.getElementById('pDeskripsi').value.trim(),
  };

  try {
    if (editingPelatihanId) {
      await api(`/admin/pelatihan/${editingPelatihanId}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Pelatihan berhasil diperbarui.');
    } else {
      await api('/admin/pelatihan', { method: 'POST', body: JSON.stringify(body) });
      toast('Pelatihan berhasil ditambahkan.');
    }
    closeModalPelatihan();
    await loadPelatihan();
  } catch (err) {
    errEl.textContent = err?.message || 'Gagal menyimpan pelatihan.';
  } finally {
    btn.disabled    = false;
    btn.textContent = editingPelatihanId ? 'Simpan Perubahan' : 'Tambah Pelatihan';
  }
}

/* ── Delete Pelatihan ── */
let deleteCallback = null;

function confirmDelete(id, judul) {
  document.getElementById('deleteMsg').textContent = `Hapus pelatihan "${judul}"? Semua data pendaftaran terkait juga akan terhapus.`;
  deleteCallback = async () => {
    try {
      await api(`/admin/pelatihan/${id}`, { method: 'DELETE' });
      toast('Pelatihan berhasil dihapus.');
      closeModalDelete();
      await loadPelatihan();
    } catch (err) {
      toast(err?.message || 'Gagal menghapus pelatihan.', 'error');
    }
  };
  document.getElementById('btnConfirmDelete').onclick = deleteCallback;
  document.getElementById('modalDeleteOverlay').classList.add('active');
}

function closeModalDelete() { document.getElementById('modalDeleteOverlay').classList.remove('active'); }

/* ══════════════════════════════════════════════════════════
   PENDAFTARAN
══════════════════════════════════════════════════════════ */
async function loadPendaftaran() {
  try {
    const res       = await api('/admin/pendaftaran');
    dataPendaftaran = res.data.pendaftaran || [];
    renderPendaftaranTable();
  } catch {
    document.getElementById('pendaftaranTable').innerHTML = `<tr><td colspan="7" class="table-empty">Gagal memuat data</td></tr>`;
  }
}

function renderPendaftaranTable() {
  const q   = (document.getElementById('searchPendaftaran')?.value || '').toLowerCase();
  const st  = document.getElementById('fdStatus')?.value || '';

  const list = dataPendaftaran.filter(p =>
    (!q  || p.peserta_nama.toLowerCase().includes(q) || p.pelatihan_judul.toLowerCase().includes(q)) &&
    (!st || p.status === st)
  );

  document.getElementById('pendaftaranSub').textContent = `${list.length} pendaftaran`;

  /* update pending badge */
  const pendingCount = dataPendaftaran.filter(p => p.status === 'pending').length;
  const badge        = document.getElementById('badgePending');
  badge.textContent  = pendingCount;
  badge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';

  const tb = document.getElementById('pendaftaranTable');
  if (!list.length) { tb.innerHTML = '<tr><td colspan="7" class="table-empty">Tidak ada data</td></tr>'; return; }

  tb.innerHTML = list.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div style="font-weight:600;color:var(--text-head)">${p.peserta_nama}</div>
        <div style="font-size:12px;color:var(--text-muted)">${p.peserta_email}</div>
      </td>
      <td>
        <div style="font-weight:500">${p.pelatihan_judul}</div>
        <div style="font-size:12px;color:var(--text-muted)">${formatTgl(p.jadwal)}</div>
      </td>
      <td>${p.peserta_instansi || '—'}</td>
      <td>${formatTgl(p.created_at)}</td>
      <td>${statusBadge(p.status, 'pendaftaran')}</td>
      <td>
        <button class="btn-xs btn-xs-status" onclick="openModalStatus(${p.id})">Update Status</button>
      </td>
    </tr>`).join('');
}

/* ── Modal Update Status ── */
let editingStatusId = null;

function openModalStatus(id) {
  const p = dataPendaftaran.find(x => x.id === id);
  if (!p) return;
  editingStatusId = id;

  document.getElementById('statusInfoBox').innerHTML = `
    <strong>${p.peserta_nama}</strong> — ${p.pelatihan_judul}<br>
    <span style="font-size:12px;color:var(--text-muted)">Mendaftar: ${formatTgl(p.created_at)}</span>`;
  document.getElementById('sStatus').value   = p.status;
  document.getElementById('sCatatan').value  = p.catatan_admin || '';
  document.getElementById('sErr').textContent = '';
  document.getElementById('modalStatusOverlay').classList.add('active');
}

function closeModalStatus() { document.getElementById('modalStatusOverlay').classList.remove('active'); }

async function submitUpdateStatus() {
  if (!editingStatusId) return;
  const btn     = document.getElementById('btnSaveStatus');
  const status  = document.getElementById('sStatus').value;
  const catatan = document.getElementById('sCatatan').value.trim();
  const errEl   = document.getElementById('sErr');

  errEl.textContent = '';
  btn.disabled      = true;
  btn.textContent   = 'Menyimpan…';

  try {
    await api(`/admin/pendaftaran/${editingStatusId}/status`, {
      method: 'PUT',
      body:   JSON.stringify({ status, catatan_admin: catatan || null }),
    });
    toast(`Status diperbarui menjadi "${status}".`);
    closeModalStatus();
    await loadPendaftaran();
  } catch (err) {
    errEl.textContent = err?.message || 'Gagal memperbarui status.';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Simpan';
  }
}

/* ══════════════════════════════════════════════════════════
   USERS
══════════════════════════════════════════════════════════ */
async function loadUsers() {
  try {
    const res = await api('/admin/users');
    dataUsers = res.data.users || [];
    renderUsersTable();
  } catch {
    document.getElementById('usersTable').innerHTML = `<tr><td colspan="8" class="table-empty">Gagal memuat data</td></tr>`;
  }
}

function renderUsersTable() {
  const q    = (document.getElementById('searchUsers')?.value || '').toLowerCase();
  const role = document.getElementById('fuRole')?.value || '';

  const list = dataUsers.filter(u =>
    (!q    || u.nama.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
    (!role || u.role === role)
  );

  document.getElementById('usersSub').textContent = `${list.length} pengguna`;

  const tb = document.getElementById('usersTable');
  if (!list.length) { tb.innerHTML = '<tr><td colspan="8" class="table-empty">Tidak ada data</td></tr>'; return; }

  tb.innerHTML = list.map((u, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${u.nama}</strong></td>
      <td>${u.email}</td>
      <td>${u.nik || '—'}</td>
      <td>${u.no_hp || '—'}</td>
      <td>${u.instansi || '—'}</td>
      <td>${statusBadge(u.role, 'role')}</td>
      <td>${formatTgl(u.created_at)}</td>
    </tr>`).join('');
}

/* ══════════════════════════════════════════════════════════
   LAPORAN
══════════════════════════════════════════════════════════ */
async function loadLaporan() {
  try {
    const [resPelatihan, resPendaftaran] = await Promise.all([
      api('/admin/pelatihan'),
      api('/admin/pendaftaran'),
    ]);

    const pelatihan   = (resPelatihan.data.pelatihan || []).map(p => ({ ...p, tags: normTags(p.tags) }));
    const pendaftaran = resPendaftaran.data.pendaftaran || [];

    /* ─ Summary stats ─ */
    const totalPelatihan   = pelatihan.length;
    const totalPendaftaran = pendaftaran.length;
    const approved         = pendaftaran.filter(p => p.status === 'approved').length;
    const approvedRate     = totalPendaftaran ? Math.round(approved / totalPendaftaran * 100) : 0;
    const avgKuota         = pelatihan.length
      ? Math.round(pelatihan.reduce((s, p) => s + (p.kuota ? p.kuota_terisi / p.kuota : 0), 0) / pelatihan.length * 100)
      : 0;

    document.getElementById('lTotalPelatihan').textContent   = totalPelatihan;
    document.getElementById('lTotalPendaftaran').textContent = totalPendaftaran;
    document.getElementById('lApprovedRate').textContent     = `${approvedRate}%`;
    document.getElementById('lAvgKuota').textContent         = `${avgKuota}%`;

    /* ─ Chart: Pendaftaran per pelatihan ─ */
    const daftarPerPelatihan = pelatihan.map(p => ({
      label: p.judul.length > 25 ? p.judul.slice(0, 25) + '…' : p.judul,
      count: pendaftaran.filter(d => d.pelatihan_id === p.id).length,
    }));
    mkChart('chartPendaftaranPerPelatihan', 'bar', {
      labels:   daftarPerPelatihan.map(x => x.label),
      datasets: [{ label: 'Pendaftar', data: daftarPerPelatihan.map(x => x.count), backgroundColor: 'rgba(124,58,237,.7)', borderRadius: 6, borderSkipped: false }],
    }, { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } });

    /* ─ Chart: Kategori ─ */
    const kategoriMap = {};
    pelatihan.forEach(p => { kategoriMap[p.kategori] = (kategoriMap[p.kategori] || 0) + 1; });
    mkChart('chartKategori', 'pie', {
      labels:   Object.keys(kategoriMap),
      datasets: [{ data: Object.values(kategoriMap), backgroundColor: ['#7c3aed','#3b82f6','#ec4899','#f59e0b','#10b981'], borderWidth: 0 }],
    }, { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } } });

    /* ─ Chart: Status pendaftaran ─ */
    const pendStatus = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    pendaftaran.forEach(p => { pendStatus[p.status] = (pendStatus[p.status] || 0) + 1; });
    mkChart('chartLaporanStatus', 'doughnut', {
      labels:   ['Pending','Disetujui','Ditolak','Dibatalkan'],
      datasets: [{ data: [pendStatus.pending, pendStatus.approved, pendStatus.rejected, pendStatus.cancelled], backgroundColor: ['#f59e0b','#10b981','#ef4444','#9ca3af'], borderWidth: 0 }],
    }, { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } } });

    /* ─ Chart: Tingkat pengisian kuota ─ */
    mkChart('chartKuota', 'bar', {
      labels:   pelatihan.map(p => p.judul.length > 20 ? p.judul.slice(0, 20) + '…' : p.judul),
      datasets: [{
        label: '% Terisi',
        data:  pelatihan.map(p => p.kuota ? Math.round(p.kuota_terisi / p.kuota * 100) : 0),
        backgroundColor: pelatihan.map(p => {
          const pct = p.kuota ? p.kuota_terisi / p.kuota : 0;
          return pct >= 1 ? '#ef4444' : pct >= .85 ? '#f59e0b' : '#10b981';
        }),
        borderRadius: 6, borderSkipped: false,
      }],
    }, { plugins: { legend: { display: false } }, scales: { y: { max: 100, ticks: { callback: v => v + '%' } } } });

    /* ─ Tabel ringkasan ─ */
    const tb = document.getElementById('laporanTable');
    tb.innerHTML = pelatihan.map((p, i) => {
      const daftarCount   = pendaftaran.filter(d => d.pelatihan_id === p.id).length;
      const approvedCount = pendaftaran.filter(d => d.pelatihan_id === p.id && d.status === 'approved').length;
      const pct           = p.kuota ? Math.round(p.kuota_terisi / p.kuota * 100) : 0;
      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${p.icon || '📚'} ${escHtml(p.judul)}</strong></td>
          <td>${p.kategori}</td>
          <td>${p.kuota}</td>
          <td>${p.kuota_terisi}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div class="mini-progress"><div class="mini-fill" style="width:${pct}%;background:${pct>=100?'#ef4444':pct>=85?'#f59e0b':'#10b981'}"></div></div>
              <span>${pct}%</span>
            </div>
          </td>
          <td>${daftarCount}</td>
          <td>${approvedCount}</td>
          <td>
            <button class="btn-xs btn-xs-view" onclick="showPesertaPerPelatihan(${p.id}, '${escHtml(p.judul)}', '${p.icon || '📚'}')">
              👥 Lihat Peserta
            </button>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('laporan:', err);
    toast('Gagal memuat data laporan.', 'error');
  }
}

/* ══════════════════════════════════════════════════════════
   EXPORT CSV
══════════════════════════════════════════════════════════ */
function downloadCSV(filename, rows) {
  const csv  = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportPendaftaranCSV() {
  if (!dataPendaftaran.length) { toast('Tidak ada data untuk diekspor.', 'error'); return; }
  const headers = ['No','Nama Peserta','Email','NIK/NIP','Instansi','Pelatihan','Jadwal','Mode','Tgl Daftar','Status','Catatan Admin'];
  const rows    = dataPendaftaran.map((p, i) => [
    i + 1, p.peserta_nama, p.peserta_email, p.peserta_nik || '', p.peserta_instansi || '',
    p.pelatihan_judul, formatTgl(p.jadwal), p.mode, formatTgl(p.created_at), p.status, p.catatan_admin || '',
  ]);
  downloadCSV(`pendaftaran_silatih_${dateSlug()}.csv`, [headers, ...rows]);
  toast('File CSV berhasil diunduh.');
}

function exportUsersCSV() {
  if (!dataUsers.length) { toast('Tidak ada data untuk diekspor.', 'error'); return; }
  const headers = ['No','Nama','Email','NIK/NIP','No HP','Instansi','Role','Tgl Bergabung'];
  const rows    = dataUsers.map((u, i) => [
    i + 1, u.nama, u.email, u.nik || '', u.no_hp || '', u.instansi || '', u.role, formatTgl(u.created_at),
  ]);
  downloadCSV(`users_silatih_${dateSlug()}.csv`, [headers, ...rows]);
  toast('File CSV berhasil diunduh.');
}

async function exportLaporanCSV() {
  try {
    const [resPelatihan, resPendaftaran] = await Promise.all([
      api('/admin/pelatihan'), api('/admin/pendaftaran'),
    ]);
    const pelatihan   = resPelatihan.data.pelatihan   || [];
    const pendaftaran = resPendaftaran.data.pendaftaran || [];

    const headers = ['No','Judul Pelatihan','Kategori','Mode','Jadwal','Kuota','Terisi','% Terisi','Total Pendaftar','Disetujui','Pending','Ditolak','Dibatalkan'];
    const rows    = pelatihan.map((p, i) => {
      const byPel     = pendaftaran.filter(d => d.pelatihan_id === p.id);
      const pct       = p.kuota ? Math.round(p.kuota_terisi / p.kuota * 100) : 0;
      return [
        i + 1, p.judul, p.kategori, p.mode, formatTgl(p.jadwal),
        p.kuota, p.kuota_terisi, pct + '%',
        byPel.length,
        byPel.filter(d => d.status === 'approved').length,
        byPel.filter(d => d.status === 'pending').length,
        byPel.filter(d => d.status === 'rejected').length,
        byPel.filter(d => d.status === 'cancelled').length,
      ];
    });
    downloadCSV(`laporan_silatih_${dateSlug()}.csv`, [headers, ...rows]);
    toast('Laporan CSV berhasil diunduh.');
  } catch {
    toast('Gagal mengekspor laporan.', 'error');
  }
}

function dateSlug() {
  return new Date().toISOString().slice(0, 10);
}

/* ══════════════════════════════════════════════════════════
   MODAL DAFTAR PESERTA PER PELATIHAN
══════════════════════════════════════════════════════════ */
let currentPesertaData = [];   // cache untuk export CSV
let currentPelatihanCtx = {};  // { id, judul, icon }

async function showPesertaPerPelatihan(id, judul, icon) {
  currentPelatihanCtx = { id, judul, icon };

  document.getElementById('modalPesertaTitle').textContent  = `${icon} ${judul}`;
  document.getElementById('modalPesertaSub').textContent    = 'Memuat data…';
  document.getElementById('pesertaStatsStrip').innerHTML    = '';
  document.getElementById('pesertaModalTable').innerHTML    = '<tr><td colspan="9" class="table-empty">Memuat…</td></tr>';
  document.getElementById('searchPesertaModal').value       = '';
  document.getElementById('filterStatusPeserta').value      = '';
  document.getElementById('modalPesertaOverlay').classList.add('active');

  try {
    const res = await api(`/admin/pendaftaran/pelatihan/${id}`);
    currentPesertaData = res.data.pendaftaran || [];

    document.getElementById('modalPesertaSub').textContent =
      `${res.data.pelatihan} — ${currentPesertaData.length} pendaftar`;

    renderPesertaModal();
  } catch (err) {
    document.getElementById('pesertaModalTable').innerHTML =
      '<tr><td colspan="9" class="table-empty">Gagal memuat data pendaftar.</td></tr>';
    document.getElementById('modalPesertaSub').textContent = '';
  }
}

function renderPesertaModal() {
  const q   = (document.getElementById('searchPesertaModal')?.value  || '').toLowerCase();
  const st  =  document.getElementById('filterStatusPeserta')?.value || '';

  const list = currentPesertaData.filter(p =>
    (!q  || p.nama.toLowerCase().includes(q) ||
             p.email.toLowerCase().includes(q) ||
             (p.instansi || '').toLowerCase().includes(q)) &&
    (!st || p.status === st)
  );

  /* stats strip */
  const counts = { total: currentPesertaData.length, pending:0, approved:0, rejected:0, cancelled:0 };
  currentPesertaData.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });
  document.getElementById('pesertaStatsStrip').innerHTML = `
    <div class="peserta-stat">
      <div class="peserta-stat-num">${counts.total}</div>
      <div class="peserta-stat-label">Total Pendaftar</div>
    </div>
    <div class="peserta-stat">
      <div class="peserta-stat-num" style="color:#f59e0b">${counts.pending}</div>
      <div class="peserta-stat-label">Pending</div>
    </div>
    <div class="peserta-stat">
      <div class="peserta-stat-num" style="color:#10b981">${counts.approved}</div>
      <div class="peserta-stat-label">Disetujui</div>
    </div>
    <div class="peserta-stat">
      <div class="peserta-stat-num" style="color:#ef4444">${counts.rejected}</div>
      <div class="peserta-stat-label">Ditolak</div>
    </div>
    <div class="peserta-stat">
      <div class="peserta-stat-num" style="color:#9ca3af">${counts.cancelled}</div>
      <div class="peserta-stat-label">Dibatalkan</div>
    </div>`;

  const tb = document.getElementById('pesertaModalTable');
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="9" class="table-empty">Tidak ada data yang sesuai filter</td></tr>';
    return;
  }

  tb.innerHTML = list.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div style="font-weight:600;color:var(--text-head)">${escHtml(p.nama)}</div>
      </td>
      <td style="font-size:12px">${escHtml(p.email)}</td>
      <td style="font-size:12px">${p.nik || '—'}</td>
      <td style="font-size:12px">${p.no_hp || '—'}</td>
      <td style="font-size:12px">${escHtml(p.instansi || '—')}</td>
      <td style="font-size:12px;white-space:nowrap">${formatTgl(p.created_at)}</td>
      <td>${statusBadge(p.status, 'pendaftaran')}</td>
      <td style="font-size:12px;color:var(--text-muted);max-width:160px">${escHtml(p.catatan_admin || '—')}</td>
    </tr>`).join('');
}

function closeModalPeserta() {
  document.getElementById('modalPesertaOverlay').classList.remove('active');
  currentPesertaData  = [];
  currentPelatihanCtx = {};
}

function exportPesertaCSV() {
  if (!currentPesertaData.length) { toast('Tidak ada data untuk diekspor.', 'error'); return; }
  const headers = ['No','Nama','Email','NIK/NIP','No HP','Instansi','Tgl Daftar','Status','Catatan Admin'];
  const rows    = currentPesertaData.map((p, i) => [
    i + 1, p.nama, p.email, p.nik || '', p.no_hp || '',
    p.instansi || '', formatTgl(p.created_at), p.status, p.catatan_admin || '',
  ]);
  const slug = currentPelatihanCtx.judul?.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) || 'pelatihan';
  downloadCSV(`peserta_${slug}_${dateSlug()}.csv`, [headers, ...rows]);
  toast('File CSV berhasil diunduh.');
}

/* ══════════════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════════════ */
function escHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* password toggle on login */
  document.querySelectorAll('.btn-toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      inp.type        = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? '👁' : '🙈';
    });
  });

  /* ESC closes modals */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeModalPelatihan();
    closeModalStatus();
    closeModalDelete();
    closeModalPeserta();
  });

  /* Overlay click closes modal */
  ['modalPelatihanOverlay','modalStatusOverlay','modalDeleteOverlay','modalPesertaOverlay'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', function (e) {
      if (e.target === this) {
        closeModalPelatihan();
        closeModalStatus();
        closeModalDelete();
        closeModalPeserta();
      }
    });
  });

  /* Auto-login if token exists */
  if (adminToken && adminUser?.role === 'admin') {
    initApp();
  }
});
