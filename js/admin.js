/* ── Admin Panel Logic (local uniquement via Node.js) ── */

let allPacks = [];
let editingPackId = null;

const $ = id => document.getElementById(id);
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'same-origin',
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function checkLocalEnvironment() {
  const banner = $('localOnlyBanner');
  if (!IS_LOCAL && banner) banner.classList.remove('hidden');
}

/* ── Auth ── */
async function checkAuth() {
  if (!IS_LOCAL) {
    showLogin();
    $('loginError').textContent = 'Administration disponible uniquement sur http://localhost:3000 (lancez node server.js)';
    return;
  }
  try {
    const { authenticated } = await api('/api/auth/check');
    if (authenticated) showDashboard();
    else showLogin();
  } catch {
    showLogin();
    $('loginError').textContent = 'Serveur local non démarré. Lancez DEMARRER.bat ou node server.js';
  }
}

function showLogin() {
  $('loginScreen').classList.remove('hidden');
  $('dashboard').classList.add('hidden');
}

function showDashboard() {
  $('loginScreen').classList.add('hidden');
  $('dashboard').classList.remove('hidden');
  loadPacks();
  loadConfig();
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('loginError').textContent = '';
  if (!IS_LOCAL) {
    $('loginError').textContent = 'Utilisez http://localhost:3000/admin.html';
    return;
  }
  try {
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: $('loginUser').value,
        password: $('loginPass').value
      })
    });
    showDashboard();
  } catch (err) {
    $('loginError').textContent = err.message;
  }
});

$('logoutBtn').addEventListener('click', async () => {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
  showLogin();
});

/* ── Tabs ── */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

/* ── Packs table ── */
async function loadPacks() {
  const data = await api('/api/admin/packs');
  allPacks = data.packs || [];
  renderTable();
}

function renderTable() {
  const tbody = $('packsTableBody');
  if (!allPacks.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px">Aucun pack. Cliquez sur Ajouter.</td></tr>';
    return;
  }

  tbody.innerHTML = allPacks.map(p => {
    const promo = p.promotion || {};
    const promoHtml = promo.active && promo.text
      ? `<span class="promo-pill" style="background:${promo.badgeColor}">${esc(promo.text)}</span>`
      : '<span style="color:#aaa">—</span>';
    const imgHtml = p.image
      ? `<img class="table-img" src="/${p.image.replace(/^\//, '')}" alt="">`
      : '<div class="table-img-empty">📦</div>';

    return `<tr>
      <td>${imgHtml}</td>
      <td><strong>${esc(p.name)}</strong><br><small style="color:#888">${esc(p.subtitle || '')}</small></td>
      <td><bdi dir="ltr">${esc(p.price)}</bdi></td>
      <td>${promoHtml}</td>
      <td class="${p.enabled ? 'status-on' : 'status-off'}">${p.enabled ? '✓ Actif' : '✗ Masqué'}</td>
      <td>
        <button class="btn-edit" onclick="editPack('${esc(p.id)}')">Modifier</button>
        <button class="btn-danger" onclick="deletePack('${esc(p.id)}')">Supprimer</button>
      </td>
    </tr>`;
  }).join('');
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Modal ── */
$('addPackBtn').addEventListener('click', () => {
  editingPackId = null;
  $('modalTitle').textContent = 'Ajouter un pack';
  $('packForm').reset();
  $('packId').value = '';
  $('packEnabled').checked = true;
  $('promoActive').checked = false;
  $('promoColor').value = '#2d6a4f';
  $('promoColorHex').value = '#2d6a4f';
  $('packGiftPosition').value = 'pos-tl';
  $('packSortOrder').value = allPacks.length + 1;
  updatePreview();
  $('packModal').classList.remove('hidden');
});

function editPack(id) {
  const pack = allPacks.find(p => p.id === id);
  if (!pack) return;
  editingPackId = id;
  $('modalTitle').textContent = 'Modifier le pack';
  $('packId').value = pack.id;
  $('packName').value = pack.name || '';
  $('packPrice').value = pack.price || '';
  $('packSubtitle').value = pack.subtitle || '';
  $('packDescription').value = pack.description || '';
  $('packImage').value = pack.image || '';
  $('packTopBadge').value = pack.topBadge || '';
  $('packCadeauTag').value = pack.cadeauTag || '';
  $('packGiftPosition').value = pack.giftPosition || 'pos-tl';
  $('packSortOrder').value = pack.sortOrder || 1;
  $('packDetailId').value = pack.detailId || '';
  $('packEnabled').checked = pack.enabled !== false;
  $('promoActive').checked = pack.promotion?.active || false;
  $('promoText').value = pack.promotion?.text || '';
  $('promoColor').value = pack.promotion?.badgeColor || '#2d6a4f';
  $('promoColorHex').value = pack.promotion?.badgeColor || '#2d6a4f';
  updatePreview();
  $('packModal').classList.remove('hidden');
}

function closePackModal() {
  $('packModal').classList.add('hidden');
  editingPackId = null;
}

async function deletePack(id) {
  if (!confirm('Supprimer ce pack définitivement ?')) return;
  await api(`/api/admin/packs/${id}`, { method: 'DELETE' });
  await loadPacks();
}

function getFormData() {
  return {
    name: $('packName').value.trim(),
    price: $('packPrice').value.trim(),
    subtitle: $('packSubtitle').value.trim(),
    description: $('packDescription').value.trim(),
    image: $('packImage').value.trim(),
    topBadge: $('packTopBadge').value.trim(),
    cadeauTag: $('packCadeauTag').value.trim(),
    giftPosition: $('packGiftPosition').value,
    sortOrder: parseInt($('packSortOrder').value) || 1,
    detailId: $('packDetailId').value.trim() || null,
    enabled: $('packEnabled').checked,
    promotion: {
      active: $('promoActive').checked,
      text: $('promoText').value.trim(),
      badgeColor: $('promoColorHex').value || '#2d6a4f'
    }
  };
}

$('packForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = getFormData();
  try {
    if (editingPackId) {
      await api(`/api/admin/packs/${editingPackId}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await api('/api/admin/packs', { method: 'POST', body: JSON.stringify(data) });
    }
    closePackModal();
    await loadPacks();
  } catch (err) {
    alert(err.message);
  }
});

/* ── Live preview ── */
function updatePreview() {
  const data = getFormData();
  const promo = data.promotion;
  const promoHtml = promo.active && promo.text
    ? `<div class="preview-promo" style="background:${promo.badgeColor}">${esc(promo.text)}</div>`
    : '';
  const imgSrc = data.image ? `/${data.image.replace(/^\//, '')}` : '';

  $('livePreview').innerHTML = `
    <div class="preview-card">
      <div class="preview-circle">
        ${imgSrc ? `<img src="${imgSrc}" alt="" onerror="this.style.display='none'">` : '<div style="width:100%;height:100%;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center">📦</div>'}
      </div>
      <div class="preview-title">${esc(data.name) || 'Nom du pack'}</div>
      ${promoHtml}
      <div class="preview-price"><bdi dir="ltr">${esc(data.price) || '0 DH'}</bdi></div>
      <button class="preview-btn">أطلب الآن</button>
    </div>`;
}

['packName','packPrice','packImage','promoActive','promoText','promoColor','promoColorHex'].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener('input', updatePreview);
  if (el && el.type === 'checkbox') el.addEventListener('change', updatePreview);
});

$('promoColor').addEventListener('input', e => {
  $('promoColorHex').value = e.target.value;
  updatePreview();
});
$('promoColorHex').addEventListener('input', e => {
  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) $('promoColor').value = e.target.value;
  updatePreview();
});

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $('promoText').value = btn.dataset.text;
    $('promoColor').value = btn.dataset.color;
    $('promoColorHex').value = btn.dataset.color;
    $('promoActive').checked = true;
    updatePreview();
  });
});

