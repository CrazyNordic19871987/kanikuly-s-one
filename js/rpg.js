// -- XP + Level system ---------------------------
// LEVEL_NAMES / xpToNextLevel / getLevel live in js/logic.js (pure logic module).

function calcStudentXP(studentId) {
  let xp = 0;
  state.completions.filter(c => c.student_id == studentId).forEach(c => {
    xp += xpFromCompletion(c.score);
  });
  state.badges.filter(b => b.student_id == studentId && b.earned).forEach(b => {
    xp += xpFromBadge(b.rarity);
  });
  xp += getStreakBonusXP(studentId);
  xp += getRelicBonus(studentId);
  return xp;
}

// ── CD8: Streak System ──────────────────────────────────────
function getStreak(studentId) {
  return state.streaks[studentId] || { count: 0, lastDate: '' };
}
function checkAndUpdateStreak(studentId) {
  const today = new Date().toISOString().slice(0, 10);
  const streak = getStreak(studentId);
  if (streak.lastDate === today) return streak.count; // already counted today
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let newCount = streak.lastDate === yesterday ? streak.count + 1 : 1;
  state.streaks[studentId] = { count: newCount, lastDate: today };
  persistProgress(studentId);
  const bonus = STREAK_BONUS[Math.min(newCount, STREAK_BONUS.length - 1)] || 0;
  const milestone = STREAK_MILESTONES.find(m => m.days === newCount);
  return { count: newCount, bonus, milestone };
}
function getStreakBonusXP(studentId) {
  const s = getStreak(studentId);
  return STREAK_BONUS[Math.min(s.count, STREAK_BONUS.length - 1)] || 0;
}

// ── CD4/CD6: Economy System ──────────────────────────────────
function getCoins(studentId) { return state.coins[studentId] || 0; }
function persistProgress(studentId) {
  if (typeof debouncedSaveProgress === 'function') {
    debouncedSaveProgress(studentId, snapshotStudentProgress(state, studentId));
  }
}
function addCoins(studentId, amount) {
  state.coins[studentId] = (state.coins[studentId] || 0) + amount;
  persistProgress(studentId);
  return state.coins[studentId];
}
function spendCoins(studentId, amount) {
  const cur = getCoins(studentId);
  if (cur < amount) return false;
  state.coins[studentId] = cur - amount;
  persistProgress(studentId);
  return true;
}
function getEconomyFromCompletions(studentId) {
  let coins = 0;
  state.completions.filter(c => c.student_id == studentId).forEach(c => {
    const score = c.score || 1;
    coins += Math.floor(score * 2);
  });
  return coins + (state.coins[studentId] || 0);
}

// ── CD7: Mystery Box ────────────────────────────────────────
function getMysteryCount(studentId) { return state.mysteryCount[studentId] || 0; }
function incrementMysteryCount(studentId) {
  state.mysteryCount[studentId] = (state.mysteryCount[studentId] || 0) + 1;
  persistProgress(studentId);
  if (state.mysteryCount[studentId] >= MYSTERY_BOX_INTERVAL) {
    state.mysteryCount[studentId] = 0;
    return rollMysteryBox();
  }
  return null;
}
function rollMysteryBox() {
  const totalWeight = MYSTERY_BOX_POOL.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const reward of MYSTERY_BOX_POOL) {
    roll -= reward.weight;
    if (roll <= 0) return reward;
  }
  return MYSTERY_BOX_POOL[0];
}

// ── CD2: Boss Battles ────────────────────────────────────────
function getCurrentBoss() {
  const now = new Date();
  const start = new Date(2026, 5, 1); // June 1 2026
  const weekNum = Math.floor((now - start) / (7 * 86400000)) + 1;
  return BOSS_BATTLES.find(b => b.week === weekNum) || BOSS_BATTLES[0];
}
function isBossDefeated(studentId, weekNum) {
  return !!(state.bossDefeated[studentId] && state.bossDefeated[studentId]['week' + weekNum]);
}
function defeatBoss(studentId) {
  const boss = getCurrentBoss();
  if (!boss) return null;
  const weekKey = 'week' + boss.week;
  if (!state.bossDefeated[studentId]) state.bossDefeated[studentId] = {};
  state.bossDefeated[studentId][weekKey] = true;
  persistProgress(studentId);
  return boss.rewards;
}
function getBossTeamDamage(studentId) {
  return state.completions.filter(c => c.student_id == studentId).reduce((sum, c) => sum + ((c.score || 1) * 10), 0);
}

