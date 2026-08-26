// =============================================
//  Каникулы с ONE! — Летние каникулы 2026
// =============================================

// -- Состояние приложения ----------------------
let state = {
  students: [],
  observations: [],
  badges: [],
  completions: [],
  shifts: [],
  competencies: [],
  badgeDefs: [],
  discConfig: { colors: {}, skill_map: {}, combo: {} },
  currentPage: 'shifts',
  currentStudentId: null,
  currentDay: 1,
  currentTrack: 'bio',
  filterSquad: '',
  filterShift: '',
  filterCampus: '',
  filterSdCampus: '',
  filterSdSquad: '',
  currentShiftId: null,
  searchQuery: '',
  radarChart: null
};

let tempRatings = { independence: 0, quality: 0 };

// -- Safe element helper ------------------------
function ge(id) {
  return document.getElementById(id);
}

// -- XSS escape helper --------------------------
function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

// -- XP + Level system ---------------------------
const LEVEL_NAMES = ['Новичок','Стажёр','Ученик','Практикант','Специалист','Эксперт','Мастер','Профи','Гуру','Легенда'];

function xpToNextLevel(level) {
  if (level >= 10) return Infinity;
  return 200 + (level * 150);
}

function calcStudentXP(studentId) {
  let xp = 0;
  state.completions.filter(c => c.student_id == studentId).forEach(c => {
    const score = c.score || 1;
    xp += 20 + score * 15;
  });
  state.badges.filter(b => b.student_id == studentId && b.earned).forEach(b => {
    if (b.rarity === 'legendary') xp += 100;
    else if (b.rarity === 'epic') xp += 60;
    else if (b.rarity === 'rare') xp += 40;
    else xp += 20;
  });
  return xp;
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
  const shiftId = student?.shift;
  const shiftData = SHIFT_INVENTORY[shiftId];

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
      items.push({...item});
    } else if (item.rarity === 'rare' && completedCount >= 2) {
      items.push({...item});
    } else if (item.rarity === 'common') {
      items.push({...item});
    }
  });

  const maxSlots = INVENTORY_SLOTS_BASE + Math.floor(completedCount / 3);
  return { items, maxSlots: Math.min(maxSlots, 12), shiftName: shiftData.name };
}

// -- Инициализация -----------------------------
function populateShiftSelect() {
  const sel = ge('s-shift');
  if (!sel || typeof state.shifts === 'undefined') return;
  state.shifts.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = 'Миссия ' + s.id + ' — ' + s.title;
    sel.appendChild(opt);
  });
}

function populateStudentFilters() {
  const shiftSel = ge('st-filter-shift');
  const squadSel = ge('st-filter-squad');
  if (!shiftSel || typeof state.shifts === 'undefined') return;
  state.shifts.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name || 'Смена ' + s.id;
    shiftSel.appendChild(opt);
  });
  for (let i = 1; i <= 8; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = 'Отряд ' + i;
    squadSel.appendChild(opt);
  }
}

function onStFilterChange() {
  renderStudentList();
}

function getStudentFilters() {
  return {
    shift: ge('st-filter-shift')?.value || '',
    squad: ge('st-filter-squad')?.value || '',
    campus: ge('st-filter-campus')?.value || ''
  };
}

function populateDbFilters() {
  const shiftSel = ge('db-shift-select');
  const squadSel = ge('db-squad-select');
  if (shiftSel && typeof state.shifts !== 'undefined' && shiftSel.options.length <= 1) {
    state.shifts.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
    opt.textContent = s.name || 'Миссия ' + s.id;
      shiftSel.appendChild(opt);
    });
  }
  if (squadSel && squadSel.options.length <= 1) {
    for (let i = 1; i <= 8; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = 'Отряд ' + i;
      squadSel.appendChild(opt);
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoader(true);
    await loadData();
  } catch(e) {
    console.error('Load error:', e);
  }
  try { setupNav(); } catch(e) { console.error('Nav error:', e); }
  try { setupSearch(); } catch(e) { console.error('Search error:', e); }
  try { renderShiftsPage(); } catch(e) { console.error('Shifts error:', e); }
  showLoader(false);

  const hash = location.hash.replace('#', '');
  const validPages = ['students', 'shifts', 'dashboard', 'achievements', 'talents'];
  const startPage = validPages.includes(hash) ? hash : 'shifts';
  navigateTo(startPage, true);
  history.replaceState({ page: startPage }, '', '#' + startPage);
});

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.page) {
    const page = e.state.page;
    if (page === state.currentPage && page !== 'shift-detail' && page !== 'shift-dashboard') return;

    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
      p.style.animation = '';
    });
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

    if (page === 'shift-detail') {
      if (e.state.shiftId) openShiftDetail(e.state.shiftId);
      return;
    }
    if (page === 'shift-dashboard') {
      if (e.state.shiftId) {
        state.currentShiftId = e.state.shiftId;
        state.filterSdCampus = '';
        state.filterSdSquad = '';
      }
      navigateTo('shift-dashboard', true);
      setTimeout(() => renderShiftDashboard(), 100);
      return;
    }

    const needsMainRebuild = state.currentPage === 'shift-detail' || state.currentPage === 'shift-dashboard';
    if (needsMainRebuild) rebuildMainContent();

    const el = ge('page-' + page);
    if (el) el.classList.add('active');
    animatePageIn(page);

    const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navBtn) navBtn.classList.add('active');
    state.currentPage = page;

    if (typeof syncBottomBar === 'function') syncBottomBar(page);

    if (page === 'achievements') { populateStudentSelect('ach-student-select', onAchStudentChange); populateAchFilters(); }
    if (page === 'talents')      populateStudentSelect('talent-student-select', onTalentStudentChange);
    if (page === 'dashboard')    renderDashboard();
    if (page === 'shifts')       renderShiftsPage();
    if (page === 'students')     renderStudentList();
  }
});

let _radarResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_radarResizeTimer);
  _radarResizeTimer = setTimeout(() => {
    if (state.currentPage === 'talents' && state.currentStudentId) {
      const canvas = document.getElementById('radar-canvas');
      if (canvas && canvas.parentElement) {
        const obs = state.observations.filter(o => o.student_id === state.currentStudentId);
        const scores = calcCompetencies(obs, state.currentStudentId);
        drawRadar(canvas, scores, {
          grid: 'rgba(255,255,255,0.08)',
          axis: 'rgba(255,255,255,0.1)',
          label: 'rgba(255,255,255,0.7)',
          font: '600 10px sans-serif',
          fillGrad: ['rgba(232,168,56,0.35)', 'rgba(232,168,56,0.15)'],
          stroke: '#E8A838',
          point: '#E8A838'
        });
      }
    }
  }, 200);
});

async function loadData() {
  const safeGet = async (table) => { try { return await api.getAll(table); } catch(e) { console.warn('Fetch failed:', table, e); return []; } };

  const [students, observations, badges, completions, shifts, competencies, badgeDefs, discRows, missionsRows] = await Promise.all([
    safeGet(TABLES.STUDENTS),
    safeGet(TABLES.OBSERVATIONS),
    safeGet(TABLES.BADGES),
    safeGet(TABLES.COMPLETIONS),
    safeGet(TABLES.CONTENT_SHIFTS),
    safeGet(TABLES.CONTENT_COMPETENCIES),
    safeGet(TABLES.CONTENT_BADGE_DEFS),
    safeGet(TABLES.CONTENT_DISC_CONFIG),
    safeGet(TABLES.CONTENT_MISSIONS)
  ]);

  state.students    = Array.isArray(students) ? students : [];
  state.observations = Array.isArray(observations) ? observations : [];
  state.badges      = Array.isArray(badges) ? badges : [];
  state.completions = Array.isArray(completions) ? completions : [];

  if (Array.isArray(shifts) && shifts.length > 0) {
    state.shifts = shifts.map(s => ({ ...s, id: s.shift_id, name: (s.title || s.name || ('Миссия ' + s.shift_id)).replace(/^<|>$/g, '').trim() })).sort((a, b) => a.id - b.id);
  } else {
    state.shifts = typeof DEFAULT_SHIFTS !== 'undefined' ? DEFAULT_SHIFTS : [];
  }
  if (Array.isArray(competencies) && competencies.length > 0) {
    state.competencies = competencies.map(c => ({ id: c.comp_id, name: c.name, icon: c.icon, color: c.color }));
  } else {
    state.competencies = typeof DEFAULT_COMPETENCIES !== 'undefined' ? DEFAULT_COMPETENCIES : [];
  }
  if (Array.isArray(badgeDefs) && badgeDefs.length > 0) {
    state.badgeDefs = badgeDefs.map(b => ({ id: b.badge_id, name: b.name, icon: b.icon, shift_id: b.shift_id, direction_name: b.direction_name, mission_name: b.mission_name, condition: b.condition, rarity: b.rarity, desc: b.desc }));
  } else {
    state.badgeDefs = [];
  }
  if (Array.isArray(discRows) && discRows.length > 0) {
    const dc = typeof DEFAULT_DISC_CONFIG !== 'undefined' ? JSON.parse(JSON.stringify(DEFAULT_DISC_CONFIG)) : { colors:{}, skill_map:{}, combo:{} };
    discRows.forEach(r => { dc[r.config_key] = r.config_value; });
    state.discConfig = dc;
  } else {
    state.discConfig = typeof DEFAULT_DISC_CONFIG !== 'undefined' ? JSON.parse(JSON.stringify(DEFAULT_DISC_CONFIG)) : { colors:{}, skill_map:{}, combo:{} };
  }
  if (Array.isArray(missionsRows) && missionsRows.length > 0) {
    state.missions = missionsRows;
  } else {
    state.missions = [];
  }

  populateShiftSelect();
  populateStudentFilters();
  populateAssShiftSelect();
}

function showLoader(v) {
  const loader = ge('app-loader');
  if (loader) {
    loader.style.opacity = v ? '1' : '0';
    loader.style.pointerEvents = v ? 'all' : 'none';
  }
}

// -- Навигация ---------------------------------
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      navigateTo(page);
    });
  });
}

