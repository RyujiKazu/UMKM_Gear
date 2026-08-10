const state = {
  user: null,
  selectedUnitIds: new Set(),
  catalogUnits: [],
  categories: [],
};

const authView = document.querySelector('#auth-view');
const appView = document.querySelector('#app-view');
const pageContent = document.querySelector('#page-content');
const pageTitle = document.querySelector('#page-title');
const pageKicker = document.querySelector('#page-kicker');
const dialog = document.querySelector('#entity-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogContent = document.querySelector('#dialog-content');
const toast = document.querySelector('#toast');

const navByRole = {
  member: [
    { route: 'dashboard', label: 'Ringkasan', icon: '⌂' },
    { route: 'catalog', label: 'Katalog Alat', icon: '▦' },
    { route: 'my-loans', label: 'Pinjaman Saya', icon: '↔' },
    { route: 'profile', label: 'Profil UMKM', icon: '○' },
  ],
  admin: [
    { route: 'admin-dashboard', label: 'Ringkasan', icon: '⌂' },
    { route: 'units', label: 'Data Unit', icon: '▦' },
    { route: 'active-loans', label: 'Peminjaman Aktif', icon: '↔' },
    { route: 'history', label: 'Riwayat', icon: '≡' },
    { route: 'categories', label: 'Kategori', icon: '◇' },
    { route: 'members', label: 'Anggota', icon: '○' },
  ],
};

const routeMeta = {
  dashboard: ['Ruang Anggota', 'Ringkasan'],
  catalog: ['Temukan Peralatan', 'Katalog Alat'],
  'my-loans': ['Aktivitas Saya', 'Pinjaman Saya'],
  profile: ['Identitas Usaha', 'Profil UMKM'],
  'admin-dashboard': ['Pusat Kendali', 'Ringkasan Admin'],
  units: ['Kelola Inventaris', 'Data Unit'],
  'active-loans': ['Operasional Harian', 'Peminjaman Aktif'],
  history: ['Arsip Transaksi', 'Riwayat Peminjaman'],
  categories: ['Kelola Inventaris', 'Kategori Unit'],
  members: ['Kelola Akses', 'Data Anggota'],
};

const statusLabels = {
  available: 'Tersedia',
  borrowed: 'Dipinjam',
  maintenance: 'Perawatan',
  inactive: 'Nonaktif',
  good: 'Baik',
  minor_damage: 'Rusak ringan',
  damaged: 'Rusak',
  active: 'Aktif',
  partially_returned: 'Dikembalikan sebagian',
  completed: 'Selesai',
  returned: 'Dikembalikan',
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatMoney(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value, withTime = false) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(new Date(value));
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.className = `toast${isError ? ' error' : ''}`;
  toast.hidden = false;
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => { toast.hidden = true; }, 3600);
}

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.includes('/auth/login')) showLogin();
    const error = new Error(payload.error?.message ?? 'Permintaan tidak dapat diproses.');
    error.details = payload.error?.details;
    throw error;
  }
  return payload.data;
}

function loading() {
  pageContent.innerHTML = '<div class="loading">Memuat data...</div>';
}

function emptyState(title, description, icon = '○') {
  return `
    <div class="empty-state">
      <div>
        <span class="empty-state-icon">${icon}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
    </div>`;
}

function statCard(label, value, help, icon, highlight = false) {
  return `
    <article class="stat-card${highlight ? ' highlight' : ''}">
      <div class="stat-label"><span>${escapeHtml(label)}</span><span class="stat-icon">${icon}</span></div>
      <strong class="stat-value">${escapeHtml(value)}</strong>
      <span class="stat-help">${escapeHtml(help)}</span>
    </article>`;
}

function showLogin() {
  state.user = null;
  state.selectedUnitIds.clear();
  appView.hidden = true;
  authView.hidden = false;
}

function showApp() {
  authView.hidden = true;
  appView.hidden = false;
  document.querySelector('#sidebar-user-name').textContent = state.user.name;
  document.querySelector('#sidebar-user-role').textContent = state.user.role === 'admin' ? 'Administrator' : 'Anggota UMKM';
  document.querySelector('#user-avatar').textContent = initials(state.user.name);
  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());
  renderNavigation();

  const allowed = navByRole[state.user.role].map((item) => item.route);
  const fallback = state.user.role === 'admin' ? 'admin-dashboard' : 'dashboard';
  const requested = location.hash.slice(1);
  if (!allowed.includes(requested)) location.hash = fallback;
  else loadRoute(requested);
}