// ── CD6: Limited-Time Badges ──────────────────────────────────
function checkLimitedBadges(studentId) {
  const earned = state.limitedEarned[studentId] || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayComps = state.completions.filter(c => c.student_id == studentId && c.created_at && c.created_at.slice(0, 10) === today);
  const student = state.students.find(s => s.id == studentId);
  const shiftId = student ? parseInt(studentPrimaryShift(student.id) || 0) : 0;
  const myShifts = student ? studentShifts(student.id).map(String) : [];
  const newlyEarned = [];
  for (const lb of LIMITED_BADGES) {
    if (earned.includes(lb.id)) continue;
    if (lb.shift_ids.length && !myShifts.some(sh => lb.shift_ids.map(String).includes(sh))) continue;
    let met = false;
    if (lb.condition === '3 completions in 1 day') met = todayComps.length >= 3;
    else if (lb.condition === '5 perfect scores in a row') {
      const last5 = state.completions.filter(c => c.student_id == studentId).slice(-5);
      met = last5.length === 5 && last5.every(c => (c.score || 0) >= 5);
    }
    else if (lb.condition === 'completion after 20:00') {
      const h = new Date().getHours();
      met = h >= 20 && todayComps.length > 0;
    }
    else if (lb.condition === 'completion before 10:00') {
      const h = new Date().getHours();
      met = h < 10 && todayComps.length > 0;
    }
    else if (lb.condition === 'all 7 directions in 1 shift') {
      const dirs = new Set(state.completions.filter(c => c.student_id == studentId && parseInt(c.shift_id) === shiftId).map(c => (c.direction_name||'').toLowerCase()));
      met = dirs.size >= 7;
    }
    if (met) {
      newlyEarned.push(lb);
      if (!state.limitedEarned[studentId]) state.limitedEarned[studentId] = [];
      state.limitedEarned[studentId].push(lb.id);
    }
  }
  if (newlyEarned.length) persistProgress(studentId);
  return newlyEarned;
}

// ── CD1: Legacy Relics ────────────────────────────────────────
function getRelics(studentId) { return state.relics[studentId] || []; }
function awardRelic(studentId, shiftId) {
  const relic = LEGENDARY_RELICS.find(r => r.from_shift === shiftId);
  if (!relic) return null;
  const current = getRelics(studentId);
  if (current.includes(relic.id)) return null;
  if (!state.relics[studentId]) state.relics[studentId] = [];
  state.relics[studentId].push(relic.id);
  persistProgress(studentId);
  return relic;
}
function getRelicBonus(studentId) {
  const relics = getRelics(studentId);
  return relics.length * 10; // +10 XP per relic
}

// ── CD3/CD4: Avatar Customization ─────────────────────────────
function getAvatar(studentId) {
  return state.avatars[studentId] || { color: '#3B82F6', icon: '🤖', title: '', frame: '' };
}
function setAvatar(studentId, data) {
  state.avatars[studentId] = { ...getAvatar(studentId), ...data };
  persistProgress(studentId);
}

// ── CD5: Social Comparison ────────────────────────────────────
function getRecentActivity(limit = 10) {
  const all = state.completions
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, limit);
  return all.map(c => {
    const s = state.students.find(st => st.id == c.student_id);
    return s ? { student: s, completion: c } : null;
  }).filter(Boolean);
}
function getLeaderboard() {
  return state.students.map(s => {
    const xp = calcStudentXP(s.id);
    const lv = getLevel(xp);
    return { student: s, xp, level: lv.level, levelName: lv.name };
  }).sort((a, b) => b.xp - a.xp);
}
function getFriends(studentId, limit = 5) {
  const lb = getLeaderboard();
  const idx = lb.findIndex(e => e.student.id == studentId);
  if (idx === -1) return lb.slice(0, limit);
  const start = Math.max(0, idx - 2);
  return lb.slice(start, start + 5);
}

