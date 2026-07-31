<script>
const API = 'https://dummyjson.com/products';
const PAGE_SIZE = 10;

/* ============================================================
   STOREFRONT (GET-only)
============================================================ */
const sf = { page: 1, total: 0, category: null, query: '', products: [], loading: false };

const $ = (id) => document.getElementById(id);

async function loadCategories(){
  try{
    const res = await fetch(`${API}/categories`);
    const data = await res.json();
    const cats = data.map(c => typeof c === 'string' ? {slug:c, name:c} : {slug:c.slug, name:c.name});
    const wrap = $('categoryChips');
    wrap.innerHTML = '';
    const allChip = document.createElement('button');
    allChip.textContent = 'All';
    allChip.className = chipClass(sf.category === null);
    allChip.onclick = () => { sf.category = null; sf.query=''; $('searchInput').value=''; sf.page = 1; fetchStorefront(); renderChips(); };
    wrap.appendChild(allChip);
    cats.forEach(c => {
      const b = document.createElement('button');
      b.textContent = c.name;
      b.dataset.slug = c.slug;
      b.className = chipClass(sf.category === c.slug);
      b.onclick = () => { sf.category = c.slug; sf.query=''; $('searchInput').value=''; sf.page = 1; fetchStorefront(); renderChips(); };
      wrap.appendChild(b);
    });
  }catch(e){
    $('categoryChips').innerHTML = '<span class="font-mono text-xs text-[var(--red)]">categories failed to load</span>';
  }
}
function chipClass(active){
  return `px-3 py-1.5 rounded-full border-2 transition ${active ? 'bg-[var(--ink)] text-white border-[var(--ink)]' : 'bg-white text-[var(--ink)] border-[var(--ink)]/15 hover:border-[var(--ink)]'}`;
}
function renderChips(){
  [...document.querySelectorAll('#categoryChips button')].forEach(b => {
    const isAll = !b.dataset.slug;
    const active = isAll ? sf.category === null : b.dataset.slug === sf.category;
    b.className = chipClass(active);
  });
}

function buildStorefrontURL(){
  const skip = (sf.page - 1) * PAGE_SIZE;
  if (sf.query.trim()) return `${API}/search?q=${encodeURIComponent(sf.query.trim())}&limit=${PAGE_SIZE}&skip=${skip}`;
  if (sf.category) return `${API}/category/${encodeURIComponent(sf.category)}?limit=${PAGE_SIZE}&skip=${skip}`;
  return `${API}?limit=${PAGE_SIZE}&skip=${skip}`;
}

async function fetchStorefront(){
  sf.loading = true;
  renderGridSkeleton();
  try{
    const res = await fetch(buildStorefrontURL());
    if(!res.ok) throw new Error('request failed');
    const data = await res.json();
    sf.products = data.products || [];
    sf.total = data.total || 0;
    renderMeta();
    renderGrid();
    renderPagination();
  }catch(e){
    $('productGrid').innerHTML = '';
    $('emptyState').classList.remove('hidden');
    $('emptyState').textContent = 'Could not reach the catalog feed. Try again.';
  }finally{
    sf.loading = false;
  }
}

function renderMeta(){
  const start = sf.total === 0 ? 0 : (sf.page-1)*PAGE_SIZE + 1;
  const end = Math.min(sf.page*PAGE_SIZE, sf.total);
  const scope = sf.query.trim() ? `search "${sf.query.trim()}"` : (sf.category ? `category "${sf.category}"` : 'all stock');
  $('resultMeta').textContent = `showing ${start}–${end} of ${sf.total} · ${scope}`;
}

function renderGridSkeleton(){
  const grid = $('productGrid');
  $('emptyState').classList.add('hidden');
  grid.innerHTML = Array.from({length:10}).map(()=>`
    <div class="bg-white border-2 border-[var(--ink)]/10 p-3">
      <div class="skeleton h-28 w-full mb-3"></div>
      <div class="skeleton h-3 w-3/4 mb-2"></div>
      <div class="skeleton h-3 w-1/2"></div>
    </div>`).join('');
}