function rebuildMainContent() {
  const mainEl = document.querySelector('.main');
  if (!mainEl) return;
  const sq = esc(state.searchQuery);
  mainEl.innerHTML = `<div class="topbar">
    <button class="mobile-menu-toggle" onclick="toggleMobileMenu()">☰</button>
    <button class="mobile-back-btn" id="mobile-back-btn" onclick="goBack()" style="display:none">←</button>
    <div class="topbar-logo" style="cursor:pointer" onclick="navigateTo('shifts')" title="На главную"><svg viewBox="0 0 200 48" width="48" height="48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="16" r="11" fill="#E8A838"/><circle cx="24" cy="16" r="6" fill="#FFD93D"/><line x1="24" y1="4" x2="24" y2="1" stroke="#E8A838" stroke-width="1.5" stroke-linecap="round"/><line x1="32" y1="8" x2="34" y2="6" stroke="#E8A838" stroke-width="1.5" stroke-linecap="round"/><line x1="36" y1="16" x2="39" y2="16" stroke="#E8A838" stroke-width="1.5" stroke-linecap="round"/><line x1="16" y1="8" x2="14" y2="6" stroke="#E8A838" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="16" x2="9" y2="16" stroke="#E8A838" stroke-width="1.5" stroke-linecap="round"/><polygon points="24,22 18,32 30,32" fill="#E8A838" opacity="0.9"/><polygon points="24,22 20,32 24,31" fill="#d66a12" opacity="0.8"/></svg></div>
    <div class="topbar-title" style="cursor:pointer" onclick="navigateTo('shifts')" title="На главную">КАНИКУЛЫ С ONE!</div>
    <div class="search-wrap"><span class="search-icon">🔍</span><input type="text" id="search-input" placeholder="Поиск участников..." value="${sq}"></div>
    <div class="topbar-right"><div class="status-dot"></div></div>
  </div>
  <div class="page" id="page-students">
    <div class="page-wrap">
      <div class="page-header"><h1>👥 УЧАСТНИКИ</h1><p>Регистрация и управление профилями</p></div>
      <button class="btn-print" onclick="window.print()">🖨️ Распечатать / Сохранить PDF</button>
      <div class="form-card"><h3 style="font-size:0.85rem;margin-bottom:12px">➕ Новый участник</h3>
        <form id="student-form"><div class="form-grid">
          <div class="form-group"><label>Имя</label><input class="form-input" id="s-firstname" required placeholder="Имя"></div>
          <div class="form-group"><label>Фамилия</label><input class="form-input" id="s-lastname" required placeholder="Фамилия"></div>
          <div class="form-group"><label>Возраст</label><input class="form-input" id="s-age" type="number" min="7" max="12" required placeholder="7-12"></div>
          <div class="form-group"><label>Пол</label><select class="form-input" id="s-gender" required><option value="">Выбрать...</option><option value="Мужской">Мужской</option><option value="Женский">Женский</option></select></div>
          <div class="form-group"><label>Класс</label><input class="form-input" id="s-grade" type="number" min="1" max="11" required placeholder="Класс"></div>
          <div class="form-group"><label>Отряд</label><select class="form-input" id="s-squad" required><option value="">Выбрать...</option><option value="1">Отряд 1</option><option value="2">Отряд 2</option><option value="3">Отряд 3</option><option value="4">Отряд 4</option><option value="5">Отряд 5</option><option value="6">Отряд 6</option><option value="7">Отряд 7</option><option value="8">Отряд 8</option></select></div>
          <div class="form-group"><label>Кампус</label><select class="form-input" id="s-campus" required><option value="">Выбрать...</option><option value="ШОП">ШОП</option><option value="ШСТ">ШСТ</option></select></div>
          <div class="form-group"><label>Миссия</label><select class="form-input" id="s-shift" required><option value="">Выбрать...</option></select></div>
        </div>
        <div class="form-group" style="margin-top:8px"><label>Заметки</label><textarea class="form-input" id="s-notes" rows="2" placeholder="Дополнительная информация..."></textarea></div>
        <button class="btn-primary" type="submit">✅ Добавить участника</button></form>
      </div>
      <div class="students-layout"><div>
        <div class="student-filters" id="student-filters">
          <select class="form-input st-filter-select" id="st-filter-shift" onchange="onStFilterChange()"><option value="">Все миссии</option></select>
          <select class="form-input st-filter-select" id="st-filter-squad" onchange="onStFilterChange()"><option value="">Все отряды</option></select>
          <select class="form-input st-filter-select" id="st-filter-campus" onchange="onStFilterChange()"><option value="">Все кампусы</option><option value="ШОП">ШОП</option><option value="ШСТ">ШСТ</option></select>
        </div>
        <h3 style="font-size:0.85rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">Список · <span id="student-count">0</span></h3>
        <div id="student-list"></div>
      </div></div>
    </div>
  </div>
  <div class="page" id="page-shifts">
    <div class="page-wrap">
      <div class="page-header"><h1>🏕️ МИССИИ</h1><p>Концепции миссий — 10 сюжетов на выбор</p></div>
      <button class="btn-print" onclick="window.print()">🖨️ Распечатать / Сохранить PDF</button>
      <div class="shifts-grid" id="shifts-grid"></div>
    </div>
  </div>
  <div class="page" id="page-achievements">
    <div class="page-wrap">
      <div class="page-header"><h1>🏆 БАДЖИ</h1><p>Коллекция достижений участников</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <div style="flex:1;min-width:200px"><label style="font-size:0.7rem;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:4px">Участник</label><select class="form-input" id="ach-student-select"><option value="">— Выбрать участника —</option></select></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <select class="form-input" id="ach-filter-shift" onchange="renderAchBadges()" style="width:auto;min-width:120px"><option value="">Все миссии</option></select>
        <select class="form-input" id="ach-filter-campus" onchange="renderAchBadges()" style="width:auto;min-width:120px"><option value="">Все кампусы</option><option value="ШОП">ШОП</option><option value="ШСТ">ШСТ</option></select>
        <select class="form-input" id="ach-filter-squad" onchange="renderAchBadges()" style="width:auto;min-width:120px"><option value="">Все отряды</option></select>
      </div>
      <div class="ach-summary" id="ach-summary"></div>
      <div class="badge-grid" id="badge-grid"></div>
    </div>
  </div>
  <div class="page" id="page-talents">
    <div class="page-wrap">
      <div class="page-header"><h1>🎯 ПРОФИЛЬ ИГРОКА</h1><p>RPG-карточка участника каникул</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button class="btn-primary" onclick="printStudentReport(state.currentStudentId)">🎮 Скачать репорт участника</button>
        <button class="btn-print" style="margin-bottom:0" onclick="window.print()">🖨️ Печать страницы</button>
      </div>
      <div style="margin-bottom:12px"><label style="font-size:0.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;display:block">Участник</label><select class="student-selector" id="talent-student-select"><option value="">— Выбрать участника —</option></select></div>
      <div class="pp-hero" id="pp-hero"><div class="pp-avatar-wrap"><div class="pp-avatar" id="pp-avatar">--</div><div class="pp-level-badge" id="pp-level">1</div></div><div class="pp-hero-info"><div class="pp-name" id="pp-name">--</div><div class="pp-meta" id="pp-meta">--</div><div class="pp-xp-wrap"><div class="pp-xp-header"><span>Опыт</span><span id="pp-xp-text">0 XP</span></div><div class="pp-xp-bar"><div class="pp-xp-fill" id="pp-xp-fill" style="width:0%"></div></div></div><div class="pp-shift-tag" id="pp-shift-tag">--</div></div></div>
      <div class="pp-stats-grid" id="pp-stats"></div>
      <div class="pp-tabs"><button class="pp-tab active" data-tab="skills" onclick="ppTab('skills')">Навыки</button><button class="pp-tab" data-tab="badges" onclick="ppTab('badges')">Значки</button><button class="pp-tab" data-tab="inventory" onclick="ppTab('inventory')">Инвентарь</button><button class="pp-tab" data-tab="shifts" onclick="ppTab('shifts')">Миссии</button><button class="pp-tab" data-tab="history" onclick="ppTab('history')">История</button><button class="pp-tab" data-tab="disc" onclick="ppTab('disc')">DISC</button><button class="pp-tab" data-tab="recommend" onclick="ppTab('recommend')">Рекомендации</button></div>
      <div class="pp-panel active" data-panel="skills"><div class="gc"><h3>🕸️ Радар компетенций</h3><div class="radar-wrap"><canvas id="radar-canvas" width="400" height="400"></canvas></div><div id="ai-insights-section" style="margin-top:12px"></div></div><div class="gc"><h3>📈 Шкала компетенций</h3><div class="comp-bars" id="comp-bars"></div></div><div class="gc"><h3>🏆 Ключевое направление</h3><div id="career-content"></div></div></div>
      <div class="pp-panel" data-panel="badges"><div class="gc"><h3>⭐ Полученные значки <span id="pp-badge-count" style="color:var(--muted);font-weight:400"></span></h3><div id="talent-badges-list"></div></div></div>
      <div class="pp-panel" data-panel="inventory"><div class="gc"><h3>🎒 Инвентарь</h3><div id="talent-inventory"></div></div></div>
      <div class="pp-panel" data-panel="shifts"><div class="gc"><h3>🏕️ Миссии участника</h3><div id="pp-shifts-list"></div></div></div>
      <div class="pp-panel" data-panel="history"><div class="gc"><h3>📜 История наблюдений</h3><div class="obs-list" id="talent-obs-list"></div></div></div>
      <div class="pp-panel" data-panel="disc"><div class="gc"><h3>🧩 DISC-профиль</h3><div class="disc-bars" id="disc-bars"></div><div class="disc-combo" id="disc-combo"></div></div></div>
      <div class="pp-panel" data-panel="recommend"><div class="gc"><h3>🔮 Рекомендации</h3><div id="pp-recommendations"></div></div></div>
    </div>
  </div>
  <div class="page" id="page-dashboard">
    <div class="page-wrap">
      <div class="page-header"><h1>📊 ДАШБОРД</h1><p>Общая статистика</p></div>
      <div class="filter-row"><span class="filter-label">Кампус:</span><button class="filter-pill active" data-filter="db-campus" data-val="" onclick="setDbFilter('campus','')">Все</button><button class="filter-pill" data-filter="db-campus" data-val="ШОП" onclick="setDbFilter('campus','ШОП')">ШОП</button><button class="filter-pill" data-filter="db-campus" data-val="ШСТ" onclick="setDbFilter('campus','ШСТ')">ШСТ</button></div>
      <div class="filter-row"><span class="filter-label">Миссия:</span><select class="form-input" id="db-shift-select" onchange="onDbShiftFilter()" style="width:auto;display:inline-block"><option value="">Все миссии</option></select></div>
      <div class="filter-row"><span class="filter-label">Отряд:</span><select class="form-input" id="db-squad-select" onchange="onDbSquadFilter()" style="width:auto;display:inline-block"><option value="">Все отряды</option></select></div>
      <div class="stats-row" id="db-stats"></div>
      <div class="db-student-grid" id="db-student-grid"></div>
    </div>
  </div>
  <div class="page" id="page-assessments">
    <div class="page-wrap">
      <div class="page-header"><h1>📋 ОЦЕНКА МИССИЙ</h1><p>Выставление баллов за задания</p></div>
      <div class="assess-selectors">
        <div><label style="font-size:0.7rem;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:4px">Миссия</label><select class="form-input" id="ass-shift" onchange="onAssShiftChange()"><option value="">Выбрать миссию...</option></select></div>
        <div><label style="font-size:0.7rem;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:4px">Направление</label><select class="form-input" id="ass-direction" onchange="onAssDirectionChange()"><option value="">Выбрать направление...</option></select></div>
        <div><label style="font-size:0.7rem;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:4px">Участник</label><select class="form-input" id="ass-student" onchange="onAssStudentChange()"><option value="">Выбрать участника...</option></select></div>
      </div>
      <div id="ass-missions-area"></div>
      <div id="ass-summary-area"></div>
    </div>
  </div>`;
  populateShiftSelect();
  populateStudentFilters();
  populateAssShiftSelect();
  populateDbFilters();
  populateStudentSelect('ach-student-select', onAchStudentChange);
  populateStudentSelect('talent-student-select', onTalentStudentChange);
  rebindSearch();
}

function navigateTo(page, skipHistory) {
  closeReport();
  if (page === state.currentPage) return;

  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.animation = '';
  });
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  if (page === 'shift-detail') return;

  const needsMainRebuild = state.currentPage === 'shift-detail' || state.currentPage === 'shift-dashboard';

  if (needsMainRebuild) {
    rebuildMainContent();
  }

  const el = ge('page-' + page);
  if (el) el.classList.add('active');
  animatePageIn(page);

  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');
  state.currentPage = page;

  if (!skipHistory) {
    history.pushState({ page }, '', '#' + page);
  }

  if (typeof syncBottomBar === 'function') syncBottomBar(page);

  if (page === 'achievements') { populateStudentSelect('ach-student-select', onAchStudentChange); populateAchFilters(); }
  if (page === 'talents')      populateStudentSelect('talent-student-select', onTalentStudentChange);
  if (page === 'dashboard')    renderDashboard();
  if (page === 'shifts')       renderShiftsPage();
  if (page === 'students')     renderStudentList();
  if (page === 'shift-dashboard') {
    if (typeof syncBottomBar === 'function') syncBottomBar('shifts');
  }
}

function animatePageIn(page) {
  const el = document.getElementById('page-' + page);
  if (!el) return;
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'pageSlideIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards';
}

// -- Поиск --------------------------------------
function setupSearch() {
  const el = document.getElementById('search-input');
  if (el) el.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderStudentList();
  });
}

function rebindSearch() {
  const el = document.getElementById('search-input');
  if (el) {
    el.value = state.searchQuery || '';
    el.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase();
      renderStudentList();
    });
  }
}

// =============================================
//  Страница 1: Участники
// =============================================

document.getElementById('student-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Сохранение...';
  btn.disabled = true;

  const student = {
    first_name: v('s-firstname'),
    last_name:  v('s-lastname'),
    age:        parseInt(v('s-age')),
    gender:     v('s-gender'),
    grade:      parseInt(v('s-grade')),
    squad:      parseInt(v('s-squad')),
    shift:      parseInt(v('s-shift')),
    campus:     v('s-campus'),
    notes:      v('s-notes'),
    created_at: new Date().toISOString()
  };

  let saved;
  try {
    const result = await api.insert(TABLES.STUDENTS, student);
    if (!result || !result[0]) { showToast('⚠️ Ошибка сохранения', 'warn'); btn.textContent = '+ Добавить участника'; btn.disabled = false; return; }
    saved = result[0];
  } catch(err) {
    console.error('Insert student error:', err);
    showToast('⚠️ Ошибка сервера: ' + err.message, 'warn');
    btn.textContent = '+ Добавить участника'; btn.disabled = false;
    return;
  }

  state.students.unshift(saved);
  renderStudentList();

  e.target.reset();
  btn.textContent = '+ Добавить участника';
  btn.disabled = false;
  showToast('✓ Участник добавлен!');
});

function renderStudentList() {
  const el = document.getElementById('student-list');
  const countEl = document.getElementById('student-count');
  if (!el) return;
  let list = state.students;

  const filters = getStudentFilters();
  if (filters.shift) list = list.filter(s => String(s.shift) === String(filters.shift));
  if (filters.squad) list = list.filter(s => String(s.squad) === String(filters.squad));
  if (filters.campus) list = list.filter(s => (s.campus || '') === filters.campus);

  if (state.searchQuery) {
    list = list.filter(s =>
      (s.first_name + ' ' + s.last_name).toLowerCase().includes(state.searchQuery)
    );
  }

  if (countEl) countEl.textContent = list.length;

  if (!list.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">👥</div>
      <p>${state.searchQuery ? 'Участник не найден' : 'Нет участников. Добавьте первого!'}</p>
    </div>`;
    return;
  }

  el.innerHTML = list.map(s => {
    const obs   = state.observations.filter(o => o.student_id === s.id).length;
    const bdgs  = state.badges.filter(b => b.student_id === s.id && b.earned).length;
    const initials = (s.first_name?.[0] || '') + (s.last_name?.[0] || '');
    const progress = Math.round((obs / 40) * 100);
    const xp = calcStudentXP(s.id);
    const lv = getLevel(xp);
    return `
      <div class="student-card" data-id="${s.id}" onclick="quickViewStudent('${s.id}')">
        <div class="sc-avatar">${initials}<div class="sc-level-badge">${lv.level}</div></div>
        <div class="sc-info">
          <div class="sc-name">${s.first_name} ${s.last_name} <span class="sc-level-tag">${lv.name}</span></div>
          <div class="sc-meta">${s.age} лет · ${s.gender} · ${s.grade} кл. · отряд ${s.squad} · ${state.shifts.find(sh => sh.id == s.shift)?.name || 'Миссия ' + s.shift} · ${s.campus || ''}</div>
          <div class="sc-xp-bar"><div class="sc-xp-fill" style="width:${lv.progress}%"></div></div>
          <div class="sc-progress">
            <div class="sc-progress-bar"><div class="sc-progress-fill" style="width:${progress}%"></div></div>
            <span class="sc-progress-label">${obs} занятий · ${bdgs} значков · ${xp} XP</span>
          </div>
        </div>
        <button class="sc-delete" onclick="deleteStudent(event,'${s.id}')">✕</button>
      </div>`;
  }).join('');

  el.querySelectorAll('.student-card').forEach((card, i) => {
    card.style.animationDelay = (i * 0.06) + 's';
    card.classList.add('card-enter');
  });
}

function quickViewStudent(id) {
  state.currentStudentId = id;
  navigateTo('talents');
  setTimeout(() => {
    const sel = document.getElementById('talent-student-select');
    if (sel) {
      sel.value = id;
      sel.dispatchEvent(new Event('change'));
    }
  }, 100);
}

async function deleteStudent(e, id) {
  e.stopPropagation();
  if (!confirm('Удалить участника и все его данные?')) return;
  try {
    await api.remove(TABLES.STUDENTS, id);
  } catch(err) {
    console.error('Delete student error:', err);
    showToast('⚠️ Ошибка удаления: ' + err.message, 'warn');
    return;
  }
  state.students = state.students.filter(s => s.id !== id);
  state.observations = state.observations.filter(o => o.student_id !== id);
  state.badges = state.badges.filter(b => b.student_id !== id);
  renderStudentList();
  showToast('✓ Участник удалён');
}

// =============================================
//  Страница 2: Задания
// =============================================

function populateStudentSelect(selectId, onChange) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">— Выбрать участника —</option>' +
    state.students.map(s =>
      `<option value="${s.id}">${s.first_name} ${s.last_name} · отряд ${s.squad} · ${s.campus || ''}</option>`
    ).join('');
  sel.onchange = onChange;

  if (state.currentStudentId) {
    sel.value = state.currentStudentId;
    sel.dispatchEvent(new Event('change'));
  }
}

function onTaskStudentChange() {
  const id = document.getElementById('task-student-select').value;
  state.currentStudentId = id;
  const container = document.getElementById('task-detail');
  if (!id || !container) return;
  renderDayTabs();
  renderCurrentTask();
}

function renderDayTabs() {
  const el = document.getElementById('day-tabs');
  if (!el) return;
  el.innerHTML = Array.from({length:10}, (_,i) => {
    const day = i+1;
    const done = hasObservation(state.currentStudentId, day, state.currentTrack);
    return `<button class="day-pill ${day===state.currentDay?'active':''} ${done?'done':''}"
      onclick="selectDay(${day})">${day}</button>`;
  }).join('');
}

function selectDay(day) {
  state.currentDay = day;
  renderDayTabs();
  renderCurrentTask();
}

function selectTrack(track) {
  state.currentTrack = track;
  document.querySelectorAll('.track-tab').forEach(b => b.classList.remove('active'));
  document.querySelector(`.track-tab[data-track="${track}"]`)?.classList.add('active');
  renderDayTabs();
  renderCurrentTask();
}

function renderCurrentTask() {
  const container = ge('task-detail');
  if (!container) return;
  const studentId = state.currentStudentId;
  if (!studentId) { container.innerHTML = '<p class="empty-note">Выберите участника</p>'; return; }

  const student = state.students.find(s => s.id === studentId);
  if (!student) { container.innerHTML = '<p class="empty-note">Участник не найден</p>'; return; }

  const shift = state.shifts.find(s => s.id == student.shift);
  if (!shift || !shift.directions) { container.innerHTML = '<p class="empty-note">Нет данных по миссии</p>'; return; }

  const trackDir = shift.directions.find(d => {
    const n = d.name.toLowerCase();
    const t = state.currentTrack.toLowerCase();
    return n.includes(t) || (t === 'bio' && (n.includes('био') || n.includes('eco'))) || (t === 'eng' && (n.includes('инженер') || n.includes('it') || n.includes('тех'))) || (t === 'media' && n.includes('медиа')) || (t === 'english' && (n.includes('англий') || n.includes('english')));
  });

  if (!trackDir || !trackDir.missions || !trackDir.missions.length) {
    const shiftDefName = state.shifts.find(sh => sh.id == student.shift)?.name || 'Миссии ' + student.shift;
    container.innerHTML = '<p class="empty-note">Нет заданий для этого направления в ' + shiftDefName + '</p>';
    return;
  }

  const missionIdx = (state.currentDay - 1) % trackDir.missions.length;
  const mission = trackDir.missions[missionIdx];

  const obs = getObservation(studentId, state.currentDay, state.currentTrack);
  tempRatings = { independence: obs?.independence || 0, quality: obs?.quality || 0 };

  function starBtns(type, obsVal) {
    let html = '';
    for (let n = 1; n <= 5; n++) {
      const active = obsVal >= n ? ' active' : '';
      html += '<button class="star' + active + '" onclick="setRating(\'' + type + '\',' + n + ')">' + n + '</button>';
    }
    return html;
  }

  let skillChips = '';
  (mission.skills || []).forEach(s => {
    const c = state.competencies.find(cc => cc.id === s);
    if (c) skillChips += '<span class="skill-chip" style="--chip-color:' + c.color + '">' + c.icon + ' ' + c.name + '</span>';
  });

  let html =
    '<div class="task-header">' +
      '<div class="task-day-badge">День ' + state.currentDay + ' · ' + esc(trackDir.name) + '</div>' +
      '<h3 class="task-title">' + esc(mission.name) + '</h3>' +
      '<p class="task-desc">' + esc(mission.desc) + '</p>' +
      '<div class="task-skills">' + skillChips + '</div>' +
    '</div>' +
    '<div class="task-form">' +
      '<div class="rating-group">' +
        '<label>Самостоятельность</label>' +
        '<div class="star-rating" id="rate-independence">' +
          starBtns('independence', obs ? obs.independence : 0) +
        '</div>' +
      '</div>' +
      '<div class="rating-group">' +
        '<label>Качество</label>' +
        '<div class="star-rating" id="rate-quality">' +
          starBtns('quality', obs ? obs.quality : 0) +
        '</div>' +
      '</div>' +
      '<label class="toggle-row">' +
        '<span>Проявил инициативу</span>' +
        '<div class="toggle-wrap">' +
          '<input type="checkbox" id="chk-initiative" ' + (obs && obs.initiative ? 'checked' : '') + '>' +
          '<span class="toggle-slider"></span>' +
        '</div>' +
      '</label>' +
      '<div class="form-group">' +
        '<label>Заметки вожатого</label>' +
        '<textarea id="obs-notes" rows="2" placeholder="Комментарии...">' + esc(obs ? obs.notes || '' : '') + '</textarea>' +
      '</div>' +
      '<button class="btn-primary" onclick="saveObservation()">' +
        (obs ? '✓ Обновить' : '✓ Сохранить задание') +
      '</button>' +
    '</div>';

  container.innerHTML = html;
}

function setRating(field, val) {
  tempRatings[field] = val;
  document.querySelectorAll(`#rate-${field} .star`).forEach((s, i) => {
    s.classList.toggle('active', i < val);
  });
}

