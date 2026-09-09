/* exported renderCardsPage */
// ═══════════════════════════════════════════════════════
//  КОЛЛЕКЦИЯ КАРТОЧЕК (84 шт.) — из таблицы cards
// ═══════════════════════════════════════════════════════

const CARD_RARITY = {
  common:    { border:'#6b7280', glow:'rgba(107,114,128,0.10)', text:'#9ca3af' },
  rare:      { border:'#3b82f6', glow:'rgba(59,130,246,0.15)',  text:'#60a5fa' },
  epic:      { border:'#8b5cf6', glow:'rgba(139,92,246,0.15)',  text:'#a78bfa' },
  legendary: { border:'#fbbf24', glow:'rgba(251,191,36,0.25)',  text:'#fbbf24' }
};
const CARD_RARITY_ORDER = ['legendary', 'epic', 'rare', 'common'];

function rarityKey(r) {
  if (CARD_RARITY[r]) return r;
  const rev = { 'Обычный':'common', 'Редкий':'rare', 'Эпический':'epic', 'Легендарный':'legendary' };
  return rev[r] || 'common';
}

function cardRarityStyle(rarity) {
  const r = CARD_RARITY[rarityKey(rarity)] || CARD_RARITY.common;
  return '--rc-border:' + r.border + '; --rc-glow:' + r.glow + '; --rc-text:' + r.text + ';';
}

function cardNumBadge(c, pad) {
  const n = String(c.num || '');
  return '#' + (pad && n.length === 1 ? '0' + n : n);
}

function cardInventory(c) {
  const rk = rarityKey(c.rarity);
  return '<div class="card" data-rarity="' + rk + '" style="' + cardRarityStyle(c.rarity) + '">' +
    '<div class="rarity-stripe"></div>' +
    '<div class="num">' + cardNumBadge(c, true) + '</div>' +
    '<div class="mission-badge">М' + esc(c.mission) + '</div>' +
    '<div class="icon">' + esc(c.icon) + '</div>' +
    '<div class="name">' + esc(c.name) + '</div>' +
    '<div class="rarity-pill">' + esc(rarityLabel(rk)) + '</div>' +
    '<div class="bonus">' + esc(c.bonus) + '</div>' +
  '</div>';
}

function cardRelic(c) {
  return '<div class="card" data-rarity="epic" style="' + cardRarityStyle('epic') + '">' +
    '<div class="rarity-stripe"></div>' +
    '<div class="num">#' + esc(c.num) + '</div>' +
    '<div class="mission-badge">Смена ' + esc(c.shift) + '</div>' +
    '<div class="icon">' + esc(c.icon) + '</div>' +
    '<div class="name">' + esc(c.name) + '</div>' +
    '<div class="rarity-pill">Реликвия</div>' +
    '<div class="bonus">' + esc(c.bonus) + '</div>' +
  '</div>';
}

function cardBadge(c) {
  const rk = rarityKey(c.rarity);
  return '<div class="badge-card" data-rarity="' + rk + '" style="' + cardRarityStyle(c.rarity) + '">' +
    '<div class="icon">' + esc(c.icon) + '</div>' +
    '<div class="name">' + esc(c.name) + '</div>' +
    '<div class="cond">' + esc(c.condition) + '</div>' +
    '<div class="rarity-pill">' + esc(rarityLabel(rk)) + '</div>' +
  '</div>';
}

function cardBoss(c) {
  const maxHp = 1500;
  const pct = Math.round((c.hp / maxHp) * 100);
  return '<div class="card boss-card" data-rarity="legendary" style="' + cardRarityStyle('legendary') + '">' +
    '<div class="rarity-stripe"></div>' +
    '<div class="num">#' + esc(c.num) + '</div>' +
    '<div class="icon">' + esc(c.icon) + '</div>' +
    '<div>' +
      '<div class="name">' + esc(c.name) + '</div>' +
      '<div class="hp-bar-wrap"><div class="hp-bar" style="width:' + pct + '%"></div></div>' +
      '<div class="meta-row"><span>Неделя <b>' + esc(c.week) + '</b></span><span>HP <b>' + esc(c.hp) + '</b></span></div>' +
      '<div class="desc">Награда: ' + esc(c.reward) + '</div>' +
    '</div>' +
  '</div>';
}

function cardShop(c) {
  const rk = rarityKey(c.rarity);
  return '<div class="card shop-card" data-rarity="' + rk + '" style="' + cardRarityStyle(c.rarity) + '">' +
    '<div class="rarity-stripe"></div>' +
    '<div class="num">#' + esc(c.num) + '</div>' +
    '<div class="icon">' + esc(c.icon) + '</div>' +
    '<div class="name">' + esc(c.name) + '</div>' +
    '<div class="price">' + esc(c.price) + '</div>' +
    '<div class="type-pill">' + esc(c.item_type) + '</div>' +
    '<div class="desc">' + esc(c.bonus) + '</div>' +
  '</div>';
}

