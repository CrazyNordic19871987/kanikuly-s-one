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
  const campusEl = ge('ass-campus');
  if (!campusEl) return;
  const campus = campusEl.value;
  const shiftSel = ge('ass-shift');
  const squadSel = ge('ass-squad');
  const studentSel = ge('ass-student');
  if (!squadSel || !studentSel) return;
  // Reset downstream
  squadSel.innerHTML = '<option value="">Выбрать команду...</option>';
  studentSel.innerHTML = '<option value="">Выбрать участника...</option>';
  ge('ass-missions-area').innerHTML = '';
  ge('ass-summary-area').innerHTML = '';
}

function onAssShiftChange() {
  const shiftSel = ge('ass-shift');
  const campusEl = ge('ass-campus');
  const squadSel = ge('ass-squad');
  const studentSel = ge('ass-student');
  if (!shiftSel || !squadSel || !studentSel) return;
  const shiftId = parseInt(shiftSel.value);
  const campus = campusEl ? campusEl.value : '';
  squadSel.innerHTML = '<option value="">Выбрать команду...</option>';
  studentSel.innerHTML = '<option value="">Выбрать участника...</option>';
  ge('ass-missions-area').innerHTML = '';
  ge('ass-summary-area').innerHTML = '';
  if (!shiftId) return;
  let filtered = shiftParticipants(shiftId);
  if (campus) filtered = filtered.filter(s => s.campus === campus);
  const squads = [...new Set(filtered.map(s => squadOfIn(s.id, shiftId)).filter(t => t != null))].sort((a,b) => a-b);
  squads.forEach(sq => {
    const opt = document.createElement('option');
    opt.value = sq;
    opt.textContent = squadName(sq);
    squadSel.appendChild(opt);
  });
}

function onAssSquadChange() {
  const shiftSel = ge('ass-shift');
  const squadSel = ge('ass-squad');
  const studentSel = ge('ass-student');
  if (!shiftSel || !squadSel || !studentSel) return;
  const shiftId = parseInt(shiftSel.value);
  const squad = parseInt(squadSel.value);
  const campusEl = ge('ass-campus');
  const campus = campusEl ? campusEl.value : '';
  studentSel.innerHTML = '<option value="">Выбрать участника...</option>';
  ge('ass-missions-area').innerHTML = '';
  ge('ass-summary-area').innerHTML = '';
  if (!shiftId || !squad) return;
  let list = shiftParticipants(shiftId).filter(s => String(squadOfIn(s.id, shiftId)) === String(squad));
  if (campus) list = list.filter(s => s.campus === campus);
  list.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = displayName(s);
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
      <div class="assess-direction-header" data-card-action tabindex="0" onclick="this.parentElement.classList.toggle('open')">
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
  if (!authIsAdmin()) { showToast('Только администратор может сохранять оценки', 'warn'); return; }
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