async function saveObservation() {
  const indEl = document.querySelectorAll('#rate-independence .star.active');
  const qualEl = document.querySelectorAll('#rate-quality .star.active');
  const independence = indEl.length || tempRatings.independence;
  const quality = qualEl.length || tempRatings.quality;
  if (!independence || !quality) { showToast('⚠️ Поставьте оценки!', 'warn'); return; }

  const data = {
    student_id:   state.currentStudentId,
    day:          state.currentDay,
    track:        state.currentTrack,
    independence,
    quality,
    initiative:   document.getElementById('chk-initiative').checked,
    notes:        document.getElementById('obs-notes').value,
    created_at:   new Date().toISOString()
  };

  const existing = getObservation(state.currentStudentId, state.currentDay, state.currentTrack);
  try {
    if (existing) {
      await api.update(TABLES.OBSERVATIONS, existing.id, data);
      Object.assign(existing, data);
    } else {
      const result = await api.insert(TABLES.OBSERVATIONS, data);
      if (!result || !result[0]) { showToast('⚠️ Ошибка сохранения', 'warn'); return; }
      state.observations.push(result[0]);
    }
  } catch(err) {
    console.error('Save observation error:', err);
    showToast('⚠️ Ошибка сервера: ' + err.message, 'warn');
    return;
  }

  await checkAndAwardBadges(state.currentStudentId, state.currentDay, state.currentTrack, data);
  renderDayTabs();
  renderCurrentTask();
  showToast('✓ Задание сохранено!');
}

function getObservation(studentId, day, track) {
  return state.observations.find(o =>
    o.student_id === studentId && o.day === day && o.track === track
  );
}

function hasObservation(studentId, day, track) {
  return !!getObservation(studentId, day, track);
}

// =============================================
//  Страница 3: Достижения (авто-начисление)
// =============================================

