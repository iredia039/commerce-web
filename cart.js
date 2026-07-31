/* ==========================================================================
   STOCKROOM — cart (customer-side only)
   Lives entirely client-side in localStorage — nothing here writes to
   DummyJSON. The one exception is checkout(), which POSTs the cart to
   DummyJSON's /carts/add purely to get back a real discounted total,
   the same way the rest of this app surfaces the exact endpoint it hits.
   Nothing is actually purchased; the cart is cleared locally afterward.
   ========================================================================== */

const CART_KEY = 'stockroom_cart_v1';
const CART_USER_ID = 1; // required by DummyJSON's /carts/add, has no real meaning here

const Cart = {
  _listeners: [],

  load() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    this._listeners.forEach(fn => fn(items));
  },

  get() {
    return this.load();
  },

  add(product, qty = 1) {
    const items = this.load();
    const id = String(product.id);
    if (items[id]) {
      items[id].qty += qty;
    } else {
      items[id] = {
        id: product.id,
        title: product.title,
        price: product.price,
        discountPercentage: product.discountPercentage || 0,
        thumbnail: product.thumbnail,
        qty,
      };
    }
    this.save(items);
    return items[id];
  },

  setQty(id, qty) {
    const items = this.load();
    id = String(id);
    if (!items[id]) return;
    if (qty <= 0) delete items[id];
    else items[id].qty = qty;
    this.save(items);
  },

  remove(id) {
    const items = this.load();
    delete items[String(id)];
    this.save(items);
  },

  clear() {
    this.save({});
  },

  count() {
    return Object.values(this.load()).reduce((n, i) => n + i.qty, 0);
  },

  subtotal() {
    return Object.values(this.load()).reduce((sum, i) => {
      const unit = i.price * (1 - (i.discountPercentage || 0) / 100);
      return sum + unit * i.qty;
    }, 0);
  },

  onChange(fn) {
    this._listeners.push(fn);
  },

  async checkout() {
    const items = this.load();
    const products = Object.values(items).map(i => ({ id: i.id, quantity: i.qty }));
    if (!products.length) throw new Error('Cart is empty');
    const res = await fetch(`${API_BASE}/carts/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: CART_USER_ID, products }),
    });
    if (!res.ok) throw new Error(`POST /carts/add failed (${res.status})`);
    return res.json();
  },
};
