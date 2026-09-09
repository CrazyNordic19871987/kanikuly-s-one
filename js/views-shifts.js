/* exported populateStudentSelect, onTaskStudentChange, renderDayTabs, selectDay, selectTrack, renderCurrentTask, setRating, saveObservation, getObservation, hasObservation, getShiftSvg, renderShiftsPage, openShiftDashboard, setSdFilter, renderShiftDashboard, goBack, openShiftDetail */
// =============================================
//  Страница 2: Задания
// =============================================

function populateStudentSelect(selectId, onChange) {
  const sel = document.getElementById(selectId);
  const list = visibleStudents();
  sel.innerHTML = '<option value="">— Выбрать участника —</option>' +
    list.map(s =>
      `<option value="${s.id}">${displayNameEsc(s)} · ${studentParticipationLabel(s)} · ${esc(s.campus)}</option>`
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

  const primShift = studentPrimaryShift(student.id);
  const shift = state.shifts.find(s => s.id === primShift);
  if (!shift || !shift.directions) { container.innerHTML = '<p class="empty-note">Нет данных по миссии</p>'; return; }

  const trackDir = shift.directions.find(d => {
    const n = d.name.toLowerCase();
    const t = state.currentTrack.toLowerCase();
    return n.includes(t) || (t === 'bio' && (n.includes('био') || n.includes('eco'))) || (t === 'eng' && (n.includes('инженер') || n.includes('it') || n.includes('тех'))) || (t === 'media' && n.includes('медиа')) || (t === 'english' && (n.includes('англий') || n.includes('english')));
  });

  if (!trackDir || !trackDir.missions || !trackDir.missions.length) {
    const shiftDefName = state.shifts.find(sh => sh.id === primShift)?.name || 'Миссии ' + primShift;
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
  if (!authIsAdmin()) { showToast('Только администратор может оценивать', 'warn'); return; }
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
    notes:        sanitizeText(document.getElementById('obs-notes').value),
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
  triggerStreakAndMystery(state.currentStudentId);
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

function getShiftSvg(id) {
  const s = state.shifts.find(sh => String(sh.id) === String(id));
  const pos = id === 2 ? 'object-position:center 85%' : '';
  return `<img src="${shiftBannerUrl(s)}" onerror="bannerOnerror.call(this)" alt="Миссия ${id}" loading="lazy" style="width:100%;height:100%;object-fit:cover;${pos}">`;
}

function renderShiftsPage() {
  const grid = document.getElementById('shifts-grid');
  if (!grid) return;
  if (!state.shifts || !state.shifts.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🏕️</div><p>Нет данных о миссиях</p></div>';
    return;
  }
  grid.innerHTML = state.shifts.map(s => {
    const dateStr = (window.SHIFT_DATES && window.SHIFT_DATES[s.id]) ? window.SHIFT_DATES[s.id] : (window.SHIFT_DATES && window.SHIFT_DATES[parseInt(s.id)]) ? window.SHIFT_DATES[parseInt(s.id)] : '';
    return `
    <div class="shift-card card-enter" data-card-action tabindex="0" onclick="openShiftDetail(${s.id})" style="cursor:pointer">
      <div class="shift-card-header">
        <div class="shift-card-img">
          ${getShiftSvg(s.id)}
          <div class="shift-card-img-text">
            <div class="shift-card-num">Миссия ${s.id}</div>
            <div class="shift-card-title">${s.title}</div>
            <div class="shift-card-subtitle">${s.subtitle}</div>
            ${dateStr ? '<div class="shift-card-date">📅 ' + dateStr + '</div>' : ''}
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
          <span style="font-size:0.78rem;font-weight:700;color:var(--orange)">${shiftParticipants(s.id).length}</span>
          <button class="btn-sm" style="margin-left:auto;padding:4px 10px;font-size:0.65rem" onclick="openShiftDashboard(${s.id}, event)">📊 Дашборд</button>
        </div>
      </div>
    </div>
  `;
  }).join('');
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
  let participants = shiftParticipants(shiftId);
  if (state.filterSdCampus) participants = participants.filter(s => s.campus === state.filterSdCampus);

  // Dynamic team pills (1..10)
  const allSquads = [...new Set(participants.map(s => squadOfIn(s.id, shiftId)).filter(t => t != null).sort((a,b) => a-b))];
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
      pill.textContent = squadName(sq);
      parent.appendChild(pill);
    });
    // Re-activate if needed
    if (state.filterSdSquad) {
      parent.querySelectorAll('.filter-pill[data-filter="sd-squad"]').forEach(p => p.classList.toggle('active', p.dataset.val === state.filterSdSquad));
    }
  }

  if (state.filterSdSquad) participants = participants.filter(s => String(squadOfIn(s.id, shiftId)) === String(state.filterSdSquad));

  // Calculate stats
  let totalXp = 0, totalAllScored = 0, totalCounted = 0, totalCompletions = 0;
  const participantData = participants.map(s => {
    const obs = state.observations.filter(o => o.student_id === s.id);
    const comps = state.completions.filter(c => c.student_id === s.id && c.shift_id === shiftId);
    const bdgs = state.badges.filter(b => b.student_id === s.id && b.earned);
    let xp = 0, currency = 0, scoredCount = 0, scoreSum = 0;
    comps.forEach(c => {
      xp += c.xp || 0;
      currency += c.currency || 0;
      if (c.score > 0) { scoreSum += c.score; scoredCount++; }
      totalCompletions++;
    });
    totalXp += xp;
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
  const sdStatsEl = ge('sd-stats');
  const avgAll = totalCounted > 0 ? (totalAllScored / totalCounted).toFixed(1) : '—';
  if (sdStatsEl) {
    sdStatsEl.innerHTML = `
      <div class="sd-stat"><div class="sd-stat-num">${participants.length}</div><div class="sd-stat-label">Участников</div></div>
      <div class="sd-stat"><div class="sd-stat-num">${totalCompletions}</div><div class="sd-stat-label">Оценок</div></div>
      <div class="sd-stat"><div class="sd-stat-num">${avgAll}</div><div class="sd-stat-label">Средний балл</div></div>
      <div class="sd-stat"><div class="sd-stat-num">${totalXp}</div><div class="sd-stat-label">Всего XP</div></div>
    `;
  }

  // Render leaderboard
  const lbEl = ge('sd-leaderboard');
  if (lbEl) {
    if (!participantData.length) {
      lbEl.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>Нет участников для отображения</p></div>';
    } else {
      lbEl.innerHTML = participantData.map((pd, i) => {
        const rankClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
        const initials = initialsOf(pd.student);
        const progressPct = pd.completionsCount > 0 ? Math.min(100, Math.round((pd.completionsCount / (shift.directions ? shift.directions.reduce((s,d) => s + d.missions.length, 0) : 10)) * 100)) : 0;
        return `<div class="sd-lb-row card-enter" style="animation-delay:${i * 0.05}s">
          <div class="sd-lb-rank ${rankClass}">${i < 3 ? ['🥇','🥈','🥉'][i] : '#' + (i+1)}</div>
          <div class="sd-lb-avatar">${avatarCircle(pd.student, initials, 40, 'var(--green)')}</div>
          <div class="sd-lb-info">
            <div class="sd-lb-name">${displayNameEsc(pd.student)}</div>
            <div class="sd-lb-meta">команда ${(function(){ const q = squadOfIn(pd.student.id, shiftId); return q ? squadName(q) : 'без команды'; })()} · ${pd.student.campus || ''} · ${pd.topSkill}</div>
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
      const sq = squadOfIn(pd.student.id, shiftId);
      if (sq == null) return;
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
        <div class="sd-squad-bar-label">${squadName(sq)}</div>
        <div class="sd-squad-bar-track"><div class="sd-squad-bar-fill" style="width:${pct}%"></div></div>
        <div class="sd-squad-bar-val">${data.count} чел. · ${avgSq}★ · ${data.totalXp} XP</div>
        </div>`;
      }).join('') + '</div>';
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

  let detailDate = (window.SHIFT_DATES && window.SHIFT_DATES[s.id]) ? window.SHIFT_DATES[s.id] : (window.SHIFT_DATES && window.SHIFT_DATES[parseInt(s.id)]) ? window.SHIFT_DATES[parseInt(s.id)] : '';
  let html = `<div class="page-wrap shift-detail">
    <button class="shift-detail-back" onclick="navigateTo('shifts')">← Назад к миссиям</button>
    <div class="shift-detail-banner">
      <img src="${shiftBannerUrl(s)}" onerror="bannerOnerror.call(this)" alt="${esc(s.title)}" style="width:100%;height:100%;object-fit:cover">
      <div class="shift-detail-banner-overlay">
        <div class="shift-detail-num">Миссия ${s.id}</div>
        <div class="shift-detail-title">${s.title}</div>
        <div class="shift-detail-subtitle">${s.subtitle}</div>
        ${detailDate ? '<div class="shift-detail-date">📅 ' + detailDate + '</div>' : ''}
      </div>
    </div>
    <div class="shift-detail-header">
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

