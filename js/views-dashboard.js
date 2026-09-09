// =============================================
//  Страница 5: Дашборд
// =============================================

function renderDashboard() {
  const squad = state.filterSquad;
  const shift = state.filterShift;
  const campus = state.filterCampus;
  let list = state.students;
  if (squad) list = list.filter(s => studentInAnySquad(s.id) == squad);
  if (shift) list = list.filter(s => studentShifts(s.id).map(String).includes(String(shift)));
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
    const progress = obs.length ? Math.round((obs.length / 40) * 100) : 0;
    const progressLabel = obs.length ? progress + '%' : 'нет занятий';
    const trackCounts = {bio:0, eng:0, media:0, english:0};
    obs.forEach(o => { if (trackCounts[o.track] !== undefined) trackCounts[o.track]++; });
    const dominantTrack = Object.entries(trackCounts).sort((a,b) => b[1]-a[1])[0];
    const trackIcon = {bio:'🧬', eng:'⚙️', media:'🎥', english:'🌍'}[dominantTrack?.[0]] || '📋';
    const xp = calcStudentXP(s.id);
    const lv = getLevel(xp);

    return `<div class="db-student-card" data-card-action tabindex="0" onclick="openStudentTalents('${s.id}')">
      <div class="db-sc-top">
        <div class="db-sc-avatar">${avatarCircle(s, initialsOf(s), 44)}<div class="db-sc-level">${lv.level}</div></div>
        <div class="db-sc-info">
          <strong>${displayNameEsc(s)}</strong> <span class="sc-level-tag">${lv.name}</span>
          <span>${studentParticipationLabel(s)} · ${esc(s.campus)} · ${esc(s.grade)} кл</span>
        </div>
        <div class="db-sc-track">${trackIcon}</div>
      </div>
      <div class="db-sc-xp"><div class="db-sc-xp-bar"><div style="width:${lv.progress}%;background:linear-gradient(90deg,#FFD93D,var(--orange))"></div></div><span>${xp} XP</span></div>
      <div class="db-sc-progress">
        <div class="db-sc-bar"><div style="width:${progress}%;background:var(--orange)"></div></div>
        <span>${progressLabel}</span>
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