// ── CD1/CD3: DISC Mission Recommendations ────────────────────
function getDiscType(studentId) {
  const xp = calcStudentXP(studentId);
  const comps = {};
  state.completions.filter(c => c.student_id == studentId).forEach(c => {
    const d = (c.direction_name || '').toLowerCase();
    comps[d] = (comps[d] || 0) + (c.score || 1);
  });
  let maxDir = '', maxScore = 0;
  for (const [k, v] of Object.entries(comps)) { if (v > maxScore) { maxScore = v; maxDir = k; } }
  if (maxDir.includes('спорт') || maxDir.includes('it')) return 'D';
  if (maxDir.includes('медиа') || maxDir.includes('art')) return 'I';
  if (maxDir.includes('дипломат') || maxDir.includes('биотех')) return 'S';
  return 'C';
}
function getDiscRecommendation(studentId) {
  const disc = getDiscType(studentId);
  return DISC_MISSION_BOOSTS[disc] || DISC_MISSION_BOOSTS.C;
}

// ── CD3: Mission Branching ────────────────────────────────────
function getMissionBranch(studentId) {
  const disc = getDiscType(studentId);
  const branches = {
    D: { a: { name:'Лидерская миссия', desc:'Веди команду к победе', icon:'👑', bonus:'initiative' },
         b: { name:'Стратегическая миссия', desc:'Спланируй идеальную атаку', icon:'🎯', bonus:'problem_solving' }},
    I: { a: { name:'Творческая миссия', desc:'Создай что-то уникальное', icon:'🎨', bonus:'creativity' },
         b: { name:'Коммуникационная миссия', desc:'Убеди и вдохнови других', icon:'💬', bonus:'communication' }},
    S: { a: { name:'Командная миссия', desc:'Поддержи и объедини команду', icon:'🤝', bonus:'cooperation' },
         b: { name:'Миссия-исследование', desc:'Изучи и найди скрытое', icon:'🔍', bonus:'curiosity' }},
    C: { a: { name:'Аналитическая миссия', desc:'Проанализируй данные', icon:'📊', bonus:'critical_thinking' },
         b: { name:'Техническая миссия', desc:'Собери и запрограммируй', icon:'🔧', bonus:'learning_ability' }}
  };
  return branches[disc] || branches.C;
}

// ── CD5: Team Scoreboard ──────────────────────────────────────
function getSquadScores() {
  const squads = {};
  state.students.forEach(s => {
    const raw = studentInAnySquad(s.id);
    const sq = raw ? squadName(raw) : 'Без команды';
    if (!squads[sq]) squads[sq] = { name: sq, totalXP: 0, members: 0, badges: 0 };
    squads[sq].totalXP += calcStudentXP(s.id);
    squads[sq].members++;
    squads[sq].badges += state.badges.filter(b => b.student_id == s.id && b.earned).length;
  });
  return Object.values(squads).sort((a, b) => b.totalXP - a.totalXP);
}

// ── Near-miss feedback helper ─────────────────────────────────
function getNearMiss(studentId) {
  const xp = calcStudentXP(studentId);
  const lv = getLevel(xp);
  if (lv.level >= 10) return null;
  const needed = lv.nextXP - lv.xp;
  return { needed, currentLevel: lv.level, nextLevel: lv.level + 1, nextLevelName: LEVEL_NAMES[lv.level] || 'Легенда' };
}