function renderNavigation() {
  const items = navByRole[state.user.role];
  const markup = items.map((item) => `
    <button class="nav-link" type="button" data-route="${item.route}">
      <span class="nav-icon" aria-hidden="true">${item.icon}</span>
      <span>${item.label}</span>
    </button>`).join('');
  document.querySelector('#main-nav').innerHTML = markup;
  document.querySelector('#mobile-nav').innerHTML = items.slice(0, 4).map((item) => `
    <button class="nav-link" type="button" data-route="${item.route}">
      <span class="nav-icon" aria-hidden="true">${item.icon}</span>
      <span>${item.label}</span>
    </button>`).join('');

  document.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => { location.hash = button.dataset.route; });
  });
}

function markActiveNavigation(route) {
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.classList.toggle('active', button.dataset.route === route);
  });
}

async function loadRoute(route) {
  if (!state.user) return;
  const allowed = navByRole[state.user.role].map((item) => item.route);
  if (!allowed.includes(route)) {
    location.hash = state.user.role === 'admin' ? 'admin-dashboard' : 'dashboard';
    return;
  }

  markActiveNavigation(route);
  const [kicker, title] = routeMeta[route];
  pageKicker.textContent = kicker;
  pageTitle.textContent = title;
  loading();

  try {
    const renderers = {
      dashboard: renderMemberDashboard,
      catalog: renderCatalog,
      'my-loans': renderMyLoans,
      profile: renderProfile,
      'admin-dashboard': renderAdminDashboard,
      units: renderUnitsAdmin,
      'active-loans': renderActiveLoans,
      history: renderHistory,
      categories: renderCategoriesAdmin,
      members: renderMembersAdmin,
    };
    await renderers[route]();
    pageContent.focus({ preventScroll: true });
  } catch (error) {
    pageContent.innerHTML = emptyState('Data belum dapat dimuat', error.message, '!');
    showToast(error.message, true);
  }
}

async function renderMemberDashboard() {
  const [units, loans] = await Promise.all([api('/units'), api('/loans/mine')]);
  const active = loans.filter((item) => item.itemStatus === 'borrowed');
  const overdue = active.filter((item) => item.isOverdue);
  const available = units.filter((unit) => unit.availabilityStatus === 'available');
  const dueSoon = [...active].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0];
  const suggestions = available.slice(0, 4);

  const chip = document.querySelector('#active-loan-chip');
  chip.hidden = false;
  chip.textContent = `${active.length}/2 unit aktif`;

  pageContent.innerHTML = `
    <section class="stats-grid">
      ${statCard('Unit sedang dipinjam', String(active.length), 'Maksimal 2 unit aktif', '↔', true)}
      ${statCard('Alat tersedia', String(available.length), 'Siap dipinjam hari ini', '▦')}
      ${statCard('Jatuh tempo terdekat', dueSoon ? formatDate(dueSoon.dueAt) : '-', dueSoon ? dueSoon.unitName : 'Belum ada pinjaman', '◷')}
      ${statCard('Terlambat', String(overdue.length), overdue.length ? 'Segera hubungi admin' : 'Semua terkendali', '!')}
    </section>
    <section class="dashboard-grid">
      <div class="panel">
        <div class="panel-header"><h3>Alat yang bisa membantu usahamu</h3><button class="text-button" data-go="catalog">Lihat semua</button></div>
        <div class="panel-body quick-list">
          ${suggestions.length ? suggestions.map((unit) => `
            <div class="quick-item">
              <span class="item-thumb">${escapeHtml(initials(unit.name).slice(0, 1))}</span>
              <div><strong>${escapeHtml(unit.name)}</strong><span>${escapeHtml(unit.unitCode)} · ${formatMoney(unit.finePerDay)}/hari jika terlambat</span></div>
              <span class="badge available">Tersedia</span>
            </div>`).join('') : emptyState('Belum ada unit tersedia', 'Coba kembali setelah unit dikembalikan.')}
        </div>
      </div>
      <aside class="panel">
        <div class="panel-header"><h3>Aturan singkat</h3></div>
        <div class="panel-body">
          <div class="quick-list">
            <div class="quick-item"><span class="item-thumb">2</span><div><strong>Maksimal dua unit</strong><span>Akumulasi seluruh pinjaman aktif.</span></div></div>
            <div class="quick-item"><span class="item-thumb">5</span><div><strong>Maksimal lima hari</strong><span>Pilih durasi sesuai kebutuhan.</span></div></div>
            <div class="quick-item"><span class="item-thumb">A</span><div><strong>Kembali melalui admin</strong><span>Admin mencatat kondisi dan denda.</span></div></div>
          </div>
        </div>
      </aside>
    </section>`;
  pageContent.querySelector('[data-go="catalog"]')?.addEventListener('click', () => { location.hash = 'catalog'; });
}

