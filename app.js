// =============================================
//  Каникулы с ONE! — Лагерь будущего 2026
// =============================================

// -- Состояние приложения ----------------------
let state = {
  students: [],
  observations: [],
  badges: [],
  currentPage: 'students',
  currentStudentId: null,
  currentDay: 1,
  currentTrack: 'bio',
  filterSquad: '',
  filterShift: '',
  searchQuery: '',
  radarChart: null
};

let tempRatings = { independence: 0, quality: 0 };

// -- Safe element helper ------------------------
function ge(id) {
  return document.getElementById(id);
}

// -- Инициализация -----------------------------
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoader(true);
    await loadData();
    setupNav();
    setupSearch();
    renderStudentList();
    renderDashboard();
    showLoader(false);
    animatePageIn('students');
  } catch(e) {
    console.error('Init error:', e);
    showLoader(false);
    document.body.innerHTML += `<div style="color:var(--orange);padding:20px;font-family:monospace">Error: ${e.message}</div>`;
  }
});

async function loadData() {
  const [students, observations, badges] = await Promise.all([
    api.getAll(TABLES.STUDENTS),
    api.getAll(TABLES.OBSERVATIONS),
    api.getAll(TABLES.BADGES)
  ]);
  state.students    = Array.isArray(students) ? students : LS.get('students');
  state.observations = Array.isArray(observations) ? observations : LS.get('observations');
  state.badges      = Array.isArray(badges) ? badges : LS.get('badges');
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

function navigateTo(page) {
  closeReport();
  if (page === state.currentPage) return;

  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.animation = '';
  });
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  if (page === 'shift-detail') return;

  if (page === 'shifts') {
    const mainEl = document.querySelector('.main');
    if (mainEl && state.currentPage === 'shift-detail') {
      mainEl.innerHTML = `<div class="topbar">
        <button class="mobile-menu-toggle" onclick="toggleMobileMenu()">☰</button>
        <div class="topbar-logo">Каникулы с ONE!</div>
        <div class="topbar-right"><div class="status-dot"></div></div>
      </div>
      <div class="page active" id="page-shifts">
        <div class="page-wrap">
          <div class="page-header">
            <h1>🏕️ СМЕНЫ</h1>
            <p>Концепции смен — 10 сюжетов на выбор</p>
          </div>
          <button class="btn-print" onclick="window.print()">🖨️ Распечатать / Сохранить PDF</button>
          <div class="shifts-grid" id="shifts-grid"></div>
        </div>
      </div>`;
    }
  }

  const el = ge('page-' + page);
  if (el) el.classList.add('active');
  animatePageIn(page);

  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');
  state.currentPage = page;

  if (page === 'achievements') populateStudentSelect('ach-student-select', onAchStudentChange);
  if (page === 'talents')      populateStudentSelect('talent-student-select', onTalentStudentChange);
  if (page === 'dashboard')    renderDashboard();
  if (page === 'shifts')       renderShiftsPage();
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
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderStudentList();
  });
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
    notes:      v('s-notes'),
    created_at: new Date().toISOString()
  };

  const result = await api.insert(TABLES.STUDENTS, student);
  if (!result) showToast('⚠️ Сохранено локально (нет связи с сервером)', 'warn');
  const saved = result ? result[0] : { ...student, id: Date.now().toString() };

  state.students.unshift(saved);
  LS.set('students', state.students);
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
  if (countEl) countEl.textContent = state.students.length;
  let list = state.students;

  if (state.searchQuery) {
    list = list.filter(s =>
      (s.first_name + ' ' + s.last_name).toLowerCase().includes(state.searchQuery)
    );
  }

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
    return `
      <div class="student-card" data-id="${s.id}" onclick="quickViewStudent('${s.id}')">
        <div class="sc-avatar">${initials}</div>
        <div class="sc-info">
          <div class="sc-name">${s.first_name} ${s.last_name}</div>
          <div class="sc-meta">${s.age} лет · ${s.gender} · ${s.grade} кл. · отряд ${s.squad} · смена ${s.shift}</div>
          <div class="sc-progress">
            <div class="sc-progress-bar"><div class="sc-progress-fill" style="width:${progress}%"></div></div>
            <span class="sc-progress-label">${obs} занятий · ${bdgs} значков</span>
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
  await api.remove(TABLES.STUDENTS, id);
  state.students = state.students.filter(s => s.id !== id);
  state.observations = state.observations.filter(o => o.student_id !== id);
  state.badges = state.badges.filter(b => b.student_id !== id);
  LS.set('students', state.students);
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
      `<option value="${s.id}">${s.first_name} ${s.last_name} · отряд ${s.squad}</option>`
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
  const task = KTP.find(t => t.track === state.currentTrack && t.day === state.currentDay);
  const container = ge('task-detail');
  if (!task || !container) { if (container) container.innerHTML = '<p class="empty-note">Выберите задание</p>'; return; }

  const obs = getObservation(state.currentStudentId, state.currentDay, state.currentTrack);
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
  task.skills.forEach(s => {
    const c = COMPETENCIES.find(c => c.id === s);
    if (c) skillChips += '<span class="skill-chip" style="--chip-color:' + c.color + '">' + c.icon + ' ' + c.name + '</span>';
  });

  let pdfBlock = '';
  if (task.pdfSkills && task.pdfSkills.length) {
    pdfBlock += '<div class="pdf-block">' +
      '<div class="pdf-block-title">🧪 Навыки занятия <span class="pdf-block-src">(из «Таблицы навыков каникул»)</span></div>' +
      '<ul class="pdf-list">' + task.pdfSkills.map(s => '<li>' + s + '</li>').join('') + '</ul>' +
    '</div>';
  }
  if (task.pdfProfessions && task.pdfProfessions.length) {
    pdfBlock += '<div class="pdf-block">' +
      '<div class="pdf-block-title">💼 Профессии будущего</div>' +
      '<div class="pdf-professions">' + task.pdfProfessions.map(p => '<span class="prof-chip">' + p + '</span>').join('') + '</div>' +
    '</div>';
  }

  let html =
    '<div class="task-header">' +
      '<div class="task-day-badge">День ' + task.day + '</div>' +
      '<h3 class="task-title">' + task.name + '</h3>' +
      '<p class="task-desc">' + task.desc + '</p>' +
      '<div class="task-skills">' + skillChips + '</div>' +
      pdfBlock +
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
        '<textarea id="obs-notes" rows="2" placeholder="Комментарии...">' + (obs ? obs.notes || '' : '') + '</textarea>' +
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
  if (existing) {
    await api.update(TABLES.OBSERVATIONS, existing.id, data);
    Object.assign(existing, data);
  } else {
    const result = await api.insert(TABLES.OBSERVATIONS, data);
    if (!result) showToast('⚠️ Сохранено локально (нет связи с сервером)', 'warn');
    const saved = result ? result[0] : { ...data, id: Date.now().toString() };
    state.observations.push(saved);
  }
  LS.set('observations', state.observations);

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
  const defs = BADGE_DEFS.filter(b => b.track === track && b.day === day);
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
    const result = await api.insert(TABLES.BADGES, badge);
    if (!result) showToast('⚠️ Значок сохранён локально', 'warn');
    const saved = result ? result[0] : { ...badge, id: Date.now().toString() };
    state.badges.push(saved);
    LS.set('badges', state.badges);
    showBadgeNotification(def);
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

function renderAchievements(studentId) {
  const earned = state.badges.filter(b => b.student_id === studentId && b.earned);
  const earnedIds = new Set(earned.map(b => b.badge_id));
  const rarityOrder = { legendary:0, epic:1, rare:2, common:3 };
  const badgeGrid = document.getElementById('badge-grid');
  const achSummary = document.getElementById('ach-summary');

  if (badgeGrid) {
    badgeGrid.innerHTML = BADGE_DEFS
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
    `<span class="ach-count">${earned.length}</span> из <span>${BADGE_DEFS.length}</span> значков получено`;
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

function renderTalentCard(studentId) {
  const student = state.students.find(s => s.id === studentId);
  if (!student) return;

  const obs = state.observations.filter(o => o.student_id === studentId);
  const earnedBadges = state.badges.filter(b => b.student_id === studentId && b.earned);

  const talentName = ge('talent-name');
  const talentMeta = ge('talent-meta');
  if (talentName) talentName.textContent = student.first_name + ' ' + student.last_name;
  if (talentMeta) talentMeta.textContent = student.age + ' лет · ' + student.grade + ' класс · отряд ' + student.squad + ' · смена ' + student.shift;

  const topBadgesEl = document.getElementById('talent-top-badges');
  if (topBadgesEl) topBadgesEl.innerHTML =
    earnedBadges.map(b => `<span class="mini-badge rarity-${b.rarity}" title="${b.name}">${b.icon}</span>`).join('');

  const compScores = calcCompetencies(obs);
  renderRadarChart(compScores);
  renderAIInsights(studentId);
  renderCompBars(compScores);

  renderDISC(obs);

  renderCareer(obs, earnedBadges);

  renderRecommendations(obs, earnedBadges, compScores);

  const badgesListEl = document.getElementById('talent-badges-list');
  if (badgesListEl) badgesListEl.innerHTML = earnedBadges.length
    ? earnedBadges.map(b =>
        `<div class="talent-badge-row rarity-${b.rarity}">
          <span class="tbr-icon">${b.icon}</span>
          <div><strong>${b.name}</strong><p>${b.desc || ''}</p></div>
          <span class="tbr-rarity">${rarityLabel(b.rarity)}</span>
        </div>`).join('')
    : '<p class="empty-note">Значков пока нет</p>';

  const obsListEl = document.getElementById('talent-obs-list');
  if (obsListEl) obsListEl.innerHTML = obs.length
    ? obs.map(o => {
        const task = KTP.find(t => t.track === o.track && t.day === o.day);
        const trackIcon = {bio:'🧬', eng:'⚙️', media:'🎥', english:'🌍'}[o.track] || '📋';
        return `<div class="obs-row">
          <span class="obs-icon">${trackIcon}</span>
          <div class="obs-info"><strong>${task?.name || 'Задание'}</strong> · день ${o.day}</div>
          <div class="obs-scores">
            <span>💪 ${o.independence}/5</span>
            <span>★ ${o.quality}/5</span>
            ${o.initiative ? '<span class="init-chip">🚀 инициатива</span>' : ''}
          </div>
        </div>`;
      }).join('')
    : '<p class="empty-note">Наблюдений пока нет</p>';
}

function getScoredProfessions(obs, badges, compScores) {
  const professions = [];
  Object.entries(TRACK_PROFESSIONS).forEach(([track, profs]) => {
    profs.forEach(prof => {
      const trackBadges = BADGE_DEFS.filter(b => b.track === track).map(b => b.id);
      const trackSkills = KTP.filter(t => t.track === track).flatMap(t => t.skills);
      const uniqueSkills = [...new Set(trackSkills)];
      professions.push({
        id: prof.title.toLowerCase().replace(/\s/g, '_'),
        name: prof.title,
        icon: track === 'bio' ? '🧬' : track === 'eng' ? '⚙️' : track === 'english' ? '🌍' : '🎥',
        desc: prof.desc,
        criteria: {
          tracks: [track],
          badges: trackBadges.slice(0, 2),
          skills: uniqueSkills.slice(0, 4),
          minAvgScore: 3.0
        }
      });
    });
  });

  const scored = professions.map(prof => {
    let score = 0;
    let maxScore = 0;
    const comments = [];

    const relevantObs = obs.filter(o => prof.criteria.tracks.includes(o.track));
    if (relevantObs.length > 0) {
      const avgScore = relevantObs.reduce((sum, o) => sum + (o.independence + o.quality) / 2, 0) / relevantObs.length;
      if (avgScore >= prof.criteria.minAvgScore) {
        const trackScore = Math.min(40, (avgScore / 5) * 40);
        score += trackScore;
        comments.push(`✓ Хорошие оценки в треке (${avgScore.toFixed(1)}/5)`);
      } else {
        comments.push(`⚠ Баллы ниже порога (${avgScore.toFixed(1)}/5)`);
      }
      maxScore += 40;
    } else {
      comments.push(`— Нет данных в треке`);
      maxScore += 40;
    }

    const earnedBadgeIds = badges.map(b => b.badge_id);
    const relevantBadges = prof.criteria.badges.filter(b => earnedBadgeIds.includes(b));
    if (prof.criteria.badges.length > 0) {
      const badgeScore = (relevantBadges.length / prof.criteria.badges.length) * 35;
      score += badgeScore;
      if (relevantBadges.length > 0) {
        comments.push(`🏅 Значки трека: ${relevantBadges.map(b => {
          const def = BADGE_DEFS.find(d => d.id === b);
          return def ? def.icon + ' ' + def.name : b;
        }).join(', ')}`);
      }
      maxScore += 35;
    } else {
      score += 35;
      maxScore += 35;
    }

    const relevantSkills = prof.criteria.skills;
    let skillScore = 0;
    let skillCount = 0;
    relevantSkills.forEach(skillId => {
      if (compScores[skillId]) {
        skillScore += compScores[skillId];
        skillCount++;
      }
    });
    if (skillCount > 0) {
      const avgSkill = skillScore / skillCount;
      score += (avgSkill / 100) * 25;
      comments.push(`📊 Компетенции: ${relevantSkills.filter(s => (compScores[s] || 0) > 50).map(s => {
        const c = COMPETENCIES.find(cc => cc.id === s);
        return c ? c.icon + ' ' + c.name : s;
      }).join(', ')}`);
    }
    maxScore += 25;

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    return {
      ...prof,
      score: percentage,
      comments
    };
  });

  scored.sort((a, b) => b.score - a.score);
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

function calcCompetencies(obs) {
  const scores = {};
  COMPETENCIES.forEach(c => scores[c.id] = 0);
  const counts = {};
  COMPETENCIES.forEach(c => counts[c.id] = 0);

  obs.forEach(o => {
    const tasks = KTP.filter(t => t.track === o.track && t.day === o.day);
    tasks.forEach(task => {
      task.skills.forEach(skill => {
        if (scores[skill] !== undefined) {
          scores[skill] += (o.independence + o.quality) / 2 + (o.initiative ? 1 : 0);
          counts[skill]++;
        }
      });
    });
  });

  const maxPossible = 6;
  const result = {};
  COMPETENCIES.forEach(c => {
    result[c.id] = counts[c.id] > 0
      ? Math.min(100, Math.round((scores[c.id] / counts[c.id] / maxPossible) * 100))
      : 0;
  });
  return result;
}

function drawRadar(canvas, scores, o) {
  if (!canvas) return;
  const opts = o || {};
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2, R = Math.min(W,H)/2 - 34;
  const N = COMPETENCIES.length;

  ctx.clearRect(0, 0, W, H);

  for (let r = 1; r <= 5; r++) {
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
      const rr = (r/5) * R;
      const x = cx + Math.cos(angle) * rr;
      const y = cy + Math.sin(angle) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = opts.grid || 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  COMPETENCIES.forEach((c, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
    ctx.strokeStyle = opts.axis || 'rgba(255,255,255,0.1)';
    ctx.stroke();

    const lx = cx + Math.cos(angle) * (R + 24);
    const ly = cy + Math.sin(angle) * (R + 24);
    ctx.font = opts.font || '11px sans-serif';
    ctx.fillStyle = opts.label || 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.icon, lx, ly);
  });

  ctx.beginPath();
  COMPETENCIES.forEach((c, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    const val = (scores[c.id] || 0) / 100;
    const x = cx + Math.cos(angle) * R * val;
    const y = cy + Math.sin(angle) * R * val;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  const g = opts.fillGrad || ['rgba(237,118,21,0.35)', 'rgba(237,118,21,0.15)'];
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  grad.addColorStop(0, g[0]);
  grad.addColorStop(1, g[1]);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = opts.stroke || '#ed7615';
  ctx.lineWidth = 2;
  ctx.stroke();

  COMPETENCIES.forEach((c, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    const val = (scores[c.id] || 0) / 100;
    const x = cx + Math.cos(angle) * R * val;
    const y = cy + Math.sin(angle) * R * val;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI*2);
    ctx.fillStyle = opts.point || '#ed7615';
    ctx.fill();
  });
}

function renderRadarChart(scores) {
  drawRadar(document.getElementById('radar-canvas'), scores, {
    grid: 'rgba(255,255,255,0.08)',
    axis: 'rgba(255,255,255,0.1)',
    label: 'rgba(255,255,255,0.5)',
    font: '11px sans-serif',
    fillGrad: ['rgba(237,118,21,0.35)', 'rgba(237,118,21,0.15)'],
    stroke: '#ed7615',
    point: '#ed7615'
  });
}

function renderCompBars(scores) {
  const el = document.getElementById('comp-bars');
  if (!el) return;
  el.innerHTML = COMPETENCIES.map(c => `
    <div class="comp-bar-row">
      <span class="comp-bar-icon">${c.icon}</span>
      <span class="comp-bar-name">${c.name}</span>
      <div class="comp-bar-track">
        <div class="comp-bar-fill" style="width:${scores[c.id]}%;background:${c.color}80;border-right:2px solid ${c.color}"></div>
      </div>
      <span class="comp-bar-val">${scores[c.id]}%</span>
    </div>`).join('');
}

function calcDisc(obs) {
  const rawScores = {D:0, I:0, S:0, C:0};
  const counts = {D:0, I:0, S:0, C:0};

  obs.forEach(o => {
    const tasks = KTP.filter(t => t.track === o.track && t.day === o.day);
    tasks.forEach(task => {
      task.skills.forEach(skill => {
        for (const [type, skills] of Object.entries(DISC_SKILL_MAP)) {
          if (skills.includes(skill)) {
            rawScores[type] += (o.independence + o.quality) / 2 + (o.initiative ? 0.5 : 0);
            counts[type]++;
          }
        }
      });
    });
  });

  const maxVal = Math.max(...Object.values(rawScores), 1);
  const disc = {};
  for (const t of ['D','I','S','C']) {
    disc[t] = counts[t] > 0
      ? Math.max(10, Math.round((rawScores[t] / maxVal) * 100))
      : 10;
  }

  const labels = {
    D:{label:'Доминирование', color:DISC_COLORS.D, desc:'Активный, решительный'},
    I:{label:'Влияние',       color:DISC_COLORS.I, desc:'Общительный, креативный'},
    S:{label:'Стабильность',  color:DISC_COLORS.S, desc:'Уравновешенный, надёжный'},
    C:{label:'Постоянство',   color:DISC_COLORS.C, desc:'Аналитик, точный'}
  };

  const dominant = Object.entries(disc).sort((a,b) => b[1]-a[1])[0];

  return { disc, labels, dominant };
}

function renderDISC(obs) {
  const { disc, labels, dominant } = calcDisc(obs);

  const discBarsEl = document.getElementById('disc-bars');
  if (discBarsEl) discBarsEl.innerHTML = ['D','I','S','C'].map(t => `
    <div class="disc-row">
      <div class="disc-type-label" style="color:${labels[t].color}">${t}</div>
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
    Object.entries(DISC_COMBO).map(([key, val]) => `
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
  let list = state.students;
  if (squad) list = list.filter(s => s.squad == squad);
  if (shift) list = list.filter(s => s.shift == shift);

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

    return `<div class="db-student-card" onclick="openStudentTalents('${s.id}')">
      <div class="db-sc-top">
        <div class="db-sc-avatar">${(s.first_name?.[0]||'')+(s.last_name?.[0]||'')}</div>
        <div class="db-sc-info">
          <strong>${s.first_name} ${s.last_name}</strong>
          <span>отряд ${s.squad} · смена ${s.shift} · ${s.grade} кл</span>
        </div>
        <div class="db-sc-track">${trackIcon}</div>
      </div>
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

  renderClubsSection(grid.parentElement, null);
  renderActivitiesSection(grid.parentElement);
  renderEnglishSection(grid.parentElement);
  renderCampTeam(grid.parentElement);
}