// -- Inventory system ---------------------------
const SHIFT_INVENTORY = {
  1: { name:'Кибер-Атлеты', items:[
    { id:'cyber_neuropod', icon:'⚡', name:'Нейро-под', rarity:'common', bonus:'+5% к спорту' },
    { id:'cyber_blazecore', icon:'🔥', name:'Blaze-ядро', rarity:'rare', bonus:'+10% к спорту' },
    { id:'cyber_lasergun', icon:'🔫', name:'Лазер-пистолет', rarity:'common', bonus:'+5% к тактике' },
    { id:'cyber_balance', icon:'⚖️', name:'Балансборд', rarity:'common', bonus:'+5% к координации' },
    { id:'cyber_chip', icon:'💾', name:'Нейро-чип', rarity:'rare', bonus:'+10% к IT' }
  ]},
  2: { name:'Terraforming', items:[
    { id:'terra_seedpod', icon:'🌱', name:'Капсула-семя', rarity:'common', bonus:'+5% к биотеху' },
    { id:'terra_terraformer', icon:'🏗️', name:'Терраформер', rarity:'rare', bonus:'+10% к биотеху' },
    { id:'terra_rover', icon:'🛞', name:'Ровер-разведчик', rarity:'common', bonus:'+5% к исследованию' },
    { id:'terra_diploma', icon:'🤝', name:'Дипломатический мандат', rarity:'common', bonus:'+5% к дипломатии' },
    { id:'terra_colony', icon:'🏕️', name:'Колония', rarity:'rare', bonus:'+10% к команде' }
  ]},
  3: { name:'Meta-Agency', items:[
    { id:'meta_cam', icon:'📹', name:'Шпионская камера', rarity:'common', bonus:'+5% к медиа' },
    { id:'meta_disguise', icon:'🎭', name:'Маскировка', rarity:'rare', bonus:'+10% к медиа' },
    { id:'meta_decoder', icon:'🔑', name:'Декодер', rarity:'common', bonus:'+5% к IT' },
    { id:'meta_tagger', icon:'🎯', name:'Тагер', rarity:'common', bonus:'+5% к спорту' },
    { id:'meta_dossier', icon:'📁', name:'Досье агента', rarity:'rare', bonus:'+10% к аналитике' }
  ]},
  4: { name:'Future Makers', items:[
    { id:'maker_3dpen', icon:'🖊️', name:'3D-ручка', rarity:'common', bonus:'+5% к дизайну' },
    { id:'maker_printer', icon:'🖨️', name:'3D-принтер', rarity:'rare', bonus:'+10% к дизайну' },
    { id:'maker_sensor', icon:'📡', name:'Датчик', rarity:'common', bonus:'+5% к IT' },
    { id:'maker_flask', icon:'🧪', name:'Лабораторный стакан', rarity:'common', bonus:'+5% к биотеху' },
    { id:'maker_proto', icon:'🧬', name:'Прототип', rarity:'rare', bonus:'+10% к изобретениям' }
  ]},
  5: { name:'Active Tech 2077', items:[
    { id:'active_exo', icon:'🦾', name:'Экзо-перчатка', rarity:'common', bonus:'+5% к спорту' },
    { id:'active_core', icon:'⚙️', name:'Био-ядро', rarity:'rare', bonus:'+10% к биотеху' },
    { id:'active_react', icon:'⚡', name:'Реактор', rarity:'common', bonus:'+5% к IT' },
    { id:'active_grip', icon:'🧤', name:'Силовая перчатка', rarity:'common', bonus:'+5% к силе' },
    { id:'active_amplifier', icon:'🔋', name:'Амплификатор', rarity:'rare', bonus:'+10% к производительности' }
  ]},
  6: { name:'Urban Quest', items:[
    { id:'urban_map', icon:'🗺️', name:'Городская карта', rarity:'common', bonus:'+5% к навигации' },
    { id:'urban_signal', icon:'📡', name:'Сигнал', rarity:'rare', bonus:'+10% к IT' },
    { id:'urban_mic', icon:'🎤', name:'Репортёрский микрофон', rarity:'common', bonus:'+5% к медиа' },
    { id:'urban_spray', icon:'🎨', name:'Спрей-маркер', rarity:'common', bonus:'+5% к дизайну' },
    { id:'urban_blueprint', icon:'📐', name:'Городской чертёж', rarity:'rare', bonus:'+10% к стратегии' }
  ]},
  7: { name:'Smart City Lab', items:[
    { id:'smart_led', icon:'💡', name:'LED-модуль', rarity:'common', bonus:'+5% к IT' },
    { id:'smart_circuit', icon:'🔌', name:'Микросхема', rarity:'rare', bonus:'+10% к IT' },
    { id:'smart_brush', icon:'🖌️', name:'Кисть smart-художника', rarity:'common', bonus:'+5% к дизайну' },
    { id:'smart_biosample', icon:'🧫', name:'Био-образец', rarity:'common', bonus:'+5% к биотеху' },
    { id:'smart_scale', icon:'⚖️', name:'Миниатюрная модель', rarity:'rare', bonus:'+10% к архитектуре' }
  ]},
  8: { name:'English Game Studio', items:[
    { id:'eng_dice', icon:'🎲', name:'Кубик историй', rarity:'common', bonus:'+5% к английскому' },
    { id:'eng_book', icon:'📖', name:'Сценарный буклет', rarity:'rare', bonus:'+10% к английскому' },
    { id:'eng_ctrl', icon:'🎮', name:'Геймпад', rarity:'common', bonus:'+5% к IT' },
    { id:'eng_palette', icon:'🎨', name:'Палитра', rarity:'common', bonus:'+5% к дизайну' },
    { id:'eng_stage', icon:'🎭', name:'Мини-сцена', rarity:'rare', bonus:'+10% к презентациям' }
  ]},
  9: { name:'Champions Academy', items:[
    { id:'champ_medal', icon:'🏅', name:'Спортивная медаль', rarity:'common', bonus:'+5% к спорту' },
    { id:'champ_trophy', icon:'🏆', name:'Кубок чемпиона', rarity:'rare', bonus:'+15% к спорту' },
    { id:'champ_whistle', icon:'📣', name:'Судейский свисток', rarity:'common', bonus:'+5% к лидерству' },
    { id:'champ_flag', icon:'🚩', name:'Флаг команды', rarity:'common', bonus:'+5% к дипломатии' },
    { id:'champ_belt', icon:'🥊', name:'Чемпионский пояс', rarity:'legendary', bonus:'+20% ко всем' }
  ]},
  10: { name:'Island Survival', items:[
    { id:'island_compass', icon:'🧭', name:'Компас', rarity:'common', bonus:'+5% к навигации' },
    { id:'island_flare', icon:'🔴', name:'Ракета', rarity:'rare', bonus:'+10% к спасению' },
    { id:'island_cam', icon:'📹', name:'Экспедиционная камера', rarity:'common', bonus:'+5% к медиа' },
    { id:'island_knife', icon:'🔪', name:'Сапёрный нож', rarity:'common', bonus:'+5% к выживанию' },
    { id:'island_beacon', icon:'📡', name:'Спасательный маяк', rarity:'legendary', bonus:'+20% ко всем' }
  ]}
};