async function checkAndAwardBadges(studentId, day, track, obs) {
  const defs = state.badgeDefs;
  for (const def of defs) {
    const alreadyEarned = state.badges.find(b => b.student_id === studentId && b.badge_id === def.id && b.earned);
    if (alreadyEarned) continue;
    const conditionMet = def.condition === 'completed' ||
      (def.condition === 'initiative' && obs.initiative);
    if (!conditionMet) continue;

    const badge = {
      student_id: studentId,
      badge_id: def.id,
      name: def.name,
      icon: def.icon,
      track: def.track,
      rarity: def.rarity,
      earned: true,
      earned_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    try {
      const result = await api.insert(TABLES.BADGES, badge);
      if (!result || !result[0]) continue;
      state.badges.push(result[0]);
      showBadgeNotification(def);
    } catch(err) {
      console.warn('Badge award failed:', def.name, err);
    }
  }
}

function showBadgeNotification(def) {
  const el = document.createElement('div');
  el.className = 'badge-notification rarity-' + def.rarity;
  el.innerHTML = `<div class="bn-icon">${def.icon}</div>
    <div class="bn-text"><strong>Новый значок!</strong><span>${def.name}</span></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 50);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 500); }, 3500);
}

function onAchStudentChange() {
  const id = document.getElementById('ach-student-select').value;
  state.currentStudentId = id;
  if (!id) return;
  renderAchievements(id);
}

function populateAchFilters() {
  const shiftSel = document.getElementById('ach-filter-shift');
  const squadSel = document.getElementById('ach-filter-squad');
  if (shiftSel && shiftSel.options.length <= 1) {
    (state.shifts || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name || 'Миссия ' + s.id;
      shiftSel.appendChild(opt);
    });
  }
  if (squadSel && squadSel.options.length <= 1) {
    for (let i = 1; i <= 8; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = 'Отряд ' + i;
      squadSel.appendChild(opt);
    }
  }
}

function renderAchBadges() {
  const studentId = document.getElementById('ach-student-select').value;
  if (studentId) renderAchievements(studentId);
}

function renderAchievements(studentId) {
  const earned = state.badges.filter(b => b.student_id === studentId && b.earned);
  const earnedIds = new Set(earned.map(b => b.badge_id));

  const filterShift = document.getElementById('ach-filter-shift')?.value || '';
  const filterCampus = document.getElementById('ach-filter-campus')?.value || '';
  const filterSquad = document.getElementById('ach-filter-squad')?.value || '';

  let filteredDefs = state.badgeDefs;
  if (filterShift) filteredDefs = filteredDefs.filter(d => String(d.shift_id) === String(filterShift));
  if (filterCampus || filterSquad) {
    const matchingStudentIds = state.students
      .filter(s => (!filterCampus || s.campus === filterCampus) && (!filterSquad || String(s.squad) === String(filterSquad)))
      .map(s => s.id);
    const matchingBadges = new Set(
      state.badges.filter(b => matchingStudentIds.includes(b.student_id) && b.earned).map(b => b.badge_id)
    );
    filteredDefs = filteredDefs.filter(d => matchingBadges.has(d.id) || earnedIds.has(d.id));
  }

  const rarityOrder = { legendary:0, epic:1, rare:2, common:3 };
  const badgeGrid = document.getElementById('badge-grid');
  const achSummary = document.getElementById('ach-summary');

  if (badgeGrid) {
    badgeGrid.innerHTML = filteredDefs
      .sort((a,b) => rarityOrder[a.rarity] - rarityOrder[b.rarity])
      .map(def => {
        const isEarned = earnedIds.has(def.id);
        const earnedObj = earned.find(b => b.badge_id === def.id);
        const dateStr = earnedObj?.earned_at ? new Date(earnedObj.earned_at).toLocaleDateString('ru') : '';
        return `
          <div class="badge-card ${isEarned ? 'earned' : 'locked'} rarity-${def.rarity}">
            <div class="badge-glow"></div>
            <div class="badge-emoji">${isEarned ? def.icon : '🔒'}</div>
            <div class="badge-name">${def.name}</div>
            <div class="badge-desc">${def.desc}</div>
            <div class="badge-rarity">${rarityLabel(def.rarity)}</div>
            ${isEarned ? `<div class="badge-date">${dateStr}</div>` : ''}
          </div>`;
      }).join('');
  }
  if (achSummary) achSummary.innerHTML =
    `<span class="ach-count">${earned.length}</span> из <span>${filteredDefs.length}</span> значков получено`;
}

function rarityLabel(r) {
  return { common:'Обычный', rare:'Редкий', epic:'Эпический', legendary:'Легендарный' }[r] || r;
}

// =============================================
//  Страница 4: Таланты участника
// =============================================

function onTalentStudentChange() {
  const id = document.getElementById('talent-student-select').value;
  state.currentStudentId = id;
  if (!id) return;
  renderTalentCard(id);
  const student = state.students.find(s => s.id === id);
  if (student) fillReport(student);
}

function ppTab(tab) {
  document.querySelectorAll('.pp-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.pp-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
}

function renderTalentCard(studentId) {
  const student = state.students.find(s => s.id === studentId);
  if (!student) return;

  const obs = state.observations.filter(o => o.student_id === studentId);
  const earnedBadges = state.badges.filter(b => b.student_id === studentId && b.earned);
  const xp = calcStudentXP(studentId);
  const lv = getLevel(xp);
  const shift = state.shifts.find(s => s.id == student.shift);
  const shiftName = shift ? shift.name : student.shift;

  const initials = ((student.first_name || '')[0] || '') + ((student.last_name || '')[0] || '');
  const setEl = (id, html) => { const e = document.getElementById(id); if (e) e.innerHTML = html; };
  const setText = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };

  // Hero card
  setText('pp-name', student.first_name + ' ' + student.last_name);
  setEl('pp-avatar', initials || '?');
  setText('pp-level', lv.level);
  setText('pp-meta', student.age + ' лет · ' + student.grade + ' класс · отряд ' + student.squad);
  setText('pp-xp-text', xp + ' / ' + lv.nextXP + ' XP');
  setText('pp-shift-tag', shiftName);
  const pct = lv.nextXP > 0 ? Math.min(100, Math.round((xp / lv.nextXP) * 100)) : 0;
  const xpFill = document.getElementById('pp-xp-fill');
  if (xpFill) xpFill.style.width = pct + '%';
  const lvlBadge = document.getElementById('pp-level');
  if (lvlBadge) lvlBadge.textContent = lv.level;

  // Stats grid
  const completedCount = state.completions.filter(c => c.student_id === studentId).length;
  const unlocBadges = state.badgeDefs.filter(b => earnedBadges.some(eb => eb.badge_id === b.id)).length;
  const shiftsAttended = new Set(state.completions.filter(c => c.student_id === studentId).map(c => c.shift_id)).size;
  setEl('pp-stats', `
    <div class="pp-stat"><div class="pp-stat-num">${lv.level}</div><div class="pp-stat-label">Уровень</div></div>
    <div class="pp-stat"><div class="pp-stat-num">${xp}</div><div class="pp-stat-label">Опыт</div></div>
    <div class="pp-stat"><div class="pp-stat-num">${completedCount}</div><div class="pp-stat-label">Заданий</div></div>
    <div class="pp-stat"><div class="pp-stat-num">${unlocBadges}</div><div class="pp-stat-label">Значков</div></div>
  `);

  // Skills tab
  const compScores = calcCompetencies(obs, studentId);
  renderRadarChart(compScores);
  renderAIInsights(studentId);
  renderCompBars(compScores);
  renderCareer(obs, earnedBadges);
  renderRecommendations(obs, earnedBadges, compScores);

  // Badges tab
  const badgesListEl = document.getElementById('talent-badges-list');
  if (badgesListEl) badgesListEl.innerHTML = earnedBadges.length
    ? earnedBadges.map(b => {
        const def = state.badgeDefs.find(d => d.id === b.badge_id);
        const shiftObj = def ? state.shifts.find(s => s.id == def.shift_id) : null;
        const shiftLabel = shiftObj ? shiftObj.name : '';
        return `<div class="talent-badge-row rarity-${b.rarity}">
          <span class="tbr-icon">${b.icon}</span>
          <div><strong>${b.name}</strong><p>${b.desc || ''}</p>${shiftLabel ? '<p style="font-size:0.6rem;color:var(--orange);margin:2px 0 0">' + shiftLabel + '</p>' : ''}</div>
          <span class="tbr-rarity">${rarityLabel(b.rarity)}</span>
        </div>`;
      }).join('')
    : '<p class="empty-note">Значков пока нет</p>';
  const badgeCount = document.getElementById('pp-badge-count');
  if (badgeCount) badgeCount.textContent = earnedBadges.length > 0 ? `(${earnedBadges.length})` : '';

  // Inventory tab
  const inv = computeInventory(studentId);
  const invEl = document.getElementById('talent-inventory');
  if (invEl) {
    let invHtml = `<div class="inv-header"><span>${inv.items.length} / ${inv.maxSlots} слотов</span></div><div class="inv-grid">`;
    inv.items.forEach(item => {
      invHtml += `<div class="inv-item rarity-${item.rarity}" title="${item.name} — ${item.bonus}"><span class="inv-icon">${item.icon}</span><span class="inv-name">${item.name}</span></div>`;
    });
    for (let i = inv.items.length; i < inv.maxSlots; i++) {
      invHtml += `<div class="inv-item empty"><span class="inv-icon">+</span></div>`;
    }
    invHtml += '</div>';
    invEl.innerHTML = invHtml;
  }

  // History tab
  const obsListEl = document.getElementById('talent-obs-list');
  if (obsListEl) obsListEl.innerHTML = obs.length
    ? obs.map(o => {
        const trackIcon = {bio:'🧬', eng:'⚙️', media:'🎥', english:'🌍'}[o.track] || '📋';
        return `<div class="obs-row">
          <span class="obs-icon">${trackIcon}</span>
          <div class="obs-info"><strong>${o.track} · день ${o.day}</strong></div>
          <div class="obs-scores">
            <span>💪 ${o.independence}/5</span>
            <span>★ ${o.quality}/5</span>
            ${o.initiative ? '<span class="init-chip">🚀 инициатива</span>' : ''}
          </div>
        </div>`;
      }).join('')
    : '<p class="empty-note">Наблюдений пока нет</p>';

  // DISC tab
  renderDISC(obs, studentId);

  // Shifts tab — show all shifts the student participated in with completion details
  const ppShiftsEl = document.getElementById('pp-shifts-list');
  if (ppShiftsEl) {
    const studentCompletions = state.completions.filter(c => c.student_id === studentId);
    const shiftIds = [...new Set(studentCompletions.map(c => c.shift_id))];
    if (shiftIds.length === 0) {
      ppShiftsEl.innerHTML = '<p class="empty-note">Участник пока не записан ни на одну миссию</p>';
    } else {
      ppShiftsEl.innerHTML = shiftIds.map(sid => {
        const shiftObj = state.shifts.find(s => s.id == sid);
        const shiftName = shiftObj ? shiftObj.name : 'Миссия ' + sid;
        const shiftComps = studentCompletions.filter(c => c.shift_id == sid);
        const directions = [...new Set(shiftComps.map(c => c.direction_name))];
        const avgScore = shiftComps.reduce((sum, c) => sum + (c.score || 0), 0) / (shiftComps.length || 1);
        const badgeCount = earnedBadges.filter(b => {
          const def = state.badgeDefs.find(d => d.id === b.badge_id);
          return def && def.shift_id == sid;
        }).length;
        const pct = Math.round(avgScore * 20);
        const barColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--orange)' : 'var(--sky)';
        return `<div class="obs-row" style="flex-direction:column;align-items:stretch;gap:8px">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="obs-icon">🏕️</span>
            <div class="obs-info"><strong>${esc(shiftName)}</strong></div>
            <span style="font-size:0.65rem;color:var(--muted)">${shiftComps.length} заданий · ${badgeCount} баджей</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${directions.map(d => `<span style="font-size:0.6rem;padding:2px 6px;border-radius:4px;background:var(--glass-b);color:var(--muted)">${esc(d)}</span>`).join('')}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:6px;background:var(--glass-b);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px"></div></div>
            <span style="font-size:0.65rem;font-weight:700;color:${barColor};min-width:32px;text-align:right">${pct}%</span>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Recommendations tab — AI-style analysis based on competencies, badges, and shift activity
  const ppRecEl = document.getElementById('pp-recommendations');
  if (ppRecEl) {
    const allComps = Object.entries(compScores).sort((a, b) => b[1] - a[1]);
    const topComps = allComps.filter(([, v]) => v > 0).slice(0, 5);
    const weakComps = allComps.filter(([, v]) => v < 30 && v > 0);

    // Map competencies to profession families
    const professionMap = {
      leader: ['IT-стартап', 'Предприниматель', 'Тимлид в технологиях'],
      communicator: ['PR-менеджер', 'Дипломат', 'HR-директор'],
      analyst: ['Data Scientist', 'Исследователь', 'Аналитик данных'],
      creator: ['UX/UI-дизайнер', 'Арт-директор', 'Креативный продюсер'],
      researcher: ['Биотехнолог', 'Научный сотрудник', 'Фармацевт'],
      teamplayer: ['Проджект-менеджер', 'Организатор событий', 'Координатор'],
      optimizer: ['Продуктовый менеджер', 'Операционист', 'Логист'],
      tech_lover: ['Разработчик', 'Инженер IoT', 'Системный администратор'],
      entrepreneur: ['Стартапер', 'Маркетолог', 'Финансовый аналитик'],
      athlete: ['Тренер', 'Спортивный менеджер', 'Физиотерапевт'],
      diplomat: ['Юрист', 'Международный аналитик', 'Переговорщик'],
      designer: ['Графический дизайнер', 'Архитектор', 'Промдизайнер'],
      media_pro: ['Видеопродюсер', 'Контент-мейкер', 'SMM-специалист'],
      english_master: ['Переводчик', 'Тьютор английского', 'Международный менеджер']
    };

    // Extracurricular map based on top skills
    const extraMap = {
      leader: ['Школа лидеров', 'Дебаты', 'Студенческий совет'],
      communicator: ['Школа ораторского мастерства', 'Подкаст-клуб', 'Театральная студия'],
      analyst: ['Программирование', 'Математический кружок', 'Научная олимпиада'],
      creator: ['Арт-студия', 'Фотоклуб', 'Дизайн-марафон'],
      researcher: ['Биоклуб', 'Научная лаборатория', 'STEM-кружок'],
      teamplayer: ['Волонтёрство', 'Спортивная команда', 'Тимбилдинг-клуб'],
      optimizer: ['Робототехника', 'Шахматный клуб', 'STEM-лагерь'],
      tech_lover: ['Кoding club', 'Hackathon', 'Клуб робототехники'],
      entrepreneur: ['Молодёжный бизнес-инкубатор', 'Финансовая грамотность', 'Стартап-клуб'],
      athlete: ['Спортивная секция', 'Фитнес-клуб', 'Туристический кружок'],
      diplomat: ['Модель ООН', 'Клуб дипломатии', 'Школа переговоров'],
      designer: ['Арт-студия', '3D-моделирование', 'Летняя дизайнерская школа'],
      media_pro: ['Видеопродакшн', 'Журналистика', 'Блогер-клуб'],
      english_master: ['Разговорный клуб', 'Клуб путешественников', 'English theater']
    };

    let html = '';

    // Top strengths
    if (topComps.length > 0) {
      html += '<h4 style="font-size:0.8rem;margin-bottom:10px;color:var(--green)">💪 Сильные стороны</h4>';
      topComps.forEach(([id, val]) => {
        const comp = state.competencies.find(c => c.id === id);
        if (!comp) return;
        const barColor = val >= 70 ? 'var(--green)' : val >= 40 ? 'var(--orange)' : 'var(--sky)';
        html += `<div class="rec-comment" style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span>${comp.icon} ${comp.name}</span><span style="font-size:0.65rem;font-weight:700;color:${barColor}">${val}%</span>
          </div>
          <div style="height:4px;background:var(--glass-b);border-radius:2px;overflow:hidden"><div style="height:100%;width:${val}%;background:${barColor};border-radius:2px"></div></div>
        </div>`;
      });
    }

    // Profession recommendations
    const profRecs = [];
    topComps.forEach(([id]) => {
      if (professionMap[id]) professionMap[id].forEach(p => profRecs.push(p));
    });
    if (profRecs.length > 0) {
      html += '<h4 style="font-size:0.8rem;margin:16px 0 10px;color:var(--orange)">🔮 Профессии будущего</h4>';
      const unique = [...new Set(profRecs)].slice(0, 6);
      html += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${unique.map(p =>
        `<span style="padding:4px 10px;border-radius:8px;background:var(--orange-dim);color:var(--orange);font-size:0.7rem;font-weight:600">${esc(p)}</span>`
      ).join('')}</div>`;
    }

    // Extracurricular recommendations
    const extraRecs = [];
    topComps.forEach(([id]) => {
      if (extraMap[id]) extraMap[id].forEach(e => extraRecs.push(e));
    });
    if (extraRecs.length > 0) {
      html += '<h4 style="font-size:0.8rem;margin:16px 0 10px;color:var(--sky)">🌟 Рекомендации по кружкам и секциям</h4>';
      const unique = [...new Set(extraRecs)].slice(0, 8);
      html += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${unique.map(e =>
        `<span style="padding:4px 10px;border-radius:8px;background:rgba(100,181,246,0.12);color:var(--sky);font-size:0.7rem;font-weight:600">${esc(e)}</span>`
      ).join('')}</div>`;
    }

    // Areas to develop
    if (weakComps.length > 0) {
      html += '<h4 style="font-size:0.8rem;margin:16px 0 10px;color:var(--muted)">📚 Рекомендуется развить</h4>';
      weakComps.forEach(([id, val]) => {
        const comp = state.competencies.find(c => c.id === id);
        if (!comp) return;
        html += `<div class="rec-comment" style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span>${comp.icon} ${comp.name}</span><span style="font-size:0.65rem;color:var(--muted)">${val}%</span>
          </div>
        </div>`;
      });
    }

    // Summary
    const totalObs = obs.length;
    const totalBadges = earnedBadges.length;
    const avgObs = totalObs > 0 ? Math.round(obs.reduce((s, o) => s + (o.quality || 0), 0) / totalObs * 20) : 0;
    html += `<div class="disc-combo" style="margin-top:16px">
      <strong>📊 Итоговый профиль</strong>
      <p>Уровень ${lv.level} · ${xp} XP · ${totalObs} наблюдений · ${totalBadges} значков · средний балл ${avgObs}%</p>
      <p style="margin-top:4px">Основной профиль: <strong style="color:var(--orange)">${topComps.length > 0 ? (state.competencies.find(c => c.id === topComps[0][0])?.name || '--') : 'Пока нет данных'}</strong></p>
    </div>`;

    if (!html) html = '<p class="empty-note">Недостаточно данных для анализа. Начните выставлять оценки!</p>';
    ppRecEl.innerHTML = html;
  }

  // Reset to skills tab
  ppTab('skills');
}

function getScoredProfessions(obs, badges, compScores) {
  const shiftMissions = [];
  state.shifts.forEach(s => {
    (s.directions || []).forEach(d => {
      (d.missions || []).forEach(m => {
        shiftMissions.push({ shift_id: s.id, direction: d.name, icon: d.icon, ...m });
      });
    });
  });
  const scored = shiftMissions.map(m => {
    let score = 0;
    let maxScore = 0;
    const comments = [];
    const mSkills = m.skills || [];
    let skillScore = 0;
    mSkills.forEach(sk => {
      if (compScores[sk]) skillScore += compScores[sk];
    });
    if (mSkills.length > 0) {
      const avg = skillScore / mSkills.length;
      score = avg;
      maxScore = 100;
      comments.push('📊 Совпадение с компетенциями: ' + mSkills.filter(s => (compScores[s]||0) > 50).map(s => {
        const c = state.competencies.find(cc => cc.id === s);
        return c ? c.icon + ' ' + c.name : s;
      }).join(', '));
    }
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return { id: m.name.toLowerCase().replace(/\s/g,'_'), name: m.name, icon: m.icon || '📋', desc: m.desc || '', score: pct, comments };
  });
  scored.sort((a,b) => b.score - a.score);
  return scored;
}

function renderRecommendations(obs, badges, compScores) {
  const container = document.getElementById('recommendations-content');
  if (!container) return;

  const scored = getScoredProfessions(obs, badges, compScores);

  container.innerHTML = scored.map(prof => {
    const level = prof.score >= 70 ? 'high' : prof.score >= 40 ? 'medium' : 'low';
    const levelText = prof.score >= 70 ? '✓ Высокая совместимость' : prof.score >= 40 ? '⚠ Средняя совместимость' : '— Низкая совместимость';

    return `
      <div class="recommendation-card rarity-${level}">
        <div class="rec-header">
          <span class="rec-icon">${prof.icon}</span>
          <div class="rec-info">
            <strong>${prof.name}</strong>
            <p>${prof.desc}</p>
          </div>
          <div class="rec-score">
            <span class="rec-pct">${prof.score}%</span>
            <span class="rec-level">${levelText}</span>
          </div>
        </div>
        <div class="rec-comments">
          ${prof.comments.map(c => `<div class="rec-comment">${c}</div>`).join('')}
        </div>
      </div>`;
  }).join('');
}

function calcCompetencies(obs, studentId) {
  const scores = {};
  state.competencies.forEach(c => scores[c.id] = 0);
  const counts = {};
  state.competencies.forEach(c => counts[c.id] = 0);

  const filteredCompletions = studentId
    ? state.completions.filter(c => c.student_id == studentId)
    : state.completions;

  filteredCompletions.forEach(c => {
    if (!c.skills) return;
    Object.entries(c.skills).forEach(([sk, val]) => {
      if (scores[sk] !== undefined) {
        scores[sk] += val;
        counts[sk]++;
      }
    });
  });

  const result = {};
  state.competencies.forEach(c => {
    result[c.id] = counts[c.id] > 0
      ? Math.min(100, Math.round((scores[c.id] / counts[c.id]) * 20))
      : 0;
  });
  return result;
}

function drawRadar(canvas, scores, o) {
  if (!canvas) return;
  const opts = o || {};
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const wrap = canvas.parentElement;
  const wrapW = wrap ? wrap.clientWidth : 400;
  const isMobile = wrapW < 380;
  const logicalW = isMobile ? wrapW : Math.min(wrapW, 500);
  const logicalH = isMobile ? logicalW : logicalW;

  canvas.style.width = logicalW + 'px';
  canvas.style.height = logicalH + 'px';
  canvas.width = Math.round(logicalW * dpr);
  canvas.height = Math.round(logicalH * dpr);
  ctx.scale(dpr, dpr);

  const W = logicalW, H = logicalH;
  const cx = W / 2, cy = H / 2;
  const pad = isMobile ? Math.round(42 * (W / 340)) : Math.round(65 * (W / 400));
  const R = Math.min(W, H) / 2 - pad;
  const N = state.competencies.length;

  ctx.clearRect(0, 0, W, H);

  const gridAlpha = isMobile ? 0.12 : 0.08;
  for (let r = 1; r <= 5; r++) {
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
      const rr = (r / 5) * R;
      const x = cx + Math.cos(angle) * rr;
      const y = cy + Math.sin(angle) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = opts.grid || `rgba(255,255,255,${gridAlpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const baseIcon = isMobile ? 18 : 22;
  const baseFont = isMobile ? 8 : 10;
  const baseIconOffset = isMobile ? 16 : 22;
  const baseNameOffset = isMobile ? 30 : 40;
  const iconDy = isMobile ? 4 : 5;

  const scaleFactor = W / 400;
  const iconSize = Math.max(14, Math.round(baseIcon * scaleFactor));
  const textSize = Math.max(7, Math.round(baseFont * scaleFactor));
  const iconOffset = Math.round(baseIconOffset * scaleFactor);
  const nameOffset = Math.round(baseNameOffset * scaleFactor);

  const labelColor = opts.label || 'rgba(255,255,255,0.7)';

  state.competencies.forEach((c, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
    ctx.strokeStyle = opts.axis || 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const iconR = R + iconOffset;
    const iconX = cx + Math.cos(angle) * iconR;
    const iconY = cy + Math.sin(angle) * iconR;
    ctx.font = iconSize + 'px sans-serif';
    ctx.fillStyle = labelColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.icon, iconX, iconY - Math.round(iconDy * scaleFactor));

    const nameR = R + nameOffset;
    const nameX = cx + Math.cos(angle) * nameR;
    const nameY = cy + Math.sin(angle) * nameR;
    ctx.font = `600 ${textSize}px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = isMobile ? 'rgba(255,255,255,0.65)' : (opts.label || 'rgba(255,255,255,0.5)');
    ctx.fillText(c.name || c.id, nameX, nameY);
  });

  ctx.beginPath();
  state.competencies.forEach((c, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    const val = (scores[c.id] || 0) / 100;
    const x = cx + Math.cos(angle) * R * val;
    const y = cy + Math.sin(angle) * R * val;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  const g = opts.fillGrad || ['rgba(232,168,56,0.35)', 'rgba(232,168,56,0.15)'];
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  grad.addColorStop(0, g[0]);
  grad.addColorStop(1, g[1]);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = opts.stroke || '#E8A838';
  ctx.lineWidth = 2;
  ctx.stroke();

  state.competencies.forEach((c, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    const val = (scores[c.id] || 0) / 100;
    const x = cx + Math.cos(angle) * R * val;
    const y = cy + Math.sin(angle) * R * val;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI*2);
    ctx.fillStyle = opts.point || '#E8A838';
    ctx.fill();
  });
}

function renderRadarChart(scores) {
  drawRadar(document.getElementById('radar-canvas'), scores, {
    grid: 'rgba(255,255,255,0.08)',
    axis: 'rgba(255,255,255,0.1)',
    label: 'rgba(255,255,255,0.5)',
    font: '11px sans-serif',
    fillGrad: ['rgba(232,168,56,0.35)', 'rgba(232,168,56,0.15)'],
    stroke: '#E8A838',
    point: '#E8A838'
  });
}

function renderCompBars(scores) {
  const el = document.getElementById('comp-bars');
  if (!el) return;
  el.innerHTML = state.competencies.map(c => `
    <div class="comp-bar-row">
      <span class="comp-bar-icon">${c.icon}</span>
      <span class="comp-bar-name">${c.name}</span>
      <div class="comp-bar-track">
        <div class="comp-bar-fill" style="width:${scores[c.id]}%;background:${c.color}80;border-right:2px solid ${c.color}"></div>
      </div>
      <span class="comp-bar-val">${scores[c.id]}%</span>
    </div>`).join('');
}

function calcDisc(obs, studentId) {
  const rawScores = {D:0, I:0, S:0, C:0};
  const counts = {D:0, I:0, S:0, C:0};

  const filteredCompletions = studentId
    ? state.completions.filter(c => c.student_id == studentId)
    : state.completions;

  filteredCompletions.forEach(c => {
    if (!c.skills) return;
    Object.keys(c.skills).forEach(skill => {
      const skillMap = state.discConfig.skill_map || {};
      for (const [type, skills] of Object.entries(skillMap)) {
        if (skills.includes(skill)) {
          rawScores[type] += c.score || 0;
          counts[type]++;
        }
      }
    });
  });

  const maxVal = Math.max(...Object.values(rawScores), 1);
  const disc = {};
  for (const t of ['D','I','S','C']) {
    disc[t] = counts[t] > 0
      ? Math.max(10, Math.round((rawScores[t] / maxVal) * 100))
      : 10;
  }

  const dc = state.discConfig.colors || {};
  const labels = {
    D:{label:'Командир', color:dc.D || '#EF4444', desc:'Я беру высоту!', slogan:'Сила воли, скорость, преодоление препятствий'},
    I:{label:'Звездочет', color:dc.I || '#FBBF24', desc:'Я зажигаю свет!', slogan:'Энергия, общение, вдохновение и веселье'},
    S:{label:'Хранитель', color:dc.S || '#22C55E', desc:'Я держу строй!', slogan:'Забота, дружба, помощь и терпение'},
    C:{label:'Мастер',    color:dc.C || '#3B82F6', desc:'Я знаю секрет!', slogan:'Точность, знания, логика и порядок'}
  };

  const dominant = Object.entries(disc).sort((a,b) => b[1]-a[1])[0];

  return { disc, labels, dominant };
}

function renderDISC(obs, studentId) {
  const { disc, labels, dominant } = calcDisc(obs, studentId);

  const discBarsEl = document.getElementById('disc-bars');
  if (discBarsEl) discBarsEl.innerHTML = ['D','I','S','C'].map(t => `
    <div class="disc-row">
      <div class="disc-type-label" style="color:${labels[t].color}">${t} <span style="font-size:0.75em;opacity:0.85">${labels[t].label}</span></div>
      <div class="disc-bar-wrap">
        <div class="disc-bar-inner" style="width:${disc[t]}%;background:linear-gradient(90deg,${labels[t].color}90,${labels[t].color})">
          <span class="disc-bar-pct">${disc[t]}%</span>
        </div>
      </div>
      <div class="disc-type-desc">${labels[t].desc}</div>
    </div>`).join('');

  const domEl = document.getElementById('disc-dominant');
  if (domEl) {
    domEl.innerHTML =
      `<span style="color:${labels[dominant[0]].color}">Доминирует тип: ${dominant[0]} — ${labels[dominant[0]].label}</span>`;
  }

  const existingCombo = domEl?.parentNode?.querySelector('.disc-combo-section');
  if (existingCombo) existingCombo.remove();

  const comboHtml = '<div class="disc-combo-section"><h3>Комбо-типы DISC</h3>' +
    Object.entries(state.discConfig.combo || {}).map(([key, val]) => `
      <div class="disc-row" style="margin-bottom:6px;">
        <div class="disc-type-label" style="color:${val.color}">${key}</div>
        <div class="disc-type-desc"><strong>${val.label}</strong> · ${val.desc}</div>
      </div>`).join('') + '</div>';

  if (domEl && domEl.parentNode) {
    domEl.parentNode.insertAdjacentHTML('beforeend', comboHtml);
  }
}

function renderCareer(obs, badges) {
  const trackCounts = {bio:0, eng:0, media:0, english:0};
  obs.forEach(o => trackCounts[o.track] = (trackCounts[o.track] || 0) + 1);
  const top = Object.entries(trackCounts).sort((a,b) => b[1]-a[1]);
  const primary = top[0]?.[0] || 'bio';

  const profiles = {
    bio: {
      icon:'🧬', title:'BioTech направление',
      roles: ['Биоинженер', 'Агротехнолог', 'Генетик'],
      desc: 'Работа с биологическими системами, лабораторные исследования и современные технологии.',
      clubs: ['🔬 Юный биолог', '🌿 Эко-детектив', '🧪 Научная лаборатория']
    },
    eng: {
      icon:'⚙️', title:'Инженерное дело',
      roles: ['Робототехник', 'IoT-разработчик', 'Изобретатель'],
      desc: 'Проектирование и создание механизмов, электроника и программирование микроконтроллеров.',
      clubs: ['🔧 Инженерный клуб', '⚡ Энерджи-Хак', '💻 Робототехника']
    },
    media: {
      icon:'🎥', title:'Медиа-мастерство',
      roles: ['Видеограф', 'SMM-специалист', 'Контент-мейкер'],
      desc: 'Создание и монтаж видеоконтента, работа с аудиторией и продвижение в медиа.',
      clubs: ['📸 Медиастудия', '🎬 Digital-кино', '🎙️ Подкаст-студия']
    },
    english: {
      icon:'🌍', title:'Английские каникулы',
      roles: ['Глобальный коммуникатор', 'Нарративный дизайнер', 'Ведущий мероприятий'],
      desc: 'Языковая практика, сторителлинг и публичные выступления на английском языке.',
      clubs: ['🗣️ Разговорный клуб', '📚 Story Cubes', '🎤 Talent Show']
    }
  };

  const p = profiles[primary];
  const careerEl = document.getElementById('career-content');
  if (careerEl) {
    careerEl.innerHTML = `
      <div class="career-hero">
        <span class="career-hero-icon">${p.icon}</span>
        <div>
          <strong>${p.title}</strong>
          <p>${p.desc}</p>
        </div>
      </div>
      <div class="career-roles">
        ${p.roles.map(r => `<span class="career-role-chip">${r}</span>`).join('')}
      </div>
      <div class="career-clubs-title">Рекомендуемые клубы:</div>
      <div class="career-clubs">
        ${p.clubs.map(c => `<span class="career-club">${c}</span>`).join('')}
      </div>`;
  }
}

// =============================================
//  Страница 5: Дашборд
// =============================================

function renderDashboard() {
  const squad = state.filterSquad;
  const shift = state.filterShift;
  const campus = state.filterCampus;
  let list = state.students;
  if (squad) list = list.filter(s => s.squad == squad);
  if (shift) list = list.filter(s => s.shift == shift);
  if (campus) list = list.filter(s => s.campus === campus);

  const totalObs   = state.observations.filter(o => list.find(s => s.id === o.student_id)).length;
  const totalBdgs  = state.badges.filter(b => list.find(s => s.id === b.student_id) && b.earned).length;

  let avgScore = 0;
  const obsForList = state.observations.filter(o => list.find(s => s.id === o.student_id));
  if (obsForList.length) {
    avgScore = (obsForList.reduce((sum, o) => sum + (o.independence + o.quality) / 2, 0) / obsForList.length).toFixed(1);
  }

  const dbTotal = ge('db-total');
  const dbTasks = ge('db-tasks');
  const dbBadges = ge('db-badges');
  const dbAvg = ge('db-avg');
  if (dbTotal) dbTotal.textContent = list.length;
  if (dbTasks) dbTasks.textContent = totalObs;
  if (dbBadges) dbBadges.textContent = totalBdgs;
  if (dbAvg) dbAvg.textContent = avgScore;

  const grid = document.getElementById('db-student-grid');
  if (!grid) return;

  const parentEl = grid.parentElement;
  parentEl.querySelectorAll('.clubs-section,.activities-section,.english-section,.team-section')
    .forEach(el => el.remove());

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>Нет участников для выбранных фильтров</p></div>';
    return;
  }

  grid.innerHTML = list.map(s => {
    const obs = state.observations.filter(o => o.student_id === s.id);
    const bdgs = state.badges.filter(b => b.student_id === s.id && b.earned);
    const score = obs.length
      ? (obs.reduce((sum, o) => sum + (o.independence + o.quality) / 2, 0) / obs.length).toFixed(1)
      : '—';
    const progress = Math.round((obs.length / 40) * 100);
    const trackCounts = {bio:0, eng:0, media:0, english:0};
    obs.forEach(o => { if (trackCounts[o.track] !== undefined) trackCounts[o.track]++; });
    const dominantTrack = Object.entries(trackCounts).sort((a,b) => b[1]-a[1])[0];
    const trackIcon = {bio:'🧬', eng:'⚙️', media:'🎥', english:'🌍'}[dominantTrack?.[0]] || '📋';
    const xp = calcStudentXP(s.id);
    const lv = getLevel(xp);

    return `<div class="db-student-card" onclick="openStudentTalents('${s.id}')">
      <div class="db-sc-top">
        <div class="db-sc-avatar">${(s.first_name?.[0]||'')+(s.last_name?.[0]||'')}<div class="db-sc-level">${lv.level}</div></div>
        <div class="db-sc-info">
          <strong>${s.first_name} ${s.last_name}</strong> <span class="sc-level-tag">${lv.name}</span>
          <span>отряд ${s.squad} · ${state.shifts.find(sh => sh.id == s.shift)?.name || 'Миссия ' + s.shift} · ${s.campus || ''} · ${s.grade} кл</span>
        </div>
        <div class="db-sc-track">${trackIcon}</div>
      </div>
      <div class="db-sc-xp"><div class="db-sc-xp-bar"><div style="width:${lv.progress}%;background:linear-gradient(90deg,#FFD93D,var(--orange))"></div></div><span>${xp} XP</span></div>
      <div class="db-sc-progress">
        <div class="db-sc-bar"><div style="width:${progress}%;background:var(--orange)"></div></div>
        <span>${progress}%</span>
      </div>
      <div class="db-sc-stats">
        <div><span>${obs.length}</span><small>занятий</small></div>
        <div><span>${bdgs.length}</span><small>значков</small></div>
        <div><span>${score}</span><small>балл</small></div>
      </div>
      <div class="db-sc-badges">${bdgs.slice(0,5).map(b=>`<span>${b.icon}</span>`).join('')}</div>
    </div>`;
  }).join('');
}