function renderGrid(){
  const grid = $('productGrid');
  if(sf.products.length === 0){
    grid.innerHTML = '';
    $('emptyState').classList.remove('hidden');
    return;
  }
  $('emptyState').classList.add('hidden');
  grid.innerHTML = sf.products.map(p => `
    <button data-id="${p.id}" class="prod-card text-left bg-white border-2 border-[var(--ink)]/10 hover:border-[var(--orange)] transition group tag-corner overflow-hidden">
      <div class="h-28 flex items-center justify-center bg-[#F4F3EF] overflow-hidden">
        <img src="${p.thumbnail}" alt="${escapeHtml(p.title)}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition" loading="lazy" />
      </div>
      <div class="barcode mx-3 mt-2"></div>
      <div class="p-3 pt-2">
        <div class="font-mono text-[10px] uppercase text-[var(--steel)] truncate">${escapeHtml(p.category)}</div>
        <div class="font-medium text-sm truncate mt-0.5">${escapeHtml(p.title)}</div>
        <div class="font-mono text-sm font-semibold mt-1 text-[var(--orange)]">$${Number(p.price).toFixed(2)}</div>
      </div>
    </button>
  `).join('');
  [...grid.querySelectorAll('.prod-card')].forEach(el => el.onclick = () => openDetail(el.dataset.id));
}

function renderPagination(){
  const totalPages = Math.max(1, Math.ceil(sf.total / PAGE_SIZE));
  const p = sf.page;
  const el = $('pagination');
  let pages = [];
  const win = 1;
  for(let i=1;i<=totalPages;i++){
    if(i===1 || i===totalPages || (i>=p-win && i<=p+win)) pages.push(i);
    else if(pages[pages.length-1] !== '…') pages.push('…');
  }
  const btn = (label, page, disabled, active) => `<button ${disabled?'disabled':''} data-page="${page}"
      class="pg-btn px-3 py-1.5 border-2 ${active?'bg-[var(--ink)] text-white border-[var(--ink)]':'bg-white border-[var(--ink)]/10 hover:border-[var(--ink)]'} ${disabled?'opacity-30 cursor-not-allowed':''}">${label}</button>`;
  el.innerHTML = btn('‹ Prev', p-1, p<=1, false) +
    pages.map(pg => pg === '…' ? `<span class="px-2 text-[var(--steel)]">…</span>` : btn(pg, pg, false, pg===p)).join('') +
    btn('Next ›', p+1, p>=totalPages, false);
  [...el.querySelectorAll('.pg-btn')].forEach(b => {
    if(b.disabled) return;
    b.onclick = () => { sf.page = Number(b.dataset.page); fetchStorefront(); window.scrollTo({top:0, behavior:'smooth'}); };
  });
}

async function openDetail(id){
  $('detailModal').classList.remove('hidden');
  $('detailContent').innerHTML = `<div class="skeleton h-64 w-full"></div>`;
  try{
    const res = await fetch(`${API}/${id}`);
    const p = await res.json();
    $('detailContent').innerHTML = `
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <div class="bg-[#F4F3EF] h-64 flex items-center justify-center mb-3">
            <img src="${p.thumbnail}" class="max-h-full max-w-full object-contain" />
          </div>
          <div class="flex gap-2 overflow-x-auto">
            ${(p.images||[]).slice(0,5).map(im=>`<img src="${im}" class="h-14 w-14 object-cover border-2 border-[var(--ink)]/10">`).join('')}
          </div>
        </div>
        <div>
          <div class="font-mono text-[10px] uppercase text-[var(--steel)]">${escapeHtml(p.category)} · ${escapeHtml(p.brand||'—')}</div>
          <h2 class="font-display text-2xl font-semibold mt-1">${escapeHtml(p.title)}</h2>
          <div class="font-mono text-2xl font-semibold text-[var(--orange)] mt-3">$${Number(p.price).toFixed(2)}</div>
          <p class="text-sm mt-3 leading-relaxed text-[var(--ink)]/80">${escapeHtml(p.description||'')}</p>
          <div class="grid grid-cols-2 gap-3 mt-5 font-mono text-xs">
            <div class="border-2 border-[var(--ink)]/10 p-2"><div class="text-[var(--steel)] uppercase text-[10px]">Stock</div><div class="font-semibold">${p.stock}</div></div>
            <div class="border-2 border-[var(--ink)]/10 p-2"><div class="text-[var(--steel)] uppercase text-[10px]">Rating</div><div class="font-semibold">${p.rating ?? '—'}</div></div>
            <div class="border-2 border-[var(--ink)]/10 p-2"><div class="text-[var(--steel)] uppercase text-[10px]">SKU</div><div class="font-semibold">#${p.id}</div></div>
            <div class="border-2 border-[var(--ink)]/10 p-2"><div class="text-[var(--steel)] uppercase text-[10px]">Discount</div><div class="font-semibold">${p.discountPercentage ?? 0}%</div></div>
          </div>
        </div>
      </div>`;
  }catch(e){
    $('detailContent').innerHTML = `<p class="font-mono text-sm text-[var(--red)]">Could not load item #${id}.</p>`;
  }
}
$('closeDetail').onclick = () => $('detailModal').classList.add('hidden');
$('detailModal').addEventListener('click', (e)=>{ if(e.target.id==='detailModal') $('detailModal').classList.add('hidden'); });

