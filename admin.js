// ============================================================
// admin.js
// The admin dashboard: table of products (backed by
// state.admin.shadowProducts), add/full-edit/quick-edit/delete,
// each done optimistically with rollback on failure, plus the
// activity log.
// ============================================================

// ---- DOM references ----
const adminTableBody   = document.getElementById("admin-table-body");
const activityLogEl     = document.getElementById("activity-log");
const addProductBtn     = document.getElementById("add-product-btn");

const productFormModal  = document.getElementById("product-form-modal");
const productForm       = document.getElementById("product-form");
const productFormTitle  = document.getElementById("product-form-title");
const formCloseBtn      = document.getElementById("form-close-btn");

const formIdInput          = document.getElementById("product-form-id");
const formTitleInput       = document.getElementById("product-form-title-input");
const formCategoryInput    = document.getElementById("product-form-category");
const formPriceInput       = document.getElementById("product-form-price");
const formStockInput       = document.getElementById("product-form-stock");
const formDescriptionInput = document.getElementById("product-form-description");

// ---- Load the shadow state the first time the admin view opens ----
// (After this first load, shadowProducts is the source of truth —
// we don't re-fetch the full list from the API again, since our
// local edits wouldn't survive a re-fetch.)
async function initAdminProducts() {
  // TODO: if state.admin.shadowProducts is empty, call getProducts()
  // for a starting batch and store the array into
  // state.admin.shadowProducts. Then call renderAdminTable().
}

// ---- Render the admin table from shadow state ----
function renderAdminTable() {
  adminTableBody.innerHTML = "";

  // TODO: for each product in state.admin.shadowProducts, render a <tr> with:
  //   - title / category (plain text)
  //   - price and stock as small editable <input>s (quick-edit)
  //   - "Save" button next to price/stock inputs -> calls quickEditProduct(id, changes)
  //   - "Edit" button -> opens productFormModal pre-filled -> full edit (PUT)
  //   - "Delete" button -> calls handleDeleteProduct(id)
}

// ---- Render the activity log from state ----
function renderActivityLog() {
  activityLogEl.innerHTML = "";

  // TODO: for each entry in state.admin.activityLog, render an <li>
  // showing entry.timestamp, entry.message, colored by entry.type.
}

// ============================================================
// THE OPTIMISTIC UPDATE + ROLLBACK PATTERN
// Every write action below (add / full edit / quick edit / delete)
// follows the same shape. Use this as your template:
//
//   async function handleSomeAction(...) {
//     const previousState = /* shallow copy of the bit of shadowProducts
//                                 you're about to change, so you can restore it */;
//
//     // 1. OPTIMISTIC: change state.admin.shadowProducts immediately
//     //    and re-render, BEFORE the network call finishes.
//     // 2. re-render (renderAdminTable(), renderActivityLog())
//     // 3. try {
//     //      await theApiCall(...);           // from api.js
//     //      logActivity("Did X to product Y", "success");
//     //    } catch (err) {
//     //      // ROLLBACK: put previousState back into shadowProducts
//     //      logActivity("Failed to do X — rolled back", "error");
//     //    }
//     // 4. renderAdminTable(); renderActivityLog();
//   }
// ============================================================

async function handleAddProduct(productData) {
  // TODO: follow the pattern above using addProduct() from api.js.
  // Optimistic step: push a temporary product object (with a fake id)
  // into state.admin.shadowProducts before the request resolves.
}

async function handleFullEditProduct(id, productData) {
  // TODO: follow the pattern above using updateProductFull() from api.js.
}

async function quickEditProduct(id, changes) {
  // TODO: follow the pattern above using updateProductPartial() from api.js.
  // changes will usually be { price } or { stock }.
}

async function handleDeleteProduct(id) {
  // TODO: follow the pattern above using deleteProduct() from api.js.
  // Optimistic step: remove the product from shadowProducts immediately;
  // rollback = splice it back in at its original index if the call fails.
}

// ---- Add/Edit modal open + close ----
function openProductForm(product = null) {
  productForm.reset();
  if (product) {
    productFormTitle.textContent = "Edit product";
    formIdInput.value = product.id;
    formTitleInput.value = product.title;
    formCategoryInput.value = product.category;
    formPriceInput.value = product.price;
    formStockInput.value = product.stock;
    formDescriptionInput.value = product.description || "";
  } else {
    productFormTitle.textContent = "Add product";
    formIdInput.value = "";
  }
  productFormModal.classList.remove("hidden");
}

formCloseBtn.addEventListener("click", () => {
  productFormModal.classList.add("hidden");
});

addProductBtn.addEventListener("click", () => openProductForm());

productForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const productData = {
    title: formTitleInput.value,
    category: formCategoryInput.value,
    price: Number(formPriceInput.value),
    stock: Number(formStockInput.value),
    description: formDescriptionInput.value,
  };

  if (formIdInput.value) {
    handleFullEditProduct(Number(formIdInput.value), productData);
  } else {
    handleAddProduct(productData);
  }

  productFormModal.classList.add("hidden");
});
