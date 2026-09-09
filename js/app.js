// =============================================
//  Каникулы с ONE! — Летние каникулы 2026
// =============================================

// -- Состояние приложения ----------------------
let state = {
  students: [],
  participations: [],  // старое имя: participation rows (student_id, shift_id, squad)
  observations: [],
  badges: [],
  completions: [],
  shifts: [],
  competencies: [],
  badgeDefs: [],
  inventoryItems: [],  // content_inventory_items (fallback to SHIFT_INVENTORY)
  cards: [],          // cards (84 карточки коллекции) from cards table
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
  radarChart: null,
  // CD8: Streak
  streaks: {},         // { studentId: { count, lastDate } }
  // CD4/CD6: Economy
  coins: {},           // { studentId: number }
  // CD3/CD4: Avatar
  avatars: {},         // { studentId: { color, icon, title, frame } }
  // CD1: Legacy
  relics: {},          // { studentId: [relicId, ...] }
  // CD2: Boss
  bossDefeated: {},    // { studentId: { week1: true, ... } }
  // CD5: Social
  recentActivity: [],  // last N completions across all students
  // CD7: Mystery
  mysteryCount: {},    // { studentId: number } completions since last box
  // CD6: Limited badges
  limitedEarned: {}    // { studentId: [badgeId, ...] }
};

let tempRatings = { independence: 0, quality: 0 };

// -- Safe element helper ------------------------
function ge(id) {
  return document.getElementById(id);
}

// ── Role-scoped student list ──
// Admins see all students; a player sees only their own linked student.
function visibleStudents() {
  if (typeof authIsAdmin === 'function' && authIsAdmin()) return state.students;
  const session = localStorage.getItem('kanikuly_access_token');
  if (!session) return state.students;
  const uid = window._authCache && window._authCache.user ? window._authCache.user.id : null;
  if (uid) {
    const mine = state.students.filter(s => String(s.user_id) === String(uid));
    if (mine.length) return mine;
  }
  return state.students;
}

// ── Участие в миссиях (participations) ──
// Одна строка = студент в миссии X, команда N (1..10).
// Студент может участвовать в нескольких миссиях; в каждой — команда своя.

// Команда студента в конкретной миссии (или null)
function studentSquadIn(studentId, shiftId) {
  const p = (state.participations || []).find(r => String(r.student_id) === String(studentId) && String(r.shift_id) === String(shiftId));
  return p ? p.squad : null;
}
// Студенты, участвующие в миссии (с позицией их команды)
function shiftParticipants(shiftId) {
  const parts = {};
  (state.participations || []).forEach(r => {
    if (String(r.shift_id) === String(shiftId)) parts[String(r.student_id)] = r.squad;
  });
  return state.students.filter(s => String(s.id) in parts);
}
// Команда студента в миссии (источник — participations)
function squadOfIn(studentId, shiftId) {
  return studentSquadIn(studentId, shiftId);
}
// «Основная» миссия студента (для карточки/профиля): первая participation
function studentPrimaryShift(studentId) {
  const parts = (state.participations || []).filter(r => String(r.student_id) === String(studentId));
  return parts.length ? parts[0].shift_id : null;
}
function studentPrimarySquad(studentId) {
  const parts = (state.participations || []).filter(r => String(r.student_id) === String(studentId));
  return parts.length ? parts[0].squad : null;
}

// Все миссии, в которых участвует студент (номера миссий)
function studentShifts(studentId) {
  return (state.participations || []).filter(r => String(r.student_id) === String(studentId)).map(r => r.shift_id);
}

// Перечитать участия из Supabase
async function reloadParticipations() {
  try {
    const rows = await safeGet(TABLES.PARTICIPATIONS);
    state.participations = Array.isArray(rows) ? rows : [];
    return state.participations;
  } catch (e) {
    return state.participations || [];
  }
}

// Добавить студента в миссию (команда 1..10). Возвращает true/false.
async function addParticipation(studentId, shiftId, squad) {
  try {
    await api.insert(TABLES.PARTICIPATIONS, {
      student_id: studentId,
      shift_id:   parseInt(shiftId),
      squad:      parseInt(squad),
      created_at: new Date().toISOString()
    });
    await reloadParticipations();
    return true;
  } catch (e) {
    console.error('addParticipation error:', e);
    return false;
  }
}