let searchDebounce;
$('searchInput').addEventListener('input', (e)=>{
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(()=>{
    sf.query = e.target.value;
    sf.category = null;
    sf.page = 1;
    renderChips();
    fetchStorefront();
  }, 400);
});

function escapeHtml(str){
  const d = document.createElement('div'); d.textContent = str ?? ''; return d.innerHTML;
}

/* ============================================================
   TABS
============================================================ */
$('tabStorefront').onclick = () => switchTab('storefront');
$('tabAdmin').onclick = () => switchTab('admin');
function switchTab(which){
  const sfOn = which==='storefront';
  $('viewStorefront').classList.toggle('hidden', !sfOn);
  $('viewAdmin').classList.toggle('hidden', sfOn);
  $('tabStorefront').className = `px-4 py-2 rounded-sm transition ${sfOn?'tab-active':'text-white/60 hover:text-white'}`;
  $('tabAdmin').className = `px-4 py-2 rounded-sm transition ${!sfOn?'tab-active':'text-white/60 hover:text-white'}`;
  if(!sfOn && admin.products.length===0 && !admin.loading) seedAdmin();
}

/* ============================================================
   ADMIN CONSOLE (shadow state + write ops)
============================================================ */
const admin = { products: [], log: [], loading: false, nextTempId: -1 };

function pushLog(entry){
  const item = { id: crypto.randomUUID(), time: new Date(), ...entry };
  admin.log.unshift(item);
  renderLog();
  return item.id;
}
function updateLog(id, patch){
  const idx = admin.log.findIndex(l => l.id === id);
  if(idx>-1) admin.log[idx] = { ...admin.log[idx], ...patch };
  renderLog();
}
function renderLog(){
  $('logCount').textContent = `${admin.log.length} event${admin.log.length===1?'':'s'}`;
  $('activityLog').innerHTML = admin.log.map(l => {
    const statusColor = l.status==='success' ? 'var(--green)' : l.status==='failed' ? 'var(--red)' : 'var(--yellow)';
    const methodColor = { POST:'var(--green)', PUT:'var(--steel)', PATCH:'var(--yellow)', DELETE:'var(--red)' }[l.method] || 'var(--ink)';
    return `<div class="log-enter border-l-4 pl-2 py-1" style="border-color:${statusColor}">
      <div class="flex items-center gap-2 text-[10px] text-[var(--steel)]">
        <span>${l.time.toLocaleTimeString()}</span>
        <span class="font-semibold" style="color:${methodColor}">${l.method}</span>
        <span class="truncate">${l.endpoint}</span>
        ${l.status==='pending' ? '<span class="pulse-dot">●</span>' : ''}
      </div>
      <div class="text-[11px] mt-0.5">${l.desc}</div>
      ${l.status ? `<div class="text-[10px] uppercase font-semibold mt-0.5" style="color:${statusColor}">${l.status}${l.detail? ' — '+l.detail : ''}</div>` : ''}
    </div>`;
  }).join('');
}

async function seedAdmin(){
  admin.loading = true;
  $('adminLoading').classList.remove('hidden');
  $('adminLoading').textContent = 'loading shadow inventory…';
  try{
    const res = await fetch(`${API}?limit=20`);
    const data = await res.json();
    admin.products = data.products.map(p => ({...p}));
    renderAdminTable();
    $('adminLoading').classList.add('hidden');
    pushLog({ method:'GET', endpoint:'/products?limit=20', desc:'Seeded local shadow ledger from live catalog', status:'success' });
  }catch(e){
    $('adminLoading').textContent = 'Could not seed shadow inventory — check connection and click Reseed.';
  }finally{
    admin.loading = false;
  }
}
$('resetShadow').onclick = () => { admin.products = []; admin.log = []; renderLog(); seedAdmin(); };

