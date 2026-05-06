/* ══════════════════════════════════════════════════════════
   SiLatih — Frontend App (connected to REST API)
   ══════════════════════════════════════════════════════════ */

const API_URL = 'http://localhost:3001/api';

/* ── Auth state ─────────────────────────────────────────────── */
let authToken = localStorage.getItem('silatih_token') || null;
let authUser  = JSON.parse(localStorage.getItem('silatih_user') || 'null');

/* ── Data state ─────────────────────────────────────────────── */
let TRAININGS     = [];
let registeredIds = [];   // pelatihan_id yang sudah didaftar user ini
let currentTraining = null;

/* ── Filter state ───────────────────────────────────────────── */
let activeCategory = 'all';
let activeStatus   = 'all';
let activeMode     = 'all';
let searchQuery    = '';

/* ══════════════════════════════════════════════════════════
   API HELPER
   ══════════════════════════════════════════════════════════ */
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res  = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

/* ══════════════════════════════════════════════════════════
   DATA LOADERS
   ══════════════════════════════════════════════════════════ */
async function loadPelatihan() {
  try {
    const res = await api('/pelatihan');
    TRAININGS = (res.data.pelatihan || []).map(normalizePelatihan);
  } catch {
    TRAININGS = [];
  }
}

async function loadMyPendaftaran() {
  if (!authToken) { registeredIds = []; return; }
  try {
    const res = await api('/pendaftaran/saya');
    registeredIds = (res.data.pendaftaran || [])
      .filter(p => !['cancelled', 'rejected'].includes(p.status))
      .map(p => p.pelatihan_id);
  } catch {
    registeredIds = [];
  }
}