function setFilter(type, val) {
  if (type === 'squad') state.filterSquad = val;
  if (type === 'shift') state.filterShift = val;
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
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.classList.add('show'), 50);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2800);
}

function getUnlockedClubs(studentId) {
  const obs = state.observations.filter(o => o.student_id === studentId);
  const maxDay = obs.length > 0 ? Math.max(...obs.map(o => o.day)) :0;
  return CAMP_CLUBS.map(club => ({
    ...club,
    unlocked: maxDay >= club.unlockDay
  }));
}

function renderShiftsPage() {
  const grid = document.getElementById('shifts-grid');
  if (!grid) return;
  if (!SHIFTS || !SHIFTS.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🏕️</div><p>Нет данных о сменах</p></div>';
    return;
  }
  grid.innerHTML = SHIFTS.map(s => `
    <div class="shift-card card-enter" onclick="openShiftDetail(${s.id})" style="cursor:pointer">
      <div class="shift-card-header">
        <div class="shift-card-num">Смена ${s.id}</div>
        <div class="shift-card-title">${s.title}</div>
        <div class="shift-card-subtitle">${s.subtitle}</div>
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
      </div>
    </div>
  `).join('');
}

function openShiftDetail(shiftId) {
  const s = SHIFTS.find(x => x.id === shiftId);
  if (!s) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector('.nav-item[data-page="shifts"]');
  if (navBtn) navBtn.classList.add('active');
  state.currentPage = 'shift-detail';

  let html = `<div class="page-wrap shift-detail">
    <button class="shift-detail-back" onclick="navigateTo('shifts')">← Назад к сменам</button>
    <div class="shift-detail-header">
      <div class="shift-detail-num">Смена ${s.id}</div>
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
    <h3 style="font-size:0.8rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">🗺️ Направления и миссии</h3>
    <div class="shift-detail-sections">`;

  if (s.directions) {
    s.directions.forEach(d => {
      html += `<div class="shift-direction">
        <div class="shift-direction-header">
          <span class="shift-direction-icon">${d.icon}</span>
          <span class="shift-direction-name">${d.name}</span>
        </div>
        <div class="shift-direction-missions">
          ${d.missions.map(m => `<div class="shift-mission">
            <div class="shift-mission-dot"></div>
            <div class="shift-mission-info">
              <div class="shift-mission-name">${m.name}</div>
              <div class="shift-mission-desc">${m.desc}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>`;
    });
  }

  html += `</div>
    <div class="shift-detail-product">
      <div class="shift-detail-product-title">📦 Продуктовый инкубатор</div>
      <p>${s.product}</p>
    </div>
  </div>`;

  const mainEl = document.querySelector('.main');
  mainEl.innerHTML = html;
}

function renderCampPage() {
  // Camp page removed — functionality moved to shifts page
}

function renderClubsSection(container, studentId) {
  const clubs = studentId ? getUnlockedClubs(studentId) : CAMP_CLUBS;
  const html = `
    <div class="clubs-section" style="margin-top:20px">
      <h3 style="font-size:0.85rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">
        🏆 Клубы каникул
      </h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
        ${clubs.map(club => `
          <div class="gc ${club.unlocked ? '' : 'locked'}" style="opacity:${club.unlocked ? '1' : '0.5'};position:relative">
            <div style="font-size:1.5rem;margin-bottom:6px">${club.icon}</div>
            <strong style="display:block;font-size:0.85rem;margin-bottom:4px">${club.name}</strong>
            <p style="font-size:0.7rem;color:var(--muted);margin:0">${club.desc}</p>
            ${!club.unlocked ? '<div style="position:absolute;top:8px;right:8px;font-size:0.65rem;color:var(--orange);background:var(--orange-dim);padding:2px 8px;border-radius:10px">🔒 день ' + club.unlockDay + '+</div>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
}

function renderActivitiesSection(container) {
  const html = `
    <div class="activities-section" style="margin-top:20px">
      <h3 style="font-size:0.85rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">
        🎯 Активности и вечерние мероприятия
      </h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <h4 style="font-size:0.75rem;color:var(--orange);margin-bottom:8px">Дневные активности</h4>
          ${EVENING_ACTIVITIES.day.map(a => `
            <div class="gc" style="padding:8px;margin-bottom:6px">
              <strong style="font-size:0.8rem">${a.name}</strong>
              <p style="font-size:0.65rem;color:var(--muted);margin:2px 0 0">${a.desc}</p>
            </div>
          `).join('')}
        </div>
        <div>
          <h4 style="font-size:0.75rem;color:var(--orange);margin-bottom:8px">Вечерние мероприятия</h4>
          ${EVENING_ACTIVITIES.evening.map(a => `
            <div class="gc" style="padding:8px;margin-bottom:6px">
              <strong style="font-size:0.8rem">${a.name}</strong>
              <p style="font-size:0.65rem;color:var(--muted);margin:2px 0 0">${a.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
}

function renderEnglishSection(container) {
  const html = `
    <div class="english-section" style="margin-top:20px">
      <h3 style="font-size:0.85rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">
        🌐 Языковая составляющая
      </h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
        ${ENGLISH_COMPONENTS.map(e => `
          <div class="gc">
            <strong style="font-size:0.8rem">${e.name}</strong>
            <p style="font-size:0.65rem;color:var(--muted);margin:2px 0 0">${e.desc}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
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
    const c = COMPETENCIES.find(x => x.id === id);
    if (c) profile.strengths.push(c);
  });

  lowSkills.forEach(([id]) => {
    const c = COMPETENCIES.find(x => x.id === id);
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
  const compScores = calcCompetencies(obs);
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
    <div style="background:linear-gradient(135deg,var(--orange-dim),rgba(237,118,21,0.05));border:1px solid var(--border-h);border-radius:10px;padding:16px">
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
//  OPENAI API ANALYTICS
// =============================================

async function generateOpenAIAnalysis(student, obs, badges, compScores) {
  if (!OPENAI_API_KEY) return null;

  const competencies = COMPETENCIES.map(c => ({
    name: c.name,
    icon: c.icon,
    score: compScores[c.id] || 0
  })).sort((a, b) => b.score - a.score);

  const topSkills = competencies.slice(0, 4);
  const lowSkills = competencies.slice(-3).filter(c => c.score < 30);

  const trackCounts = { bio: 0, eng: 0, media: 0, english: 0 };
  obs.forEach(o => { if (trackCounts[o.track] !== undefined) trackCounts[o.track]++; });
  const dominant = Object.entries(trackCounts).sort((a, b) => b[1] - a[1])[0];

  const avgScore = obs.length > 0
    ? (obs.reduce((s, o) => s + (o.independence + o.quality) / 2, 0) / obs.length).toFixed(1)
    : 'N/A';

  const earnedBadges = badges.filter(b => b.earned);

  const prompt = `Ты — эксперт по детскому развитию и образовательным технологиям.
Проанализируй профиль участника летних каникул и дай развёрнутые рекомендации.

УЧАСТНИК: ${student.first_name} ${student.last_name}
ВОЗРАСТ: ${student.age} лет
КЛАСС: ${student.grade}
КОЛИЧЕСТВО НАБЛЮДЕНИЙ: ${obs.length} дней
СРЕДНИЙ БАЛЛ: ${avgScore}/5

ДОМИНИРУЮЩИЙ ТРЕК: ${dominant[0] === 'bio' ? 'Биотехнологии 🧬' : dominant[0] === 'eng' ? 'Инженерия ⚙️' : dominant[0] === 'english' ? 'Английские каникулы 🌍' : 'Медиа 🎥'}

ТОП КОМПЕТЕНЦИИ (сильные стороны):
${topSkills.map(c => `- ${c.icon} ${c.name}: ${c.score}%`).join('\n')}

ЗОНЫ РОСТА (слабые стороны):
${lowSkills.length > 0 ? lowSkills.map(c => `- ${c.icon} ${c.name}: ${c.score}%`).join('\n') : '- Недостаточно данных'}

ЗАРАБОТАННЫЕ ЗНАЧКИ: ${earnedBadges.length > 0 ? earnedBadges.map(b => `${b.icon} ${b.name}`).join(', ') : 'Нет'}

ДАННЫЕ ПО ТРЕКАМ:
- Биотехнологии: ${trackCounts.bio} занятий
- Инженерия: ${trackCounts.eng} занятий
- Медиа: ${trackCounts.media} занятий
- Английские каникулы: ${trackCounts.english} занятий

Верни анализ в формате JSON:
{
  "summary": "развёрнутое резюме профиля на 2-3 предложения",
  "strengths": ["сильная сторона 1", "сильная сторона 2", "сильная сторона 3"],
  "areasForGrowth": ["зона роста 1", "зона роста 2"],
  "learningStyle": "стиль обучения (кинестетик/визуал/аудиал/читатель)",
  "recommendedExtracurricular": [
    {"name": "название занятия", "reason": "почему подходит этому участнику"}
  ],
  "careerHint": "краткая подсказка по возможной карьере/профессии",
  "tipsForMentors": ["совет 1", "совет 2", "совет 3"]
}

ВАЖНО: Верни ТОЛЬКО валидный JSON без markdown разметки, без текста до или после. Только объект {}.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (content) {
      try {
        return JSON.parse(content);
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        console.error('Failed to parse OpenAI response');
        return null;
      }
    }
  } catch (e) {
    console.error('OpenAI request failed:', e);
    return null;
  }
}

function renderCampTeam(container) {
  const html = `
    <div class="team-section" style="margin-top:20px">
      <h3 style="font-size:0.85rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">
        👥 Команда каникул
      </h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px">
        ${CAMP_TEAM.map(m => `
          <div class="gc">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <strong style="font-size:0.8rem">${m.name}</strong>
                <p style="font-size:0.65rem;color:var(--orange);margin:2px 0">${m.alias}</p>
              </div>
            </div>
            <p style="font-size:0.65rem;color:var(--muted);margin:4px 0 0">${m.role}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
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
  const compScores = calcCompetencies(obs);
  const profile = analyzeStudentProfile(obs, earned, compScores);
  const level = getStudentLevel(obs, state.badges.filter(b => b.student_id === student.id));
  const avg = obs.length ? (obs.reduce((s, o) => s + (o.independence + o.quality) / 2, 0) / obs.length).toFixed(1) : '—';

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  set('rp-avatar', (student.first_name?.[0] || '') + (student.last_name?.[0] || ''));
  set('rp-name', student.first_name + ' ' + student.last_name);
  set('rp-age', student.age + ' лет');
  set('rp-grade', student.grade + ' класс');
  set('rp-squad', 'Отряд ' + student.squad);
  set('rp-shift', 'Смена ' + student.shift);
  set('rp-progress', level.progress + '%');
  set('rp-progress-label', level.progress + '%');
  set('rp-level', level.num);
  set('rp-level-icon', level.icon);
  set('rp-level-name', level.name);
  set('rp-stat-tasks', obs.length);
  set('rp-stat-badges', earned.length);
  set('rp-stat-score', avg);

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
    fillGrad: ['rgba(237,118,21,0.32)', 'rgba(237,118,21,0.05)'],
    stroke: '#ed7615',
    point: '#ed7615'
  });

  const barsEl = ge('rp-comp-bars');
  if (barsEl) {
    barsEl.innerHTML = COMPETENCIES.map(c => {
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
    const disc = calcDisc(obs);
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
  const careerEl = ge('rp-careers');
  if (careerEl) {
    careerEl.innerHTML = scored.slice(0, 3).map(p => `
      <div class="rp-career">
        <div class="rp-career-top">
          <span class="rp-career-ico">${p.icon}</span>
          <span class="rp-career-name">${p.name}</span>
          <span class="rp-career-pct">${p.score}%</span>
        </div>
        <div class="rp-career-desc">${p.desc}</div>
      </div>`).join('') || '<div class="empty-note">Нет данных для анализа</div>';
  }

  const extraEl = ge('rp-extra');
  if (extraEl) {
    extraEl.innerHTML = (profile.recommendedExtracurricular || []).slice(0, 4).map(e => `
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
    badgesEl.innerHTML = BADGE_DEFS.map(def => {
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
      const task = KTP.find(t => t.track === o.track && t.day === o.day);
      return `<tr>
        <td>День ${o.day}</td>
        <td>${trackIcons[o.track] || ''} ${trackNames[o.track] || o.track}</td>
        <td>${task?.name || '—'}</td>
        <td>${o.independence}/5</td>
        <td>${o.quality}/5</td>
        <td class="${o.initiative ? 'ok' : 'no'}">${o.initiative ? '🚀 да' : '—'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--rp-muted)">Наблюдений пока нет</td></tr>';
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