function shouldSimulateFailure(){
  return $('simulateFail').checked && Math.random() < 0.3;
}

function renderAdminTable(){
  const body = $('adminTableBody');
  if(admin.products.length===0){
    body.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-[var(--steel)] text-xs">No items in shadow ledger.</td></tr>`;
    return;
  }
  body.innerHTML = admin.products.map(p => `
    <tr data-row="${p.id}" class="${p._pending ? 'opacity-50' : ''} hover:bg-[#F7F7F4]">
      <td class="px-3 py-2">
        <div class="flex items-center gap-2">
          <img src="${p.thumbnail||''}" class="w-8 h-8 object-cover border border-[var(--ink)]/10 bg-[#F4F3EF]">
          <div class="max-w-[160px]">
            <div class="truncate font-sans text-[13px]">${escapeHtml(p.title)}</div>
            <div class="text-[10px] text-[var(--steel)]">#${p.id}</div>
          </div>
        </div>
      </td>
      <td class="px-3 py-2 text-[11px]">${escapeHtml(p.category||'')}</td>
      <td class="px-3 py-2">
        <input type="number" step="0.01" data-field="price" data-id="${p.id}" value="${p.price}" class="qedit w-20 px-1 py-1 border border-[var(--ink)]/15 focus:border-[var(--orange)] text-xs">
      </td>
      <td class="px-3 py-2">
        <input type="number" data-field="stock" data-id="${p.id}" value="${p.stock}" class="qedit w-16 px-1 py-1 border border-[var(--ink)]/15 focus:border-[var(--orange)] text-xs">
      </td>
      <td class="px-3 py-2">
        <div class="flex gap-1">
          <button data-act="quicksave" data-id="${p.id}" title="Quick save (PATCH)" class="w-7 h-7 bg-[var(--yellow)]/80 hover:bg-[var(--yellow)] text-xs">✓</button>
          <button data-act="edit" data-id="${p.id}" title="Full edit (PUT)" class="w-7 h-7 bg-[var(--steel)] text-white hover:brightness-110 text-xs">✎</button>
          <button data-act="delete" data-id="${p.id}" title="Delete" class="w-7 h-7 bg-[var(--red)] text-white hover:brightness-110 text-xs">🗑</button>
        </div>
      </td>
    </tr>`).join('');

  body.querySelectorAll('[data-act="quicksave"]').forEach(b => b.onclick = () => quickEdit(Number(b.dataset.id)));
  body.querySelectorAll('[data-act="edit"]').forEach(b => b.onclick = () => openEditModal(Number(b.dataset.id)));
  body.querySelectorAll('[data-act="delete"]').forEach(b => b.onclick = () => deleteProduct(Number(b.dataset.id)));
}

