/**
 * admin.js — HANYA dimuat oleh admin.html.
 * Halaman publik (kopi.html, goldfish.html, website.html) tidak pernah
 * memuat file ini, jadi tombol "Tulis artikel baru" & kontrol edit/hapus
 * tidak pernah muncul di sisi pengunjung.
 */

const els = {
  loginView: document.querySelector("[data-login-view]"),
  dashboardView: document.querySelector("[data-dashboard-view]"),
  loginForm: document.querySelector("[data-login-form]"),
  loginError: document.querySelector("[data-login-error]"),
  logoutBtn: document.querySelector("[data-logout]"),
  articleForm: document.querySelector("[data-article-form]"),
  formTitle: document.querySelector("[data-form-title]"),
  cancelEditBtn: document.querySelector("[data-cancel-edit]"),
  adminList: document.querySelector("[data-admin-list]"),
  categoryTabs: document.querySelectorAll("[data-filter-tab]"),
  saveMsg: document.querySelector("[data-save-msg]"),
};

let editingId = null;
let activeFilter = "all";

/* ---------------- AUTH ---------------- */

async function checkSession() {
  const { data } = await db.auth.getSession();
  if (data.session) {
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  els.loginView.hidden = false;
  els.dashboardView.hidden = true;
}

function showDashboard() {
  els.loginView.hidden = true;
  els.dashboardView.hidden = false;
  loadAdminArticles();
}

els.loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.loginError.textContent = "";
  const formData = new FormData(els.loginForm);
  const email = formData.get("email");
  const password = formData.get("password");

  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    els.loginError.textContent = "Email atau kata sandi salah.";
    return;
  }
  showDashboard();
});

els.logoutBtn?.addEventListener("click", async () => {
  await db.auth.signOut();
  showLogin();
});

/* ---------------- FORM TULIS / EDIT ---------------- */

els.articleForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.saveMsg.textContent = "Menyimpan...";

  const formData = new FormData(els.articleForm);
  const category = formData.get("category");
  const title = formData.get("title");
  const content = formData.get("content");
  const file = formData.get("image");

  let image_url = formData.get("existing_image_url") || null;

  if (file && file.size > 0) {
    const path = `${category}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(path, file);

    if (uploadError) {
      els.saveMsg.textContent = "Gagal unggah gambar: " + uploadError.message;
      return;
    }
    image_url = db.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const payload = { category, title, content, image_url };
  let error;

  if (editingId) {
    ({ error } = await db.from(TABLE_ARTICLES).update(payload).eq("id", editingId));
  } else {
    ({ error } = await db.from(TABLE_ARTICLES).insert(payload));
  }

  if (error) {
    els.saveMsg.textContent = "Gagal menyimpan: " + error.message;
    return;
  }

  els.saveMsg.textContent = editingId ? "Artikel diperbarui." : "Artikel tersimpan.";
  resetForm();
  loadAdminArticles();
});

els.cancelEditBtn?.addEventListener("click", resetForm);

function resetForm() {
  editingId = null;
  els.articleForm.reset();
  els.formTitle.textContent = "Tulis artikel baru";
  els.cancelEditBtn.hidden = true;
}

/* ---------------- FILTER TAB ---------------- */

els.categoryTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeFilter = tab.dataset.filterTab;
    els.categoryTabs.forEach((t) => t.classList.toggle("is-active", t === tab));
    loadAdminArticles();
  });
});

/* ---------------- LIST + EDIT + HAPUS ---------------- */

async function loadAdminArticles() {
  els.adminList.innerHTML = `<p class="state-msg">Memuat...</p>`;

  let query = db.from(TABLE_ARTICLES).select("*").order("created_at", { ascending: false });
  if (activeFilter !== "all") query = query.eq("category", activeFilter);

  const { data, error } = await query;

  if (error) {
    els.adminList.innerHTML = `<p class="state-msg state-msg--error">Gagal memuat: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    els.adminList.innerHTML = `<p class="state-msg">Belum ada artikel di filter ini.</p>`;
    return;
  }

  els.adminList.innerHTML = data.map(
    (a) => `
    <div class="admin-row">
      <div class="admin-row__meta">
        <span class="tag tag--${a.category}">${a.category}</span>
        <strong>${escapeHtml(a.title)}</strong>
        <span class="admin-row__date">${formatDate(a.created_at)}</span>
      </div>
      <div class="admin-row__actions">
        <button data-edit="${a.id}">Edit</button>
        <button data-delete="${a.id}" class="btn--danger">Hapus</button>
      </div>
    </div>
  `
  ).join("");

  els.adminList.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const article = data.find((a) => a.id === btn.dataset.edit);
      startEdit(article);
    });
  });

  els.adminList.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Hapus artikel ini? Aksi ini tidak bisa dibatalkan.")) return;
      const { error } = await db.from(TABLE_ARTICLES).delete().eq("id", btn.dataset.delete);
      if (error) {
        alert("Gagal menghapus: " + error.message);
        return;
      }
      loadAdminArticles();
    });
  });
}

function startEdit(article) {
  editingId = article.id;
  els.articleForm.category.value = article.category;
  els.articleForm.title.value = article.title;
  els.articleForm.content.value = article.content;
  els.articleForm.existing_image_url.value = article.image_url || "";
  els.formTitle.textContent = "Edit artikel";
  els.cancelEditBtn.hidden = false;
  els.articleForm.scrollIntoView({ behavior: "smooth" });
}

checkSession();