/* ── Config ── */
async function loadConfig() {
  const config = await api('/api/admin/config');
  $('whatsappInput').value = config.whatsapp || '';
  $('adminUserInput').value = config.adminUsername || '';
}

$('saveWhatsappBtn').addEventListener('click', async () => {
  try {
    await api('/api/admin/config', {
      method: 'PUT',
      body: JSON.stringify({ whatsapp: $('whatsappInput').value })
    });
    $('whatsappMsg').textContent = '✓ Enregistré dans data/config.json';
    setTimeout(() => $('whatsappMsg').textContent = '', 3000);
  } catch (err) { alert(err.message); }
});

$('saveSettingsBtn').addEventListener('click', async () => {
  try {
    const body = { adminUsername: $('adminUserInput').value };
    if ($('adminPassInput').value) body.newPassword = $('adminPassInput').value;
    await api('/api/admin/config', { method: 'PUT', body: JSON.stringify(body) });
    $('settingsMsg').textContent = '✓ Paramètres enregistrés (data/admin.json — local)';
    $('adminPassInput').value = '';
    setTimeout(() => $('settingsMsg').textContent = '', 3000);
  } catch (err) { alert(err.message); }
});

/* ── Export pour GitHub Pages ── */
async function exportAllData() {
  try {
    const data = await api('/api/admin/export');
    downloadJson('packs.json', data.packs);
    setTimeout(() => downloadJson('config.json', data.config), 300);
    $('exportMsg').textContent = '✓ packs.json et config.json téléchargés — remplacez-les dans data/ puis commit sur GitHub';
    setTimeout(() => $('exportMsg').textContent = '', 8000);
  } catch (err) {
    alert(err.message);
  }
}

$('exportDataBtn').addEventListener('click', exportAllData);
$('previewSiteBtn').addEventListener('click', () => window.open('/', '_blank'));

/* ── Init ── */
checkLocalEnvironment();
checkAuth();
