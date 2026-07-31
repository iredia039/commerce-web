/* ==========================================================================
   STOCKROOM — admin dashboard
   Writes (POST/PUT/PATCH/DELETE) never persist on dummyjson, so every
   mutation is applied optimistically to a localStorage-backed shadow
   state, laid over live GET data, and rolled back if the request fails.
   ========================================================================== */

let shadow = Shadow.load();
let log = Shadow.loadLog();
let categories = [];
let currentRowsById = new Map();
let pendingIds = new Set();

const adminState = { mode: 'all', category: '', query: '', page: 1 };

const tbody = document.getElementById('admin-tbody');
const adminPager = document.getElementById('admin-pager');
const adminCount = document.getElementById('admin-count');
const categorySelect = document.getElementById('admin-category');
const searchInput = document.getElementById('admin-search');
const flakyCheckbox = document.getElementById('flaky-checkbox');
const flakyToggle = document.getElementById('flaky-toggle');
const logList = document.getElementById('log-list');
const logCount = document.getElementById('log-count');

init();

async function init() {
  renderLog();
  try {
    categories = await Api.getCategories();
    categories.forEach(c => {
      categorySelect.appendChild(new Option(c.name, c.slug));
      document.getElementById('f-category').appendChild(new Option(c.name, c.slug));
    });
  } catch (err) {
    console.error(err);
  }
  loadAdminPage(1);
}

categorySelect.addEventListener('change', () => {
  adminState.category = categorySelect.value;
  adminState.mode = categorySelect.value ? 'category' : (searchInput.value.trim() ? 'search' : 'all');
  loadAdminPage(1);
});

let searchDebounce;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    const q = searchInput.value.trim();
    if (q) {
      adminState.mode = 'search';
      adminState.query = q;
      categorySelect.value = '';
      adminState.category = '';
    } else {
      adminState.mode = adminState.category ? 'category' : 'all';
    }
    loadAdminPage(1);
  }, 350);
});

flakyCheckbox.addEventListener('change', () => {
  flakyToggle.classList.toggle('is-on', flakyCheckbox.checked);
});

/* ---------------- fetch + merge with shadow state ---------------- */

async function loadAdminPage(page) {
  adminState.page = page;
  tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Loading…</td></tr>`;
  const skip = (page - 1) * PAGE_SIZE;
  try {
    let data;
    if (adminState.mode === 'category') data = await Api.getByCategory(adminState.category, { skip });
    else if (adminState.mode === 'search') data = await Api.search(adminState.query, { skip });
    else data = await Api.getProducts({ skip });

    let rows = data.products
      .filter(p => !shadow.deleted.includes(p.id))
      .map(p => applyEditedShadow(p));

    const addedArr = Object.values(shadow.added).filter(matchesAdminFilter);
    let displayTotal = data.total + addedArr.length;

    if (page === 1 && addedArr.length) {
      rows = [...addedArr.map(p => ({ ...p, _added: true })), ...rows].slice(0, PAGE_SIZE);
    }

    currentRowsById = new Map(rows.map(r => [String(r.id), r]));
    renderTable(rows);
    renderAdminPager(displayTotal, page);
    adminCount.textContent = `${displayTotal} total`;
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Could not load products — ${escapeHtml(err.message)}</td></tr>`;
    adminPager.innerHTML = '';
  }
}

function matchesAdminFilter(p) {
  if (adminState.mode === 'category') return p.category === adminState.category;
  if (adminState.mode === 'search') {
    const q = adminState.query.toLowerCase();
    return (p.title || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  }
  return true;
}

function applyEditedShadow(p) {
  const patch = shadow.edited[p.id];
  return patch ? { ...p, ...patch, _edited: true } : p;
}

function renderTable(rows) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No products match this view.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(rowTemplate).join('');
  tbody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const product = currentRowsById.get(id);
      if (!product) return;
      if (action === 'quick') openQuickEdit(product);
      if (action === 'full') openFullEdit(product);
      if (action === 'delete') confirmDelete(product);
    });
  });
}

