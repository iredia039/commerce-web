// ============================================================
// app.js
// Entry point: wires up the Store/Admin nav toggle and kicks off
// the first load. Runs last (loaded after the other scripts).
// ============================================================

const navStoreBtn = document.getElementById("nav-store-btn");
const navAdminBtn = document.getElementById("nav-admin-btn");
const storeView   = document.getElementById("store-view");
const adminView   = document.getElementById("admin-view");

function showStoreView() {
  storeView.classList.remove("hidden");
  adminView.classList.add("hidden");
  navStoreBtn.classList.add("bg-slate-900", "text-white");
  navStoreBtn.classList.remove("text-slate-600");
  navAdminBtn.classList.remove("bg-slate-900", "text-white");
  navAdminBtn.classList.add("text-slate-600");
}

function showAdminView() {
  adminView.classList.remove("hidden");
  storeView.classList.add("hidden");
  navAdminBtn.classList.add("bg-slate-900", "text-white");
  navAdminBtn.classList.remove("text-slate-600");
  navStoreBtn.classList.remove("bg-slate-900", "text-white");
  navStoreBtn.classList.add("text-slate-600");

  // Only fetch the admin's starting product list the first time
  // this view is opened (see initAdminProducts in admin.js).
  initAdminProducts();
}

navStoreBtn.addEventListener("click", showStoreView);
navAdminBtn.addEventListener("click", showAdminView);

// ---- Initial load ----
loadCategories();
loadStoreProducts();