/* ---- PATCH: quick edit (price/stock) ---- */
async function quickEdit(id){
  const row = document.querySelector(`tr[data-row="${id}"]`);
  const priceInput = row.querySelector('[data-field="price"]');
  const stockInput = row.querySelector('[data-field="stock"]');
  const newPrice = Number(priceInput.value);
  const newStock = Number(stockInput.value);
  const product = admin.products.find(p => p.id === id);
  const before = { price: product.price, stock: product.stock };

  product.price = newPrice; product.stock = newStock; product._pending = true;
  renderAdminTable();
  const logId = pushLog({ method:'PATCH', endpoint:`/products/${id}`, desc:`Quick-edit "${product.title}": price ${before.price}→${newPrice}, stock ${before.stock}→${newStock}`, status:'pending' });

  try{
    if(shouldSimulateFailure()) throw new Error('Simulated network failure');
    const res = await fetch(`${API}/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ price:newPrice, stock:newStock })
    });
    if(!res.ok) throw new Error('Server rejected update');
    await res.json();
    product._pending = false;
    updateLog(logId, { status:'success' });
  }catch(e){
    product.price = before.price; product.stock = before.stock; product._pending = false;
    updateLog(logId, { status:'failed', detail: e.message + ' — rolled back' });
  }
  renderAdminTable();
}

async function deleteProduct(id){
  const idx = admin.products.findIndex(p => p.id === id);
  if(idx === -1) return;
  const product = admin.products[idx];
  if(!confirm(`Delete "${product.title}" from the shadow ledger?`)) return;

  const snapshot = product; 
  admin.products.splice(idx, 1);
  renderAdminTable();
  const logId = pushLog({ method:'DELETE', endpoint:`/products/${id}`, desc:`Delete "${snapshot.title}"`, status:'pending' });

  try{
    if(shouldSimulateFailure()) throw new Error('Simulated network failure');
    const res = await fetch(`${API}/${id}`, { method:'DELETE' });
    if(!res.ok) throw new Error('Server rejected delete');
    await res.json();
    updateLog(logId, { status:'success' });
  }catch(e){
    admin.products.splice(idx, 0, snapshot);
    updateLog(logId, { status:'failed', detail: e.message + ' — restored' });
  }
  renderAdminTable();
}

let editMode = 'add';
function openEditModal(id){
  editMode = 'edit';
  const p = admin.products.find(pr => pr.id === id);
  $('editModalTitle').textContent = 'Edit Product (full replace)';
  $('fId').value = p.id;
  $('fTitle').value = p.title || '';
  $('fCategory').value = p.category || '';
  $('fBrand').value = p.brand || '';
  $('fPrice').value = p.price || 0;
  $('fStock').value = p.stock || 0;
  $('fThumbnail').value = p.thumbnail || '';
  $('fDescription').value = p.description || '';
  $('editModal').classList.remove('hidden');
}
$('openAdd').onclick = () => {
  editMode = 'add';
  $('editModalTitle').textContent = 'Add Product';
  $('editForm').reset();
  $('fId').value = '';
  $('editModal').classList.remove('hidden');
};
$('closeEdit').onclick = $('cancelEdit').onclick = () => $('editModal').classList.add('hidden');
$('editModal').addEventListener('click', (e)=>{ if(e.target.id==='editModal') $('editModal').classList.add('hidden'); });

$('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: $('fTitle').value.trim(),
    category: $('fCategory').value.trim(),
    brand: $('fBrand').value.trim(),
    price: Number($('fPrice').value),
    stock: Number($('fStock').value),
    thumbnail: $('fThumbnail').value.trim() || 'https://cdn.dummyjson.com/products/images/placeholder.jpg',
    description: $('fDescription').value.trim(),
  };
  $('editModal').classList.add('hidden');
  if(editMode === 'add') await addProduct(payload);
  else await fullEditProduct(Number($('fId').value), payload);
});


async function addProduct(payload){
  const tempId = admin.nextTempId--;
  const optimistic = { id: tempId, rating: 0, discountPercentage: 0, images: [payload.thumbnail], _pending:true, ...payload };
  admin.products.unshift(optimistic);
  renderAdminTable();
  const logId = pushLog({ method:'POST', endpoint:'/products/add', desc:`Add "${payload.title}"`, status:'pending' });

  try{
    if(shouldSimulateFailure()) throw new Error('Simulated network failure');
    const res = await fetch(`${API}/add`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('Server rejected creation');
    const created = await res.json();
    const idx = admin.products.findIndex(p => p.id === tempId);
    if(idx>-1) admin.products[idx] = { ...optimistic, ...created, id: created.id ?? tempId, _pending:false };
    updateLog(logId, { status:'success', desc:`Add "${payload.title}" → assigned id #${created.id ?? tempId}` });
  }catch(e){
    admin.products = admin.products.filter(p => p.id !== tempId);
    updateLog(logId, { status:'failed', detail: e.message + ' — discarded' });
  }
  renderAdminTable();
}

/* ---- PUT: full edit ---- */
async function fullEditProduct(id, payload){
  const idx = admin.products.findIndex(p => p.id === id);
  if(idx === -1) return;
  const before = { ...admin.products[idx] };
  admin.products[idx] = { ...admin.products[idx], ...payload, _pending:true };
  renderAdminTable();
  const logId = pushLog({ method:'PUT', endpoint:`/products/${id}`, desc:`Full replace "${payload.title}"`, status:'pending' });

  try{
    if(shouldSimulateFailure()) throw new Error('Simulated network failure');
    const res = await fetch(`${API}/${id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('Server rejected update');
    const updated = await res.json();
    admin.products[idx] = { ...admin.products[idx], ...updated, _pending:false };
    updateLog(logId, { status:'success' });
  }catch(e){
    admin.products[idx] = { ...before, _pending:false };
    updateLog(logId, { status:'failed', detail: e.message + ' — rolled back' });
  }
  renderAdminTable();
}

/* ============================================================
   INIT
============================================================ */
loadCategories();
fetchStorefront();
</script>