function setFilter(type, val) {
  if (type === 'squad') state.filterSquad = val;
  if (type === 'shift') state.filterShift = val;
  if (type === 'campus') state.filterCampus = val;
  renderDashboard();

  document.querySelectorAll(`.filter-pill[data-filter="${type}"]`).forEach(p => p.classList.remove('active'));
  document.querySelector(`.filter-pill[data-filter="${type}"][data-val="${val}"]`)?.classList.add('active');
}

function openStudentTalents(id) {
  state.currentStudentId = id;
  navigateTo('talents');
  setTimeout(() => {
    const sel = document.getElementById('talent-student-select');
    sel.value = id;
    sel.dispatchEvent(new Event('change'));
  }, 150);
}

// =============================================
//  Утилиты
// =============================================

function v(id) {
  return document.getElementById(id)?.value || '';
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.classList.add('show'), 50);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2800);
}

function getShiftSvg(id) {
  return `<img src="img/mission${id}-banner.JPG" alt="Миссия ${id}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
}

function renderShiftsPage() {
  const grid = document.getElementById('shifts-grid');
  if (!grid) return;
  if (!state.shifts || !state.shifts.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🏕️</div><p>Нет данных о миссиях</p></div>';
    return;
  }
  grid.innerHTML = state.shifts.map(s => `
    <div class="shift-card card-enter" onclick="openShiftDetail(${s.id})" style="cursor:pointer">
      <div class="shift-card-header">
        <div class="shift-card-img">
          ${getShiftSvg(s.id)}
          <div class="shift-card-img-text">
            <div class="shift-card-num">Миссия ${s.id}</div>
            <div class="shift-card-title">${s.title}</div>
            <div class="shift-card-subtitle">${s.subtitle}</div>
          </div>
        </div>
      </div>
      <div class="shift-card-body">
        <div class="shift-card-section">
          <div class="shift-card-section-title">📖 Легенда</div>
          <p>${s.legend}</p>
        </div>
        <div class="shift-card-section">
          <div class="shift-card-section-title">🎯 Направления</div>
          <div class="shift-tags">
            ${s.tags.map(t => `<span class="shift-tag">${t}</span>`).join('')}
          </div>
        </div>
        <div class="shift-product">
          <strong>📦 Продуктовый инкубатор</strong>
          ${s.product}
        </div>
        <div style="margin-top:10px;padding:8px 12px;background:var(--glass-b);border-radius:8px;display:flex;align-items:center;gap:8px">
          <span style="font-size:0.72rem;color:var(--muted)">👥 Участников:</span>
          <span style="font-size:0.78rem;font-weight:700;color:var(--orange)">${state.students.filter(st => st.shift === s.id).length}</span>
          <button class="btn-sm" style="margin-left:auto;padding:4px 10px;font-size:0.65rem" onclick="openShiftDashboard(${s.id}, event)">📊 Дашборд</button>
        </div>
      </div>
    </div>
  `).join('');
}

// =============================================
//  ДАШБОРД СМЕНЫ
// =============================================

function openShiftDashboard(shiftId, evt) {
  if (evt) evt.stopPropagation();
  state.currentShiftId = shiftId;
  state.filterSdCampus = '';
  state.filterSdSquad = '';
  navigateTo('shift-dashboard');
  history.pushState({ page: 'shift-dashboard', shiftId }, '', '#shift-dashboard');
  setTimeout(() => renderShiftDashboard(), 100);
}

function setSdFilter(type, val) {
  if (type === 'campus') state.filterSdCampus = val;
  if (type === 'squad') state.filterSdSquad = val;
  renderShiftDashboard();
  const selector = type === 'campus' ? 'sd-campus' : 'sd-squad';
  document.querySelectorAll(`.filter-pill[data-filter="${selector}"]`).forEach(p => p.classList.remove('active'));
  document.querySelector(`.filter-pill[data-filter="${selector}"][data-val="${val}"]`)?.classList.add('active');
}

function renderShiftDashboard() {
  const shiftId = state.currentShiftId;
  const shift = state.shifts.find(s => s.id === shiftId);
  if (!shift) return;

  const sdTitle = ge('sd-title');
  const sdSubtitle = ge('sd-subtitle');
  if (sdTitle) sdTitle.textContent = '📊 ДАШБОРД МИССИИ ' + shiftId;
  if (sdSubtitle) sdSubtitle.textContent = shift.title + ' · ' + (shift.currency || '');

  // Filter participants
  let participants = state.students.filter(s => s.shift == shiftId);
  if (state.filterSdCampus) participants = participants.filter(s => s.campus === state.filterSdCampus);

  // Dynamic squad pills
  const allSquads = [...new Set(state.students.filter(s => s.shift == shiftId).map(s => s.squad))].sort((a,b) => a-b);
  const squadRow = document.querySelectorAll('.filter-pill[data-filter="sd-squad"]');
  const firstSquadPill = squadRow[0];
  if (firstSquadPill) {
    const parent = firstSquadPill.parentElement;
    parent.querySelectorAll('.filter-pill[data-filter="sd-squad"]:not(:first-child)').forEach(p => p.remove());
    allSquads.forEach(sq => {
      const pill = document.createElement('button');
      pill.className = 'filter-pill';
      pill.dataset.filter = 'sd-squad';
      pill.dataset.val = sq;
      pill.setAttribute('onclick', "setSdFilter('squad','" + sq + "')");
      pill.textContent = 'Отряд ' + sq;
      parent.appendChild(pill);
    });
    // Re-activate if needed
    if (state.filterSdSquad) {
      parent.querySelectorAll('.filter-pill[data-filter="sd-squad"]').forEach(p => p.classList.toggle('active', p.dataset.val == state.filterSdSquad));
    }
  }

  if (state.filterSdSquad) participants = participants.filter(s => s.squad == state.filterSdSquad);

  // Calculate stats
  let totalXp = 0, totalCurrency = 0, totalAllScored = 0, totalCounted = 0, totalCompletions = 0;
  const participantData = participants.map(s => {
    const obs = state.observations.filter(o => o.student_id === s.id);
    const comps = state.completions.filter(c => c.student_id == s.id && c.shift_id == shiftId);
    const bdgs = state.badges.filter(b => b.student_id === s.id && b.earned);
    let xp = 0, currency = 0, scoredCount = 0, scoreSum = 0;
    comps.forEach(c => {
      xp += c.xp || 0;
      currency += c.currency || 0;
      if (c.score > 0) { scoreSum += c.score; scoredCount++; }
      totalCompletions++;
    });
    totalXp += xp;
    totalCurrency += currency;
    const obsScore = obs.length ? (obs.reduce((sum, o) => sum + (o.independence + o.quality) / 2, 0) / obs.length) : 0;
    const avgScore = scoredCount > 0 ? (scoreSum / scoredCount) : obsScore;
    totalAllScored += scoreSum;
    totalCounted += scoredCount;

    // Top competency from completions
    const skillsAccum = {};
    comps.forEach(c => {
      if (c.skills) Object.entries(c.skills).forEach(([k,v]) => { skillsAccum[k] = (skillsAccum[k]||0) + v; });
    });
    const topSkill = Object.entries(skillsAccum).sort((a,b) => b[1] - a[1])[0];
    const topSkillComp = topSkill ? state.competencies.find(c => c.id === topSkill[0]) : null;

    return {
      student: s,
      xp, currency, avgScore: avgScore.toFixed(1),
      completionsCount: comps.length,
      badgesCount: bdgs.length,
      topSkill: topSkillComp ? topSkillComp.icon + ' ' + topSkillComp.name : '—'
    };
  }).sort((a, b) => b.xp - a.xp);

  // Render stats
  const avgAll = totalCounted > 0 ? (totalAllScored / totalCounted).toFixed(1) : '—';
  ge('sd-stats').innerHTML = `
    <div class="sd-stat"><div class="sd-stat-num">${participants.length}</div><div class="sd-stat-label">Участников</div></div>
    <div class="sd-stat"><div class="sd-stat-num">${totalCompletions}</div><div class="sd-stat-label">Оценок</div></div>
    <div class="sd-stat"><div class="sd-stat-num">${avgAll}</div><div class="sd-stat-label">Средний балл</div></div>
    <div class="sd-stat"><div class="sd-stat-num">${totalXp}</div><div class="sd-stat-label">Всего XP</div></div>
  `;

  // Render leaderboard
  const lbEl = ge('sd-leaderboard');
  if (lbEl) {
    if (!participantData.length) {
      lbEl.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>Нет участников для отображения</p></div>';
    } else {
      lbEl.innerHTML = participantData.map((pd, i) => {
        const rankClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
        const initials = (pd.student.first_name?.[0] || '') + (pd.student.last_name?.[0] || '');
        const progressPct = pd.completionsCount > 0 ? Math.min(100, Math.round((pd.completionsCount / (shift.directions ? shift.directions.reduce((s,d) => s + d.missions.length, 0) : 10)) * 100)) : 0;
        return `<div class="sd-lb-row card-enter" style="animation-delay:${i * 0.05}s">
          <div class="sd-lb-rank ${rankClass}">${i < 3 ? ['🥇','🥈','🥉'][i] : '#' + (i+1)}</div>
          <div class="sd-lb-avatar">${initials}</div>
          <div class="sd-lb-info">
            <div class="sd-lb-name">${pd.student.first_name} ${pd.student.last_name}</div>
            <div class="sd-lb-meta">отряд ${pd.student.squad} · ${pd.student.campus || ''} · ${pd.topSkill}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
              <div style="flex:1;height:3px;border-radius:2px;background:var(--glass-b);overflow:hidden"><div style="height:100%;border-radius:2px;background:linear-gradient(90deg,var(--orange),#d65a0f);width:${progressPct}%"></div></div>
              <span style="font-size:0.55rem;color:var(--muted)">${progressPct}%</span>
            </div>
          </div>
          <div class="sd-lb-stats">
            <span>${pd.completionsCount} зад.</span>
            <span>${pd.avgScore}★</span>
            <span class="sd-lb-xp">${pd.xp} XP</span>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Render squad distribution
  const squadsEl = ge('sd-squads');
  if (squadsEl) {
    const squadCounts = {};
    participantData.forEach(pd => {
      const sq = pd.student.squad;
      if (!squadCounts[sq]) squadCounts[sq] = { count: 0, totalXp: 0, totalScore: 0, scoreCount: 0 };
      squadCounts[sq].count++;
      squadCounts[sq].totalXp += pd.xp;
      squadCounts[sq].totalScore += parseFloat(pd.avgScore) * pd.completionsCount;
      squadCounts[sq].scoreCount += pd.completionsCount;
    });
    const maxCount = Math.max(...Object.values(squadCounts).map(s => s.count), 1);
    squadsEl.innerHTML = Object.entries(squadCounts).sort((a,b) => a[0] - b[0]).map(([sq, data]) => {
      const pct = Math.round((data.count / maxCount) * 100);
      const avgSq = data.scoreCount > 0 ? (data.totalScore / data.scoreCount).toFixed(1) : '—';
      return `<div class="sd-squad-bar">
        <div class="sd-squad-bar-label">Отряд ${sq}</div>
        <div class="sd-squad-bar-track"><div class="sd-squad-bar-fill" style="width:${pct}%"></div></div>
        <div class="sd-squad-bar-val">${data.count} чел. · ${avgSq}★ · ${data.totalXp} XP</div>
      </div>`;
    }).join('');
  }
}

