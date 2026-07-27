// ============================================================
// api.js
// Every call to dummyjson.com lives in this file. Keeping all
// fetch() calls in one place means store.js and admin.js never
// have to think about URLs or response.json() — they just call
// these functions and get plain data back.
//
// Pattern to follow for each function below:
//   async function name(args) {
//     try {
//       const res = await fetch(url);
//       if (!res.ok) throw new Error(`Request failed: ${res.status}`);
//       const data = await res.json();
//       return data;
//     } catch (err) {
//       console.error(err);
//       throw err; // let the caller decide how to show this to the user
//     }
//   }
// ============================================================

const API_BASE = "https://dummyjson.com/products";

// ---------- GET (store side) ----------

// Fetch one page of products.
// limit/skip map directly to state.store.pageSize and (page-1)*pageSize.
async function getProducts(limit, skip) {
  // TODO: fetch `${API_BASE}?limit=${limit}&skip=${skip}`
  // returns { products, total, skip, limit }
}

// Fetch the list of category names for the filter dropdown.
async function getCategories() {
  // TODO: fetch `${API_BASE}/categories`
}

// Fetch one page of products within a single category.
async function getProductsByCategory(categoryName, limit, skip) {
  // TODO: fetch `${API_BASE}/category/${categoryName}?limit=${limit}&skip=${skip}`
}

// Fetch one page of search results.
async function searchProducts(query, limit, skip) {
  // TODO: fetch `${API_BASE}/search?q=${encodeURIComponent(query)}&limit=${limit}&skip=${skip}`
}

// Fetch a single product's full detail.
async function getProductById(id) {
  // TODO: fetch `${API_BASE}/${id}`
}

// ---------- WRITE (admin side) ----------
// Reminder: dummyjson *accepts* these requests and echoes back a
// fake success response, but never actually stores anything.
// admin.js is responsible for updating state.admin.shadowProducts
// after each of these resolves — that's the "real" data source.

async function addProduct(productData) {
  // TODO: POST `${API_BASE}/add`
  // headers: { "Content-Type": "application/json" }, body: JSON.stringify(productData)
}

async function updateProductFull(id, productData) {
  // TODO: PUT `${API_BASE}/${id}` — full replace
}

async function updateProductPartial(id, partialData) {
  // TODO: PATCH `${API_BASE}/${id}` — quick edit (e.g. just price or stock)
}

async function deleteProduct(id) {
  // TODO: DELETE `${API_BASE}/${id}`
}