// Команда студента (для фильтра) — команда в любой его миссии
function studentInAnySquad(studentId) {
  const parts = (state.participations || []).filter(r => String(r.student_id) === String(studentId));
  return parts.length ? String(parts[0].squad) : null;
}

// Краткое описание участий: "М1 · Команда 2, М3 · Команда 5"
function squadName(squad) {
  const names = (typeof SQUAD_NAMES !== 'undefined') ? SQUAD_NAMES : [];
  const nm = names[Number(squad)];
  return (nm && String(nm).trim()) ? String(nm).trim() : ('Команда ' + squad);
}

function studentParticipationLabel(s) {
  const parts = (state.participations || []).filter(r => String(r.student_id) === String(s.id));
  if (parts.length) {
    return parts.map(r => 'М' + r.shift_id + ' · ' + squadName(r.squad)).join(', ');
  }
  return 'Не в командах';
}

function populateSquadControls() {
  for (let i = 1; i <= 10; i++) {
    const ss = ge('s-squad');
    if (ss && !ss.querySelector('[data-squad-opt="' + i + '"]')) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.dataset.squadOpt = i;
      opt.textContent = squadName(i);
      ss.appendChild(opt);
    }
  }
  const pillsWrap = ge('db-squad-pills');
  if (pillsWrap && !pillsWrap.children.length) {
    for (let i = 1; i <= 10; i++) {
      const b = document.createElement('button');
      b.className = 'filter-pill';
      b.dataset.filter = 'squad';
      b.dataset.val = i;
      b.textContent = squadName(i);
      b.onclick = function () { setFilter('squad', String(i)); };
      pillsWrap.appendChild(b);
    }
  }
}

// Аватар-кружок: если есть avatar_url — фото, иначе инициалы
function avatarCircle(st, innerText, size, borderColor) {
  const url = st && (st.avatar_url || st.avatar);
  size = size || 40;
  const style = 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;border:3px solid ' + (borderColor || 'var(--orange)') + ';display:block';
  if (url) return '<img src="' + esc(url) + '" alt="' + esc(innerText || 'Аватар участника') + '" style="' + style + '" onerror="this.remove()">';
  return '<div class="sc-avatar-inner" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--glass-b);border:3px solid ' + (borderColor || 'var(--orange)') + ';display:flex;align-items:center;justify-content:center;font-size:' + (size * 0.4) + 'px;font-weight:700">' + (innerText || initialsOf(st)) + '</div>';
}

// ── Image helpers (Supabase URL-first, GitHub fallback) ──
// Каждая принимает optional URL. Если URL есть — берём её,
// иначе fallback на img/{folder}/{id}.png, затем на эмодзи/инициалы.
function badgeImg(badgeId, emoji, size, url) {
  size = size || 48;
  const src = url || ('img/badges/' + badgeId + '.png');
  return '<img src="' + esc(src) + '" alt="' + esc(emoji) + '" width="' + size + '" height="' + size + '" style="border-radius:12px;object-fit:cover" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="badge-emoji-fallback" style="display:none;font-size:' + (size * 0.6) + 'px">' + emoji + '</span>';
}
function itemImg(itemId, emoji, size, url) {
  size = size || 40;
  const src = url || ('img/items/' + itemId + '.png');
  return '<img src="' + esc(src) + '" alt="' + esc(emoji) + '" width="' + size + '" height="' + size + '" style="border-radius:10px;object-fit:cover" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="item-emoji-fallback" style="display:none;font-size:' + (size * 0.6) + 'px">' + emoji + '</span>';
}
function avatarImg(studentId, fallbackInitials, size, url) {
  size = size || 80;
  const src = url || ('img/avatars/' + studentId + '.jpg');
  return '<img src="' + esc(src) + '" alt="' + esc(fallbackInitials) + '" width="' + size + '" height="' + size + '" style="border-radius:50%;object-fit:cover;border:3px solid var(--orange)" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="avatar-fallback" style="display:none;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--glass-b);border:3px solid var(--orange);align-items:center;justify-content:center;font-size:' + (size * 0.4) + 'px;font-weight:700">' + fallbackInitials + '</span>';
}

function avatarPublicUrl(path) {
  return SUPABASE_URL + '/storage/v1/object/public/' + path;
}