function goBack() {
  history.back();
}

function openShiftDetail(shiftId) {
  const s = state.shifts.find(x => x.id === shiftId);
  if (!s) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector('.nav-item[data-page="shifts"]');
  if (navBtn) navBtn.classList.add('active');
  state.currentPage = 'shift-detail';
  history.pushState({ page: 'shift-detail', shiftId }, '', '#shift-detail');
  if (typeof syncBottomBar === 'function') syncBottomBar('shifts');

  let html = `<div class="page-wrap shift-detail">
    <button class="shift-detail-back" onclick="navigateTo('shifts')">← Назад к миссиям</button>
    <div class="shift-detail-header">
      <div class="shift-detail-num">Миссия ${s.id}</div>
      <div class="shift-detail-title">${s.title}</div>
      <div class="shift-detail-subtitle">${s.subtitle}</div>
      <div class="shift-detail-legend">${s.legend}</div>
    </div>
    <div class="shift-detail-info">
      <div class="shift-info-card">
        <div class="shift-info-card-title">🎮 Геймификация</div>
        <p>${s.gamification}</p>
      </div>
      <div class="shift-info-card">
        <div class="shift-info-card-title">🌍 Английская среда</div>
        <p>${s.english}</p>
      </div>
      <div class="shift-info-card">
        <div class="shift-info-card-title">⚽ Спорт</div>
        <p>${s.sport}</p>
      </div>
      <div class="shift-info-card">
        <div class="shift-info-card-title">🎯 Навыки и профессии</div>
        <p>${s.skills}</p>
      </div>
    </div>
    <h3 style="font-size:0.8rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">🗺️ Направления и задания</h3>
    <div class="shift-detail-sections">`;

  if (s.directions) {
    s.directions.forEach(d => {
      html += `<div class="shift-direction">
        <div class="shift-direction-header">
          <span class="shift-direction-icon">${d.icon}</span>
          <span class="shift-direction-name">${d.name}</span>
        </div>
        <div class="shift-direction-missions">
          ${d.missions.map(m => {
            const full = (state.missions || []).find(mi => mi.shift_id === s.id && mi.direction_name && mi.direction_name.toLowerCase() === d.name.toLowerCase() && mi.mission_name && mi.mission_name.toLowerCase() === m.name.toLowerCase());
            const desc = full ? full.description : m.desc;
            const steps = full ? full.key_steps : '';
            const age79 = full ? full.age_7_9 : '';
            const age1012 = full ? full.age_10_12 : '';
            const engPhrases = full ? full.english_phrases : '';
            const engVocab = full ? full.english_vocabulary : '';
            const materials = full ? full.materials : '';
            const c03 = full ? full.criteria_0_3 : '';
            const c46 = full ? full.criteria_4_6 : '';
            const c78 = full ? full.criteria_7_8 : '';
            const c910 = full ? full.criteria_9_10 : '';
            const uid = 'm_' + s.id + '_' + d.name.replace(/\W/g,'') + '_' + m.name.replace(/\W/g,'');
            return `<div class="shift-mission">
            <div class="shift-mission-dot"></div>
            <div class="shift-mission-info">
              <div class="shift-mission-name">${m.name}</div>
              <div class="shift-mission-desc">${desc}</div>
              ${full ? `<button class="shift-mission-toggle" onclick="document.getElementById('${uid}').classList.toggle('open');this.textContent=this.textContent==='Подробнее ▾'?'Скрыть ▴':'Подробнее ▾'">Подробнее ▾</button>
              <div class="shift-mission-full" id="${uid}">
                ${steps ? `<div class="mission-full-block"><strong>Ключевые шаги:</strong> ${steps}</div>` : ''}
                ${age79 || age1012 ? `<div class="mission-full-block"><strong>Возраст 7-9:</strong> ${age79}<br><strong>Возраст 10-12:</strong> ${age1012}</div>` : ''}
                ${engPhrases || engVocab ? `<div class="mission-full-block"><strong>Английский:</strong> ${engPhrases} ${engVocab ? '| Словарь: ' + engVocab : ''}</div>` : ''}
                ${materials ? `<div class="mission-full-block"><strong>Материалы:</strong> ${materials}</div>` : ''}
                ${c03 || c46 || c78 || c910 ? `<div class="mission-full-block"><strong>Критерии:</strong> 0-3: ${c03} | 4-6: ${c46} | 7-8: ${c78} | 9-10: ${c910}</div>` : ''}
              </div>` : ''}
            </div>
          </div>`;
          }).join('')}
        </div>
      </div>`;
    });
  }

  html += `</div>
    <div class="shift-detail-product">
      <div class="shift-detail-product-title">📦 Продуктовый инкубатор</div>
      <p>${s.product}</p>
    </div>
    <button class="btn-primary" style="margin-top:16px" onclick="openShiftDashboard(${s.id}, event)">📊 Дашборд миссии</button>
  </div>`;

  const mainEl = document.querySelector('.main');
  mainEl.innerHTML = html;
}

// =============================================
//  AI ANALYTICS (Local Rule-Based Engine)
// =============================================

const AI_EXTRA_CURRICULAR = {
  programming: {
    name: 'Программирование', icon: '💻',
    desc: 'Python, Scratch, Roblox Studio — логика и творчество через код',
    tags: ['problem_solving', 'creativity', 'learning_ability']
  },
  chess: {
    name: 'Шахматы', icon: '♟️',
    desc: 'Стратегическое мышление, концентрация, просчёт на несколько ходов',
    tags: ['critical_thinking', 'persistence', 'self_organization']
  },
  englishImmersion: {
    name: 'Английский клуб', icon: '🌍',
    desc: 'Разговорный клуб с носителями, проекты на английском',
    tags: ['communication', 'learning_ability', 'social_position']
  },
  robotics: {
    name: 'Робототехника', icon: '🤖',
    desc: ' LEGO, Arduino — механику и программированию через практику',
    tags: ['problem_solving', 'creativity', 'initiative']
  },
  publicSpeaking: {
    name: 'Ораторское мастерство', icon: '🎤',
    desc: 'Уверенная речь, презентации, дебаты — искусство убеждать',
    tags: ['communication', 'initiative', 'social_position']
  },
  creativeWriting: {
    name: 'Творческое письмо', icon: '✍️',
    desc: 'Сторителлинг, поэзия, сценарии — выражение через текст',
    tags: ['creativity', 'communication', 'curiosity']
  },
  mathClub: {
    name: 'Математический клуб', icon: '🔢',
    desc: 'Олимпиадные задачи, логика, быстрый счёт — математика как игра',
    tags: ['critical_thinking', 'learning_ability', 'problem_solving']
  },
  artDesign: {
    name: 'Арт-дизайн', icon: '🎨',
    desc: 'Графический дизайн, иллюстрация, цифровое искусство',
    tags: ['creativity', 'adaptability', 'self_organization']
  },
  scienceClub: {
    name: 'Научный кружок', icon: '🔬',
    desc: 'Эксперименты, исследования, проектная деятельность',
    tags: ['curiosity', 'learning_ability', 'problem_solving']
  },
  dramaTheater: {
    name: 'Театральная студия', icon: '🎭',
    desc: 'Актёрское мастерство, импровизация, работа с голосом',
    tags: ['communication', 'adaptability', 'creativity']
  }
};

const AI_LEARNING_STYLES = {
  kinesthetic: { name: 'Кинестетик', icon: '🤲', desc: 'Учится через прикосновения, движение и практику. Лучше всего — строить, собирать, трогать.' },
  visual: { name: 'Визуал', icon: '👁️', desc: 'Учится через образы, схемы и видео. Запоминает то, что видит.' },
  auditory: { name: 'Аудиал', icon: '👂', desc: 'Учится через слух и разговор. Лучше всего — обсуждать и слушать.' },
  reading: { name: 'Читатель', icon: '📖', desc: 'Учится через текст. Лучше всего — читать инструкции и писать заметки.' }
};

function analyzeStudentProfile(obs, badges, compScores) {
  const profile = {
    strengths: [],
    weaknesses: [],
    dominantTrack: null,
    learningStyle: null,
    engagementLevel: 'neutral',
    personalityTraits: [],
    recommendedExtracurricular: [],
    summary: ''
  };

  if (!obs.length) {
    profile.summary = 'Недостаточно данных для анализа. Добавьте наблюдения, чтобы получить персональные рекомендации.';
    return profile;
  }

  const sorted = Object.entries(compScores).sort((a, b) => b[1] - a[1]);
  const topSkills = sorted.slice(0, 4).filter(([_, v]) => v > 30);
  const lowSkills = sorted.slice(-3).filter(([_, v]) => v < 30);

  topSkills.forEach(([id]) => {
    const c = state.competencies.find(x => x.id === id);
    if (c) profile.strengths.push(c);
  });

  lowSkills.forEach(([id]) => {
    const c = state.competencies.find(x => x.id === id);
    if (c) profile.weaknesses.push(c);
  });

  profile.growthAreas = [...profile.weaknesses];

  const trackCounts = { bio: 0, eng: 0, media: 0, english: 0 };
  obs.forEach(o => { if (trackCounts[o.track] !== undefined) trackCounts[o.track]++; });
  const dominant = Object.entries(trackCounts).sort((a, b) => b[1] - a[1])[0];
  profile.dominantTrack = dominant[0];

  const avgScore = obs.reduce((s, o) => s + (o.independence + o.quality) / 2, 0) / obs.length;
  const initiativeRate = obs.filter(o => o.initiative).length / obs.length;
  const totalObs = obs.length;
  profile.engagementLevel = avgScore >= 4 && initiativeRate > 0.3 ? 'high' : avgScore >= 3 ? 'moderate' : 'low';

  if (compScores['creativity'] > 50 && compScores['communication'] > 50) {
    profile.personalityTraits.push('креативный коммуникатор', 'визуально ориентированный');
    profile.learningStyle = AI_LEARNING_STYLES.visual;
  } else if (compScores['problem_solving'] > 50 && compScores['critical_thinking'] > 50) {
    profile.personalityTraits.push('аналитик', 'системный мыслитель');
    profile.learningStyle = AI_LEARNING_STYLES.reading;
  } else if (compScores['initiative'] > 50 && compScores['persistence'] > 50) {
    profile.personalityTraits.push('лидер', 'инициативный');
    profile.learningStyle = AI_LEARNING_STYLES.kinesthetic;
  } else if (compScores['communication'] > 50 && compScores['cooperation'] > 50) {
    profile.personalityTraits.push('командный игрок', 'социально активный');
    profile.learningStyle = AI_LEARNING_STYLES.auditory;
  } else {
    profile.personalityTraits.push('разносторонний', 'всесторонне любознательный');
    profile.learningStyle = AI_LEARNING_STYLES.visual;
  }

  const studentTags = profile.strengths.map(s => s.id);
  const extraRecommended = Object.entries(AI_EXTRA_CURRICULAR)
    .map(([id, ec]) => {
      let match = 0;
      ec.tags.forEach(tag => { if (studentTags.includes(tag)) match++; });
      return { ...ec, id, match };
    })
    .filter(ec => ec.match >= 1)
    .sort((a, b) => b.match - a.match)
    .slice(0, 4);

  profile.recommendedExtracurricular = extraRecommended;

  const engagementText = {
    high: 'Показывает отличную вовлечённость и часто проявляет инициативу. Рекомендуем расширять зону ответственности.',
    moderate: 'Вовлечён на среднем уровне. Мотивируйте через индивидуальные достижения и признание.',
    low: 'Показывает низкую вовлечённость. Рекомендуем поддержку и более частую обратную связь.'
  };

  const trackNames = { bio: 'Биотехнологии', eng: 'Инженерии', media: 'Медиа', english: 'Английских каникул' };
  const trackIcons = { bio: '🧬', eng: '⚙️', media: '🎥', english: '🌍' };
  const trackDesc = {
    bio: 'Этот профиль показывает склонность к работе с природой, растениями и биологическими системами.',
    eng: 'Этот профиль показывает склонность к конструированию, электронике и программированию.',
    media: 'Этот профиль показывает склонность к творчеству, съёмке и работе с аудиторией.',
    english: 'Этот профиль показывает склонность к языкам, сторителлингу и публичным выступлениям.'
  };

  profile.summary = `За ${obs.length} ${obs.length === 1 ? 'мероприятие' : obs.length < 5 ? 'мероприятия' : 'мероприятий'} участник показал средний балл ${avgScore.toFixed(1)}/5. Доминирующее направление — ${trackNames[dominant[0]]} (${trackIcons[dominant[0]]}). ${trackDesc[dominant[0]]} Сильные стороны: ${profile.strengths.slice(0, 3).map(s => s.name).join(', ') || 'требуется анализ'}. ${engagementText[profile.engagementLevel]}`;

  return profile;
}

