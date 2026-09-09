// =============================================
//  Страница 1: Участники
// =============================================

document.getElementById('student-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!authIsAdmin()) { showToast('Только администратор может добавлять участников', 'warn'); return; }
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Сохранение...';
  btn.disabled = true;

  const sSquad = parseInt(v('s-squad'));
  const sShift = parseInt(v('s-shift'));
  const student = {
    first_name: sanitizeText(v('s-firstname')),
    last_name:  sanitizeText(v('s-lastname')),
    username:   sanitizeText(v('s-username')).trim().toLowerCase() || null,
    nickname:   sanitizeText(v('s-nickname')),
    avatar_url: sanitizeText(v('s-avatar')) || null,
    age:        parseInt(v('s-age')),
    gender:     sanitizeText(v('s-gender')),
    grade:      parseInt(v('s-grade')),
    campus:     sanitizeText(v('s-campus')),
    notes:      sanitizeText(v('s-notes')),
    created_at: new Date().toISOString()
  };

  let saved;
  try {
    const result = await api.insert(TABLES.STUDENTS, student);
    if (!result || !result[0]) { showToast('⚠️ Ошибка сохранения', 'warn'); btn.textContent = '+ Добавить участника'; btn.disabled = false; return; }
    saved = result[0];
    // Записываем участие в миссии (студент + миссия + команда)
    if (sShift && sSquad) {
      try {
        await api.insert(TABLES.PARTICIPATIONS, {
          student_id: saved.id,
          shift_id:   sShift,
          squad:      sSquad,
          created_at: new Date().toISOString()
        });
      } catch (_e) { /* участие опционально */ }
    }
  } catch(err) {
    console.error('Insert student error:', err);
    showToast('⚠️ Ошибка сервера: ' + err.message, 'warn');
    btn.textContent = '+ Добавить участника'; btn.disabled = false;
    return;
  }

  state.students.unshift(saved);
  await reloadParticipations();
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
  let list = visibleStudents();

  const filters = getStudentFilters();
  if (filters.shift) list = list.filter(s => studentShifts(s.id).map(String).includes(String(filters.shift)));
  if (filters.squad) list = list.filter(s => studentInAnySquad(s.id) === String(filters.squad));
  if (filters.campus) list = list.filter(s => (s.campus || '') === filters.campus);

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(s =>
      displayName(s).toLowerCase().includes(q) ||
      (s.first_name + ' ' + s.last_name).toLowerCase().includes(q)
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
    const initials = initialsOf(s);
    const progress = Math.round((obs / 40) * 100);
    const xp = calcStudentXP(s.id);
    const lv = getLevel(xp);
    return `
      <div class="student-card" data-id="${s.id}" data-card-action onclick="quickViewStudent('${s.id}')">
        <div class="sc-avatar">${avatarCircle(s, initials, 46)}<div class="sc-level-badge">${lv.level}</div></div>
        <div class="sc-info">
          <div class="sc-name">${displayNameEsc(s)} <span class="sc-level-tag">${lv.name}</span></div>
          <div class="sc-meta">${esc(s.age)} лет · ${esc(s.gender)} · ${esc(s.grade)} кл. · ${studentParticipationLabel(s)} · ${esc(s.campus)}</div>
          <div class="sc-xp-bar"><div class="sc-xp-fill" style="width:${lv.progress}%"></div></div>
          <div class="sc-progress">
            <div class="sc-progress-bar"><div class="sc-progress-fill" style="width:${progress}%"></div></div>
            <span class="sc-progress-label">${obs} занятий · ${bdgs} значков · ${xp} XP</span>
          </div>
        </div>
        ${authIsAdmin() ? '<button class="sc-delete" onclick="deleteStudent(event,\'' + s.id + '\')">✕</button>' : ''}
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
  if (!authIsAdmin()) { showToast('Только администратор может удалять участников', 'warn'); return; }
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
