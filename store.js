// ============================================================
// store.js
// Everything about the customer-facing "Store" view: loading
// products, rendering the grid, pagination, search, filter,
// and the product detail modal.
// ============================================================

// ---- DOM references ----
const searchInput   = document.getElementById("search-input");
const categorySelect = document.getElementById("category-select");
const storeStatus    = document.getElementById("store-status");
const productGrid    = document.getElementById("product-grid");
const paginationEl   = document.getElementById("pagination");

const detailModal   = document.getElementById("detail-modal");
const detailContent = document.getElementById("detail-content");
const detailCloseBtn = document.getElementById("detail-close-btn");

// ---- Main load function ----
// Decides WHICH api.js function to call based on current state
// (plain list vs category vs search), using pageSize = 10.
async function loadStoreProducts() {
  const { page, pageSize, category, searchQuery } = state.store;
  const skip = (page - 1) * pageSize;

  // TODO:
  // 1. show loading state (storeStatus.textContent = "Loading...")
  // 2. if searchQuery -> searchProducts(searchQuery, pageSize, skip)
  //    else if category -> getProductsByCategory(category, pageSize, skip)
  //    else -> getProducts(pageSize, skip)
  // 3. save result into state.store.products and state.store.total
  // 4. call renderProductGrid() and renderPagination()
  // 5. on error, show a friendly message in storeStatus
}

// ---- Populate the category <select> once on page load ----
async function loadCategories() {
  // TODO: call getCategories(), then create an <option> for each
  // and append it into categorySelect
}

// ---- Render the grid of product cards ----
function renderProductGrid() {
  productGrid.innerHTML = "";

  // TODO: for each product in state.store.products, build a card
  // (image, title, category, price) and append to productGrid.
  // Each card's click handler should call openProductDetail(product.id).

  // Reminder: handle the empty-results case (no products found).
}

// ---- Render Prev / page numbers / Next ----
function renderPagination() {
  paginationEl.innerHTML = "";

  // TODO: work out totalPages = Math.ceil(state.store.total / state.store.pageSize)
  // build Prev button, numbered buttons, Next button.
  // Clicking a page button should update state.store.page and call loadStoreProducts().
}

// ---- Product detail modal ----
async function openProductDetail(id) {
  // TODO: call getProductById(id), render its fields into detailContent,
  // then remove the "hidden" class from detailModal.
}

detailCloseBtn.addEventListener("click", () => {
  detailModal.classList.add("hidden");
});

// ---- Search + filter event listeners ----
// (debounce search so it doesn't fire a request on every keystroke)
let searchDebounceTimer;
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    state.store.searchQuery = e.target.value.trim();
    state.store.page = 1; // reset to first page on new search
    loadStoreProducts();
  }, 400);
});

categorySelect.addEventListener("change", (e) => {
  state.store.category = e.target.value;
  state.store.page = 1;
  loadStoreProducts();
});