function unitCard(unit) {
  const selected = state.selectedUnitIds.has(unit.id);
  const available = unit.availabilityStatus === 'available';
  return `
    <article class="unit-card${selected ? ' selected' : ''}">
      <div class="unit-card-top">
        <span class="unit-symbol">${escapeHtml(initials(unit.name).slice(0, 1))}</span>
        <span class="badge ${unit.availabilityStatus}">${statusLabels[unit.availabilityStatus] ?? unit.availabilityStatus}</span>
      </div>
      <h3>${escapeHtml(unit.name)}</h3>
      <span class="unit-code">${escapeHtml(unit.unitCode)}</span>
      <p class="unit-description">${escapeHtml(unit.description ?? 'Peralatan produktif untuk mendukung operasional UMKM.')}</p>
      <div class="tags">${unit.categories.map((category) => `<span class="tag">${escapeHtml(category.name)}</span>`).join('')}</div>
      <div class="unit-card-footer">
        <span class="fine-label">Denda keterlambatan<strong>${formatMoney(unit.finePerDay)}/hari</strong></span>
        <button class="button button-small ${selected ? 'button-secondary' : 'button-primary'}" type="button" data-select-unit="${unit.id}" ${available ? '' : 'disabled'}>
          ${selected ? 'Batalkan' : 'Pilih alat'}
        </button>
      </div>
    </article>`;
}

async function renderCatalog(query = '') {
  state.catalogUnits = await api(`/units?q=${encodeURIComponent(query)}`);
  pageContent.innerHTML = `
    <div class="toolbar">
      <form id="catalog-search" class="search-box">
        <input name="q" type="search" value="${escapeHtml(query)}" placeholder="Cari nama atau kode unit..." aria-label="Cari unit">
      </form>
      <span class="muted">${state.catalogUnits.length} unit ditemukan</span>
    </div>
    <section id="catalog-grid" class="catalog-grid">
      ${state.catalogUnits.length ? state.catalogUnits.map(unitCard).join('') : emptyState('Unit tidak ditemukan', 'Coba gunakan kata pencarian lain.', '⌕')}
    </section>
    <div id="selection-bar" class="selection-bar" ${state.selectedUnitIds.size ? '' : 'hidden'}>
      <div><strong><span id="selection-count">${state.selectedUnitIds.size}</span> alat dipilih</strong><span>Maksimal dua unit per anggota</span></div>
      <button id="borrow-selected" class="button button-accent" type="button">Ajukan peminjaman</button>
    </div>`;

  pageContent.querySelector('#catalog-search').addEventListener('submit', (event) => {
    event.preventDefault();
    renderCatalog(new FormData(event.currentTarget).get('q').trim()).catch((error) => showToast(error.message, true));
  });
  bindUnitSelection();
}

function bindUnitSelection() {
  pageContent.querySelectorAll('[data-select-unit]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.selectUnit);
      if (state.selectedUnitIds.has(id)) state.selectedUnitIds.delete(id);
      else if (state.selectedUnitIds.size < 2) state.selectedUnitIds.add(id);
      else return showToast('Maksimal dua unit dapat dipilih.', true);
      const card = button.closest('.unit-card');
      card.classList.toggle('selected', state.selectedUnitIds.has(id));
      button.textContent = state.selectedUnitIds.has(id) ? 'Batalkan' : 'Pilih alat';
      button.classList.toggle('button-secondary', state.selectedUnitIds.has(id));
      button.classList.toggle('button-primary', !state.selectedUnitIds.has(id));
      const bar = pageContent.querySelector('#selection-bar');
      bar.hidden = state.selectedUnitIds.size === 0;
      pageContent.querySelector('#selection-count').textContent = state.selectedUnitIds.size;
    });
  });
  pageContent.querySelector('#borrow-selected')?.addEventListener('click', openBorrowDialog);
}

function openBorrowDialog() {
  const selected = state.catalogUnits.filter((unit) => state.selectedUnitIds.has(unit.id));
  openDialog('Ajukan peminjaman', `
    <div class="quick-list">
      ${selected.map((unit) => `<div class="quick-item"><span class="item-thumb">${initials(unit.name).slice(0, 1)}</span><div><strong>${escapeHtml(unit.name)}</strong><span>${escapeHtml(unit.unitCode)}</span></div></div>`).join('')}
    </div>
    <form id="dialog-form" class="stack-form">
      <label><span>Durasi peminjaman</span><select name="durationDays" required>
        ${[1, 2, 3, 4, 5].map((day) => `<option value="${day}" ${day === 5 ? 'selected' : ''}>${day} hari</option>`).join('')}
      </select></label>
      <label><span>Keperluan (opsional)</span><textarea name="notes" maxlength="500" placeholder="Contoh: produksi pesanan bazar akhir pekan"></textarea></label>
      <p class="inline-note">Batas pengembalian dihitung sejak peminjaman dibuat. Pengembalian hanya dapat diproses oleh admin.</p>
      <button class="button button-primary button-block" type="submit">Konfirmasi peminjaman</button>
    </form>`,
  async (form) => {
    await api('/loans', {
      method: 'POST',
      body: JSON.stringify({
        unitIds: [...state.selectedUnitIds],
        durationDays: Number(form.durationDays.value),
        notes: form.notes.value || null,
      }),
    });
    state.selectedUnitIds.clear();
    closeDialog();
    showToast('Peminjaman berhasil dibuat.');
    location.hash = 'my-loans';
  });
}