const INVENTORY_SLOTS_BASE = 6;

function computeInventory(studentId) {
  const items = [];
  const completions = state.completions.filter(c => c.student_id == studentId);
  const student = state.students.find(s => s.id === studentId);
  const shiftId = student ? studentPrimaryShift(student.id) : null;
  // Предметы: из Supabase (content_inventory_items) приоритетно, иначе встроенные
  const dbItems = state.inventoryItems.filter(it => String(it.shift_id) === String(shiftId));
  const shiftData = dbItems.length ? { name: (state.shifts.find(sh => String(sh.id) === String(shiftId)) || {}).name || ('Миссия ' + shiftId), items: dbItems }
                                  : SHIFT_INVENTORY[shiftId];

  if (!shiftData) return { items, maxSlots: INVENTORY_SLOTS_BASE };

  const trackHits = {};
  completions.forEach(c => {
    const dir = (c.direction_name || '').toLowerCase();
    if (dir.includes('спорт'))     trackHits['sport'] = (trackHits['sport'] || 0) + 1;
    if (dir.includes('it'))        trackHits['it'] = (trackHits['it'] || 0) + 1;
    if (dir.includes('биотех'))    trackHits['bio'] = (trackHits['bio'] || 0) + 1;
    if (dir.includes('медиа'))     trackHits['media'] = (trackHits['media'] || 0) + 1;
    if (dir.includes('дипломат'))  trackHits['diplo'] = (trackHits['diplo'] || 0) + 1;
    if (dir.includes('art') || dir.includes('design')) trackHits['art'] = (trackHits['art'] || 0) + 1;
    if (dir.includes('предприн'))  trackHits['biz'] = (trackHits['biz'] || 0) + 1;
  });

  const hasHighScore = completions.some(c => c.score >= 5);
  const completedCount = completions.length;

  shiftData.items.forEach(item => {
    if (items.find(i => i.id === item.id)) return;
    if (item.rarity === 'legendary' && hasHighScore) {
      items.push({ ...item, id: item.id || item.item_id });
    } else if (item.rarity === 'rare' && completedCount >= 2) {
      items.push({ ...item, id: item.id || item.item_id });
    } else if (item.rarity === 'common') {
      items.push({ ...item, id: item.id || item.item_id });
    }
  });

  const maxSlots = INVENTORY_SLOTS_BASE + Math.floor(completedCount / 3);
  return { items, maxSlots: Math.min(maxSlots, 12), shiftName: shiftData.name };
}
