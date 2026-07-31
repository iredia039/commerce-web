/* ==========================================================================
   STOCKROOM — shared API + utilities
   ========================================================================== */

const API_BASE = 'https://dummyjson.com';
const PAGE_SIZE = 10;

const Api = {
  async getProducts({ limit = PAGE_SIZE, skip = 0 } = {}) {
    const res = await fetch(`${API_BASE}/products?limit=${limit}&skip=${skip}`);
    if (!res.ok) throw new Error(`GET /products failed (${res.status})`);
    return res.json();
  },

  async getCategories() {
    const res = await fetch(`${API_BASE}/products/categories`);
    if (!res.ok) throw new Error(`GET /products/categories failed (${res.status})`);
    const data = await res.json();
    // API may return array of strings or array of {slug,name,url} objects.
    return data.map(c => (typeof c === 'string' ? { slug: c, name: titleCase(c) } : c));
  },

  async getByCategory(slug, { limit = PAGE_SIZE, skip = 0 } = {}) {
    const res = await fetch(`${API_BASE}/products/category/${encodeURIComponent(slug)}?limit=${limit}&skip=${skip}`);
    if (!res.ok) throw new Error(`GET /products/category/${slug} failed (${res.status})`);
    return res.json();
  },

  async search(q, { limit = PAGE_SIZE, skip = 0 } = {}) {
    const res = await fetch(`${API_BASE}/products/search?q=${encodeURIComponent(q)}&limit=${limit}&skip=${skip}`);
    if (!res.ok) throw new Error(`GET /products/search failed (${res.status})`);
    return res.json();
  },

  async getOne(id) {
    const res = await fetch(`${API_BASE}/products/${id}`);
    if (!res.ok) throw new Error(`GET /products/${id} failed (${res.status})`);
    return res.json();
  },

  async addProduct(body) {
    const res = await fetch(`${API_BASE}/products/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST /products/add failed (${res.status})`);
    return res.json();
  },

  async replaceProduct(id, body) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT /products/${id} failed (${res.status})`);
    return res.json();
  },

  async patchProduct(id, body) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH /products/${id} failed (${res.status})`);
    return res.json();
  },

  async deleteProduct(id) {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE /products/${id} failed (${res.status})`);
    return res.json();
  },
};

function titleCase(slug) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function timeStamp() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

function toast(message, kind = 'success', ms = 4200) {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast' + (kind === 'failed' ? ' failed' : '');
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .2s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 200);
  }, ms);
}

/* ---------------- shadow state (admin only) ----------------
   Persisted in localStorage since DummyJSON writes never persist
   server-side. Structure:
   { added: { [tempOrRealId]: product }, edited: { [id]: partialFields }, deleted: [id,...] }
------------------------------------------------------------- */
const SHADOW_KEY = 'stockroom_admin_shadow_v1';
const LOG_KEY = 'stockroom_admin_log_v1';

const Shadow = {
  load() {
    try {
      const raw = localStorage.getItem(SHADOW_KEY);
      if (!raw) return { added: {}, edited: {}, deleted: [] };
      const parsed = JSON.parse(raw);
      return {
        added: parsed.added || {},
        edited: parsed.edited || {},
        deleted: parsed.deleted || [],
      };
    } catch {
      return { added: {}, edited: {}, deleted: [] };
    }
  },
  save(state) {
    localStorage.setItem(SHADOW_KEY, JSON.stringify(state));
  },
  loadLog() {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  saveLog(log) {
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-300)));
  },
};