function rowTemplate(p) {
  const cls = pendingIds.has(String(p.id)) ? 'row-pending' : (p._added ? 'row-added' : (p._edited ? 'row-edited' : ''));
  const flag = p._added ? '<span class="row-flag added">local: added</span>' : (p._edited ? '<span class="row-flag edited">local: edited</span>' : '');
  const disabled = pendingIds.has(String(p.id)) ? 'disabled' : '';
  return `
    <tr class="${cls}" data-row="${p.id}">
      <td><img class="row-thumb" src="${p.thumbnail || ''}" alt=""></td>
      <td><span class="row-title">${escapeHtml(p.title)}</span>${flag}</td>
      <td>${escapeHtml(p.category)}</td>
      <td>${money(p.price)}</td>
      <td>${p.stock}</td>
      <td>
        <div class="row-actions">
          <button class="btn small line" data-action="quick" data-id="${p.id}" ${disabled}>Quick edit</button>
          <button class="btn small line" data-action="full" data-id="${p.id}" ${disabled}>Full edit</button>
          <button class="btn small danger" data-action="delete" data-id="${p.id}" ${disabled}>Delete</button>
        </div>
      </td>
    </tr>`;
}

function renderAdminPager(total, cur) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  let pages = new Set([1, totalPages, cur - 1, cur, cur + 1].filter(n => n >= 1 && n <= totalPages));
  pages = [...pages].sort((a, b) => a - b);
  let html = `<button ${cur === 1 ? 'disabled' : ''} data-page="${cur - 1}">‹</button>`;
  let last = 0;
  pages.forEach(n => {
    if (n - last > 1) html += `<span class="ellipsis">…</span>`;
    html += `<button class="${n === cur ? 'is-current' : ''}" data-page="${n}">${n}</button>`;
    last = n;
  });
  html += `<button ${cur === totalPages ? 'disabled' : ''} data-page="${cur + 1}">›</button>`;
  adminPager.innerHTML = html;
  adminPager.querySelectorAll('button[data-page]').forEach(b => {
    b.addEventListener('click', () => loadAdminPage(Number(b.dataset.page)));
  });
}

/* ---------------- activity log ---------------- */

function addLog({ method, endpoint, detail }) {
  const entry = { id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), time: timeStamp(), method, endpoint, detail, status: 'pending' };
  log.push(entry);
  Shadow.saveLog(log);
  renderLog();
  return entry.id;
}

function settleLog(id, status, detail) {
  const entry = log.find(l => l.id === id);
  if (!entry) return;
  entry.status = status;
  if (detail) entry.detail = detail;
  Shadow.saveLog(log);
  renderLog();
}

function renderLog() {
  logCount.textContent = `${log.length} event${log.length === 1 ? '' : 's'}`;
  if (!log.length) {
    logList.innerHTML = `<li class="log-empty">No admin actions yet. Add, edit, or delete a product to see it logged here.</li>`;
    return;
  }
  logList.innerHTML = log.slice(-100).map(e => `
    <li class="log-line">
      <div class="log-row1">
        <span class="log-time">${e.time}</span>
        <span class="log-method ${e.method}">${e.method}</span>
        <span class="log-endpoint">${escapeHtml(e.endpoint)}</span>
        <span class="log-status ${e.status}">${e.status}</span>
      </div>
      ${e.detail ? `<div class="log-detail">${escapeHtml(e.detail)}</div>` : ''}
    </li>`).join('');
}

/* ---------------- flaky-network simulation ---------------- */

function shouldSimulateFailure() {
  return flakyCheckbox.checked && Math.random() < 0.35;
}

/* ---------------- add product ---------------- */

const formOverlay = document.getElementById('form-overlay');
const productForm = document.getElementById('product-form');
document.getElementById('btn-add').addEventListener('click', openAddForm);
document.getElementById('form-close').addEventListener('click', closeFormModal);
document.getElementById('form-cancel').addEventListener('click', closeFormModal);
formOverlay.addEventListener('click', e => { if (e.target === formOverlay) closeFormModal(); });

let editingId = null; // null => add mode

function openAddForm() {
  editingId = null;
  productForm.reset();
  document.getElementById('f-discount').value = 0;
  document.getElementById('form-eyebrow').textContent = 'POST /products/add';
  document.getElementById('form-modal-title').textContent = 'Add product';
  document.getElementById('form-submit').textContent = 'Save product';
  formOverlay.classList.add('is-open');
}

function openFullEdit(product) {
  editingId = product.id;
  document.getElementById('form-eyebrow').textContent = `PUT /products/${product.id}`;
  document.getElementById('form-modal-title').textContent = `Edit — ${product.title}`;
  document.getElementById('form-submit').textContent = 'Save changes';
  document.getElementById('f-title').value = product.title || '';
  document.getElementById('f-category').value = product.category || '';
  document.getElementById('f-brand').value = product.brand || '';
  document.getElementById('f-price').value = product.price ?? '';
  document.getElementById('f-stock').value = product.stock ?? '';
  document.getElementById('f-discount').value = product.discountPercentage ?? 0;
  document.getElementById('f-thumbnail').value = product.thumbnail || '';
  document.getElementById('f-description').value = product.description || '';
  formOverlay.classList.add('is-open');
}

