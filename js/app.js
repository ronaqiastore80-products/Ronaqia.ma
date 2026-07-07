/* ── Public site: packs dynamiques + WhatsApp ── */

let packsData = [];
let whatsappNumber = '';
let currentRevealPackId = null;

const GIFT_SVG = `
  <div class="gift-box">
    <div class="gift-bow"></div>
    <div class="gift-box-lid"></div>
    <div class="gift-box-ribbon-v"></div>
    <div class="gift-box-ribbon-h"></div>
    <div class="gift-box-body"></div>
  </div>`;

const EMPTY_IMG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
  <span>Image</span>`;

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function renderPriceBadge(priceStr, label = 'السعر:', extraClass = '') {
  const trimmed = (priceStr || '').trim();
  const match = trimmed.match(/^([\d\s.,]+)\s*(?:DH)?$/i);
  const number = match ? match[1].trim() : trimmed;
  const badgeClass = extraClass ? `price-badge ${extraClass}` : 'price-badge';
  return `
    <div class="price-badge-container">
      <div class="${badgeClass}">
        <span class="price-label">${escapeHtml(label)}</span>
        <div class="price-value-wrapper">
          <span class="price-number">${escapeHtml(number)}</span>
          <span class="price-currency">DH</span>
        </div>
      </div>
    </div>`;
}

function buildWhatsAppMessage(pack) {
  const promo = pack.promotion?.active && pack.promotion?.text
    ? pack.promotion.text
    : 'Aucune promotion';
  return [
    'السلام عليكم،',
    `أرغب في طلب ${pack.name}.`,
    '',
    `السعر : ${pack.price}`,
    `العرض الحالي : ${promo}`,
    '',
    'Merci.'
  ].join('\n');
}

function openWhatsAppOrder(pack, e) {
  if (e) e.stopPropagation();
  if (!whatsappNumber) {
    alert('رقم الواتساب غير مُعدّ بعد. تواصل مع الإدارة.');
    return;
  }
  const text = encodeURIComponent(buildWhatsAppMessage(pack));
  window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
}

function toggleLogicWaSticky(show, packId) {
  const bar = document.getElementById('logicWaSticky');
  if (!bar) return;
  bar.classList.toggle('visible', !!show);
  bar.setAttribute('aria-hidden', show ? 'false' : 'true');
  if (!show || !packId) return;

  const btn = bar.querySelector('.logic-wa-cta');
  if (btn) btn.setAttribute('onclick', `orderPack('${packId}', event)`);

  const texts = {
    'pack-logic': {
      main: 'اطلبي مجموعتكِ الذكية الآن عبر الواتساب',
      sub: '(اضغطي هنا لإرسال الطلب مباشرة والاستفادة من التوصيل المجاني)'
    },
    'pack-routine': {
      main: 'اطلبي باك الشعر المثالي الآن عبر الواتساب',
      sub: '(اضغطي هنا لإرسال الطلب مباشرة والاستفادة من التوصيل المجاني)'
    }
  };
  const copy = texts[packId];
  if (copy) {
    const main = bar.querySelector('.logic-wa-cta-main');
    const sub = bar.querySelector('.logic-wa-cta-sub');
    if (main) main.textContent = copy.main;
    if (sub) sub.textContent = copy.sub;
  }
}

function closeAllPackDetails() {
  document.querySelectorAll('.section-pack-detail').forEach(s => s.classList.remove('visible'));
  toggleLogicWaSticky(false);
}

function closePackView() {
  closePackReveal();
  closeAllPackDetails();
}

function handlePackClick(pack) {
  closeAllPackDetails();
  revealPackOffer(pack);

  if (pack.detailId) {
    openPackDetail(pack.detailId, pack.id);
  } else {
    showGenericPackDetail(pack);
  }
}

function renderPackCard(pack, index) {
  const hasImage = pack.image && pack.image.trim();
  const imgInner = hasImage
    ? `<img src="${escapeHtml(pack.image)}" alt="${escapeHtml(pack.name)}">`
    : EMPTY_IMG;
  const imgClass = hasImage ? 'pack-img-inner' : 'pack-img-inner is-empty';

  return `
    <div class="pack-card fade-up" data-pack-id="${escapeHtml(pack.id)}" data-index="${index}">
      <div class="pack-circle-wrap has-cadeau" role="button" tabindex="0"
           onclick="handlePackCardClick('${escapeHtml(pack.id)}', event)"
           onkeydown="if(event.key==='Enter')handlePackCardClick('${escapeHtml(pack.id)}', event)">
        <span class="pack-sparkle s1">✦</span>
        <span class="pack-sparkle s2">✨</span>
        <div class="pack-gift-float ${escapeHtml(pack.giftPosition || 'pos-tl')}">${GIFT_SVG}</div>
        <div class="pack-blob"></div>
        <div class="pack-circle">
          <span class="pack-badge">${escapeHtml(pack.topBadge || 'PACK')}</span>
          <div class="${imgClass}">${imgInner}</div>
        </div>
        <div class="pack-cadeau-tag">${escapeHtml(pack.cadeauTag || '🎁 Cadeau')}</div>
      </div>
      <h3 class="pack-title">${escapeHtml(pack.name)}</h3>
      <p class="pack-click-hint">👆 اضغطي لعرض التفاصيل</p>
      <p class="pack-subtitle">${escapeHtml(pack.subtitle)}</p>
      <div class="pack-price-display">${renderPriceBadge(pack.price)}</div>
      <button type="button" class="btn-order-now" onclick="orderPack('${escapeHtml(pack.id)}', event)">
        أطلب الآن
      </button>
    </div>`;
}

function handlePackCardClick(packId, e) {
  if (e.target.closest('.btn-order-now')) return;
  const pack = packsData.find(p => p.id === packId);
  if (pack) handlePackClick(pack);
}

function orderPack(packId, e) {
  const pack = packsData.find(p => p.id === packId);
  if (pack) openWhatsAppOrder(pack, e);
}

function revealPackOffer(pack) {
  currentRevealPackId = pack.id;
  const section = document.getElementById('pack-reveal');
  const content = document.getElementById('packRevealContent');
  if (!section || !content) return;

  const promo = pack.promotion || {};
  const promoHtml = promo.active && promo.text
    ? `<div class="reveal-promo-big" style="background:${escapeHtml(promo.badgeColor || '#2d6a4f')}">${escapeHtml(promo.text)}</div>`
    : '';

  content.innerHTML = `
    <div class="reveal-gift-icon">🎁</div>
    <p class="reveal-label">Voici l'offre dyalek!</p>
    <h2 class="reveal-title">${escapeHtml(pack.name)}</h2>
    ${promoHtml}
    <div class="reveal-actions">
      <button type="button" class="btn-order-now" onclick="orderPack('${escapeHtml(pack.id)}', event)">أطلب الآن</button>
    </div>
    <button type="button" class="btn-back-packs-sm" onclick="closePackView()">← رجوع للباقات</button>
  `;

  document.querySelectorAll('.pack-card').forEach(c => c.classList.remove('active'));
  const card = document.querySelector(`[data-pack-id="${pack.id}"]`);
  if (card) card.classList.add('active');

  section.classList.remove('visible');
  void section.offsetWidth;
  section.classList.add('visible');

  setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}

function closePackReveal() {
  document.getElementById('pack-reveal')?.classList.remove('visible');
  document.querySelectorAll('.pack-card').forEach(c => c.classList.remove('active'));
  currentRevealPackId = null;
}

function showGenericPackDetail(pack) {
  const section = document.getElementById('pack-generic');
  const content = document.getElementById('packGenericContent');
  if (!section || !content) return;

  const promo = pack.promotion || {};
  const promoHtml = promo.active && promo.text
    ? `<div class="reveal-promo-big" style="background:${escapeHtml(promo.badgeColor || '#2d6a4f')}">${escapeHtml(promo.text)}</div>`
    : '';

  const imgHtml = pack.image && pack.image.trim()
    ? `<div class="pack-detail-hero-img fade-up"><img src="${escapeHtml(pack.image)}" alt="${escapeHtml(pack.name)}"></div>`
    : '';

  const descHtml = pack.description
    ? `<p class="pack-detail-intro fade-up">${escapeHtml(pack.description)}</p>`
    : '';

  const cadeauHtml = pack.cadeauTag
    ? `<p class="pack-generic-cadeau fade-up">${escapeHtml(pack.cadeauTag)}</p>`
    : '';

  content.innerHTML = `
    <div class="pack-detail-header">
      <h2 class="fade-up">${escapeHtml(pack.name)}</h2>
      ${promoHtml ? `<div class="fade-up">${promoHtml}</div>` : ''}
      ${imgHtml}
      ${pack.subtitle ? `<p class="pack-detail-intro fade-up">${escapeHtml(pack.subtitle)}</p>` : ''}
      ${descHtml}
      ${cadeauHtml}
      <div class="pack-generic-price fade-up">${renderPriceBadge(pack.price)}</div>
      <div class="reveal-actions fade-up">
        <button type="button" class="btn-order-now" onclick="orderPack('${escapeHtml(pack.id)}', event)">أطلب الآن</button>
      </div>
    </div>
    <div class="pack-detail-back-wrap">
      <button type="button" class="btn-back-packs-sm" onclick="closePackView()">← رجوع للباقات</button>
    </div>
  `;

  section.classList.remove('visible');
  void section.offsetWidth;
  section.classList.add('visible');

  content.querySelectorAll('.fade-up').forEach(el => {
    el.classList.remove('visible');
    if (window.packObserver) window.packObserver.observe(el);
  });
}

function formatWhatsappDisplay(num) {
  if (!num) return '';
  const n = num.replace(/\D/g, '');
  if (n.startsWith('212') && n.length >= 12) {
    return `+212 ${n.slice(3, 4)} ${n.slice(4, 6)} ${n.slice(6, 8)} ${n.slice(8, 10)} ${n.slice(10)}`.trim();
  }
  return `+${n}`;
}

function renderFooterContact() {
  const waLink = document.getElementById('footerWhatsappLink');
  const waNum = document.getElementById('footerWhatsappNumber');
  const waSocial = document.getElementById('footerWaSocial');
  if (!whatsappNumber) return;

  const href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('السلام عليكم، أود الاستفسار عن منتجات RONAQIA.')}`;
  if (waLink) waLink.href = href;
  if (waSocial) waSocial.href = href;
  if (waNum) {
    waNum.textContent = formatWhatsappDisplay(whatsappNumber);
    waNum.style.display = 'block';
    waNum.style.marginTop = '4px';
    waNum.style.fontSize = '0.95rem';
    waNum.style.color = 'rgba(255,255,255,0.85)';
  }
}