function renderAIInsights(studentId) {
  const container = document.getElementById('ai-insights-section');
  if (!container) return;

  const obs = state.observations.filter(o => o.student_id === studentId);
  const badges = state.badges.filter(b => b.student_id === studentId && b.earned);
  const compScores = calcCompetencies(obs, studentId);
  const profile = analyzeStudentProfile(obs, badges, compScores);

  const trackNames = { bio: 'Биотехнологии', eng: 'Инженерия', media: 'Медиа', english: 'Английские каникулы' };
  const trackIcons = { bio: '🧬', eng: '⚙️', media: '🎥', english: '🌍' };
  const engagementColors = { high: '#22C55E', moderate: '#FBBF24', low: '#EF4444' };
  const engagementLabels = { high: 'Высокая', moderate: 'Средняя', low: 'Низкая' };
  const engagementIcons = { high: '🔥', moderate: '⚡', low: '📉' };
  const growthLabels = { high: 'Низкая', moderate: 'Средняя', low: 'Высокая' };
  const growthIcons = { high: '💚', moderate: '💛', low: '🔴' };

  if (!obs.length) {
    container.innerHTML = `<div style="padding:12px;background:var(--glass-b);border-radius:10px;text-align:center">
      <p style="font-size:0.75rem;color:var(--muted)">🤖 Добавьте наблюдения для AI-анализа</p>
    </div>`;
    return;
  }

  const avgScore = obs.length ? (obs.reduce((s, o) => s + (o.independence + o.quality) / 2, 0) / obs.length).toFixed(1) : '0';

  container.innerHTML = `
    <div style="background:linear-gradient(135deg,var(--orange-dim),rgba(232,168,56,0.05));border:1px solid var(--border-h);border-radius:10px;padding:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">
        <span style="font-size:1.6rem">${trackIcons[profile.dominantTrack]}</span>
        <div>
          <strong style="font-size:0.9rem">Доминирующий трек: ${trackNames[profile.dominantTrack]}</strong>
          <p style="font-size:0.7rem;color:var(--muted);margin:2px 0 0">${profile.learningStyle?.icon} ${profile.learningStyle?.name}</p>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:0.65rem;color:var(--muted)">Вовлечённость</div>
          <div style="font-size:0.8rem;font-weight:700;color:${engagementColors[profile.engagementLevel]}">${engagementIcons[profile.engagementLevel]} ${engagementLabels[profile.engagementLevel]}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div>
          <div style="font-size:0.7rem;color:var(--muted);margin-bottom:8px">🎯 Сильные стороны</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${profile.strengths.slice(0, 4).map(s => `
              <div style="display:flex;align-items:center;gap:6px;font-size:0.7rem">
                <span>${s.icon || '⭐'}</span>
                <span>${s.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:0.7rem;color:var(--muted);margin-bottom:8px">📈 Зоны роста</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${profile.growthAreas.slice(0, 3).map(g => `
              <div style="display:flex;align-items:center;gap:6px;font-size:0.7rem">
                <span>${g.icon || '📌'}</span>
                <span>${g.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div style="margin-bottom:14px;padding:10px;background:var(--glass-b);border-radius:8px">
        <div style="font-size:0.7rem;color:var(--muted);margin-bottom:8px">🎯 Стиль обучения</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:1.2rem">${profile.learningStyle?.icon || '🎓'}</span>
          <div>
            <strong style="font-size:0.75rem">${profile.learningStyle?.name || 'Аналитик'}</strong>
            <p style="font-size:0.65rem;color:var(--muted);margin:2px 0 0">${profile.learningStyle?.desc || 'Учится через анализ и логику.'}</p>
          </div>
        </div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:0.7rem;color:var(--muted);margin-bottom:10px">📚 Рекомендуемые занятия</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${profile.recommendedExtracurricular.slice(0, 10).map(ec => `
            <div style="display:flex;align-items:flex-start;gap:8px;padding:8px;background:var(--glass-b);border-radius:8px">
              <span style="font-size:1.1rem">${ec.icon}</span>
              <div>
                <strong style="font-size:0.7rem">${ec.name}</strong>
                <p style="font-size:0.6rem;color:var(--muted);margin:2px 0 0">${ec.desc}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="padding:12px;background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(168,85,247,0.05));border:1px solid var(--border);border-radius:8px">
        <div style="font-size:0.7rem;color:var(--accent);margin-bottom:6px">🧠 AI Заключение</div>
        <p style="font-size:0.7rem;line-height:1.5;color:var(--white);margin:0">За ${obs.length} ${obs.length === 1 ? 'мероприятие' : obs.length < 5 ? 'мероприятия' : 'мероприятий'} участник показал средний балл ${avgScore}/5. Доминирующее направление — ${trackNames[profile.dominantTrack]} (${trackIcons[profile.dominantTrack]}). ${profile.learningStyle?.desc || ''} Сильные стороны: ${profile.strengths.slice(0, 3).map(s => s.name).join(', ') || 'требуется анализ'}. ${engagementLabels[profile.engagementLevel]} вовлечённость.</p>
      </div>
    </div>`;
}

// =============================================
//  ИГРОВОЙ РЕПОРТ УЧАСТНИКА (печать / PDF)
// =============================================

const REPORT_LEVELS = [
  { min:0,   num:1, name:'Новичок',       icon:'🌱' },
  { min:50,  num:2, name:'Разведчик',     icon:'🧭' },
  { min:120, num:3, name:'Исследователь', icon:'🔭' },
  { min:220, num:4, name:'Мастер',        icon:'⚔️' },
  { min:340, num:5, name:'Легенда',       icon:'👑' }
];

function getStudentLevel(obs, badges) {
  const earned = badges.filter(b => b.earned);
  const avg = obs.length ? obs.reduce((s, o) => s + (o.independence + o.quality) / 2, 0) / obs.length : 0;
  const xp = Math.round(obs.length * avg + earned.length * 9);
  const lvl = [...REPORT_LEVELS].reverse().find(l => xp >= l.min) || REPORT_LEVELS[0];
  return { ...lvl, xp, progress: obs.length ? Math.round(obs.length / 40 * 100) : 0 };
}

function fillReport(student) {
  if (!student) return;

  const obs = state.observations.filter(o => o.student_id === student.id);
  const earned = state.badges.filter(b => b.student_id === student.id && b.earned);
  const completions = state.completions.filter(c => c.student_id == student.id);
  const compScores = calcCompetencies(obs, student.id);
  
  // Enrich competencies with completion data
  const completionSkills = {};
  let totalXp = 0, totalCurrency = 0, currencyName = '';
  const shiftProfessions = new Set();
  const shiftFutureSkills = new Set();
  completions.forEach(c => {
    totalXp += c.xp || 0;
    totalCurrency += c.currency || 0;
    if (c.currency_name) currencyName = c.currency_name;
    if (c.skills) Object.entries(c.skills).forEach(([k,v]) => { completionSkills[k] = (completionSkills[k]||0) + v; });
    (c.professions || []).forEach(p => shiftProfessions.add(p));
    (c.future_skills || []).forEach(f => shiftFutureSkills.add(f));
  });
  
  // Merge completion skills into comp scores (0-100 scale)
  Object.entries(completionSkills).forEach(([k,v]) => {
    const boosted = Math.min(100, (compScores[k] || 0) + v);
    compScores[k] = boosted;
  });

  const profile = analyzeStudentProfile(obs, earned, compScores);
  const level = getStudentLevel(obs, state.badges.filter(b => b.student_id === student.id));
  const avg = obs.length ? (obs.reduce((s, o) => s + (o.independence + o.quality) / 2, 0) / obs.length).toFixed(1) : '—';

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  set('rp-avatar', (student.first_name?.[0] || '') + (student.last_name?.[0] || ''));
  set('rp-name', student.first_name + ' ' + student.last_name);
  set('rp-age', student.age != null ? student.age + ' лет' : '—');
  set('rp-grade', student.grade != null ? student.grade + ' класс' : '—');
  set('rp-squad', 'Отряд ' + student.squad);
  const shiftDef = state.shifts.find(sh => sh.id == student.shift);
  set('rp-shift', shiftDef ? shiftDef.name : 'Миссия ' + student.shift);
  const rpCampusEl = document.getElementById('rp-campus');
  if (rpCampusEl) rpCampusEl.textContent = student.campus || '';
  set('rp-progress', level.progress + '%');
  set('rp-progress-label', level.progress + '%');
  set('rp-level', level.num);
  set('rp-level-icon', level.icon);
  set('rp-level-name', level.name);
  set('rp-stat-tasks', obs.length + completions.length);
  set('rp-stat-badges', earned.length);
  set('rp-stat-score', avg);
  set('rp-stat-xp', totalXp);
  set('rp-stat-currency', totalCurrency > 0 ? totalCurrency + ' ' + (currencyName || '') : '—');

  const engMeta = {
    high:     { i:'🔥', t:'Высокая' },
    moderate: { i:'⚡', t:'Средняя' },
    low:      { i:'📉', t:'Низкая' },
    neutral:  { i:'⚪', t:'—' }
  };
  const engM = engMeta[profile.engagementLevel] || engMeta.neutral;
  set('rp-stat-eng-icon', engM.i);
  set('rp-stat-eng', engM.t);

  set('rp-summary', profile.summary || 'Недостаточно данных для анализа. Добавьте наблюдения, чтобы получить персональный профиль.');

  drawRadar(ge('rp-radar'), compScores, {
    grid: 'rgba(19,34,69,0.12)',
    axis: 'rgba(19,34,69,0.18)',
    label: 'rgba(19,34,69,0.55)',
    font: '600 11px Space Grotesk, sans-serif',
    fillGrad: ['rgba(232,168,56,0.32)', 'rgba(232,168,56,0.05)'],
    stroke: '#E8A838',
    point: '#E8A838'
  });

  const barsEl = ge('rp-comp-bars');
  if (barsEl) {
    barsEl.innerHTML = state.competencies.map(c => {
      const v = compScores[c.id] || 0;
      return `<div class="rp-comp">
        <span class="rp-comp-ico">${c.icon}</span>
        <span class="rp-comp-name">${c.name}</span>
        <div class="rp-comp-track"><div class="rp-comp-fill" style="width:${v}%;background:linear-gradient(90deg,${c.color}99,${c.color})"></div></div>
        <span class="rp-comp-val">${v}%</span>
      </div>`;
    }).join('');
  }

  const discEl = ge('rp-disc');
  if (discEl) {
    const disc = calcDisc(obs, student.id);
    const letterColors = { D:'#EF4444', I:'#FBBF24', S:'#22C55E', C:'#3B82F6' };
    const letterText  = { D:'#fff', I:'#7c5c00', S:'#fff', C:'#fff' };
    discEl.innerHTML = ['D','I','S','C'].map(t => `
      <div class="rp-disc-row">
        <span class="rp-disc-letter" style="background:${letterColors[t]};color:${letterText[t]}">${t}</span>
        <div class="rp-disc-mid">
          <div class="rp-disc-name">${disc.labels[t].label}</div>
          <div class="rp-disc-track"><div class="rp-disc-fill" style="width:${disc.disc[t]}%;background:linear-gradient(90deg,${letterColors[t]}88,${letterColors[t]})"></div></div>
        </div>
        <span class="rp-disc-pct">${disc.disc[t]}%</span>
      </div>`).join('') +
      `<div class="rp-disc-combo">Доминирует тип <strong style="color:${letterColors[disc.dominant[0]]}">${disc.dominant[0]}</strong> — ${disc.labels[disc.dominant[0]].label}. ${disc.labels[disc.dominant[0]].desc}</div>`;
  }

  const scored = getScoredProfessions(obs, earned, compScores);
  // Add shift-specific professions from completions
  const allProfessions = [...scored];
  shiftProfessions.forEach(pName => {
    if (!allProfessions.find(p => p.name === pName)) {
      allProfessions.push({ name: pName, icon: '💼', score: 60, desc: 'Профессия из тематики миссии' });
    }
  });
  const careerEl = ge('rp-careers');
  if (careerEl) {
    careerEl.innerHTML = allProfessions.slice(0, 5).map(p => `
      <div class="rp-career">
        <div class="rp-career-top">
          <span class="rp-career-ico">${p.icon}</span>
          <span class="rp-career-name">${p.name}</span>
          <span class="rp-career-pct">${p.score}%</span>
        </div>
        <div class="rp-career-desc">${p.desc}</div>
      </div>`).join('') || '<div class="empty-note">Нет данных для анализа</div>';
  }

  // Future Skills section
  const extraEl = ge('rp-extra');
  if (extraEl) {
    const extraItems = [];
    // Add shift future skills
    shiftFutureSkills.forEach(f => {
      extraItems.push({ icon: '🔮', name: f, desc: 'Навык из тематики миссии' });
    });
    // Add recommended extracurricular
    (profile.recommendedExtracurricular || []).forEach(e => {
      extraItems.push(e);
    });
    extraEl.innerHTML = extraItems.slice(0, 6).map(e => `
      <div class="rp-extra-item">
        <span class="rp-extra-ico">${e.icon}</span>
        <div>
          <div class="rp-extra-name">${e.name}</div>
          <div class="rp-extra-desc">${e.desc}</div>
        </div>
      </div>`).join('') || '<div class="empty-note">Недостаточно данных</div>';
  }

  const badgesEl = ge('rp-badges');
  if (badgesEl) {
    const earnedIds = new Set(earned.map(b => b.badge_id));
    badgesEl.innerHTML = state.badgeDefs.map(def => {
      const is = earnedIds.has(def.id);
      return `<div class="rp-badge ${is ? 'earned' : 'locked'} rarity-${def.rarity}">
        <span class="rp-badge-ico">${is ? def.icon : '🔒'}</span>
        <span class="rp-badge-name">${def.name}</span>
        <span class="rp-badge-rarity">${is ? rarityLabel(def.rarity) : 'закрыт'}</span>
      </div>`;
    }).join('');
  }

  const tbody = ge('rp-obs')?.querySelector('tbody');
  if (tbody) {
    const trackIcons  = { bio:'🧬', eng:'⚙️', media:'🎥', english:'🌍' };
    const trackNames  = { bio:'Био', eng:'Инж', media:'Медиа', english:'English' };
    tbody.innerHTML = obs.slice().sort((a, b) => b.day - a.day).map(o => {
      return `<tr>
        <td>День ${o.day}</td>
        <td>${trackIcons[o.track] || ''} ${trackNames[o.track] || o.track}</td>
        <td>—</td>
        <td>${o.independence}/5</td>
        <td>${o.quality}/5</td>
        <td class="${o.initiative ? 'ok' : 'no'}">${o.initiative ? '🚀 да' : '—'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--rp-muted)">Наблюдений пока нет</td></tr>';
  }

  const compSection = ge('rp-completions-section');
  const compEl = ge('rp-completions');
  if (compSection && compEl && completions.length > 0) {
    compSection.style.display = '';
    const byShift = {};
    completions.forEach(c => {
      if (!byShift[c.shift_id]) byShift[c.shift_id] = [];
      byShift[c.shift_id].push(c);
    });
    let compHtml = '';
    Object.entries(byShift).sort((a,b) => a[0]-b[0]).forEach(([sId, comps]) => {
      const sh = state.shifts.find(x => x.id == sId);
      const sXp = comps.reduce((s,c) => s + (c.xp||0), 0);
      const sScore = comps.filter(c => c.score > 0);
      const sAvg = sScore.length ? (sScore.reduce((s,c) => s + c.score, 0) / sScore.length).toFixed(1) : '—';
      compHtml += '<div style="margin-bottom:12px;padding:12px;border-radius:10px;background:rgba(232,168,56,0.04);border:1px solid rgba(232,168,56,0.12)">';
      compHtml += '<div style="font-size:.72rem;font-weight:700;color:#E8A838;margin-bottom:8px">Миссия ' + sId + (sh ? ' — ' + sh.title : '') + ' · ' + sAvg + '★ · ' + sXp + ' XP</div>';
      comps.filter(c => c.score > 0).forEach(c => {
        const sc = c.score >= 7 ? 'high' : c.score >= 4 ? 'mid' : 'low';
        compHtml += '<div class="rp-comp-row">';
        compHtml += '<span class="rp-comp-score ' + sc + '">' + c.score + '</span>';
        compHtml += '<span class="rp-comp-name">' + (c.direction_name || '') + ' — ' + (c.mission_name || '') + '</span>';
        compHtml += '<span class="rp-comp-xp">' + (c.xp||0) + ' XP</span>';
        compHtml += '</div>';
      });
      compHtml += '</div>';
    });
    compEl.innerHTML = compHtml;
  } else if (compSection) {
    compSection.style.display = 'none';
  }

  set('rp-date', 'Сформировано: ' + new Date().toLocaleDateString('ru-RU') + ' · ' + new Date().toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' }));

  const reportEl = ge('report');
  if (reportEl) reportEl.classList.add('ready');
}

function printStudentReport(studentId) {
  const id = studentId || state.currentStudentId;
  const student = state.students.find(s => s.id === id);
  if (!student) { showToast('⚠️ Сначала выберите участника', 'warn'); return; }
  state.currentStudentId = id;
  fillReport(student);
  openReportPreview();
}

function openReportPreview() {
  const overlay = ge('report-overlay');
  if (overlay) {
    overlay.classList.add('open');
    overlay.scrollTop = 0;
  }
}

function closeReport() {
  const overlay = ge('report-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.classList.remove('report-mode');
}

function printReportNow() {
  document.body.classList.add('report-mode');
  setTimeout(() => window.print(), 350);
}

window.addEventListener('afterprint', () => {
  document.body.classList.remove('report-mode');
});

// =============================================
//  Страница 6: Оценка заданий
// =============================================

function populateAssShiftSelect() {
  const sel = ge('ass-shift');
  if (!sel || typeof state.shifts === 'undefined') return;
  state.shifts.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name || 'Смена ' + s.id;
    sel.appendChild(opt);
  });
}

function onAssCampusChange() {
  const campus = ge('ass-campus').value;
  const shiftSel = ge('ass-shift');
  const squadSel = ge('ass-squad');
  const studentSel = ge('ass-student');
  // Reset downstream
  squadSel.innerHTML = '<option value="">Выбрать отряд...</option>';
  studentSel.innerHTML = '<option value="">Выбрать участника...</option>';
  ge('ass-missions-area').innerHTML = '';
  ge('ass-summary-area').innerHTML = '';
}

function onAssShiftChange() {
  const shiftId = parseInt(ge('ass-shift').value);
  const campus = ge('ass-campus').value;
  const squadSel = ge('ass-squad');
  const studentSel = ge('ass-student');
  squadSel.innerHTML = '<option value="">Выбрать отряд...</option>';
  studentSel.innerHTML = '<option value="">Выбрать участника...</option>';
  ge('ass-missions-area').innerHTML = '';
  ge('ass-summary-area').innerHTML = '';
  if (!shiftId) return;
  let filtered = state.students.filter(s => s.shift === shiftId);
  if (campus) filtered = filtered.filter(s => s.campus === campus);
  const squads = [...new Set(filtered.map(s => s.squad))].sort((a,b) => a-b);
  squads.forEach(sq => {
    const opt = document.createElement('option');
    opt.value = sq;
    opt.textContent = 'Отряд ' + sq;
    squadSel.appendChild(opt);
  });
}

function onAssSquadChange() {
  const shiftId = parseInt(ge('ass-shift').value);
  const squad = parseInt(ge('ass-squad').value);
  const campus = ge('ass-campus').value;
  const studentSel = ge('ass-student');
  studentSel.innerHTML = '<option value="">Выбрать участника...</option>';
  ge('ass-missions-area').innerHTML = '';
  ge('ass-summary-area').innerHTML = '';
  if (!shiftId || !squad) return;
  let list = state.students.filter(s => s.shift === shiftId && s.squad === squad);
  if (campus) list = list.filter(s => s.campus === campus);
  list.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.first_name + ' ' + s.last_name;
    studentSel.appendChild(opt);
  });
}