function closeFormModal() {
  formOverlay.classList.remove('is-open');
  editingId = null;
}

productForm.addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(productForm);
  const payload = {
    title: fd.get('title').trim(),
    category: fd.get('category'),
    brand: fd.get('brand').trim(),
    price: Number(fd.get('price')),
    stock: Number(fd.get('stock')),
    discountPercentage: Number(fd.get('discountPercentage')) || 0,
    thumbnail: fd.get('thumbnail').trim() || 'https://cdn.dummyjson.com/products/images/furniture/Bed%20Frame/thumbnail.png',
    description: fd.get('description').trim(),
  };
  closeFormModal();
  if (editingId == null) {
    await handleAdd(payload);
  } else {
    await handleFullEdit(editingId, payload);
  }
});

async function handleAdd(payload) {
  const tempId = 'tmp-' + Date.now();
  shadow.added[tempId] = { id: tempId, rating: 0, images: [payload.thumbnail], ...payload };
  Shadow.save(shadow);
  pendingIds.add(String(tempId));
  loadAdminPage(1);
  const logId = addLog({ method: 'POST', endpoint: '/products/add', detail: `Creating "${payload.title}"` });

  try {
    if (shouldSimulateFailure()) throw new Error('Simulated network failure');
    const res = await Api.addProduct(payload);
    const finalId = res.id ?? tempId;
    const finalProduct = { ...shadow.added[tempId], ...res, id: finalId };
    delete shadow.added[tempId];
    shadow.added[finalId] = finalProduct;
    Shadow.save(shadow);
    pendingIds.delete(String(tempId));
    settleLog(logId, 'success', `Created "${payload.title}" (local id ${finalId}) — dummyjson does not persist this, kept in shadow state`);
    toast(`Added "${payload.title}"`, 'success');
  } catch (err) {
    delete shadow.added[tempId];
    Shadow.save(shadow);
    pendingIds.delete(String(tempId));
    settleLog(logId, 'failed', `Rolled back — ${err.message}`);
    toast(`Could not add "${payload.title}" — rolled back`, 'failed');
  }
  loadAdminPage(1);
}

/* ---------------- full edit (PUT) ---------------- */

async function handleFullEdit(id, payload) {
  const key = String(id);
  const isLocalAdd = Object.prototype.hasOwnProperty.call(shadow.added, key) || Object.prototype.hasOwnProperty.call(shadow.added, id);
  const addedKey = Object.prototype.hasOwnProperty.call(shadow.added, id) ? id : key;
  const prevAdded = isLocalAdd ? { ...shadow.added[addedKey] } : null;
  const prevEdited = shadow.edited[id] ? { ...shadow.edited[id] } : null;

  if (isLocalAdd) {
    shadow.added[addedKey] = { ...shadow.added[addedKey], ...payload };
  } else {
    shadow.edited[id] = { ...(shadow.edited[id] || {}), ...payload };
  }
  Shadow.save(shadow);
  pendingIds.add(key);
  loadAdminPage(adminState.page);

  const logId = addLog({ method: 'PUT', endpoint: `/products/${id}`, detail: `Replacing fields on "${payload.title}"` });

  try {
    if (shouldSimulateFailure()) throw new Error('Simulated network failure');
    const res = await Api.replaceProduct(id, payload);
    if (isLocalAdd) shadow.added[addedKey] = { ...shadow.added[addedKey], ...res };
    else shadow.edited[id] = { ...shadow.edited[id], ...res };
    Shadow.save(shadow);
    pendingIds.delete(key);
    settleLog(logId, 'success', `Updated "${payload.title}" — change kept in local shadow state`);
    toast(`Saved changes to "${payload.title}"`, 'success');
  } catch (err) {
    if (isLocalAdd) shadow.added[addedKey] = prevAdded;
    else if (prevEdited) shadow.edited[id] = prevEdited;
    else delete shadow.edited[id];
    Shadow.save(shadow);
    pendingIds.delete(key);
    settleLog(logId, 'failed', `Rolled back — ${err.message}`);
    toast(`Could not save "${payload.title}" — rolled back`, 'failed');
  }
  loadAdminPage(adminState.page);
}

/* ---------------- quick edit (PATCH) ---------------- */

