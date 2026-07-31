/* ==========================================================================
   STOCKROOM — shop (home) page
   Every network call in this file is a GET request.
   ========================================================================== */

const state = {
  mode: 'all',       // 'all' | 'category' | 'search'
  category: '',
  query: '',
  page: 1,
  total: 0,
};

const grid = document.getElementById('grid');
const pager = document.getElementById('pager');
const resultMeta = document.getElementById('result-meta');
const chipsWrap = document.getElementById('chips');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');

let currentProductsById = new Map();

init();

async function init() {
  renderSkeleton();
  try {
    const categories = await Api.getCategories();
    renderChips(categories);
  } catch (err) {
    console.error(err);
  }
  initCart();
  loadPage(1);
}

function renderChips(categories) {
  const frag = document.createDocumentFragment();
  categories.slice(0, 20).forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.slug = cat.slug;
    btn.textContent = cat.name;
    frag.appendChild(btn);
  });
  chipsWrap.appendChild(frag);

  chipsWrap.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    [...chipsWrap.children].forEach(c => c.classList.remove('is-active'));
    btn.classList.add('is-active');
    const slug = btn.dataset.slug;
    if (slug) {
      state.mode = 'category';
      state.category = slug;
    } else {
      state.mode = 'all';
      state.category = '';
    }
    state.query = '';
    searchInput.value = '';
    loadPage(1);
  });
}

searchForm.addEventListener('submit', e => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) {
    state.mode = 'all';
    state.query = '';
  } else {
    state.mode = 'search';
    state.query = q;
  }
  [...chipsWrap.children].forEach(c => c.classList.remove('is-active'));
  if (state.mode === 'all') chipsWrap.firstElementChild.classList.add('is-active');
  loadPage(1);
});

