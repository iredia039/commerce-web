// ============================================================
// state.js
// One shared object holding everything the app needs to render.
// Every other file reads/writes to this object instead of
// keeping its own separate variables.
// ============================================================

const state = {
  // ---- Store (read-only) side ----
  store: {
    products: [],       // current page of products from the API
    total: 0,           // total count matching the current filter (for pagination)
    page: 1,            // current page number (1-based)
    pageSize: 10,        // <-- 10 products per page
    category: "",       // currently selected category, "" = all
    searchQuery: "",    // currently active search term, "" = none
  },

  // ---- Admin side ----
  admin: {
    // shadowProducts is OUR local copy of the product list.
    // Because dummyjson.com doesn't really persist writes,
    // every add/edit/delete updates this array directly so the
    // admin table reflects "reality" even though the server
    // forgets it a moment later.
    shadowProducts: [],
    activityLog: [],    // array of { message, timestamp, type } — newest first
  },
};

// Small helper so every part of the app logs activity the same way.
function logActivity(message, type = "info") {
  state.admin.activityLog.unshift({
    message,
    type, // "info" | "success" | "error"
    timestamp: new Date().toLocaleTimeString(),
  });
  // TODO: call renderActivityLog() from admin.js after this
}