async function renderMyLoans() {
  const loans = await api('/loans/mine');
  const active = loans.filter((item) => item.itemStatus === 'borrowed');
  const history = loans.filter((item) => item.itemStatus === 'returned');
  document.querySelector('#active-loan-chip').textContent = `${active.length}/2 unit aktif`;
  document.querySelector('#active-loan-chip').hidden = false;

  const rows = (items) => items.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.unitName)}</strong><small>${escapeHtml(item.unitCode)} · ${escapeHtml(item.loanCode)}</small></td>
      <td>${formatDate(item.borrowedAt)}</td>
      <td>${formatDate(item.dueAt)}</td>
      <td><span class="badge ${item.isOverdue ? 'overdue' : item.itemStatus}">${item.isOverdue ? 'Terlambat' : statusLabels[item.itemStatus]}</span></td>
      <td class="text-right">${item.itemStatus === 'returned' ? formatMoney(item.fineAmount) : '-'}</td>
    </tr>`).join('');

  pageContent.innerHTML = `
    <div class="section-heading"><div><h2>Pinjaman aktif</h2><p>Hubungi admin saat unit akan dikembalikan.</p></div><button class="button button-primary" data-go="catalog">Pinjam alat</button></div>
    <section class="panel">
      ${active.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Unit</th><th>Mulai</th><th>Jatuh tempo</th><th>Status</th><th class="text-right">Denda</th></tr></thead><tbody>${rows(active)}</tbody></table></div>` : emptyState('Belum ada pinjaman aktif', 'Pilih alat dari katalog untuk mendukung kegiatan usahamu.', '↔')}
    </section>
    <div class="section-heading" style="margin-top:30px"><div><h2>Riwayat saya</h2><p>Unit yang sudah selesai dikembalikan.</p></div></div>
    <section class="panel">
      ${history.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Unit</th><th>Mulai</th><th>Jatuh tempo</th><th>Status</th><th class="text-right">Denda</th></tr></thead><tbody>${rows(history)}</tbody></table></div>` : emptyState('Riwayat masih kosong', 'Riwayat pengembalian akan muncul di sini.', '≡')}
    </section>`;
  pageContent.querySelector('[data-go="catalog"]')?.addEventListener('click', () => { location.hash = 'catalog'; });
}

async function renderProfile() {
  const profile = await api('/profile');
  pageContent.innerHTML = `
    <section class="profile-layout">
      <aside class="panel profile-summary">
        <div class="avatar">${initials(state.user.name)}</div>
        <h2>${escapeHtml(state.user.name)}</h2>
        <p>${escapeHtml(state.user.email)}</p>
        <p>Profil ini digunakan admin untuk mengenali anggota dan kebutuhan usahanya.</p>
      </aside>
      <div class="panel panel-body">
        <form id="profile-form">
          <div class="form-grid">
            <label class="field"><span>Nama UMKM</span><input name="businessName" required maxlength="150" value="${escapeHtml(profile?.businessName ?? '')}"></label>
            <label class="field"><span>Jenis usaha</span><input name="businessType" required maxlength="100" value="${escapeHtml(profile?.businessType ?? '')}"></label>
            <label class="field"><span>Nomor WhatsApp</span><input name="phone" required minlength="8" maxlength="25" value="${escapeHtml(profile?.phone ?? '')}"></label>
            <label class="field full"><span>Alamat usaha</span><textarea name="address" required maxlength="1000">${escapeHtml(profile?.address ?? '')}</textarea></label>
          </div>
          <div class="form-actions"><button class="button button-primary" type="submit">Simpan perubahan</button></div>
        </form>
      </div>
    </section>`;
  pageContent.querySelector('#profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await api('/profile', { method: 'PUT', body: JSON.stringify(data) });
      showToast('Profil UMKM berhasil diperbarui.');
    } catch (error) { showToast(error.message, true); }
  });
}

async function renderAdminDashboard() {
  const [metrics, active] = await Promise.all([api('/admin/dashboard'), api('/admin/loans/active')]);
  document.querySelector('#active-loan-chip').hidden = true;
  pageContent.innerHTML = `
    <section class="stats-grid">
      ${statCard('Total unit', String(metrics.total_units), 'Seluruh inventaris aktif', '▦', true)}
      ${statCard('Tersedia', String(metrics.available_units), 'Siap dipinjam anggota', '✓')}
      ${statCard('Sedang dipinjam', String(metrics.borrowed_units), 'Unit berada di anggota', '↔')}
      ${statCard('Terlambat', String(metrics.overdue_units), metrics.overdue_units ? 'Perlu ditindaklanjuti' : 'Tidak ada keterlambatan', '!')}
    </section>
    <section class="panel">
      <div class="panel-header"><h3>Perlu perhatian</h3><button class="text-button" data-go="active-loans">Lihat semua</button></div>
      ${active.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Anggota</th><th>Unit</th><th>Jatuh tempo</th><th>Status</th></tr></thead><tbody>
        ${active.slice(0, 6).map((item) => `<tr><td><strong>${escapeHtml(item.memberName)}</strong><small>${escapeHtml(item.memberEmail)}</small></td><td><strong>${escapeHtml(item.unitName)}</strong><small>${escapeHtml(item.unitCode)}</small></td><td>${formatDate(item.dueAt)}</td><td><span class="badge ${item.isOverdue ? 'overdue' : 'borrowed'}">${item.isOverdue ? 'Terlambat' : 'Dipinjam'}</span></td></tr>`).join('')}
      </tbody></table></div>` : emptyState('Operasional terkendali', 'Belum ada unit yang sedang dipinjam.', '✓')}
    </section>`;
  pageContent.querySelector('[data-go="active-loans"]')?.addEventListener('click', () => { location.hash = 'active-loans'; });
}

