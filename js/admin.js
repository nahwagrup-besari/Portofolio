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

  sectionTabs: document.querySelectorAll("[data-section-tab]"),
  sections: document.querySelectorAll("[data-section]"),
  settingsForm: document.querySelector("[data-settings-form]"),
  settingsSaveMsg: document.querySelector("[data-settings-save-msg]"),
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
  loadSiteSettingsIntoForm();
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

/* ---------------- TAB SECTION (Kelola artikel / Tampilan website) ---------------- */

els.sectionTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.sectionTab;
    els.sectionTabs.forEach((t) => t.classList.toggle("is-active", t === tab));
    els.sections.forEach((sec) => {
      sec.hidden = sec.dataset.section !== target;
    });
  });
});

/* ---------------- TAMPILAN WEBSITE (site_settings) ---------------- */

const SETTINGS_TEXT_FIELDS = [
  "hero_title",
  "hero_subtitle",
  "dir_website_title",
  "dir_website_desc",
  "dir_kopi_title",
  "dir_kopi_desc",
  "dir_goldfish_title",
  "dir_goldfish_desc",
  "page_website_title",
  "page_website_desc",
  "page_kopi_title",
  "page_kopi_desc",
  "page_goldfish_title",
  "page_goldfish_desc",
  "footer_text",
];

const SETTINGS_COLOR_FIELDS = ["accent_website", "accent_kopi", "accent_goldfish"];

async function loadSiteSettingsIntoForm() {
  if (!els.settingsForm) return;

  const { data, error } = await db.from("site_settings").select("*").eq("id", 1).single();
  if (error || !data) return;

  SETTINGS_TEXT_FIELDS.forEach((key) => {
    if (els.settingsForm[key] && data[key]) els.settingsForm[key].value = data[key];
  });

  SETTINGS_COLOR_FIELDS.forEach((key) => {
    if (els.settingsForm[key] && data[key]) els.settingsForm[key].value = data[key];
  });

  if (data.logo_url) {
    els.settingsForm.logo_url.value = data.logo_url;
    showPreview("logo_url", data.logo_url);
  }
  if (data.hero_image_url) {
    els.settingsForm.hero_image_url.value = data.hero_image_url;
    showPreview("hero_image_url", data.hero_image_url);
  }
}

function showPreview(key, url) {
  const img = els.settingsForm.querySelector(`[data-preview="${key}"]`);
  if (!img) return;
  img.src = url;
  img.classList.add("is-visible");
}

async function uploadSiteImage(file, folder) {
  const path = `site/${folder}-${Date.now()}-${file.name}`;
  const { error } = await db.storage.from(STORAGE_BUCKET).upload(path, file);
  if (error) throw error;
  return db.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

els.settingsForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.settingsSaveMsg.textContent = "Menyimpan...";

  const formData = new FormData(els.settingsForm);
  const payload = { id: 1 };

  [...SETTINGS_TEXT_FIELDS, ...SETTINGS_COLOR_FIELDS].forEach((key) => {
    payload[key] = formData.get(key) || null;
  });

  payload.logo_url = formData.get("logo_url") || null;
  payload.hero_image_url = formData.get("hero_image_url") || null;

  try {
    const logoFile = formData.get("logo");
    if (logoFile && logoFile.size > 0) {
      payload.logo_url = await uploadSiteImage(logoFile, "logo");
      showPreview("logo_url", payload.logo_url);
    }

    const heroFile = formData.get("hero_image");
    if (heroFile && heroFile.size > 0) {
      payload.hero_image_url = await uploadSiteImage(heroFile, "hero");
      showPreview("hero_image_url", payload.hero_image_url);
    }
  } catch (uploadError) {
    els.settingsSaveMsg.textContent = "Gagal unggah gambar: " + uploadError.message;
    return;
  }

  const { error } = await db.from("site_settings").upsert(payload);

  if (error) {
    els.settingsSaveMsg.textContent = "Gagal menyimpan: " + error.message;
    return;
  }

  els.settingsForm.logo_url.value = payload.logo_url || "";
  els.settingsForm.hero_image_url.value = payload.hero_image_url || "";
  els.settingsSaveMsg.textContent = "Tampilan website berhasil diperbarui.";
});

checkSession();