function cardMystery(c) {
  const rk = rarityKey(c.rarity);
  return '<div class="card mystery-card" data-rarity="' + rk + '" style="' + cardRarityStyle(c.rarity) + '">' +
    '<div class="rarity-stripe"></div>' +
    '<div class="num">#' + esc(c.num) + '</div>' +
    '<div class="icon">' + esc(c.icon) + '</div>' +
    '<div class="name">' + esc(c.name) + '</div>' +
    '<div class="chance">' + esc(c.chance) + '</div>' +
    '<div class="desc">' + esc(c.value_type) + ' · значение ' + esc(c.value) + '</div>' +
  '</div>';
}

function renderCard(c) {
  switch (c.section) {
    case 'inventory': return cardInventory(c);
    case 'relic':     return cardRelic(c);
    case 'badge':     return cardBadge(c);
    case 'boss':      return cardBoss(c);
    case 'shop':      return cardShop(c);
    case 'mystery':   return cardMystery(c);
    default:          return '';
  }
}

function renderCardsPage() {
  const cards = (state.cards || []).filter(c => c && c.section);
  const wrap = ge('cards-content');
  if (!wrap) return;

  if (!cards.length) {
    wrap.innerHTML = '<div style="padding:60px 20px;text-align:center;color:var(--muted)">' +
      '<div style="font-size:44px;margin-bottom:12px">🎴</div>' +
      '<div>Коллекция карточек пуста. Заполните таблицу <code>cards</code> в Supabase.</div></div>';
    return;
  }

  const inv = cards.filter(c => c.section === 'inventory').sort((a, b) => a.num - b.num);
  const relic = cards.filter(c => c.section === 'relic').sort((a, b) => a.num - b.num);
  const badges = cards.filter(c => c.section === 'badge').sort((a, b) => a.num - b.num);
  const bosses = cards.filter(c => c.section === 'boss').sort((a, b) => a.num - b.num);
  const shop = cards.filter(c => c.section === 'shop').sort((a, b) => a.num - b.num);
  const mystery = cards.filter(c => c.section === 'mystery').sort((a, b) => a.num - b.num);

  // ── Просмотр «По разделам» ──
  let html = '';
  html += '<section class="card-block" data-cblock="inventory"><div class="card-block-head">' +
    '<h2>🎒 Раздел 1 · Инвентарь смен</h2><span class="count">' + inv.length + ' карточек</span></div>';

  const invByMission = {};
  inv.forEach(c => { (invByMission[c.mission] = invByMission[c.mission] || []).push(c); });
  Object.keys(invByMission).sort((a, b) => a - b).forEach(m => {
    const items = invByMission[m].sort((a, b) => a.num - b.num);
    const shift = (state.shifts || []).find(s => String(s.id) === String(m));
    const mTitle = shift ? (shift.name || 'Миссия ' + m) : 'Миссия ' + m;
    html += '<div class="mission-title">' + esc(mTitle) + '</div><div class="grid">';
    html += items.map(cardInventory).join('');
    html += '</div>';
  });
  html += '</section>';

  html += '<section class="card-block" data-cblock="relic"><div class="card-block-head">' +
    '<h2>🏛️ Раздел 2 · Реликвии прошлых смен</h2><span class="count">' + relic.length + ' карточек</span></div>' +
    '<div class="grid">' + relic.map(cardRelic).join('') + '</div></section>';

  html += '<section class="card-block" data-cblock="badge"><div class="card-block-head">' +
    '<h2>⏱️ Раздел 3 · Ограниченные значки</h2><span class="count">' + badges.length + ' карточек</span></div>' +
    '<div class="grid badges">' + badges.map(cardBadge).join('') + '</div></section>';

  html += '<section class="card-block" data-cblock="boss"><div class="card-block-head">' +
    '<h2>⚔️ Раздел 4 · Боссы</h2><span class="count">' + bosses.length + ' карточек</span></div>' +
    '<div class="grid landscape">' + bosses.map(cardBoss).join('') + '</div></section>';

  html += '<section class="card-block" data-cblock="shop"><div class="card-block-head">' +
    '<h2>🛒 Раздел 5 · Магазин</h2><span class="count">' + shop.length + ' карточек</span></div>' +
    '<div class="grid">' + shop.map(cardShop).join('') + '</div></section>';

  html += '<section class="card-block" data-cblock="mystery"><div class="card-block-head">' +
    '<h2>🎁 Раздел 6 · Тайный сундук</h2><span class="count">' + mystery.length + ' карточек</span></div>' +
    '<div class="grid">' + mystery.map(cardMystery).join('') + '</div></section>';

  // ── Просмотр «По редкости» ──
  const byRarity = { rare: [], common: [], epic: [], legendary: [] };
  cards.forEach(c => {
    if (c.section === 'badge') return; // badges собираем отдельно
    if (!byRarity[rarityKey(c.rarity)]) byRarity[rarityKey(c.rarity)] = [];
    byRarity[rarityKey(c.rarity)].push(renderCard(c));
  });
  const badgesByRarity = { rare: [], common: [], epic: [], legendary: [] };
  cards.filter(c => c.section === 'badge').forEach(c => {
    if (!badgesByRarity[rarityKey(c.rarity)]) badgesByRarity[rarityKey(c.rarity)] = [];
    badgesByRarity[rarityKey(c.rarity)].push(cardBadge(c));
  });

  let rarityHtml = '';
  CARD_RARITY_ORDER.forEach(r => {
    const total = (byRarity[r] || []).length + (badgesByRarity[r] || []).length;
    rarityHtml += '<section class="card-block" data-rarity-group="' + r + '"><div class="card-block-head">' +
      '<h2>' + rarityLabel(r) + '</h2><span class="count">' + total + ' карточек</span></div>';
    if ((byRarity[r] || []).length) rarityHtml += '<div class="grid">' + byRarity[r].join('') + '</div>';
    if ((badgesByRarity[r] || []).length) rarityHtml += '<div class="grid badges" style="margin-top:18px">' + badgesByRarity[r].join('') + '</div>';
    rarityHtml += '</section>';
  });

  wrap.innerHTML =
    '<div class="card-legend">' +
      '<span class="l-common">Обычный</span><span class="l-rare">Редкий</span>' +
      '<span class="l-epic">Эпический</span><span class="l-legendary">Легендарный</span>' +
    '</div>' +
    '<div class="card-filter-bar" id="cardFilterBar">' +
      '<div class="card-view-toggle">' +
        '<button class="filter-btn" data-view="section" data-active="true">По разделам</button>' +
        '<button class="filter-btn" data-view="rarity">По редкости</button>' +
      '</div>' +
      '<button class="filter-btn" data-r="all" data-active="true">Все <span class="cnt" id="ccnt-all"></span></button>' +
      '<button class="filter-btn" data-r="common">Обычный <span class="cnt" id="ccnt-common"></span></button>' +
      '<button class="filter-btn" data-r="rare">Редкий <span class="cnt" id="ccnt-rare"></span></button>' +
      '<button class="filter-btn" data-r="epic">Эпический <span class="cnt" id="ccnt-epic"></span></button>' +
      '<button class="filter-btn" data-r="legendary">Легендарный <span class="cnt" id="ccnt-legendary"></span></button>' +
    '</div>' +
    '<div class="card-app" id="cardApp">' + html + '</div>' +
    '<div class="card-app" id="cardAppRarity" style="display:none">' + rarityHtml + '</div>';

  // ── Счётчики ──
  const rCounts = { common: 0, rare: 0, epic: 0, legendary: 0 };
  wrap.querySelectorAll('#cardApp [data-rarity]').forEach(el => { rCounts[el.dataset.rarity] = (rCounts[el.dataset.rarity] || 0) + 1; });
  const total = Object.values(rCounts).reduce((a, b) => a + b, 0);
  const setCnt = (id, v) => { const el = ge(id); if (el) el.textContent = v; };
  setCnt('ccnt-all', total);
  Object.keys(rCounts).forEach(r => setCnt('ccnt-' + r, rCounts[r]));

  // ── Фильтр + переключение вида ──
  let cFilter = 'all';
  let cView = 'section';
  const cApp = ge('cardApp');
  const cAppR = ge('cardAppRarity');
  const filterBar = ge('cardFilterBar');
  if (!filterBar) return;

  filterBar.addEventListener('click', (e) => {
    const rBtn = e.target.closest('.filter-btn[data-r]');
    const vBtn = e.target.closest('.filter-btn[data-view]');
    if (rBtn) {
      cFilter = rBtn.dataset.r;
      filterBar.querySelectorAll('.filter-btn[data-r]').forEach(b => b.dataset.active = (b === rBtn) ? 'true' : 'false');
    }
    if (vBtn) {
      cView = vBtn.dataset.view;
      filterBar.querySelectorAll('.filter-btn[data-view]').forEach(b => b.dataset.active = (b === vBtn) ? 'true' : 'false');
      cApp.style.display = cView === 'section' ? '' : 'none';
      cAppR.style.display = cView === 'rarity' ? '' : 'none';
    }
    const activeRoot = cView === 'section' ? cApp : cAppR;
    activeRoot.querySelectorAll('[data-rarity]').forEach(el => {
      const match = cFilter === 'all' || el.dataset.rarity === cFilter;
      el.dataset.hidden = match ? 'false' : 'true';
    });
    activeRoot.querySelectorAll(':scope > section.card-block').forEach(sec => {
      const anyVisible = [...sec.querySelectorAll('[data-rarity]')].some(x => x.dataset.hidden !== 'true');
      sec.dataset.hidden = anyVisible ? 'false' : 'true';
    });
    if (cView === 'section') {
      cApp.querySelectorAll('.mission-title').forEach(t => {
        const grid = t.nextElementSibling;
        const anyVisible = grid && [...grid.children].some(x => x.dataset.hidden !== 'true');
        t.dataset.hidden = anyVisible ? 'false' : 'true';
        if (grid) grid.style.display = anyVisible ? '' : 'none';
      });
    }
  });
}