async function loadPacks() {
  const grid = document.getElementById('packsGrid');
  if (!grid) return;

  try {
    const [packsRes, configRes] = await Promise.all([
      fetch(dataUrl('packs.json')),
      fetch(dataUrl('config.json'))
    ]);

    if (!packsRes.ok) throw new Error('packs.json introuvable');
    if (!configRes.ok) throw new Error('config.json introuvable');

    const packsJson = await packsRes.json();
    const configJson = await configRes.json();

    packsData = (packsJson.packs || [])
      .filter(p => p.enabled !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    whatsappNumber = (configJson.whatsapp || '').replace(/\D/g, '');
    renderFooterContact();

    if (packsData.length === 0) {
      grid.innerHTML = '<p class="packs-empty">Aucun pack disponible pour le moment.</p>';
      return;
    }

    grid.innerHTML = packsData.map((p, i) => renderPackCard(p, i)).join('');

    grid.querySelectorAll('.fade-up').forEach(el => {
      if (window.packObserver) window.packObserver.observe(el);
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p class="packs-empty">Impossible de charger les packs. Vérifiez que <code>data/packs.json</code> est présent.</p>';
  }
}

function openPackDetail(detailId, packId) {
  document.querySelectorAll('.pack-card').forEach(c => c.classList.remove('active'));
  if (packId) {
    const card = document.querySelector(`[data-pack-id="${packId}"]`);
    if (card) card.classList.add('active');
  }

  const section = document.getElementById('pack-' + detailId);
  if (!section) return;

  section.classList.remove('visible');
  void section.offsetWidth;
  section.classList.add('visible');

  section.querySelectorAll('.fade-up').forEach(el => {
    el.classList.remove('visible');
    if (window.packObserver) window.packObserver.observe(el);
  });

  const stickyPackMap = { logic: 'pack-logic', cheveux: 'pack-routine' };
  toggleLogicWaSticky(!!stickyPackMap[detailId], stickyPackMap[detailId]);
}

function toggleIngredient(el) {
  const item = el.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.ingredient-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

function toggleMenu() {
  const nav = document.getElementById('mainNav');
  const isOpen = nav?.classList.toggle('open');
  document.body.classList.toggle('menu-open', !!isOpen);
}

function closeMenu() {
  document.getElementById('mainNav')?.classList.remove('open');
  document.body.classList.remove('menu-open');
}

document.addEventListener('DOMContentLoaded', () => {
  loadPacks();

  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  window.packObserver = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 60);
        window.packObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-up').forEach(el => window.packObserver.observe(el));
});