function onAvatarFilePicked(e) {
  const file = e.target && e.target.files && e.target.files[0];
  if (!file) return;
  const sid = state.currentStudentId;
  if (!sid) { showToast('⚠️ Сначала выберите участника', 'warn'); return; }
  if (!file.type || file.type.indexOf('image/') !== 0) { showToast('⚠️ Выберите файл изображения', 'warn'); return; }
  if (file.size > 2 * 1024 * 1024) { showToast('⚠️ Файл больше 2 МБ', 'warn'); return; }
  uploadStudentAvatar(sid, file);
}

function extOf(filename) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(filename || '');
  return m ? m[1].toLowerCase() : 'jpg';
}

async function ensureAuthToken() {
  try {
    if (typeof authGetUser === 'function') {
      const u = await authGetUser();
      if (u) {
        const t = localStorage.getItem('kanikuly_access_token');
        if (t) return t;
      }
    }
  } catch (e) {}
  try {
    if (typeof authRefreshToken === 'function') {
      const s = await authRefreshToken();
      if (s && s.access_token) return s.access_token;
    }
  } catch (e) {}
  return localStorage.getItem('kanikuly_access_token') || SUPABASE_ANON_KEY;
}

async function removeOldAvatar(student) {
  if (!student || !student.avatar_url) return;
  try {
    const u = student.avatar_url;
    const prefix = '/storage/v1/object/public/images/avatars/';
    const i = u.indexOf(prefix);
    if (i < 0) return;
    const name = u.slice(i + prefix.length);
    if (!name) return;
    const token = await ensureAuthToken();
    await fetch(SUPABASE_URL + '/storage/v1/object/images/avatars/' + name, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token }
    });
  } catch (e) {}
}

async function uploadStudentAvatar(studentId, file) {
  const ext = extOf(file.name);
  const path = 'images/avatars/' + studentId + '.' + ext;
  const token = await ensureAuthToken();
  try {
    const res = await fetch(SUPABASE_URL + '/storage/v1/object/' + path, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: file
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      let msg = '⚠️ Ошибка загрузки (' + res.status + ')';
      if (/Unauthorized|AccessDenied|violates|row-level/i.test(txt)) {
        msg += '. Сессия истекла — выйдите и войдите заново';
      } else if (txt) {
        msg += ': ' + txt.slice(0, 80);
      }
      showToast(msg, 'error');
      return;
    }
    await removeOldAvatar(state.students.find(s => String(s.id) === String(studentId)));
    const url = avatarPublicUrl(path);
    await api.update(TABLES.STUDENTS, studentId, { avatar_url: url });
    const st = state.students.find(s => String(s.id) === String(studentId));
    if (st) st.avatar_url = url;
    showToast('✅ Аватар загружен', 'success');
    renderTalentCard(studentId);
  } catch (err) {
    showToast('⚠️ Не удалось загрузить аватар. Проверьте вход в аккаунт', 'error');
  }
}
// Изображение миссии: Supabase banner_url, иначе img/mission{n}-banner.webp (fallback JPG)
function shiftBannerUrl(s) {
  if (s && (s.banner_url || s.image_url)) {
    const u = esc(s.banner_url || s.image_url);
    return /mission_banner\/mission_\d+\.JPG$/i.test(u) ? u.replace(/\.JPG$/i, '.webp') : u;
  }
  return 'img/mission' + (s && s.id) + '-banner.webp';
}

function bannerOnerror() {
  this.onerror = null;
  if (/\.webp$/i.test(this.src)) this.src = this.src.replace(/\.webp$/i, '.JPG');
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
  for (let i = 1; i <= 10; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = squadName(i);
    squadSel.appendChild(opt);
  }
  populateAddParticipationForm();
}

// Заполнение селектов «Добавить участника в миссию»
function populateAddParticipationForm() {
  const apStudent = ge('ap-student');
  const apShift = ge('ap-shift');
  const apSquad = ge('ap-squad');
  if (!apStudent || !apShift || !apSquad) return;
  if (apStudent.options.length <= 1) {
    state.students.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = displayName(s);
      apStudent.appendChild(opt);
    });
  }
  if (apShift.options.length <= 1) {
    (state.shifts || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name || 'Миссия ' + s.id;
      apShift.appendChild(opt);
    });
  }
  if (apSquad.options.length <= 1) {
    for (let i = 1; i <= 10; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = squadName(i);
      apSquad.appendChild(opt);
    }
  }
}