function onAssStudentChange() {
  const shiftId = parseInt(ge('ass-shift').value);
  const studentId = ge('ass-student').value;
  const area = ge('ass-missions-area');
  const summaryArea = ge('ass-summary-area');
  area.innerHTML = '';
  summaryArea.innerHTML = '';
  if (!shiftId || !studentId) return;

  const shift = state.shifts.find(s => s.id === shiftId);
  if (!shift) return;

  // Load existing completions for this student+shift
  const existing = state.completions.filter(c => c.student_id == studentId && c.shift_id === shiftId);
  
  let html = '';
  shift.directions.forEach((dir, di) => {
    html += `<div class="assess-direction" id="ass-dir-${di}">
      <div class="assess-direction-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="dir-icon">${dir.icon}</span>
        <h3>${dir.name}</h3>
        <span class="dir-arrow">▶</span>
      </div>
      <div class="assess-missions-list">`;
    dir.missions.forEach((mis, mi) => {
      const existingMis = existing.find(c => c.direction_idx === di && c.mission_idx === mi);
      const score = existingMis ? existingMis.score : '';
      const skillTags = (mis.skills || []).map(sk => {
        const comp = state.competencies.find(c => c.id === sk);
        return comp ? `<span class="assess-mission-skill">${comp.icon} ${comp.name}</span>` : '';
      }).join('');
      html += `<div class="assess-mission">
        <div class="assess-mission-info">
          <div class="assess-mission-name">${mis.name}</div>
          <div class="assess-mission-desc">${mis.desc}</div>
          <div class="assess-mission-skills">${skillTags}</div>
        </div>
        <div class="assess-score-wrap">
          <input type="number" class="assess-score-input" min="0" max="10" value="${score}" 
            data-dir="${di}" data-mi="${mi}" onchange="onAssScoreChange(this)">
          <div class="assess-reward">
            <div class="assess-reward-val" id="ass-reward-${di}-${mi}">${score ? calcXp(score) + ' XP' : '—'}</div>
            <div>${score ? Math.round(score * 10) + ' ' + (shift.currency || '').substring(0,4) : ''}</div>
          </div>
        </div>
      </div>`;
    });
    html += `</div></div>`;
  });
  html += `<button class="btn-primary assess-save-btn" onclick="saveAssessments()">💾 Сохранить оценки</button>`;
  area.innerHTML = html;
}

function calcXp(score) {
  return Math.round(score * score * 2);
}

function calcCurrency(score, shift) {
  return Math.round(score * 10);
}

function onAssScoreChange(input) {
  const score = parseInt(input.value) || 0;
  const di = input.dataset.dir;
  const mi = input.dataset.mi;
  const rewardEl = ge('ass-reward-' + di + '-' + mi);
  if (rewardEl) {
    if (score > 0) {
      rewardEl.textContent = calcXp(score) + ' XP';
    } else {
      rewardEl.textContent = '—';
    }
  }
}

async function saveAssessments() {
  const shiftId = parseInt(ge('ass-shift').value);
  const studentId = ge('ass-student').value;
  if (!shiftId || !studentId) return showToast('⚠️ Выберите участника', 'warn');

  const shift = state.shifts.find(s => s.id === shiftId);
  if (!shift) return;

  const inputs = document.querySelectorAll('.assess-score-input');
  const completions = [];
  
  inputs.forEach(input => {
    const score = parseInt(input.value) || 0;
    if (score < 0 || score > 10) return;
    const di = parseInt(input.dataset.dir);
    const mi = parseInt(input.dataset.mi);
    const mis = shift.directions[di].missions[mi];
    
    const skillsImpact = {};
    (mis.skills || []).forEach(sk => {
      skillsImpact[sk] = Math.round(score * 1.5);
    });

    completions.push({
      student_id: studentId,
      shift_id: shiftId,
      direction_idx: di,
      direction_name: shift.directions[di].name,
      mission_idx: mi,
      mission_name: mis.name,
      score: score,
      xp: calcXp(score),
      currency: calcCurrency(score, shift),
      currency_name: shift.currency,
      skills: skillsImpact,
      professions: mis.professions || [],
      future_skills: mis.futureSkills || [],
      completed_at: new Date().toISOString()
    });
  });

  try {
    const oldIds = state.completions
      .filter(c => c.student_id == studentId && c.shift_id === shiftId)
      .map(c => c.id);

    state.completions = state.completions.filter(c => !(c.student_id == studentId && c.shift_id === shiftId));

    for (const comp of completions) {
      const result = await api.insert(TABLES.COMPLETIONS, comp);
      if (result && result[0]) {
        state.completions.push(result[0]);
      } else {
        console.warn('Failed to save completion:', comp.mission_name);
      }
    }

    for (const oldId of oldIds) {
      await api.remove(TABLES.COMPLETIONS, oldId);
    }

    renderAssessSummary();
    showToast('✓ Оценки сохранены!');
  } catch(e) {
    console.error('Save error:', e);
    showToast('⚠️ Ошибка сохранения', 'warn');
  }
}

function renderAssessSummary() {
  const studentId = ge('ass-student').value;
  const shiftId = parseInt(ge('ass-shift').value);
  const summaryArea = ge('ass-summary-area');
  if (!studentId || !shiftId) { summaryArea.innerHTML = ''; return; }

  const shift = state.shifts.find(s => s.id === shiftId);
  const completions = state.completions.filter(c => c.student_id == studentId && c.shift_id === shiftId);
  
  let totalXp = 0, totalCurrency = 0, totalScore = 0, count = 0;
  const skillsAccum = {};
  const profsSet = new Set();
  const futureSet = new Set();

  completions.forEach(c => {
    totalXp += c.xp || 0;
    totalCurrency += c.currency || 0;
    if (c.score > 0) { totalScore += c.score; count++; }
    if (c.skills) Object.entries(c.skills).forEach(([k,v]) => { skillsAccum[k] = (skillsAccum[k]||0) + v; });
    (c.professions || []).forEach(p => profsSet.add(p));
    (c.future_skills || []).forEach(f => futureSet.add(f));
  });

  const avgScore = count > 0 ? (totalScore / count).toFixed(1) : '—';

  let html = '<div class="assess-summary-card">';
  html += '<div class="assess-summary-title">📊 Результаты оценки — ' + shift.title + '</div>';
  
  html += '<div class="assess-summary-stats">';
  html += '<div class="assess-summary-stat"><div class="assess-summary-stat-num">' + avgScore + '</div><div class="assess-summary-stat-label">Средний балл</div></div>';
  html += '<div class="assess-summary-stat"><div class="assess-summary-stat-num">' + totalXp + '</div><div class="assess-summary-stat-label">Опыт (XP)</div></div>';
  html += '<div class="assess-summary-stat"><div class="assess-summary-stat-num">' + totalCurrency + '</div><div class="assess-summary-stat-label">' + (shift.currency || 'Валюта') + '</div></div>';
  html += '<div class="assess-summary-stat"><div class="assess-summary-stat-num">' + count + '</div><div class="assess-summary-stat-label">Оценено заданий</div></div>';
  html += '</div>';

  if (completions.length > 0) {
    html += '<div class="assess-summary-section">';
    html += '<div class="assess-summary-section-title">📋 Оцененные задания</div>';
    completions.filter(c => c.score > 0).forEach(c => {
      var scoreClass = c.score >= 7 ? 'high' : c.score >= 4 ? 'mid' : 'low';
      html += '<div class="assess-summary-mission">' +
        '<span class="assess-summary-mission-score ' + scoreClass + '">' + c.score + '</span>' +
        '<span class="assess-summary-mission-name">' + c.direction_name + ' — ' + c.mission_name + '</span>' +
        '<span class="assess-summary-mission-xp">' + c.xp + ' XP · ' + c.currency + ' ' + (shift.currency || '') + '</span>' +
      '</div>';
    });
    html += '</div>';
  }

  if (Object.keys(skillsAccum).length > 0) {
    html += '<div class="assess-summary-section">';
    html += '<div class="assess-summary-section-title">🧠 Развитые навыки</div>';
    html += '<div class="assess-summary-tags">';
    Object.entries(skillsAccum).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => {
      var comp = state.competencies.find(c => c.id === k);
      if (comp) html += '<span class="assess-summary-tag skill">' + comp.icon + ' ' + comp.name + ' +' + v + '</span>';
    });
    html += '</div></div>';
  }
  if (profsSet.size > 0) {
    html += '<div class="assess-summary-section">';
    html += '<div class="assess-summary-section-title">💼 Профессии будущего</div>';
    html += '<div class="assess-summary-tags">';
    profsSet.forEach(p => { html += '<span class="assess-summary-tag prof">💼 ' + p + '</span>'; });
    html += '</div></div>';
  }
  if (futureSet.size > 0) {
    html += '<div class="assess-summary-section">';
    html += '<div class="assess-summary-section-title">🔮 Навыки будущего</div>';
    html += '<div class="assess-summary-tags">';
    futureSet.forEach(f => { html += '<span class="assess-summary-tag future">🔮 ' + f + '</span>'; });
    html += '</div></div>';
  }

  html += '</div>';
  summaryArea.innerHTML = html;
}
