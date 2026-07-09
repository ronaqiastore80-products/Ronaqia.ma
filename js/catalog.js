/* ── Catalogue produits Ronaqia ── */

let catalogData = { categories: [] };
let currentProduct = null;
let activeCategoryId = null;

function findCategoryIdForProduct(productId) {
  for (const cat of catalogData.categories) {
    if ((cat.products || []).some(p => p.id === productId)) return cat.id;
  }
  return catalogData.categories[0]?.id || 'about';
}

function getProductShareUrl(productId) {
  const base = window.location.href.split('#')[0].split('?')[0];
  const categoryId = findCategoryIdForProduct(productId);
  return `${base}?product=${encodeURIComponent(productId)}#${categoryId}`;
}

function buildProductWhatsAppMessage(product) {
  return [
    'Bonjour, je souhaite commander :',
    product.name,
    '',
    `Prix : ${product.price}`
  ].join('\n');
}

function orderProductWhatsApp(product) {
  if (!whatsappNumber) {
    alert('رقم الواتساب غير مُعدّ بعد. تواصل مع الإدارة.');
    return;
  }
  const text = encodeURIComponent(buildProductWhatsAppMessage(product));
  window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
}

function openOpportunityWhatsApp() {
  if (!whatsappNumber) {
    alert('رقم الواتساب غير مُعدّ بعد. تواصل مع الإدارة.');
    return;
  }
  const text = encodeURIComponent(
    'Bonjour, je souhaite en savoir plus sur l\'opportunité Forever Living avec RONAQIA.'
  );
  window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
}

async function shareProduct(product) {
  const url = getProductShareUrl(product.id);
  const shareData = {
    title: product.name + ' — RONAQIA',
    text: `${product.name} — ${product.price}`,
    url
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  const panel = document.getElementById('productSharePanel');
  if (panel) {
    panel.classList.add('visible');
    panel.dataset.shareUrl = url;
    panel.dataset.shareTitle = product.name;
  }
}

function closeSharePanel() {
  document.getElementById('productSharePanel')?.classList.remove('visible');
}

async function copyProductLink() {
  const panel = document.getElementById('productSharePanel');
  const url = panel?.dataset.shareUrl || window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    alert('Lien copié !');
  } catch {
    prompt('Copiez ce lien :', url);
  }
  closeSharePanel();
}