async function onAddParticipation() {
  if (!authIsAdmin()) { showToast('Только администратор может добавлять участие', 'warn'); return; }
  const studentId = ge('ap-student')?.value;
  const shiftId = ge('ap-shift')?.value;
  const squad = ge('ap-squad')?.value;
  if (!studentId || !shiftId || !squad) { showToast('⚠️ Выберите участника, миссию и команду', 'warn'); return; }
  const ok = await addParticipation(studentId, shiftId, squad);
  if (ok) { showToast('✓ Участник добавлен в миссию ' + shiftId + ', команда ' + squad); renderStudentList(); }
  else showToast('⚠️ Не удалось добавить (возможно, уже участвует)', 'warn');
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
    for (let i = 1; i <= 10; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = squadName(i);
      squadSel.appendChild(opt);
    }
  }
}

// ── Player ↔ Student self-link ───────────────────────────────
// A player (non-admin) claims their own student record by username.
async function selfLinkStudent(profile) {
  const username = (profile.username || '').trim().toLowerCase();
  if (!username) return null;
  try {
    const session = await authGetSession();
    if (!session) return null;
    const url = `${SUPABASE_URL}/rest/v1/${TABLES.STUDENTS}?username=ilike.${encodeURIComponent(username)}&select=*&limit=5`;
    const res = await api._req(url);
    const mine = (Array.isArray(res) ? res : []).find(s => String(s.user_id) === String(session.user.id));
    if (mine) {
      state.currentStudentId = mine.id;
      return mine;
    }
    const candidate = (Array.isArray(res) ? res : []).find(s => !s.user_id);
    if (candidate) {
      try {
        await api._req(`${SUPABASE_URL}/rest/v1/${TABLES.STUDENTS}?id=eq.${candidate.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ user_id: session.user.id })
        });
        state.currentStudentId = candidate.id;
        return candidate;
      } catch (e) { return null; }
    }
    return null;
  } catch (e) {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    var session = await authGetSession();
    if (!session) {
      showAuthScreen();
      return;
    }
    var profile = await authGetProfile();
    window.__userProfile = profile;
    hideAuthScreen(profile);
    api.refreshAuth();
    if (profile && profile.role !== 'admin') {
      await selfLinkStudent(profile);
    }
  } catch(e) {
    console.error('Auth error:', e);
    showAuthScreen();
    return;
  }
  try {
    showLoader(true);
    await loadData();
  } catch(e) {
    console.error('Load error:', e);
  }
  try { setupNav(); } catch(e) { console.error('Nav error:', e); }
  try { setupSearch(); } catch(e) { console.error('Search error:', e); }
  try { renderShiftsPage(); } catch(e) { console.error('Shifts error:', e); }
  applyRoleRestrictions(window.__userProfile);
  populateSquadControls();
  showLoader(false);

  const hash = location.hash.replace('#', '');
  const validPages = ['students', 'shifts', 'dashboard', 'achievements', 'talents'];
  const startPage = validPages.includes(hash) ? hash : 'shifts';
  navigateTo(startPage, true);
  history.replaceState({ page: startPage }, '', '#' + startPage);
});

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  var t = e.target;
  if (!t) return;
  var isCard = t.tagName === 'DIV' && (t.getAttribute('role') === 'button' || t.hasAttribute('data-card-action'));
  if (!isCard) return;
  e.preventDefault();
  t.click();
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

    if (page === 'achievements') { renderCardsPage(); }
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
          fillGrad: ['rgba(59,130,246,0.35)', 'rgba(59,130,246,0.15)'],
          stroke: '#3B82F6',
          point: '#3B82F6'
        });
      }
    }
  }, 200);
});

async function loadData() {
  const safeGet = async (table) => { try { return await api.getAll(table); } catch(e) { console.warn('Fetch failed:', table, e); return []; } };

  const [students, observations, badges, completions, shifts, competencies, badgeDefs, discRows, missionsRows, inventoryRows, participationRows, cardsRows] = await Promise.all([
    safeGet(TABLES.STUDENTS),
    safeGet(TABLES.OBSERVATIONS),
    safeGet(TABLES.BADGES),
    safeGet(TABLES.COMPLETIONS),
    safeGet(TABLES.CONTENT_SHIFTS),
    safeGet(TABLES.CONTENT_COMPETENCIES),
    safeGet(TABLES.CONTENT_BADGE_DEFS),
    safeGet(TABLES.CONTENT_DISC_CONFIG),
    safeGet(TABLES.CONTENT_MISSIONS),
    safeGet(TABLES.CONTENT_INVENTORY),
    safeGet(TABLES.PARTICIPATIONS),
    safeGet(TABLES.CARDS)
  ]);

  state.students    = Array.isArray(students) ? students : [];
  state.participations = Array.isArray(participationRows) ? participationRows : [];
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
    state.badgeDefs = badgeDefs.map(b => ({ id: b.badge_id, name: b.name, icon: b.icon, shift_id: b.shift_id, direction_name: b.direction_name, mission_name: b.mission_name, condition: b.condition, rarity: b.rarity, desc: b.desc, image_url: b.image_url }));
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
  if (Array.isArray(inventoryRows) && inventoryRows.length > 0) {
    state.inventoryItems = inventoryRows;
  } else {
    state.inventoryItems = [];
  }
  if (Array.isArray(cardsRows) && cardsRows.length > 0) {
    state.cards = cardsRows.sort((a, b) => (a.num || 0) - (b.num || 0));
  } else {
    state.cards = [];
  }

  // Persist gamification state loaded from Supabase (coins, streaks, relics,
  // bosses, mystery, avatars, limited badges).
  if (typeof loadAllProgress === 'function') {
    const progressMap = await loadAllProgress();
    applyProgressToState(state, progressMap);
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
    <div class="topbar-logo" style="cursor:pointer" role="button" tabindex="0" onclick="goHome()" title="На главную" aria-label="На главную"><svg viewBox="0 0 200 48" width="48" height="48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="16" r="11" fill="#FBBF24"/><circle cx="24" cy="16" r="6" fill="#FFE08A"/><line x1="24" y1="4" x2="24" y2="1" stroke="#FBBF24" stroke-width="1.5" stroke-linecap="round"/><line x1="32" y1="8" x2="34" y2="6" stroke="#FBBF24" stroke-width="1.5" stroke-linecap="round"/><line x1="36" y1="16" x2="39" y2="16" stroke="#FBBF24" stroke-width="1.5" stroke-linecap="round"/><line x1="16" y1="8" x2="14" y2="6" stroke="#FBBF24" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="16" x2="9" y2="16" stroke="#FBBF24" stroke-width="1.5" stroke-linecap="round"/><polygon points="24,22 18,32 30,32" fill="#FBBF24" opacity="0.9"/><polygon points="24,22 20,32 24,31" fill="#f59e0b" opacity="0.8"/></svg></div>
    <div class="topbar-title" style="cursor:pointer" role="button" tabindex="0" onclick="goHome()" title="На главную" aria-label="На главную">КАНИКУЛЫ С ONE!</div>
    <div class="search-wrap"><span class="search-icon">🔍</span><input type="text" id="search-input" placeholder="Поиск участников..." value="${sq}"></div>
    <div class="topbar-right">
      <button class="btn-print topbar-export-btn" onclick="toggleExportCenter()" title="Экспорт и печать">📤</button>
      <div class="export-center" id="export-center"></div>
      <div class="status-dot"></div>
    </div>
  </div>
  <div class="page" id="page-students">
    <div class="page-wrap">
      <div class="page-header"><h2>👥 УЧАСТНИКИ</h2><p>Регистрация и управление профилями</p></div>
      <button class="btn-print" onclick="window.print()">🖨️ Распечатать / Сохранить PDF</button>
      <div class="form-card"><h3 style="font-size:0.85rem;margin-bottom:12px">➕ Новый участник</h3>
        <form id="student-form"><div class="form-grid">
          <div class="form-group"><label>Имя</label><input class="form-input" id="s-firstname" required placeholder="Имя"></div>
          <div class="form-group"><label>Фамилия</label><input class="form-input" id="s-lastname" required placeholder="Фамилия"></div>
          <div class="form-group"><label>Логин игрока</label><input class="form-input" id="s-username" placeholder="Напр. player1 (для привязки аккаунта)"></div>
          <div class="form-group"><label>Возраст</label><input class="form-input" id="s-age" type="number" min="7" max="12" required placeholder="7-12"></div>
          <div class="form-group"><label>Пол</label><select class="form-input" id="s-gender" required><option value="">Выбрать...</option><option value="Мужской">Мужской</option><option value="Женский">Женский</option></select></div>
          <div class="form-group"><label>Класс</label><input class="form-input" id="s-grade" type="number" min="1" max="11" required placeholder="Класс"></div>
          <div class="form-group"><label>Команда</label><select class="form-input" id="s-squad" required><option value="">Выбрать...</option></select></div>
          <div class="form-group"><label>Кампус</label><select class="form-input" id="s-campus" required><option value="">Выбрать...</option><option value="ШОП">ШОП</option><option value="ШСТ">ШСТ</option></select></div>
          <div class="form-group"><label>Миссия</label><select class="form-input" id="s-shift" required><option value="">Выбрать...</option></select></div>
        </div>
        <div class="form-group" style="margin-top:8px"><label>Заметки</label><textarea class="form-input" id="s-notes" rows="2" placeholder="Дополнительная информация..."></textarea></div>
        <button class="btn-primary" type="submit">✅ Добавить участника</button></form>
        <div class="form-card" style="margin-top:14px"><h3 style="font-size:0.85rem;margin-bottom:12px">➕ Добавить участника в ещё одну миссию</h3>
          <div class="form-grid" style="grid-template-columns:1fr 1fr 1fr">
            <div class="form-group"><label>Участник</label><select class="form-input" id="ap-student"><option value="">Выбрать...</option></select></div>
            <div class="form-group"><label>Миссия</label><select class="form-input" id="ap-shift"><option value="">Выбрать...</option></select></div>
            <div class="form-group"><label>Команда</label><select class="form-input" id="ap-squad"><option value="">Выбрать...</option></select></div>
          </div>
          <button class="btn-primary" type="button" onclick="onAddParticipation()" style="margin-top:8px">➕ Добавить участие</button>
        </div>
      </div>
      <div class="students-layout"><div>
        <div class="student-filters" id="student-filters">
          <select class="form-input st-filter-select" id="st-filter-shift" onchange="onStFilterChange()"><option value="">Все миссии</option></select>
          <select class="form-input st-filter-select" id="st-filter-squad" onchange="onStFilterChange()"><option value="">Все команды</option></select>
          <select class="form-input st-filter-select" id="st-filter-campus" onchange="onStFilterChange()"><option value="">Все кампусы</option><option value="ШОП">ШОП</option><option value="ШСТ">ШСТ</option></select>
        </div>
        <h3 style="font-size:0.85rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">Список · <span id="student-count">0</span></h3>
        <div id="student-list"></div>
      </div></div>
    </div>
  </div>
  <div class="page" id="page-shifts">
    <div class="page-wrap">
      <div class="page-header"><h2>🏕️ МИССИИ</h2><p>Концепции миссий — 10 сюжетов на выбор</p></div>
      <button class="btn-print" onclick="window.print()">🖨️ Распечатать / Сохранить PDF</button>
      <div class="shifts-grid" id="shifts-grid"></div>
    </div>
  </div>
  <div class="page" id="page-achievements">
    <div class="page-wrap">
      <div class="page-header"><h2>🎴 КАРТОЧКИ — КОЛЛЕКЦИЯ</h2><p>Инвентарь смен, реликвии, значки, боссы, магазин и тайный сундук (84 шт.)</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button class="btn-print" style="margin-bottom:0" onclick="window.print()">🖨️ Печать страницы</button>
      </div>
      <div id="cards-content"></div>
    </div>
  </div>
  <div class="page" id="page-talents">
    <div class="page-wrap">
      <div class="page-header"><h2>🎯 ПРОФИЛЬ ИГРОКА</h2><p>RPG-карточка участника каникул</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button class="btn-primary" onclick="printStudentReport(state.currentStudentId)">🎮 Скачать репорт участника</button>
        <button class="btn-print" style="margin-bottom:0" onclick="window.print()">🖨️ Печать страницы</button>
      </div>
      <div style="margin-bottom:12px"><label style="font-size:0.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;display:block">Участник</label><select class="student-selector" id="talent-student-select"><option value="">— Выбрать участника —</option></select></div>
      <div class="pp-hero" id="pp-hero"><div class="pp-avatar-wrap"><div class="pp-avatar" id="pp-avatar">--</div><div class="pp-level-badge" id="pp-level">1</div><button class="pp-avatar-upload" onclick="document.getElementById('pp-avatar-file').click()" title="Загрузить аватар">🖼️</button><input type="file" id="pp-avatar-file" accept="image/*" style="display:none" onchange="onAvatarFilePicked(event)"></div><div class="pp-hero-info"><div class="pp-name" id="pp-name">--</div><div class="pp-meta" id="pp-meta">--</div><div id="pp-disc-rec"></div><div id="pp-streak"></div><div id="pp-near-miss"></div><div class="pp-xp-wrap"><div class="pp-xp-header"><span>Опыт</span><span id="pp-xp-text">0 XP</span></div><div class="pp-xp-bar"><div class="pp-xp-fill" id="pp-xp-fill" style="width:0%"></div></div></div><div class="pp-shift-tag" id="pp-shift-tag">--</div><div id="pp-coins"></div></div></div>
      <div class="pp-stats-grid" id="pp-stats"></div>
      <div class="pp-tabs"><button class="pp-tab active" data-tab="skills" onclick="ppTab('skills')">Навыки</button><button class="pp-tab" data-tab="badges" onclick="ppTab('badges')">Значки</button><button class="pp-tab" data-tab="inventory" onclick="ppTab('inventory')">Инвентарь</button><button class="pp-tab" data-tab="shifts" onclick="ppTab('shifts')">Миссии</button><button class="pp-tab" data-tab="history" onclick="ppTab('history')">История</button><button class="pp-tab" data-tab="disc" onclick="ppTab('disc')">DISC</button><button class="pp-tab" data-tab="social" onclick="ppTab('social')">Социальное</button><button class="pp-tab" data-tab="legacy" onclick="ppTab('legacy')">Реликвии</button><button class="pp-tab" data-tab="boss" onclick="ppTab('boss')">Босс</button><button class="pp-tab" data-tab="shop" onclick="ppTab('shop')">Магазин</button><button class="pp-tab" data-tab="recommend" onclick="ppTab('recommend')">Рекомендации</button></div>
      <div class="pp-panel active" data-panel="skills"><div class="gc"><h3>🕸️ Радар компетенций</h3><div class="radar-wrap"><canvas id="radar-canvas" width="400" height="400"></canvas></div><div id="ai-insights-section" style="margin-top:12px"></div></div><div class="gc"><h3>📈 Шкала компетенций</h3><div class="comp-bars" id="comp-bars"></div></div><div class="gc"><h3>🏆 Ключевое направление</h3><div id="career-content"></div></div></div>
      <div class="pp-panel" data-panel="badges"><div class="gc"><h3>⭐ Полученные значки <span id="pp-badge-count" style="color:var(--muted);font-weight:400"></span></h3><div id="talent-badges-list"></div></div></div>
      <div class="pp-panel" data-panel="inventory"><div class="gc"><h3>🎒 Инвентарь</h3><div id="talent-inventory"></div></div></div>
      <div class="pp-panel" data-panel="shifts"><div class="gc"><h3>🏕️ Миссии участника</h3><div id="pp-shifts-list"></div></div></div>
      <div class="pp-panel" data-panel="history"><div class="gc"><h3>📜 История наблюдений</h3><div class="obs-list" id="talent-obs-list"></div></div></div>
      <div class="pp-panel" data-panel="disc"><div class="gc"><div class="disc-hero"><div class="eyebrow">Каникулы с ONE! · Таланты</div><h2>🎭 DISC-профили участников</h2><p>4 архетипа команды. Каждый закрывает свои 25% задачи, вместе — 100% результата.</p></div><div class="disc-arch" id="disc-page-cards"></div><div class="disc-synergy" id="disc-page-synergy"></div><h3 style="margin-top:26px">🧩 Ваш DISC-профиль</h3><div class="disc-bars" id="disc-bars"></div><div class="disc-combo" id="disc-combo"></div></div></div>
      <div class="pp-panel" data-panel="recommend"><div class="gc"><h3>🔮 Рекомендации</h3><div id="pp-recommendations"></div></div></div>
      <div class="pp-panel" data-panel="social"><div class="gc"><h3>👥 Социальное</h3><div id="pp-social"></div></div></div>
      <div class="pp-panel" data-panel="legacy"><div class="gc"><h3>🏛️ Реликвии прошлых смен</h3><div id="pp-legacy"></div></div></div>
      <div class="pp-panel" data-panel="boss"><div class="gc"><h3>⚔️ Босс-битва</h3><div id="pp-boss"></div></div></div>
      <div class="pp-panel" data-panel="shop"><div class="gc"><h3>🛒 Магазин</h3><div id="pp-shop"></div></div></div>
    </div>
  </div>
  <div class="page" id="page-dashboard">
    <div class="page-wrap">
      <div class="page-header"><h2>📊 ДАШБОРД</h2><p>Общая статистика</p></div>
      <div class="filter-row"><span class="filter-label">Кампус:</span><button class="filter-pill active" data-filter="db-campus" data-val="" onclick="setDbFilter('campus','')">Все</button><button class="filter-pill" data-filter="db-campus" data-val="ШОП" onclick="setDbFilter('campus','ШОП')">ШОП</button><button class="filter-pill" data-filter="db-campus" data-val="ШСТ" onclick="setDbFilter('campus','ШСТ')">ШСТ</button></div>
      <div class="filter-row"><span class="filter-label">Миссия:</span><select class="form-input" id="db-shift-select" onchange="onDbShiftFilter()" style="width:auto;display:inline-block"><option value="">Все миссии</option></select></div>
      <div class="filter-row"><span class="filter-label">Команда:</span><select class="form-input" id="db-squad-select" onchange="onDbSquadFilter()" style="width:auto;display:inline-block"><option value="">Все команды</option></select></div>
      <div class="stats-row" id="db-stats"></div>
      <div class="db-student-grid" id="db-student-grid"></div>
    </div>
  </div>
  <div class="page" id="page-assessments">
    <div class="page-wrap">
      <div class="page-header"><h2>📋 ОЦЕНКА МИССИЙ</h2><p>Выставление баллов за задания</p></div>
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
  populateStudentSelect('talent-student-select', onTalentStudentChange);
  populateSquadControls();
  rebindSearch();
  applyRoleRestrictions(window.__userProfile);
}

function goHome() {
  state.currentPage = '';
  navigateTo('shifts');
}

const ADMIN_PAGES = ['students', 'assessments', 'dashboard'];

function isAdminPage(page) {
  return ADMIN_PAGES.indexOf(page) !== -1;
}

function navigateTo(page, skipHistory) {
  closeReport();
  if (page === state.currentPage) return;

  if (isAdminPage(page) && typeof authIsAdmin === 'function' && !authIsAdmin()) {
    page = 'shifts';
  }

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

  if (page === 'achievements') { renderCardsPage(); }
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

function printStudentReport(studentId) {
  const id = studentId || state.currentStudentId;
  const student = state.students.find(s => s.id === id);
  if (!student) { showToast('⚠️ Сначала выберите участника', 'warn'); return; }
  state.currentStudentId = id;
  fillReport(student);
  openReportPreview();
}

function toggleExportCenter() {
  const ec = ge('export-center');
  if (!ec) return;
  if (ec.classList.contains('open')) {
    closeExportCenter();
    return;
  }
  const page = state.currentPage;
  const hasStudent = !!state.currentStudentId;
  const items = [];

  items.push({
    icon: '🖨️',
    label: 'Печать текущей страницы',
    hint: 'Распечатать или сохранить в PDF',
    action: 'window.print()'
  });

  if (page === 'talents' && hasStudent) {
    items.push({
      icon: '🎮',
      label: 'Игровой репорт участника',
      hint: 'Открыть профиль-отчёт для печати',
      action: 'printStudentReport(state.currentStudentId)'
    });
  }

  if (!items.length) {
    items.push({ icon: '🖨️', label: 'Печать текущей страницы', hint: '', action: 'window.print()' });
  }

  ec.innerHTML = '<div class="export-center-head">Экспорт и печать</div>' + items.map(it =>
    '<button class="export-center-item" onclick="' + it.action + '"><span class="export-center-ico">' + it.icon + '</span>' +
    '<span class="export-center-txt"><strong>' + it.label + '</strong><small>' + it.hint + '</small></span></button>'
  ).join('') + '<button class="export-center-close" onclick="closeExportCenter()">✕ Закрыть</button>';

  ec.classList.add('open');
  setTimeout(() => {
    document.addEventListener('click', exportCenterOutside);
  }, 0);
}

function exportCenterOutside(e) {
  const ec = ge('export-center');
  if (!ec || !ec.classList.contains('open')) return;
  if (ec.contains(e.target) || e.target.closest('.topbar-export-btn')) return;
  closeExportCenter();
}

function closeExportCenter() {
  const ec = ge('export-center');
  if (ec) ec.classList.remove('open');
  document.removeEventListener('click', exportCenterOutside);
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










