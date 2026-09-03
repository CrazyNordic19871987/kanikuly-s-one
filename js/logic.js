// ════════════════════════════════════════════
//  КАНИКУЛЫ С ONE! — PURE LOGIC MODULE
//  Self-contained, DOM-free functions extracted from app.js.
//  Browser: exposed on `window` (loaded before app.js).
//  Node/vitest: importable via CommonJS `module.exports`.
//  Do NOT reference `state`, `document`, `api`, or `auth*` here.
// ════════════════════════════════════════════

// -- XSS escape helper --------------------------
// Browser: uses the real DOM (identical to innerHTML serialization).
// Node/vitest: falls back to an equivalent 5-char escape.
function esc(s) {
  if (!s) return '';
  const str = String(s);
  if (typeof document !== 'undefined' && document.createElement) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
}

// -- HTML sanitizer for free-text input (write-path defense-in-depth) --
function sanitizeText(s) {
  if (!s) return '';
  let str = String(s);
  try {
    if (typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function') {
      str = DOMPurify.sanitize(str, { USE_PROFILES: { html: false } });
    }
  } catch (_e) { /* fall back to tag-stripping below */ }
  return str.replace(/<\s*\/?\s*(script|style|iframe|object|embed|form)[^>]*>/gi, '')
            .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
            .replace(/javascript\s*:/gi, '');
}

// -- Display helpers ----------------------------
function displayName(st) {
  if (!st) return '';
  const nick = st.nickname || st.nick_name || '';
  if (nick) return nick;
  return (st.first_name || '') + ' ' + (st.last_name || '');
}

function displayNameEsc(st) {
  return esc(displayName(st));
}

function initialsOf(st) {
  const nick = st.nickname || st.nick_name || '';
  if (nick) return nick.slice(0, 2).toUpperCase();
  return (st.first_name ? st.first_name[0] : '') + (st.last_name ? st.last_name[0] : '');
}

// -- XP + Level system --------------------------
const LEVEL_NAMES = ['Новичок','Стажёр','Ученик','Практикант','Специалист','Эксперт','Мастер','Профи','Гуру','Легенда'];

function xpToNextLevel(level) {
  if (level >= 10) return Infinity;
  return 200 + (level * 150);
}

function getLevel(xp) {
  let level = 1;
  let totalNeeded = 0;
  while (level < 10) {
    const needed = xpToNextLevel(level);
    if (totalNeeded + needed > xp) break;
    totalNeeded += needed;
    level++;
  }
  const currentLevelXP = xp - totalNeeded;
  const nextLevelXP = level >= 10 ? 0 : xpToNextLevel(level);
  const progress = level >= 10 ? 100 : Math.round((currentLevelXP / nextLevelXP) * 100);
  return { level, name: LEVEL_NAMES[level - 1], xp: currentLevelXP, nextXP: nextLevelXP, progress };
}

// -- Rarity label -------------------------------
function rarityLabel(r) {
  return { common:'Обычный', rare:'Редкий', epic:'Эпический', legendary:'Легендарный' }[r] || r;
}

// -- Assessment scoring -------------------------
function calcXp(score) {
  return Math.round(score * score * 2);
}

function calcCurrency(score, shift) {
  return Math.round(score * 10);
}

// ── Exposure ──
// Browser: attach to window so app.js can call bare globals.
if (typeof window !== 'undefined') {
  window.esc = esc;
  window.sanitizeText = sanitizeText;
  window.displayName = displayName;
  window.displayNameEsc = displayNameEsc;
  window.initialsOf = initialsOf;
  window.LEVEL_NAMES = LEVEL_NAMES;
  window.xpToNextLevel = xpToNextLevel;
  window.getLevel = getLevel;
  window.rarityLabel = rarityLabel;
  window.calcXp = calcXp;
  window.calcCurrency = calcCurrency;
}

// Node: expose for vitest.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    esc,
    sanitizeText,
    displayName,
    displayNameEsc,
    initialsOf,
    LEVEL_NAMES,
    xpToNextLevel,
    getLevel,
    rarityLabel,
    calcXp,
    calcCurrency
  };
}