function shareOnFacebook() {
  const panel = document.getElementById('productSharePanel');
  const url = encodeURIComponent(panel?.dataset.shareUrl || window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener');
  closeSharePanel();
}

function shareOnInstagram() {
  copyProductLink();
  alert('Lien copié — collez-le dans votre story ou bio Instagram.');
}

function openProductModal(product) {
  currentProduct = product;
  const modal = document.getElementById('productModal');
  if (!modal) return;

  const nameEl = document.getElementById('productModalName');
  const descEl = document.getElementById('productModalDesc');

  document.getElementById('productModalImg').src = product.image;
  document.getElementById('productModalImg').alt = product.name;
  nameEl.textContent = product.name;
  nameEl.setAttribute('lang', 'fr');
  document.getElementById('productModalPrice').innerHTML = renderPriceBadge(product.price, 'السعر:');
  descEl.textContent = product.description;
  descEl.setAttribute('lang', 'ar');
  descEl.setAttribute('dir', 'rtl');

  history.replaceState(null, '', getProductShareUrl(product.id));
  modal.classList.add('visible');
  document.body.classList.add('modal-open');
}

function closeProductModal() {
  document.getElementById('productModal')?.classList.remove('visible');
  document.body.classList.remove('modal-open');
  closeSharePanel();
  const categoryId = currentProduct ? findCategoryIdForProduct(currentProduct.id) : null;
  currentProduct = null;
  const base = window.location.href.split('?')[0].split('#')[0];
  history.replaceState(null, '', base + (categoryId ? `#${categoryId}` : '#about'));
}

function renderProductCard(product) {
  return `
    <article class="catalog-card fade-up" data-product-id="${escapeHtml(product.id)}"
             role="button" tabindex="0"
             onclick="openProductById('${escapeHtml(product.id)}')"
             onkeydown="if(event.key==='Enter')openProductById('${escapeHtml(product.id)}')">
      <div class="catalog-card-img">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"
             onerror="this.src='images/Logo_Ronaqia.png';this.style.objectFit='contain';this.style.padding='20px'">
      </div>
      <div class="catalog-card-body">
        <h3 class="catalog-card-title" lang="fr">${escapeHtml(product.name)}</h3>
        <div class="catalog-card-price">${renderPriceBadge(product.price)}</div>
        <p class="catalog-card-summary" lang="ar" dir="rtl">${escapeHtml(product.summary)}</p>
        <span class="catalog-card-cta" lang="fr">Voir le détail →</span>
      </div>
    </article>`;
}

function renderCategoryContent(category) {
  if (!category) {
    return `
      <div class="catalog-empty fade-up">
        <p lang="fr">Sélectionnez une catégorie ci-dessus pour découvrir nos produits.</p>
        <p lang="ar" dir="rtl">اختر فئة أعلاه لاكتشاف منتجاتنا.</p>
      </div>`;
  }

  return `
    <div class="catalog-category fade-up" id="${escapeHtml(category.id)}">
      <div class="catalog-category-head">
        <h3 class="catalog-category-title" lang="fr">${escapeHtml(category.title)}</h3>
        ${category.titleAr ? `<p class="catalog-category-title-ar" lang="ar" dir="rtl">${escapeHtml(category.titleAr)}</p>` : ''}
        <p class="catalog-category-desc" lang="fr">${escapeHtml(category.description || '')}</p>
      </div>
      <div class="catalog-grid">
        ${(category.products || []).map(p => renderProductCard(p)).join('')}
      </div>
    </div>`;
}

function updateCategoryFilterButtons() {
  document.querySelectorAll('.catalog-filter-btn').forEach(btn => {
    const isActive = btn.dataset.category === activeCategoryId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function setActiveCategory(categoryId, options = {}) {
  const exists = catalogData.categories.some(cat => cat.id === categoryId);
  activeCategoryId = exists ? categoryId : null;

  const content = document.getElementById('catalogCategoryContent');
  if (content) {
    const category = catalogData.categories.find(cat => cat.id === activeCategoryId) || null;
    content.innerHTML = renderCategoryContent(category);
    content.querySelectorAll('.fade-up').forEach(el => {
      if (window.packObserver) window.packObserver.observe(el);
    });
  }

  updateCategoryFilterButtons();

  if (!options.skipHash) {
    const base = window.location.href.split('?')[0].split('#')[0];
    const hash = activeCategoryId ? `#${activeCategoryId}` : '#about';
    history.replaceState(null, '', base + hash);
  }
}

function renderCategoryFilter() {
  return `
    <div class="catalog-filter-wrap fade-up">
      <div class="catalog-filter-label bilingual-label">
        <span lang="fr">Filtre par catégorie</span>
        <span class="label-sep" aria-hidden="true"></span>
        <span lang="ar" dir="rtl">تصنيف حسب الفئة</span>
      </div>
      <div class="catalog-filter" role="tablist" aria-label="Filtre par catégorie">
        ${catalogData.categories.map(cat => `
          <button type="button"
                  class="catalog-filter-btn"
                  role="tab"
                  data-category="${escapeHtml(cat.id)}"
                  aria-selected="false"
                  onclick="setActiveCategory('${escapeHtml(cat.id)}')">
            <span class="label-fr" lang="fr">${escapeHtml(cat.title)}</span>
            ${cat.titleAr ? `<span class="label-ar" lang="ar" dir="rtl">${escapeHtml(cat.titleAr)}</span>` : ''}
          </button>
        `).join('')}
      </div>
    </div>
    <div id="catalogCategoryContent"></div>`;
}

function getCategoryIdFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash || hash === 'about') return null;
  return catalogData.categories.some(cat => cat.id === hash) ? hash : null;
}

function renderCatalog() {
  const grid = document.getElementById('catalogGrid');
  if (!grid || !catalogData.categories.length) return;

  grid.innerHTML = renderCategoryFilter();
  grid.querySelectorAll('.fade-up').forEach(el => {
    if (window.packObserver) window.packObserver.observe(el);
  });

  const hashCategory = getCategoryIdFromHash();
  setActiveCategory(hashCategory, { skipHash: true });
}

function findProductById(id) {
  for (const cat of catalogData.categories) {
    const p = (cat.products || []).find(pr => pr.id === id);
    if (p) return p;
  }
  return null;
}

function openProductById(id) {
  const product = findProductById(id);
  if (product) openProductModal(product);
}

function checkProductDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('product');
  if (!id) return;

  const categoryId = findCategoryIdForProduct(id);
  if (categoryId) setActiveCategory(categoryId, { skipHash: true });
  setTimeout(() => openProductById(id), 400);
}

async function loadCatalog() {
  try {
    const res = await fetch(dataUrl('products.json'));
    if (!res.ok) return;
    catalogData = await res.json();
    renderCatalog();
    checkProductDeepLink();
  } catch (err) {
    console.error('Catalog load error:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCatalog();

  window.addEventListener('hashchange', () => {
    if (!catalogData.categories.length) return;
    const hashCategory = getCategoryIdFromHash();
    if (hashCategory !== activeCategoryId) {
      setActiveCategory(hashCategory, { skipHash: true });
    }
  });

  document.getElementById('productModalBackdrop')?.addEventListener('click', closeProductModal);
  document.getElementById('productModalClose')?.addEventListener('click', closeProductModal);
  document.getElementById('productModalOrder')?.addEventListener('click', () => {
    if (currentProduct) orderProductWhatsApp(currentProduct);
  });
  document.getElementById('productModalShare')?.addEventListener('click', () => {
    if (currentProduct) shareProduct(currentProduct);
  });
  document.getElementById('productOpportunityBtn')?.addEventListener('click', openOpportunityWhatsApp);
  document.getElementById('sharePanelClose')?.addEventListener('click', closeSharePanel);
  document.getElementById('shareCopyLink')?.addEventListener('click', copyProductLink);
  document.getElementById('shareFacebook')?.addEventListener('click', shareOnFacebook);
  document.getElementById('shareInstagram')?.addEventListener('click', shareOnInstagram);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSharePanel();
      closeProductModal();
    }
  });
});