async function renderUnitsAdmin(query = '') {
  const [units, categories] = await Promise.all([
    api(`/admin/units?q=${encodeURIComponent(query)}`),
    api('/admin/categories'),
  ]);
  state.categories = categories;
  pageContent.innerHTML = `
    <div class="toolbar">
      <form id="unit-search" class="search-box"><input name="q" type="search" value="${escapeHtml(query)}" placeholder="Cari unit atau kode..." aria-label="Cari unit"></form>
      <button id="add-unit" class="button button-primary">+ Tambah unit</button>
    </div>
    <section class="panel">
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Kode & unit</th><th>Kategori</th><th>Kondisi</th><th>Status</th><th>Denda/hari</th><th></th></tr></thead><tbody>
        ${units.map((unit) => `<tr>
          <td><strong>${escapeHtml(unit.name)}</strong><small>${escapeHtml(unit.unitCode)}</small></td>
          <td>${unit.categories.map((category) => `<span class="tag">${escapeHtml(category.name)}</span>`).join(' ')}</td>
          <td>${statusLabels[unit.conditionStatus]}</td>
          <td><span class="badge ${unit.availabilityStatus}">${statusLabels[unit.availabilityStatus]}</span></td>
          <td>${formatMoney(unit.finePerDay)}</td>
          <td><div class="table-actions"><button class="button button-small button-secondary" data-edit-unit="${unit.id}">Edit</button><button class="button button-small button-danger" data-delete-unit="${unit.id}">Hapus</button></div></td>
        </tr>`).join('')}
      </tbody></table></div>
    </section>`;

  pageContent.querySelector('#unit-search').addEventListener('submit', (event) => {
    event.preventDefault();
    renderUnitsAdmin(new FormData(event.currentTarget).get('q').trim()).catch((error) => showToast(error.message, true));
  });
  pageContent.querySelector('#add-unit').addEventListener('click', () => openUnitForm(null));
  pageContent.querySelectorAll('[data-edit-unit]').forEach((button) => {
    button.addEventListener('click', () => openUnitForm(units.find((unit) => unit.id === Number(button.dataset.editUnit))));
  });
  pageContent.querySelectorAll('[data-delete-unit]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!confirm('Hapus unit ini dari daftar aktif? Riwayat tetap disimpan.')) return;
      try {
        await api(`/admin/units/${button.dataset.deleteUnit}`, { method: 'DELETE' });
        showToast('Unit berhasil dihapus.');
        await renderUnitsAdmin(query);
      } catch (error) { showToast(error.message, true); }
    });
  });
}

