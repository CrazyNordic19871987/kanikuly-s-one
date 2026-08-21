const fs = require('fs');
const path = require('path');

// Load config.js data
const configPath = path.join(__dirname, '..', 'js', 'config.js');
let configText = fs.readFileSync(configPath, 'utf8');

// Extract SHIFTS array
const shiftsMatch = configText.match(/const SHIFTS = (\[[\s\S]*?\n\];)/);
const shifts = eval(shiftsMatch[1]);

// Extract COMPETENCIES
const compMatch = configText.match(/const COMPETENCIES = (\[[\s\S]*?\n\];)/);
const competencies = eval(compMatch[1]);

// Extract BADGE_DEFS (old, we'll transform)
const badgeMatch = configText.match(/const BADGE_DEFS = (\[[\s\S]*?\n\];)/);
const oldBadges = eval(badgeMatch[1]);

// Extract DISC
const discColorsMatch = configText.match(/const DISC_COLORS = (\{[\s\S]*?\n\};)/);
const discColors = eval(discColorsMatch[1]);
const discSkillMatch = configText.match(/const DISC_SKILL_MAP = (\{[\s\S]*?\n\};)/);
const discSkillMap = eval(discSkillMatch[1]);
const discComboMatch = configText.match(/const DISC_COMBO = (\{[\s\S]*?\n\};)/);
const discCombo = eval(discComboMatch[1]);

function esc(s) {
  if (!s) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function jsonEsc(obj) {
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

let sql = `-- ═══════════════════════════════════════════════════════════
--  Каникулы с ONE! — Таблицы контента для Supabase
--  Выполните в Supabase SQL Editor: https://supabase.com/dashboard
-- ═══════════════════════════════════════════════════════════

-- ── 1. ТАБЛИЦА СМЕН ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_shifts (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER UNIQUE NOT NULL,
  currency TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  legend TEXT,
  gamification TEXT,
  english TEXT,
  sport TEXT,
  skills TEXT,
  product TEXT,
  directions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. ТАБЛИЦА КОМПЕТЕНЦИЙ ──────────────────────────────
CREATE TABLE IF NOT EXISTS content_competencies (
  id SERIAL PRIMARY KEY,
  comp_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. ТАБЛИЦА БЕДЖЕЙ ──────────────────────────────────
CREATE TABLE IF NOT EXISTS content_badge_definitions (
  id SERIAL PRIMARY KEY,
  badge_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  shift_id INTEGER,
  direction_name TEXT,
  mission_name TEXT,
  condition TEXT DEFAULT 'completed',
  rarity TEXT DEFAULT 'common',
  desc TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 4. ТАБЛИЦА DISC-КОНФИГА ─────────────────────────────
CREATE TABLE IF NOT EXISTS content_disc_config (
  id SERIAL PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
--  SEED DATA
-- ═══════════════════════════════════════════════════════════

-- ── СМЕНЫ ────────────────────────────────────────────────
`;

// Generate shifts INSERT
sql += `INSERT INTO content_shifts (shift_id, currency, title, subtitle, tags, legend, gamification, english, sport, skills, product, directions) VALUES\n`;
const shiftValues = shifts.map(s => {
  return `(${s.id}, ${esc(s.currency)}, ${esc(s.title)}, ${esc(s.subtitle)}, ${jsonEsc(s.tags)}, ${esc(s.legend)}, ${esc(s.gamification)}, ${esc(s.english)}, ${esc(s.sport)}, ${esc(s.skills)}, ${esc(s.product)}, ${jsonEsc(s.directions)})`;
});
sql += shiftValues.join(',\n') + ';\n\n';

// Generate competencies INSERT
sql += `-- ── КОМПЕТЕНЦИИ ────────────────────────────────────────\n`;
sql += `INSERT INTO content_competencies (comp_id, name, icon, color) VALUES\n`;
const compValues = competencies.map(c => {
  return `(${esc(c.id)}, ${esc(c.name)}, ${esc(c.icon)}, ${esc(c.color)})`;
});
sql += compValues.join(',\n') + ';\n\n';

// Generate new badge definitions (shift-based)
sql += `-- ── БЕДЖИ (привязаны к сменам/направлениям/миссиям) ─────\n`;
sql += `INSERT INTO content_badge_definitions (badge_id, name, icon, shift_id, direction_name, mission_name, condition, rarity, desc) VALUES\n`;

const newBadges = [];
shifts.forEach(shift => {
  if (!shift.directions) return;
  shift.directions.forEach(dir => {
    if (!dir.missions) return;
    // First mission in each direction = "start" badge (common)
    const first = dir.missions[0];
    if (first) {
      const bid = `shift${shift.id}_${dir.name.toLowerCase().replace(/[^a-zа-я0-9]/g, '')}_start`;
      newBadges.push(`(${esc(bid)}, ${esc(first.name + ': старт')}, ${esc(dir.icon)}, ${shift.id}, ${esc(dir.name)}, ${esc(first.name)}, 'completed', 'common', ${esc('Начал миссию: ' + first.name)})`);
    }
    // Last mission in each direction = "master" badge (rare)
    const last = dir.missions[dir.missions.length - 1];
    if (last && last.name !== first?.name) {
      const bid = `shift${shift.id}_${dir.name.toLowerCase().replace(/[^a-zа-я0-9]/g, '')}_master`;
      newBadges.push(`(${esc(bid)}, ${esc(last.name + ': мастер')}, ${esc('🏆')}, ${shift.id}, ${esc(dir.name)}, ${esc(last.name)}, 'completed', 'rare', ${esc('Освоил направление «' + dir.name + '» в смене ' + shift.id)})`);
    }
  });
});
sql += newBadges.join(',\n') + ';\n\n';

// Generate DISC config INSERT
sql += `-- ── DISC-КОНФИГ ────────────────────────────────────────\n`;
sql += `INSERT INTO content_disc_config (config_key, config_value) VALUES\n`;
sql += `('colors', ${jsonEsc(discColors)}),\n`;
sql += `('skill_map', ${jsonEsc(discSkillMap)}),\n`;
sql += `('combo', ${jsonEsc(discCombo)});\n`;

// Write SQL file
const outPath = path.join(__dirname, '..', 'setup_supabase.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log('SQL file generated: setup_supabase.sql');
console.log('Shifts:', shifts.length);
console.log('Competencies:', competencies.length);
console.log('Badges:', newBadges.length);
console.log('DISC configs: 3');