async function loadPage(page) {
  state.page = page;
  renderSkeleton();
  const skip = (page - 1) * PAGE_SIZE;
  let data, endpointLabel;
  try {
    if (state.mode === 'category') {
      data = await Api.getByCategory(state.category, { skip });
      endpointLabel = `GET /products/category/${state.category}`;
    } else if (state.mode === 'search') {
      data = await Api.search(state.query, { skip });
      endpointLabel = `GET /products/search?q=${state.query}`;
    } else {
      data = await Api.getProducts({ skip });
      endpointLabel = `GET /products`;
    }
    state.total = data.total;
    renderGrid(data.products, endpointLabel);
    renderMeta(data, endpointLabel);
    renderPager();
  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div class="state-box" style="grid-column:1/-1">
        <div class="glyph">⚠</div>
        <h3>Could not reach the manifest</h3>
        <p>${escapeHtml(err.message)}. Check your connection and try again.</p>
      </div>`;
    pager.innerHTML = '';
    resultMeta.innerHTML = '';
  }
  window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
}

function renderMeta(data, endpointLabel) {
  const from = data.total === 0 ? 0 : data.skip + 1;
  const to = Math.min(data.skip + data.limit, data.total);
  resultMeta.innerHTML = `
    <span>${from}–${to} of ${data.total} products</span>
    <span class="stamp visible" style="position:static;transform:none;opacity:1;">${escapeHtml(endpointLabel)}</span>
  `;
}

function renderSkeleton() {
  grid.className = 'grid skeleton-grid';
  grid.innerHTML = Array.from({ length: PAGE_SIZE }).map(() => `
    <div class="card">
      <div class="card-media skel" style="height:100%"></div>
    </div>`).join('');
}

function renderGrid(products, endpointLabel) {
  grid.className = 'grid';
  if (!products.length) {
    grid.innerHTML = `
      <div class="state-box" style="grid-column:1/-1">
        <div class="glyph">∅</div>
        <h3>No products found</h3>
        <p>Try a different search term or category.</p>
      </div>`;
    return;
  }
  currentProductsById = new Map(products.map(p => [String(p.id), p]));

  grid.innerHTML = products.map(p => cardTemplate(p)).join('');
  grid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      const s = card.querySelector('.stamp');
      if (s) s.classList.add('visible');
    });
    card.addEventListener('mouseleave', () => {
      const s = card.querySelector('.stamp');
      if (s) s.classList.remove('visible');
    });
  });
}

// Delegated once, since grid.innerHTML is replaced on every render.
grid.addEventListener('click', e => {
  const addBtn = e.target.closest('[data-add-cart]');
  if (addBtn) {
    e.stopPropagation();
    const product = currentProductsById.get(addBtn.dataset.addCart);
    if (product) {
      Cart.add(product, 1);
      toast(`Added “${product.title}” to cart`);
    }
    return;
  }
  const card = e.target.closest('.card');
  if (card) openDetail(card.dataset.id);
});

function cardTemplate(p) {
  const low = p.stock <= 5;
  return `
    <article class="card" data-id="${p.id}" tabindex="0">
      <div class="card-media">
        <span class="stamp">GET /products/${p.id}</span>
        <img src="${p.thumbnail}" alt="" loading="lazy">
      </div>
      <div class="card-body">
        <span class="card-cat">${escapeHtml(p.category)}</span>
        <h3 class="card-title">${escapeHtml(p.title)}</h3>
        <div class="card-foot">
          <span class="card-price">${money(p.price)}</span>
          <span class="card-rating">★ ${p.rating?.toFixed?.(1) ?? p.rating}</span>
        </div>
        <span class="card-stock ${low ? 'low' : ''}">${low ? 'Low stock' : 'In stock'} · ${p.stock} units</span>
        <div class="card-actions">
          <button class="btn-cart" data-add-cart="${p.id}" aria-label="Add ${escapeHtml(p.title)} to cart">+ Cart</button>
        </div>
      </div>
    </article>`;
}

function renderPager() {
  const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
  const cur = state.page;
  let pages = [];
  const add = n => pages.push(n);
  add(1);
  for (let i = cur - 1; i <= cur + 1; i++) if (i > 1 && i < totalPages) add(i);
  if (totalPages > 1) add(totalPages);
  pages = [...new Set(pages)].sort((a, b) => a - b);

  let html = `<div class="pager-status">Page ${cur} of ${totalPages}</div>`;
  html += `<button ${cur === 1 ? 'disabled' : ''} data-page="${cur - 1}">‹ Prev</button>`;
  let last = 0;
  pages.forEach(n => {
    if (n - last > 1) html += `<span class="ellipsis">…</span>`;
    html += `<button class="${n === cur ? 'is-current' : ''}" data-page="${n}">${n}</button>`;
    last = n;
  });
  html += `<button ${cur === totalPages ? 'disabled' : ''} data-page="${cur + 1}">Next ›</button>`;
  pager.innerHTML = html;
  pager.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => loadPage(Number(btn.dataset.page)));
  });
}

/* ---------------- detail modal ---------------- */
const overlay = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
document.getElementById('modal-close').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

async function openDetail(id) {
  overlay.classList.add('is-open');
  modalBody.innerHTML = `<div style="padding:60px;text-align:center;font-family:var(--font-mono);color:var(--ink-soft)">Loading GET /products/${id} …</div>`;
  try {
    const p = await Api.getOne(id);
    modalBody.innerHTML = detailTemplate(p);
    wireDetailCart(p);
  } catch (err) {
    modalBody.innerHTML = `<div style="padding:60px;text-align:center">
      <p>Could not load this product.</p><p style="color:var(--ink-soft);font-family:var(--font-mono);font-size:12px">${escapeHtml(err.message)}</p>
    </div>`;
  }
}

function closeModal() {
  overlay.classList.remove('is-open');
}

function wireDetailCart(p) {
  let qty = 1;
  const qtyValueEl = modalBody.querySelector('#detail-qty-value');
  modalBody.querySelector('#detail-qty-inc').addEventListener('click', () => {
    qty += 1;
    qtyValueEl.textContent = qty;
  });
  modalBody.querySelector('#detail-qty-dec').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    qtyValueEl.textContent = qty;
  });
  modalBody.querySelector('#detail-add-cart').addEventListener('click', () => {
    Cart.add(p, qty);
    toast(`Added ${qty} × “${p.title}” to cart`);
  });
}

/* ---------------- cart drawer ---------------- */
function initCart() {
  const cartBtn = document.getElementById('cart-btn');
  const cartBadge = document.getElementById('cart-badge');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartItemsEl = document.getElementById('cart-items');
  const cartSubtotalEl = document.getElementById('cart-subtotal');
  const cartCheckoutBtn = document.getElementById('cart-checkout');

  function updateBadge() {
    const n = Cart.count();
    cartBadge.textContent = n;
    cartBadge.classList.toggle('is-empty', n === 0);
  }

  function renderCartItems() {
    const items = Object.values(Cart.get());
    if (!items.length) {
      cartItemsEl.innerHTML = `<div class="cart-empty">Your cart is empty. Add something from the shop.</div>`;
    } else {
      cartItemsEl.innerHTML = items.map(cartItemTemplate).join('');
    }
    cartSubtotalEl.textContent = money(Cart.subtotal());
  }

  function cartItemTemplate(i) {
    const discounted = i.price * (1 - (i.discountPercentage || 0) / 100);
    return `
      <div class="cart-item" data-cart-id="${i.id}">
        <img src="${i.thumbnail}" alt="">
        <div class="cart-item-body">
          <span class="cart-item-title">${escapeHtml(i.title)}</span>
          <span class="cart-item-price">${money(discounted)} ${i.discountPercentage ? `<s>${money(i.price)}</s>` : ''}</span>
          <div class="qty-stepper">
            <button type="button" data-cart-dec aria-label="Decrease quantity">−</button>
            <span>${i.qty}</span>
            <button type="button" data-cart-inc aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button class="cart-item-remove" data-cart-remove aria-label="Remove ${escapeHtml(i.title)}">✕</button>
      </div>`;
  }

  function openCart() {
    renderCartItems();
    cartOverlay.classList.add('is-open');
  }
  function closeCart() {
    cartOverlay.classList.remove('is-open');
  }

  cartBtn.addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', e => { if (e.target === cartOverlay) closeCart(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && cartOverlay.classList.contains('is-open')) closeCart();
  });

  cartItemsEl.addEventListener('click', e => {
    const row = e.target.closest('[data-cart-id]');
    if (!row) return;
    const id = row.dataset.cartId;
    const item = Cart.get()[id];
    if (e.target.closest('[data-cart-remove]')) Cart.remove(id);
    else if (e.target.closest('[data-cart-inc]')) Cart.setQty(id, item.qty + 1);
    else if (e.target.closest('[data-cart-dec]')) Cart.setQty(id, item.qty - 1);
  });

  cartCheckoutBtn.addEventListener('click', async () => {
    cartCheckoutBtn.disabled = true;
    cartCheckoutBtn.textContent = 'Processing…';
    try {
      const result = await Cart.checkout();
      const total = result.discountedTotal ?? result.total ?? 0;
      toast(`Order placed — DummyJSON computed a total of ${money(total)}`);
      Cart.clear();
      closeCart();
    } catch (err) {
      toast(err.message, 'failed');
    } finally {
      cartCheckoutBtn.disabled = false;
      cartCheckoutBtn.textContent = 'Checkout';
    }
  });

  Cart.onChange(() => {
    updateBadge();
    if (cartOverlay.classList.contains('is-open')) renderCartItems();
  });

  updateBadge();
}

function detailTemplate(p) {
  const reviews = (p.reviews || []).slice(0, 4).map(r => `
    <div class="review">
      <div class="review-head"><span>${escapeHtml(r.reviewerName)}</span><span>★ ${r.rating}</span></div>
      <p>${escapeHtml(r.comment)}</p>
    </div>`).join('');

  return `
    <div class="detail">
      <div class="detail-media">
        <img src="${p.images?.[0] || p.thumbnail}" alt="${escapeHtml(p.title)}" style="max-height:340px">
      </div>
      <div class="detail-body">
        <span class="detail-cat">${escapeHtml(p.category)} · ${escapeHtml(p.brand || 'Unbranded')}</span>
        <h2 id="detail-title" class="detail-title">${escapeHtml(p.title)}</h2>
        <div class="detail-price-row">
          <span class="detail-price">${money(p.price)}</span>
          ${p.discountPercentage ? `<span class="detail-discount">−${p.discountPercentage}% today</span>` : ''}
        </div>
        <div class="detail-cart-row">
          <div class="qty-stepper">
            <button type="button" id="detail-qty-dec" aria-label="Decrease quantity">−</button>
            <span id="detail-qty-value">1</span>
            <button type="button" id="detail-qty-inc" aria-label="Increase quantity">+</button>
          </div>
          <button class="btn btn-cart-lg" id="detail-add-cart">Add to cart</button>
        </div>
        <p class="detail-desc">${escapeHtml(p.description)}</p>
        <table class="spec-table">
          <tr><td>Stock</td><td>${p.stock} units</td></tr>
          <tr><td>Rating</td><td>★ ${p.rating}</td></tr>
          <tr><td>Availability</td><td>${escapeHtml(p.availabilityStatus || (p.stock > 0 ? 'In Stock' : 'Out of Stock'))}</td></tr>
          <tr><td>Warranty</td><td>${escapeHtml(p.warrantyInformation || '—')}</td></tr>
          <tr><td>Shipping</td><td>${escapeHtml(p.shippingInformation || '—')}</td></tr>
          <tr><td>Returns</td><td>${escapeHtml(p.returnPolicy || '—')}</td></tr>
          <tr><td>SKU</td><td>${escapeHtml(p.sku || '—')}</td></tr>
        </table>
        ${reviews ? `<div class="reviews">${reviews}</div>` : ''}
      </div>
    </div>`;
}