const quickOverlay = document.getElementById('quick-overlay');
const quickForm = document.getElementById('quick-form');
let quickTargetId = null;

document.getElementById('quick-close').addEventListener('click', closeQuickModal);
document.getElementById('quick-cancel').addEventListener('click', closeQuickModal);
quickOverlay.addEventListener('click', e => { if (e.target === quickOverlay) closeQuickModal(); });

function openQuickEdit(product) {
  quickTargetId = product.id;
  document.getElementById('quick-modal-title').textContent = `Quick edit — ${product.title}`;
  document.getElementById('q-price').value = product.price ?? '';
  document.getElementById('q-stock').value = product.stock ?? '';
  document.getElementById('q-discount').value = product.discountPercentage ?? 0;
  quickOverlay.classList.add('is-open');
}
function closeQuickModal() {
  quickOverlay.classList.remove('is-open');
  quickTargetId = null;
}

quickForm.addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(quickForm);
  const patch = {
    price: Number(fd.get('price')),
    stock: Number(fd.get('stock')),
    discountPercentage: Number(fd.get('discountPercentage')) || 0,
  };
  const id = quickTargetId;
  closeQuickModal();
  await handleQuickEdit(id, patch);
});

async function handleQuickEdit(id, patch) {
  const key = String(id);
  const isLocalAdd = Object.prototype.hasOwnProperty.call(shadow.added, id);
  const prevAdded = isLocalAdd ? { ...shadow.added[id] } : null;
  const prevEdited = shadow.edited[id] ? { ...shadow.edited[id] } : null;
  const title = currentRowsById.get(key)?.title || `#${id}`;

  if (isLocalAdd) shadow.added[id] = { ...shadow.added[id], ...patch };
  else shadow.edited[id] = { ...(shadow.edited[id] || {}), ...patch };
  Shadow.save(shadow);
  pendingIds.add(key);
  loadAdminPage(adminState.page);

  const logId = addLog({ method: 'PATCH', endpoint: `/products/${id}`, detail: `price → ${money(patch.price)}, stock → ${patch.stock}` });

  try {
    if (shouldSimulateFailure()) throw new Error('Simulated network failure');
    const res = await Api.patchProduct(id, patch);
    if (isLocalAdd) shadow.added[id] = { ...shadow.added[id], ...res };
    else shadow.edited[id] = { ...shadow.edited[id], ...res };
    Shadow.save(shadow);
    pendingIds.delete(key);
    settleLog(logId, 'success', `Patched "${title}"`);
    toast(`Updated "${title}"`, 'success');
  } catch (err) {
    if (isLocalAdd) shadow.added[id] = prevAdded;
    else if (prevEdited) shadow.edited[id] = prevEdited;
    else delete shadow.edited[id];
    Shadow.save(shadow);
    pendingIds.delete(key);
    settleLog(logId, 'failed', `Rolled back — ${err.message}`);
    toast(`Could not update "${title}" — rolled back`, 'failed');
  }
  loadAdminPage(adminState.page);
}

/* ---------------- delete ---------------- */

async function confirmDelete(product) {
  const ok = window.confirm(`Delete "${product.title}"? This calls DELETE /products/${product.id}.`);
  if (!ok) return;
  await handleDelete(product);
}

async function handleDelete(product) {
  const id = product.id;
  const key = String(id);
  const isLocalAdd = Object.prototype.hasOwnProperty.call(shadow.added, id);
  let snapshotAdded = null;

  if (isLocalAdd) {
    snapshotAdded = { ...shadow.added[id] };
    delete shadow.added[id];
  } else {
    shadow.deleted.push(id);
  }
  Shadow.save(shadow);
  pendingIds.add(key);
  loadAdminPage(adminState.page);

  const logId = addLog({ method: 'DELETE', endpoint: `/products/${id}`, detail: `Removing "${product.title}"` });

  try {
    if (shouldSimulateFailure()) throw new Error('Simulated network failure');
    await Api.deleteProduct(id);
    pendingIds.delete(key);
    settleLog(logId, 'success', `Deleted "${product.title}"`);
    toast(`Deleted "${product.title}"`, 'success');
  } catch (err) {
    if (isLocalAdd) shadow.added[id] = snapshotAdded;
    else shadow.deleted = shadow.deleted.filter(d => d !== id);
    Shadow.save(shadow);
    pendingIds.delete(key);
    settleLog(logId, 'failed', `Rolled back — ${err.message}`);
    toast(`Could not delete "${product.title}" — restored`, 'failed');
  }
  loadAdminPage(adminState.page);
}