function openUnitForm(unit) {
  const selectedIds = new Set(unit?.categories.map((category) => category.id) ?? []);
  const availabilityOptions = unit?.availabilityStatus === 'borrowed'
    ? ['borrowed']
    : ['available', 'maintenance', 'inactive'];
  openDialog(unit ? 'Ubah unit' : 'Tambah unit', `
    <form id="dialog-form" class="stack-form">
      <div class="form-grid">
        <label class="field"><span>Kode unik</span><input name="unitCode" required maxlength="50" value="${escapeHtml(unit?.unitCode ?? '')}" placeholder="MIX-003"></label>
        <label class="field"><span>Nama unit</span><input name="name" required maxlength="150" value="${escapeHtml(unit?.name ?? '')}"></label>
        <label class="field"><span>Kondisi</span><select name="conditionStatus">
          ${['good', 'minor_damage', 'damaged'].map((value) => `<option value="${value}" ${unit?.conditionStatus === value ? 'selected' : ''}>${statusLabels[value]}</option>`).join('')}
        </select></label>
        <label class="field"><span>Status ketersediaan</span><select name="availabilityStatus">
          ${availabilityOptions.map((value) => `<option value="${value}" ${unit?.availabilityStatus === value ? 'selected' : ''}>${statusLabels[value]}</option>`).join('')}
        </select></label>
        <label class="field"><span>Denda per hari</span><input name="finePerDay" type="number" min="0" required value="${unit?.finePerDay ?? 0}"></label>
        <label class="field"><span>Kategori (bisa lebih dari satu)</span><select name="categoryIds" multiple required>
          ${state.categories.map((category) => `<option value="${category.id}" ${selectedIds.has(category.id) ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('')}
        </select></label>
        <label class="field full"><span>Deskripsi</span><textarea name="description" maxlength="1000">${escapeHtml(unit?.description ?? '')}</textarea></label>
      </div>
      <button class="button button-primary button-block" type="submit">${unit ? 'Simpan perubahan' : 'Tambahkan unit'}</button>
    </form>`,
  async (form) => {
    const data = {
      unitCode: form.unitCode.value,
      name: form.name.value,
      description: form.description.value || null,
      conditionStatus: form.conditionStatus.value,
      availabilityStatus: form.availabilityStatus.value,
      finePerDay: Number(form.finePerDay.value),
      categoryIds: [...form.categoryIds.selectedOptions].map((option) => Number(option.value)),
    };
    await api(unit ? `/admin/units/${unit.id}` : '/admin/units', {
      method: unit ? 'PUT' : 'POST', body: JSON.stringify(data),
    });
    closeDialog();
    showToast(unit ? 'Unit berhasil diperbarui.' : 'Unit berhasil ditambahkan.');
    await renderUnitsAdmin();
  });
}

async function renderActiveLoans() {
  const items = await api('/admin/loans/active');
  pageContent.innerHTML = `
    <div class="section-heading"><div><h2>Unit di tangan anggota</h2><p>Pengembalian dan perhitungan denda diproses dari halaman ini.</p></div></div>
    <section class="panel">
      ${items.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Anggota</th><th>Unit</th><th>Periode</th><th>Status</th><th></th></tr></thead><tbody>
        ${items.map((item) => `<tr><td><strong>${escapeHtml(item.memberName)}</strong><small>${escapeHtml(item.memberEmail)} · ${escapeHtml(item.loanCode)}</small></td><td><strong>${escapeHtml(item.unitName)}</strong><small>${escapeHtml(item.unitCode)}</small></td><td><strong>${formatDate(item.borrowedAt)} – ${formatDate(item.dueAt)}</strong><small>${formatMoney(item.finePerDay)}/hari terlambat</small></td><td><span class="badge ${item.isOverdue ? 'overdue' : 'borrowed'}">${item.isOverdue ? 'Terlambat' : 'Dipinjam'}</span></td><td class="text-right"><button class="button button-small button-primary" data-return-item="${item.itemId}">Proses kembali</button></td></tr>`).join('')}
      </tbody></table></div>` : emptyState('Tidak ada peminjaman aktif', 'Semua unit sudah kembali atau belum ada transaksi.', '✓')}
    </section>`;
  pageContent.querySelectorAll('[data-return-item]').forEach((button) => {
    button.addEventListener('click', () => openReturnForm(items.find((item) => item.itemId === Number(button.dataset.returnItem))));
  });
}

function openReturnForm(item) {
  openDialog('Proses pengembalian', `
    <div class="quick-item"><span class="item-thumb">${initials(item.unitName).slice(0, 1)}</span><div><strong>${escapeHtml(item.unitName)}</strong><span>${escapeHtml(item.memberName)} · jatuh tempo ${formatDate(item.dueAt)}</span></div></div>
    <form id="dialog-form" class="stack-form" style="margin-top:18px">
      <label><span>Kondisi saat kembali</span><select name="returnedCondition" required>
        <option value="good">Baik</option><option value="minor_damage">Rusak ringan</option><option value="damaged">Rusak</option>
      </select></label>
      <label><span>Catatan (opsional)</span><textarea name="notes" maxlength="500" placeholder="Catat kelengkapan atau kerusakan unit"></textarea></label>
      <p class="inline-note">Sistem menghitung keterlambatan dan denda secara otomatis berdasarkan waktu pengembalian.</p>
      <button class="button button-primary button-block" type="submit">Selesaikan pengembalian</button>
    </form>`,
  async (form) => {
    const result = await api(`/admin/loan-items/${item.itemId}/return`, {
      method: 'POST',
      body: JSON.stringify({ returnedCondition: form.returnedCondition.value, notes: form.notes.value || null }),
    });
    closeDialog();
    showToast(`Pengembalian selesai. Denda: ${formatMoney(result.fineAmount)}.`);
    await renderActiveLoans();
  });
}

async function renderHistory() {
  const items = await api('/admin/loans/history');
  pageContent.innerHTML = `
    <div class="section-heading no-print"><div><h2>Seluruh transaksi</h2><p>Riwayat peminjaman per unit dan anggota.</p></div><button id="print-history" class="button button-primary">Cetak riwayat</button></div>
    <section class="panel print-area">
      <div class="panel-header"><h3>Riwayat Peminjaman UMKM Gear</h3><span class="muted">Dicetak ${formatDate(new Date(), true)}</span></div>
      ${items.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Kode</th><th>Anggota</th><th>Unit</th><th>Periode</th><th>Status</th><th>Admin</th><th class="text-right">Denda</th></tr></thead><tbody>
        ${items.map((item) => `<tr><td>${escapeHtml(item.loanCode)}</td><td><strong>${escapeHtml(item.memberName)}</strong><small>${escapeHtml(item.memberEmail)}</small></td><td><strong>${escapeHtml(item.unitName)}</strong><small>${escapeHtml(item.unitCode)}</small></td><td>${formatDate(item.borrowedAt)}<small>s.d. ${formatDate(item.returnedAt ?? item.dueAt)}</small></td><td><span class="badge ${item.isOverdue ? 'overdue' : item.itemStatus}">${item.isOverdue ? 'Terlambat' : statusLabels[item.itemStatus]}</span></td><td>${escapeHtml(item.returnedByName ?? '-')}</td><td class="text-right">${formatMoney(item.fineAmount)}</td></tr>`).join('')}
      </tbody></table></div>` : emptyState('Riwayat masih kosong', 'Transaksi peminjaman akan tampil di sini.', '≡')}
    </section>`;
  pageContent.querySelector('#print-history')?.addEventListener('click', () => window.print());
}

async function renderCategoriesAdmin() {
  const categories = await api('/admin/categories');
  pageContent.innerHTML = `
    <div class="section-heading"><div><h2>Pengelompokan alat</h2><p>Satu unit dapat berada di beberapa kategori.</p></div><button id="add-category" class="button button-primary">+ Tambah kategori</button></div>
    <section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Nama</th><th>Deskripsi</th><th>Jumlah unit</th><th></th></tr></thead><tbody>
      ${categories.map((category) => `<tr><td><strong>${escapeHtml(category.name)}</strong></td><td>${escapeHtml(category.description ?? '-')}</td><td>${category.unitCount}</td><td><div class="table-actions"><button class="button button-small button-secondary" data-edit-category="${category.id}">Edit</button><button class="button button-small button-danger" data-delete-category="${category.id}">Hapus</button></div></td></tr>`).join('')}
    </tbody></table></div></section>`;
  pageContent.querySelector('#add-category').addEventListener('click', () => openCategoryForm(null));
  pageContent.querySelectorAll('[data-edit-category]').forEach((button) => button.addEventListener('click', () => openCategoryForm(categories.find((category) => category.id === Number(button.dataset.editCategory)))));
  pageContent.querySelectorAll('[data-delete-category]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Hapus kategori ini? Unit tidak akan ikut terhapus.')) return;
    try { await api(`/admin/categories/${button.dataset.deleteCategory}`, { method: 'DELETE' }); showToast('Kategori dihapus.'); await renderCategoriesAdmin(); }
    catch (error) { showToast(error.message, true); }
  }));
}

function openCategoryForm(category) {
  openDialog(category ? 'Ubah kategori' : 'Tambah kategori', `
    <form id="dialog-form" class="stack-form">
      <label><span>Nama kategori</span><input name="name" required maxlength="100" value="${escapeHtml(category?.name ?? '')}"></label>
      <label><span>Deskripsi</span><textarea name="description" maxlength="500">${escapeHtml(category?.description ?? '')}</textarea></label>
      <button class="button button-primary button-block" type="submit">Simpan kategori</button>
    </form>`,
  async (form) => {
    await api(category ? `/admin/categories/${category.id}` : '/admin/categories', {
      method: category ? 'PUT' : 'POST',
      body: JSON.stringify({ name: form.name.value, description: form.description.value || null }),
    });
    closeDialog(); showToast('Kategori berhasil disimpan.'); await renderCategoriesAdmin();
  });
}

async function renderMembersAdmin() {
  const members = await api('/admin/members');
  pageContent.innerHTML = `
    <div class="section-heading"><div><h2>Anggota terdaftar</h2><p>Kelola akun yang dapat meminjam unit.</p></div><button id="add-member" class="button button-primary">+ Tambah anggota</button></div>
    <section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Anggota</th><th>UMKM</th><th>Kontak</th><th>Status</th><th></th></tr></thead><tbody>
      ${members.map((member) => `<tr><td><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.email)}</small></td><td>${escapeHtml(member.businessName ?? 'Belum mengisi profil')}</td><td>${escapeHtml(member.phone ?? '-')}</td><td><span class="badge ${member.isActive ? 'available' : 'inactive'}">${member.isActive ? 'Aktif' : 'Nonaktif'}</span></td><td><div class="table-actions"><button class="button button-small button-secondary" data-edit-member="${member.id}">Edit</button><button class="button button-small button-danger" data-delete-member="${member.id}">Hapus</button></div></td></tr>`).join('')}
    </tbody></table></div></section>`;
  pageContent.querySelector('#add-member').addEventListener('click', () => openMemberForm(null));
  pageContent.querySelectorAll('[data-edit-member]').forEach((button) => button.addEventListener('click', () => openMemberForm(members.find((member) => member.id === Number(button.dataset.editMember)))));
  pageContent.querySelectorAll('[data-delete-member]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Hapus anggota ini? Riwayat peminjamannya tetap disimpan.')) return;
    try { await api(`/admin/members/${button.dataset.deleteMember}`, { method: 'DELETE' }); showToast('Anggota dihapus.'); await renderMembersAdmin(); }
    catch (error) { showToast(error.message, true); }
  }));
}

function openMemberForm(member) {
  openDialog(member ? 'Ubah anggota' : 'Tambah anggota', `
    <form id="dialog-form" class="stack-form">
      <label><span>Nama lengkap</span><input name="name" required maxlength="100" value="${escapeHtml(member?.name ?? '')}"></label>
      <label><span>Email</span><input name="email" type="email" required maxlength="150" value="${escapeHtml(member?.email ?? '')}"></label>
      <label><span>Password ${member ? '(kosongkan jika tidak diubah)' : ''}</span><input name="password" type="password" ${member ? '' : 'required'} minlength="8" maxlength="100"></label>
      <label class="field"><span>Status akun</span><select name="isActive"><option value="true" ${member?.isActive !== false ? 'selected' : ''}>Aktif</option><option value="false" ${member?.isActive === false ? 'selected' : ''}>Nonaktif</option></select></label>
      <button class="button button-primary button-block" type="submit">Simpan anggota</button>
    </form>`,
  async (form) => {
    const data = { name: form.name.value, email: form.email.value, password: form.password.value, isActive: form.isActive.value === 'true' };
    if (member && !data.password) delete data.password;
    await api(member ? `/admin/members/${member.id}` : '/admin/members', { method: member ? 'PUT' : 'POST', body: JSON.stringify(data) });
    closeDialog(); showToast('Data anggota berhasil disimpan.'); await renderMembersAdmin();
  });
}

function openDialog(title, content, submitHandler) {
  dialogTitle.textContent = title;
  dialogContent.innerHTML = content;
  const form = dialogContent.querySelector('#dialog-form');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try { await submitHandler(form); }
    catch (error) { showToast(error.message, true); submitButton.disabled = false; }
  });
  dialog.showModal();
}

function closeDialog() {
  if (dialog.open) dialog.close();
  dialogContent.innerHTML = '';
}

document.querySelector('#dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeDialog();
});

document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const errorLabel = document.querySelector('#login-error');
  const submit = form.querySelector('[type="submit"]');
  errorLabel.hidden = true;
  submit.disabled = true;
  try {
    state.user = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: form.email.value, password: form.password.value }),
    });
    showApp();
  } catch (error) {
    errorLabel.textContent = error.message;
    errorLabel.hidden = false;
  } finally {
    submit.disabled = false;
  }
});

document.querySelectorAll('[data-demo]').forEach((button) => {
  button.addEventListener('click', () => {
    const isAdmin = button.dataset.demo === 'admin';
    document.querySelector('#login-email').value = isAdmin ? 'admin@umkmgear.local' : 'member@umkmgear.local';
    document.querySelector('#login-password').value = isAdmin ? 'Admin123!' : 'Member123!';
    document.querySelector('#login-password').focus();
  });
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST' }); }
  finally { location.hash = ''; showLogin(); }
});

window.addEventListener('hashchange', () => {
  if (state.user) loadRoute(location.hash.slice(1));
});

async function initialize() {
  try {
    state.user = await api('/auth/me');
    showApp();
  } catch {
    showLogin();
  }
}

initialize();
