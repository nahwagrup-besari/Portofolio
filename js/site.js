/**
 * site.js — perilaku shared di semua halaman publik (bukan admin).
 */
document.addEventListener("DOMContentLoaded", () => {
  // toggle nav mobile
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
  }

  // tandai link nav yang aktif sesuai halaman saat ini
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav] a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path) a.classList.add("is-active");
  });

  // jam kecil di header, sekedar sentuhan "sistem aktif"
  const clock = document.querySelector("[data-clock]");
  if (clock) {
    const tick = () => {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    };
    tick();
    setInterval(tick, 1000);
  }

  loadSiteSettings();
});

/**
 * loadSiteSettings — ambil baris tunggal dari tabel `site_settings` di
 * Supabase lalu terapkan ke setiap elemen [data-cms], warna aksen tema,
 * logo header, dan gambar hero. Kalau suatu field kosong/null di database,
 * teks bawaan yang sudah ada di HTML tetap dipakai (tidak ditimpa).
 */
async function loadSiteSettings() {
  if (typeof db === "undefined") return;

  const { data, error } = await db
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !data) return;
  applySiteSettings(data);
}

function applySiteSettings(s) {
  // semua caption teks yang ditandai data-cms="key_di_tabel"
  document.querySelectorAll("[data-cms]").forEach((el) => {
    const key = el.dataset.cms;
    if (s[key]) el.textContent = s[key];
  });

  // logo di header
  const logo = document.querySelector("[data-cms-logo]");
  if (logo && s.logo_url) {
    logo.src = s.logo_url;
    logo.hidden = false;
  }

  // gambar hero (halaman beranda)
  const heroImg = document.querySelector("[data-cms-hero-img]");
  if (heroImg && s.hero_image_url) {
    heroImg.src = s.hero_image_url;
    heroImg.hidden = false;
  }

  // warna aksen sesuai tema halaman aktif
  const theme = document.body.dataset.theme;
  const accentByTheme = {
    website: s.accent_website,
    kopi: s.accent_kopi,
    goldfish: s.accent_goldfish,
  };
  const accent = accentByTheme[theme];
  if (accent) {
    document.body.style.setProperty("--accent", accent);
    document.body.style.setProperty("--accent-soft", accent + "26");
  }
}

/** Utility: escape teks agar aman dimasukkan ke innerHTML */
function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Utility: format tanggal Indonesia singkat */
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
