/**
 * articles.js — dipakai HANYA oleh halaman publik (kopi.html, goldfish.html,
 * website.html). Murni baca data, tidak ada tombol tulis/hapus di sini sama
 * sekali — kontrol tulis artikel cuma ada di admin.html.
 */
document.addEventListener("DOMContentLoaded", () => {
  const list = document.querySelector("[data-article-list]");
  if (!list) return; // halaman ini tidak menampilkan artikel

  const category = list.dataset.articleList; // "kopi" | "goldfish" | "website"
  loadArticles(category, list);
});

async function loadArticles(category, list) {
  list.innerHTML = `<p class="state-msg">Memuat catatan...</p>`;

  const { data, error } = await db
    .from(TABLE_ARTICLES)
    .select("id, title, content, image_url, created_at")
    .eq("category", category)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    list.innerHTML = `<p class="state-msg state-msg--error">Gagal memuat artikel. Cek koneksi Supabase-mu di js/supabase-client.js.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="state-msg">Belum ada catatan di kategori ini.</p>`;
    return;
  }

  list.innerHTML = data.map(renderCard).join("");

  list.querySelectorAll("[data-open-article]").forEach((card) => {
    card.addEventListener("click", () => {
      const article = data.find((a) => a.id === card.dataset.openArticle);
      if (article) openArticleModal(article);
    });
  });
}

function renderCard(article) {
  const excerpt = article.content.length > 140
    ? article.content.slice(0, 140).trim() + "…"
    : article.content;

  return `
    <article class="card" data-open-article="${article.id}" tabindex="0">
      ${article.image_url
        ? `<img class="card__img" src="${escapeHtml(article.image_url)}" alt="" loading="lazy" />`
        : `<div class="card__img card__img--placeholder"></div>`}
      <div class="card__body">
        <time class="card__date">${formatDate(article.created_at)}</time>
        <h3 class="card__title">${escapeHtml(article.title)}</h3>
        <p class="card__excerpt">${escapeHtml(excerpt)}</p>
      </div>
    </article>
  `;
}

function openArticleModal(article) {
  let modal = document.querySelector("[data-modal]");
  if (!modal) {
    modal = document.createElement("div");
    modal.setAttribute("data-modal", "");
    modal.className = "modal";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal__backdrop" data-modal-close></div>
    <div class="modal__panel" role="dialog" aria-modal="true">
      <button class="modal__close" data-modal-close aria-label="Tutup">✕</button>
      ${article.image_url ? `<img class="modal__img" src="${escapeHtml(article.image_url)}" alt="" />` : ""}
      <time class="card__date">${formatDate(article.created_at)}</time>
      <h2 class="modal__title">${escapeHtml(article.title)}</h2>
      <div class="modal__content">${escapeHtml(article.content).replace(/\n/g, "<br>")}</div>
    </div>
  `;

  modal.classList.add("is-open");
  document.body.classList.add("no-scroll");

  modal.querySelectorAll("[data-modal-close]").forEach((el) => {
    el.addEventListener("click", () => {
      modal.classList.remove("is-open");
      document.body.classList.remove("no-scroll");
    });
  });
}