/* tags bisa datang sebagai array atau string dari MySQL */
function normalizePelatihan(p) {
  let tags = p.tags;
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags); } catch { tags = tags.split(' ').filter(Boolean); }
  }
  return { ...p, tags: Array.isArray(tags) ? tags : [] };
}

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */
const pct         = (t) => t.kuota ? Math.round((t.kuota_terisi / t.kuota) * 100) : 0;
const statusLabel = (s) => ({ open:'Dibuka', almost:'Hampir Penuh', full:'Penuh', soon:'Segera Dibuka' }[s] || s);
const modeLabel   = (m) => ({ online:'🌐 Online', offline:'📍 Offline', hybrid:'🔀 Hybrid' }[m] || m);
const initials    = (n) => (n || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();

function getFilteredList() {
  return TRAININGS.filter(t => {
    const catOk    = activeCategory === 'all' || t.kategori === activeCategory;
    const statusOk = activeStatus   === 'all' || t.status   === activeStatus;
    const modeOk   = activeMode     === 'all' || t.mode     === activeMode;
    const q        = searchQuery.toLowerCase();
    const queryOk  = !q || t.judul.toLowerCase().includes(q) ||
                     (t.tags || []).some(g => g.toLowerCase().includes(q));
    return catOk && statusOk && modeOk && queryOk;
  });
}

/* ══════════════════════════════════════════════════════════
   RENDER GRID
   ══════════════════════════════════════════════════════════ */
function showGridLoading() {
  const grid = document.getElementById('trainingGrid');
  grid.innerHTML = Array(6).fill(`
    <div class="skeleton-card">
      <div class="skeleton-banner"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line title"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
      </div>
    </div>`).join('');
  document.getElementById('emptyState').style.display = 'none';
}

function renderGrid() {
  const list  = getFilteredList();
  const grid  = document.getElementById('trainingGrid');
  const empty = document.getElementById('emptyState');

  /* summary counts */
  const counts = { open:0, almost:0, full:0, soon:0 };
  list.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
  document.getElementById('countOpen').textContent   = counts.open;
  document.getElementById('countAlmost').textContent = counts.almost;
  document.getElementById('countFull').textContent   = counts.full;
  document.getElementById('countSoon').textContent   = counts.soon;
  document.getElementById('summaryText').innerHTML =
    `Menampilkan <strong>${list.length}</strong> pelatihan`;

  if (!list.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = list.map((t, i) => {
    const p      = pct(t);
    const isReg  = registeredIds.includes(t.id);
    const sisa   = t.kuota - t.kuota_terisi;

    const btnClass = isReg ? 'btn-daftar btn-registered' :
      t.status === 'open'   ? 'btn-daftar btn-daftar-open'   :
      t.status === 'almost' ? 'btn-daftar btn-daftar-almost' :
      t.status === 'full'   ? 'btn-daftar btn-daftar-full'   :
                              'btn-daftar btn-daftar-soon';
    const btnTxt = isReg ? '✓ Terdaftar' :
      t.status === 'full' ? 'Kuota Penuh' :
      t.status === 'soon' ? 'Notifikasi'  : 'Daftar';

    const sisaHtml = t.status === 'full' ? `<span class="sisa-full">Kuota penuh</span>` :
      t.status === 'soon' ? `<span class="sisa-soon">Belum dibuka</span>` :
      sisa <= 5           ? `<span class="sisa-almost">Sisa ${sisa} kursi!</span>` :
                            `<span class="sisa-open">Sisa ${sisa} kursi</span>`;

    return `
    <div class="training-card" style="animation-delay:${i*0.06}s" onclick="openModal(${t.id})">
      <div class="card-banner">
        <div class="card-banner-gradient" style="background:${t.gradient}"></div>
        <span class="card-status-badge badge-${t.status}">${statusLabel(t.status)}</span>
        <span class="card-mode-badge">${modeLabel(t.mode)}</span>
        <span class="card-category-icon">${t.icon || '📚'}</span>
      </div>
      <div class="card-body">
        <div class="card-tags">
          ${(t.tags||[]).map(g => `<span class="card-tag">${g}</span>`).join('')}
        </div>
        <h3 class="card-title">${t.judul}</h3>
        <div class="card-meta">
          <div class="card-meta-item">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            ${formatTanggal(t.jadwal)}
          </div>
          <div class="card-meta-item">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            ${t.durasi || '-'}
          </div>
        </div>
        <div class="quota-section">
          <div class="quota-header">
            <span class="quota-label">KETERSEDIAAN KUOTA</span>
            <span class="quota-numbers" style="color:${
              t.status==='open'?'#059669':t.status==='almost'?'#d97706':t.status==='full'?'#dc2626':'#4338ca'
            }">${t.kuota_terisi}/${t.kuota}</span>
          </div>
          <div class="quota-track">
            <div class="quota-fill fill-${t.status}" style="width:${t.status==='soon'?0:p}%"></div>
          </div>
          <div class="quota-sisa">${sisaHtml}</div>
        </div>
        <div class="card-footer">
          <div class="card-instructor">
            <div class="instructor-avatar" style="background:${t.instruktur_warna||'#7c3aed'}">${initials(t.instruktur_nama)}</div>
            <span class="instructor-name">${(t.instruktur_nama||'').split(' ').slice(0,2).join(' ')}</span>
          </div>
          <button class="${btnClass}"
            onclick="event.stopPropagation(); handleCardBtn(${t.id})"
            ${t.status==='full'||isReg?'disabled':''}>
            ${btnTxt}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function formatTanggal(str) {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
}

function handleCardBtn(id) {
  const t = TRAININGS.find(x => x.id === id);
  if (!t || registeredIds.includes(id) || t.status === 'full') return;
  openModal(id);
}

/* ══════════════════════════════════════════════════════════
   MODAL DETAIL PELATIHAN
   ══════════════════════════════════════════════════════════ */
function openModal(id) {
  const t = TRAININGS.find(x => x.id === id);
  if (!t) return;
  currentTraining = t;

  document.getElementById('modalHeaderImg').style.background = t.gradient;

  document.getElementById('modalTags').innerHTML =
    `<span class="modal-tag">${t.kategori}</span>` +
    (t.tags||[]).map(g => `<span class="modal-tag">${g}</span>`).join('');

  document.getElementById('modalTitle').textContent = t.judul;

  document.getElementById('modalMeta').innerHTML = `
    <div class="modal-meta-item">
      <svg width="16" height="16" fill="none" stroke="${t.instruktur_warna}" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      <div><span>Jadwal</span><strong>${formatTanggal(t.jadwal)}</strong></div>
    </div>
    <div class="modal-meta-item">
      <svg width="16" height="16" fill="none" stroke="${t.instruktur_warna}" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      <div><span>Durasi</span><strong>${t.durasi||'-'}</strong></div>
    </div>
    <div class="modal-meta-item">
      <svg width="16" height="16" fill="none" stroke="${t.instruktur_warna}" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <div><span>Lokasi</span><strong>${t.lokasi||'-'}</strong></div>
    </div>
    <div class="modal-meta-item">
      <svg width="16" height="16" fill="none" stroke="${t.instruktur_warna}" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg>
      <div><span>Biaya</span><strong>${t.biaya||'Gratis'}</strong></div>
    </div>`;

  const p    = pct(t);
  const sisa = t.kuota - t.kuota_terisi;
  const qBg  = {open:'rgba(16,185,129,.08)',almost:'rgba(245,158,11,.08)',full:'rgba(239,68,68,.08)',soon:'rgba(99,102,241,.08)'}[t.status];
  const qBd  = {open:'rgba(16,185,129,.2)', almost:'rgba(245,158,11,.2)', full:'rgba(239,68,68,.2)', soon:'rgba(99,102,241,.2)'}[t.status];
  const sisaMsg = t.status==='full' ? '<span style="color:#dc2626;font-weight:700">Kuota telah habis</span>' :
                  t.status==='soon' ? '<span style="color:#4338ca;font-weight:700">Pendaftaran belum dibuka</span>' :
                  `<span style="color:#059669;font-weight:700">${sisa} kursi tersedia</span>`;

  const qBox = document.getElementById('modalQuotaBox');
  qBox.style.cssText = `background:${qBg};border:1px solid ${qBd};border-radius:16px;padding:16px 20px;margin-bottom:20px;`;
  qBox.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:13px;font-weight:700;color:var(--text-muted)">KETERSEDIAAN KUOTA</span>
      <span style="font-size:15px;font-weight:800">${t.kuota_terisi} / ${t.kuota} peserta</span>
    </div>
    <div class="quota-track" style="height:10px;margin-bottom:10px">
      <div class="quota-fill fill-${t.status}" style="width:${t.status==='soon'?0:p}%"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13px">
      ${sisaMsg}
      <span style="color:var(--text-muted)">${t.status==='soon'?0:p}% terisi</span>
    </div>`;

  document.getElementById('modalDesc').textContent = t.deskripsi || '';
  document.getElementById('modalInstructor').innerHTML = `
    <div class="modal-instructor-avatar" style="background:${t.instruktur_warna||'#7c3aed'}">${initials(t.instruktur_nama)}</div>
    <div>
      <div class="modal-instructor-name">${t.instruktur_nama}</div>
      <div class="modal-instructor-role">${t.instruktur_jabatan||''}</div>
    </div>`;

  const isReg = registeredIds.includes(t.id);
  const btnD  = document.getElementById('btnModalDaftar');
  btnD.style.cssText = '';

  if (isReg) {
    btnD.textContent = '✓ Anda Sudah Terdaftar';
    btnD.style.background = 'linear-gradient(135deg,#10b981,#059669)';
    btnD.style.cursor = 'default';
    btnD.onclick = null;
  } else if (t.status === 'full') {
    btnD.textContent = 'Kuota Penuh';
    btnD.style.cssText = 'background:rgba(0,0,0,.08);color:var(--text-muted);cursor:not-allowed;box-shadow:none;display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:50px;font-size:15px;font-weight:600;width:100%';
    btnD.onclick = null;
  } else if (t.status === 'soon') {
    btnD.textContent = 'Daftar Notifikasi';
    btnD.style.background = 'linear-gradient(135deg,#6366f1,#818cf8)';
    btnD.onclick = () => onClickDaftar();
  } else {
    btnD.textContent = 'Daftar Sekarang →';
    btnD.style.background = 'var(--grad-main)';
    btnD.onclick = () => onClickDaftar();
  }

  document.getElementById('formSubtitle').textContent =
    `Mendaftar: ${t.judul} — ${formatTanggal(t.jadwal)}`;

  showStep(1);
  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function onClickDaftar() {
  if (!authToken) {
    /* simpan intent, tutup modal pelatihan, buka auth */
    closeModal();
    showAuthModal('login', true);
    return;
  }
  showStep(2);
}

function showStep(n) {
  [1,2,3].forEach(i => {
    document.getElementById(`step${i}`).style.display = i === n ? 'block' : 'none';
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
  resetRegForm();
}

function resetRegForm() {
  const f = document.getElementById('regForm');
  if (f) f.reset();
  ['fNama','fNik','fEmail','fHp','fMotivasi'].forEach(id => {
    document.getElementById(id)?.classList.remove('error');
  });
  ['errNama','errNik','errEmail','errHp','errMotivasi','errAgree'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

/* ══════════════════════════════════════════════════════════
   FORMULIR PENDAFTARAN → POST ke API
   ══════════════════════════════════════════════════════════ */
async function submitPendaftaran(e) {
  e.preventDefault();
  const nama     = document.getElementById('fNama');
  const nik      = document.getElementById('fNik');
  const email    = document.getElementById('fEmail');
  const hp       = document.getElementById('fHp');
  const motivasi = document.getElementById('fMotivasi');
  const agree    = document.getElementById('fAgree');
  let ok = true;

  const setErr = (el, msgId, msg) => { el.classList.add('error'); document.getElementById(msgId).textContent = msg; ok = false; };
  const clrErr = (el, msgId)      => { el.classList.remove('error'); document.getElementById(msgId).textContent = ''; };

  if (!nama.value.trim() || nama.value.trim().length < 3) setErr(nama, 'errNama', 'Nama minimal 3 karakter'); else clrErr(nama,'errNama');
  if (!/^\d{10,18}$/.test(nik.value.trim()))               setErr(nik,  'errNik',  'NIK/NIP harus 10–18 digit'); else clrErr(nik,'errNik');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) setErr(email,'errEmail','Format email tidak valid'); else clrErr(email,'errEmail');
  if (!/^0\d{8,13}$/.test(hp.value.trim()))                setErr(hp,   'errHp',   'No HP diawali 0, 9–14 digit'); else clrErr(hp,'errHp');
  if (!motivasi.value.trim() || motivasi.value.trim().length < 20) setErr(motivasi,'errMotivasi','Motivasi minimal 20 karakter'); else clrErr(motivasi,'errMotivasi');
  if (!agree.checked) { document.getElementById('errAgree').textContent = 'Setujui syarat & ketentuan'; ok = false; }
  else document.getElementById('errAgree').textContent = '';
  if (!ok) return;

  const btn = document.querySelector('#regForm button[type="submit"]');
  btn.textContent = 'Mengirim…';
  btn.disabled = true;

  try {
    await api('/pendaftaran', {
      method: 'POST',
      body: JSON.stringify({
        pelatihan_id: currentTraining.id,
        motivasi: motivasi.value.trim(),
      }),
    });

    /* update state lokal agar langsung keliatan berubah tanpa reload */
    registeredIds.push(currentTraining.id);
    const t = TRAININGS.find(x => x.id === currentTraining.id);
    if (t && t.status !== 'soon') {
      t.kuota_terisi = Math.min(t.kuota_terisi + 1, t.kuota);
      if (t.kuota_terisi >= t.kuota)              t.status = 'full';
      else if (t.kuota_terisi / t.kuota >= 0.85)  t.status = 'almost';
    }

    document.getElementById('successMsg').textContent =
      `Pendaftaran untuk "${currentTraining.judul}" berhasil dikirim. Admin akan mengonfirmasi melalui email Anda.`;
    document.getElementById('successInfo').innerHTML = `
      <div class="success-info-item"><svg width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><strong>Program:</strong><span>${currentTraining.judul}</span></div>
      <div class="success-info-item"><svg width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><strong>Jadwal:</strong><span>${formatTanggal(currentTraining.jadwal)}</span></div>
      <div class="success-info-item"><svg width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><strong>Peserta:</strong><span>${nama.value.trim()}</span></div>
      <div class="success-info-item"><svg width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><strong>Konfirmasi:</strong><span>${email.value.trim()}</span></div>`;

    showStep(3);
    renderGrid();
  } catch (err) {
    const msg = err?.message || 'Pendaftaran gagal. Coba lagi.';
    document.getElementById('errAgree').textContent = msg;
  } finally {
    btn.textContent = 'Kirim Pendaftaran';
    btn.disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════
   AUTH — LOGIN & REGISTER
   ══════════════════════════════════════════════════════════ */
let afterAuthOpenModal = false; /* buka modal pendaftaran setelah login */

function showAuthModal(tab = 'login', afterDaftar = false) {
  afterAuthOpenModal = afterDaftar;
  switchAuthTab(tab);
  document.getElementById('authOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  document.getElementById('authOverlay').classList.remove('active');
  document.body.style.overflow = '';
  document.getElementById('loginForm').reset();
  document.getElementById('registerForm').reset();
  ['lErrEmail','lErrPassword','lErrGeneral','rErrNama','rErrNik','rErrHp','rErrEmail','rErrPassword','rErrGeneral']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
}

function switchAuthTab(tab) {
  document.getElementById('paneLogin').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('paneRegister').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tab === 'login' ? 'tabLogin' : 'tabRegister').classList.add('active');
}

function setAuthState(token, user) {
  authToken = token;
  authUser  = user;
  localStorage.setItem('silatih_token', token);
  localStorage.setItem('silatih_user',  JSON.stringify(user));
}

async function doLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('lEmail').value.trim();
  const password = document.getElementById('lPassword').value;
  const btn      = document.getElementById('btnLoginSubmit');

  document.getElementById('lErrGeneral').textContent = '';
  btn.textContent = 'Memeriksa…';
  btn.disabled = true;

  try {
    const res = await api('/auth/login', { method:'POST', body: JSON.stringify({ email, password }) });
    setAuthState(res.data.token, res.data.user);
    await loadMyPendaftaran();
    updateNavbar();
    renderGrid();
    closeAuthModal();

    if (afterAuthOpenModal && currentTraining) {
      setTimeout(() => {
        document.getElementById('modalOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
        showStep(2);
      }, 300);
    }
  } catch (err) {
    document.getElementById('lErrGeneral').textContent = err?.message || 'Login gagal. Periksa email & password.';
  } finally {
    btn.textContent = 'Masuk ke SiLatih';
    btn.disabled = false;
  }
}

async function doRegister(e) {
  e.preventDefault();
  const nama     = document.getElementById('rNama').value.trim();
  const nik      = document.getElementById('rNik').value.trim();
  const email    = document.getElementById('rEmail').value.trim();
  const password = document.getElementById('rPassword').value;
  const no_hp    = document.getElementById('rHp').value.trim();
  const instansi = document.getElementById('rInstansi').value.trim();
  const btn      = document.getElementById('btnRegisterSubmit');
  let ok = true;

  const setErr = (id, msg) => { document.getElementById(id).textContent = msg; ok = false; };
  const clrErr = (id)      => { document.getElementById(id).textContent = ''; };

  if (!nama || nama.length < 3) setErr('rErrNama', 'Nama minimal 3 karakter'); else clrErr('rErrNama');
  if (!/^\d{10,18}$/.test(nik)) setErr('rErrNik',  'NIK/NIP harus 10–18 digit angka'); else clrErr('rErrNik');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) setErr('rErrEmail','Format email tidak valid'); else clrErr('rErrEmail');
  if (!password || password.length < 8) setErr('rErrPassword','Password minimal 8 karakter'); else clrErr('rErrPassword');
  if (!/^0\d{8,13}$/.test(no_hp)) setErr('rErrHp','No HP diawali 0, 9–14 digit'); else clrErr('rErrHp');
  if (!ok) return;

  document.getElementById('rErrGeneral').textContent = '';
  btn.textContent = 'Membuat akun…';
  btn.disabled = true;

  try {
    const res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nama, nik, email, password, no_hp, instansi }),
    });
    setAuthState(res.data.token, res.data.user);
    await loadMyPendaftaran();
    updateNavbar();
    renderGrid();
    closeAuthModal();

    if (afterAuthOpenModal && currentTraining) {
      setTimeout(() => {
        document.getElementById('modalOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
        showStep(2);
      }, 300);
    }
  } catch (err) {
    document.getElementById('rErrGeneral').textContent = err?.message || 'Registrasi gagal. Coba lagi.';
  } finally {
    btn.textContent = 'Buat Akun';
    btn.disabled = false;
  }
}

function doLogout() {
  authToken     = null;
  authUser      = null;
  registeredIds = [];
  localStorage.removeItem('silatih_token');
  localStorage.removeItem('silatih_user');
  updateNavbar();
  renderGrid();
}

/* ══════════════════════════════════════════════════════════
   NAVBAR — update berdasarkan auth state
   ══════════════════════════════════════════════════════════ */
function updateNavbar() {
  const navAuth     = document.getElementById('navAuth');
  const pendaftaran = document.getElementById('btnNavPendaftaran');

  if (authUser) {
    navAuth.innerHTML = `
      <button class="nav-user-btn" id="btnUserMenu">
        <div class="nav-user-avatar">${initials(authUser.nama)}</div>
        ${authUser.nama.split(' ')[0]}
      </button>
      <button class="btn-logout" id="btnLogout">Keluar</button>`;
    document.getElementById('btnUserMenu').onclick = showMyPendaftaran;
    document.getElementById('btnLogout').onclick   = doLogout;
    if (pendaftaran) pendaftaran.style.display = 'block';
  } else {
    navAuth.innerHTML = `<button class="btn-cta" id="btnNavLogin">Masuk</button>`;
    document.getElementById('btnNavLogin').onclick = () => showAuthModal('login');
    if (pendaftaran) pendaftaran.style.display = 'none';
  }
}

/* ══════════════════════════════════════════════════════════
   MODAL PENDAFTARAN SAYA
   ══════════════════════════════════════════════════════════ */
async function showMyPendaftaran() {
  document.getElementById('myPendaftaranOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';

  const list = document.getElementById('myPendaftaranList');
  list.innerHTML = '<p style="color:var(--text-muted);font-size:14px">Memuat data…</p>';

  try {
    const res  = await api('/pendaftaran/saya');
    const data = res.data.pendaftaran || [];

    if (!data.length) {
      list.innerHTML = `
        <div class="my-empty">
          <div class="my-empty-icon">📋</div>
          <p>Belum ada pelatihan yang didaftarkan.</p>
          <button class="btn-primary" onclick="closeMyPendaftaran();scrollToSection('pelatihan')">Lihat Pelatihan</button>
        </div>`;
      return;
    }

    const statusCfg = {
      pending:   { label:'Menunggu',  cls:'status-pending' },
      approved:  { label:'Disetujui', cls:'status-approved' },
      rejected:  { label:'Ditolak',   cls:'status-rejected' },
      cancelled: { label:'Dibatalkan',cls:'status-cancelled' },
    };

    list.innerHTML = `<div class="my-list">` + data.map(p => {
      const s   = statusCfg[p.status] || statusCfg.pending;
      const trn = TRAININGS.find(t => t.id === p.pelatihan_id);
      return `
        <div class="my-item">
          <div class="my-item-icon" style="background:${trn?.gradient||'var(--grad-main)'}">
            ${trn?.icon || '📚'}
          </div>
          <div class="my-item-info">
            <div class="my-item-title">${p.judul || trn?.judul || '—'}</div>
            <div class="my-item-meta">📅 ${formatTanggal(p.jadwal)} · ${
              ({online:'🌐 Online',offline:'📍 Offline',hybrid:'🔀 Hybrid'}[p.mode]||p.mode||'')
            }</div>
          </div>
          <span class="my-status ${s.cls}">${s.label}</span>
        </div>`;
    }).join('') + `</div>`;
  } catch {
    list.innerHTML = '<p style="color:#ef4444;font-size:14px">Gagal memuat data pendaftaran.</p>';
  }
}

function closeMyPendaftaran() {
  document.getElementById('myPendaftaranOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════════════════════
   FILTER & SEARCH
   ══════════════════════════════════════════════════════════ */
function resetFilter() {
  activeCategory = 'all';
  activeStatus   = 'all';
  activeMode     = 'all';
  searchQuery    = '';
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  document.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
  document.getElementById('filterStatus').value = 'all';
  document.getElementById('filterMode').value   = 'all';
  document.getElementById('searchInput').value  = '';
  renderGrid();
}

/* ══════════════════════════════════════════════════════════
   NAVBAR SCROLL
   ══════════════════════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ══════════════════════════════════════════════════════════
   COUNTER ANIMATION
   ══════════════════════════════════════════════════════════ */
function animateCounters() {
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = +el.dataset.target;
    const dur = 1800, steps = 60, inc = target / steps;
    let cur = 0;
    const timer = setInterval(() => {
      cur += inc;
      if (cur >= target) { cur = target; clearInterval(timer); }
      el.textContent = Math.round(cur).toLocaleString('id-ID');
    }, dur / steps);
  });
}

/* ══════════════════════════════════════════════════════════
   PASSWORD TOGGLE
   ══════════════════════════════════════════════════════════ */
function initPassToggles() {
  document.querySelectorAll('.btn-toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? '👁' : '🙈';
    });
  });
}

/* ══════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

  /* ─ render skeleton dulu ─ */
  showGridLoading();

  /* ─ load data paralel ─ */
  await Promise.all([loadPelatihan(), loadMyPendaftaran()]);
  renderGrid();

  /* ─ navbar sesuai auth state ─ */
  updateNavbar();

  /* ─ password toggles ─ */
  initPassToggles();

  /* ─ filter chips ─ */
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.filter;
      renderGrid();
    });
  });

  document.getElementById('filterStatus').addEventListener('change', function() {
    activeStatus = this.value; renderGrid();
  });
  document.getElementById('filterMode').addEventListener('change', function() {
    activeMode = this.value; renderGrid();
  });

  let searchTimer;
  document.getElementById('searchInput').addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { searchQuery = this.value.trim(); renderGrid(); }, 260);
  });

  /* ─ modal pelatihan events ─ */
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
  document.getElementById('btnBack').addEventListener('click', () => showStep(1));

  /* ─ formulir pendaftaran ─ */
  document.getElementById('regForm').addEventListener('submit', submitPendaftaran);

  /* ─ auth modal events ─ */
  document.getElementById('authClose').addEventListener('click', closeAuthModal);
  document.getElementById('authOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeAuthModal(); });
  document.getElementById('tabLogin').addEventListener('click',    () => switchAuthTab('login'));
  document.getElementById('tabRegister').addEventListener('click', () => switchAuthTab('register'));
  document.getElementById('loginForm').addEventListener('submit',    doLogin);
  document.getElementById('registerForm').addEventListener('submit',  doRegister);

  /* ─ my pendaftaran modal ─ */
  document.getElementById('myPendaftaranClose').addEventListener('click', closeMyPendaftaran);
  document.getElementById('myPendaftaranOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeMyPendaftaran(); });
  const btnNav = document.getElementById('btnNavPendaftaran');
  if (btnNav) btnNav.addEventListener('click', e => { e.preventDefault(); showMyPendaftaran(); });

  /* ─ ESC tutup semua modal ─ */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeModal();
    closeAuthModal();
    closeMyPendaftaran();
  });

  /* ─ reveal scroll animation (section header & tentang) ─ */
  const revealEls = document.querySelectorAll('.section-header, .tentang-left, .tentang-right, .stats-card');
  revealEls.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        if (e.target.classList.contains('hero-stats')) animateCounters();
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach(el => io.observe(el));
  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) io.observe(heroStats);
});
