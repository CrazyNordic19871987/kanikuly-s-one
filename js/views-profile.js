// =============================================
//  Страница 3: Достижения (авто-начисление)
// =============================================

async function checkAndAwardBadges(studentId, day, track, obs) {
  if (!authIsAdmin()) return;
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
  el.innerHTML = `<div class="bn-icon">${badgeImg(def.id, def.icon, 56, def.image_url)}</div>
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
    for (let i = 1; i <= 10; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = squadName(i);
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
    const shiftFilter = filterShift;
    const matchingStudentIds = state.students
      .filter(s =>
        (!filterCampus || s.campus === filterCampus) &&
        (!filterSquad ||
          (shiftFilter
            ? String(squadOfIn(s.id, shiftFilter)) === String(filterSquad)
            : String(studentInAnySquad(s.id)) === String(filterSquad))))
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
            <div class="badge-icon-wrap">${isEarned ? badgeImg(def.id, def.icon, 56, def.image_url) : '<div class="badge-emoji" style="font-size:2rem">🔒</div>'}</div>
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

// ── CD4/CD6: Shop buy ────────────────────────────────────────
function buyShopItem(itemId) {
  const item = ECONOMY_SHOP.find(i => i.id === itemId);
  if (!item || !state.currentStudentId) return;
  if (!spendCoins(state.currentStudentId, item.cost)) {
    showToast('🪙 Недостаточно коинов!', 'warn');
    return;
  }
  if (item.type === 'consumable') {
    if (itemId === 'shop_xp_boost') {
      showToast('⚡ XP-бустер активирован! +50 XP к следующему заданию', 'success');
    } else if (itemId === 'shop_badge_hint') {
      const unearned = state.badgeDefs.filter(b => !state.badges.find(eb => eb.student_id == state.currentStudentId && eb.badge_id === b.id && eb.earned));
      if (unearned.length) {
        const hint = unearned[Math.floor(Math.random() * unearned.length)];
        showToast('💡 Подсказка: "' + hint.name + '" — ' + hint.desc, 'info');
      } else {
        showToast('🏆 Все значки уже получены!', 'success');
        addCoins(state.currentStudentId, item.cost); // refund
      }
    } else if (itemId === 'shop_rare_chest') {
      const student = state.students.find(s => s.id == state.currentStudentId);
      const ps = student ? studentPrimaryShift(student.id) : null;
      const dbItems = state.inventoryItems.filter(it => String(it.shift_id) === String(ps));
      const inv = dbItems.length ? { items: dbItems } : SHIFT_INVENTORY[ps];
      if (inv) {
        const rareItem = inv.items.find(i => i.rarity === 'rare') || inv.items[0];
        showToast('📦 Получен: ' + (rareItem.icon || '') + ' ' + rareItem.name, 'success');
      }
    } else if (itemId === 'shop_legendary_key') {
      showToast('🗝️ Ключ Легенды получен! Используйте во время босс-битвы.', 'success');
    }
  } else if (item.type === 'cosmetic') {
    if (itemId === 'shop_name_color') {
      setAvatar(state.currentStudentId, { color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] });
      showToast('🎨 Цвет имени изменён!', 'success');
    } else if (itemId === 'shop_profile_frame') {
      setAvatar(state.currentStudentId, { frame: '✨' });
      showToast('🖼️ Рамка профиля установлена!', 'success');
    } else if (itemId === 'shop_title') {
      const titles = ['Исследователь','Чемпион','Стратег','Художник','Лидер','Аналитик'];
      const t = titles[Math.floor(Math.random() * titles.length)];
      setAvatar(state.currentStudentId, { title: t });
      showToast('👑 Титул: ' + t, 'success');
    }
  } else if (item.type === 'permanent') {
    showToast('🎒 Дополнительный слот инвентаря разблокирован!', 'success');
  }
  renderTalentCard(state.currentStudentId);
}

// ── CD2: Boss reward claim ───────────────────────────────────
function claimBossReward() {
  if (!state.currentStudentId) return;
  const rewards = defeatBoss(state.currentStudentId);
  if (!rewards) return;
  addCoins(state.currentStudentId, rewards.coins);
  showToast('🏆 Босс побеждён! +' + rewards.xp + ' XP, +' + rewards.coins + ' 🪙', 'success');
  renderTalentCard(state.currentStudentId);
}

// ── CD3: Mission branch select ────────────────────────────────
function selectBranch(path) {
  showToast('🔀 Выбран путь: ' + (path === 'a' ? 'A' : 'B') + '! Следующее задание адаптировано.', 'info');
}

// ── Streak update on observation save ─────────────────────────
function triggerStreakAndMystery(studentId) {
  const streakResult = checkAndUpdateStreak(studentId);
  if (streakResult.bonus > 0) {
    showToast('🔥 Серия ' + streakResult.count + ' дн.! +' + streakResult.bonus + ' XP бонус', 'success');
  }
  if (streakResult.milestone) {
    showToast(streakResult.milestone.label + ' ' + streakResult.milestone.desc, 'success');
  }
  const mysteryReward = incrementMysteryCount(studentId);
  if (mysteryReward) {
    showToast(mysteryReward.icon + ' Тайный сундук: ' + mysteryReward.label, 'success');
    if (mysteryReward.type === 'xp') addCoins(studentId, 0); // XP handled elsewhere
    if (mysteryReward.type === 'coin') addCoins(studentId, mysteryReward.value);
  }
  const limited = checkLimitedBadges(studentId);
  limited.forEach(lb => {
    showToast('🏅 Ограниченный значок: ' + lb.icon + ' ' + lb.name, 'success');
  });
}

function renderTalentCard(studentId) {
  const student = state.students.find(s => s.id === studentId);
  if (!student) return;

  const obs = state.observations.filter(o => o.student_id === studentId);
  const earnedBadges = state.badges.filter(b => b.student_id === studentId && b.earned);
  const xp = calcStudentXP(studentId);
  const lv = getLevel(xp);
  const primShift = studentPrimaryShift(studentId);
  const shift = state.shifts.find(s => s.id == primShift);
  const shiftName = shift ? shift.name : primShift;

  const initials = initialsOf(student);
  const setEl = (id, html) => { const e = document.getElementById(id); if (e) e.innerHTML = html; };
  const setText = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };

  // Hero card
  setText('pp-name', displayName(student));
  setEl('pp-avatar', avatarImg(studentId, initials || '?', 80, student.avatar_url));
  setText('pp-level', lv.level);
  setText('pp-meta', student.age + ' лет · ' + student.grade + ' класс · ' + studentParticipationLabel(student));
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

  // Badges tab — round medallions (earned vs locked), DISC-card language
  const badgesListEl = document.getElementById('talent-badges-list');
  if (badgesListEl) {
    const earnedIds = new Set(earnedBadges.map(b => b.badge_id));
    const allDefs = Array.isArray(state.badgeDefs) ? state.badgeDefs : [];
    badgesListEl.innerHTML = allDefs.length
      ? '<div class="pp-badges">' + allDefs.map(def => {
          const earned = earnedIds.has(def.id);
          const rrk = rarityKey(def.rarity || 'common');
          const rr = rarityLabel(rrk);
          return `<div class="badge-tile ${earned ? '' : 'locked'}" data-rarity="${esc(rr)}" style="${cardRarityStyle(rrk)}" title="${esc(def.desc || '')}">
            <span class="bt-icon">${badgeImg(def.id, def.icon, 30, def.image_url)}</span>
            <span class="bt-name">${esc(def.name)}</span>
            <span class="bt-rr">${esc(rr)}${earned ? '' : ' · закрыт'}</span>
          </div>`;
        }).join('') + '</div>'
      : '<p class="empty-note">Значков пока нет</p>';
  }
  const badgeCount = document.getElementById('pp-badge-count');
  if (badgeCount) badgeCount.textContent = earnedBadges.length > 0 ? `(${earnedBadges.length})` : '';

  // Inventory tab — square tiles in DISC-card language
  const inv = computeInventory(studentId);
  const invEl = document.getElementById('talent-inventory');
  if (invEl) {
    let invCards = '';
    inv.items.forEach(item => {
      const rrk = rarityKey(item.rarity || 'common');
      const rr = rarityLabel(rrk);
      invCards += `<div class="pp-tile inv-tile" data-rarity="${esc(rr)}" style="${cardRarityStyle(rrk)}">` +
        `<span class="inv-ic">${itemImg(item.id, item.icon, 40, item.image_url)}</span>` +
        `<span class="inv-nm">${esc(item.name)}</span>` +
        `<span class="inv-rr">${esc(rr)}</span>` +
      `</div>`;
    });
    for (let i = inv.items.length; i < inv.maxSlots; i++) {
      invCards += `<div class="pp-tile inv-tile empty"><span class="inv-empty-plus">+</span></div>`;
    }
    const invHeader = `<div class="inv-grid-hdr">${inv.items.length} / ${inv.maxSlots} слотов</div>`;
    invEl.innerHTML = invHeader + '<div class="pp-inv">' + invCards + '</div>';
  }

  // History tab — timeline tiles in DISC archetype language
  const obsListEl = document.getElementById('talent-obs-list');
  if (obsListEl) {
    const trackCfg = {
      bio:   { icon:'🧬', tc:'tc-bio' },
      eng:   { icon:'⚙️', tc:'tc-eng' },
      media: { icon:'🎥', tc:'tc-media' },
      english:{icon:'🌍', tc:'tc-english' }
    };
    obsListEl.innerHTML = obs.length
      ? '<div class="pp-hist">' + obs.map(o => {
          const tr = trackCfg[o.track] || { icon:'📋', tc:'tc-misc' };
          const trackName = String(o.track || '').replace(/^./, c => c.toUpperCase()) || 'Наблюдение';
          return `<div class="hist-tile ${tr.tc}">
            <div class="hist-dot">${tr.icon}</div>
            <div class="hist-body">
              <div class="hist-title">${esc(trackName)} <span style="opacity:.6">· день ${esc(o.day)}</span></div>
              <div class="hist-scores">
                <span class="hist-score">💪 ${esc(o.independence)}/5</span>
                <span class="hist-score">★ ${esc(o.quality)}/5</span>
                ${o.initiative ? '<span class="hist-chip">🚀 инициатива</span>' : ''}
              </div>
            </div>
          </div>`;
        }).join('') + '</div>'
      : '<p class="empty-note">Наблюдений пока нет</p>';
  }

  // DISC tab
  renderDISC(obs, studentId);

  // Shifts tab — show all shifts the student participated in with completion details
  const ppShiftsEl = document.getElementById('pp-shifts-list');
  if (ppShiftsEl) {
    const studentCompletions = state.completions.filter(c => c.student_id === studentId);
    const partShifts = studentShifts(studentId);
    const shiftIds = [...new Set([...studentCompletions.map(c => c.shift_id), ...partShifts])];
    if (shiftIds.length === 0) {
      ppShiftsEl.innerHTML = '<p class="empty-note">Участник пока не записан ни на одну миссию</p>';
    } else {
      ppShiftsEl.innerHTML = '<div class="pp-miss">' + shiftIds.map(sid => {
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
        const tc = pct >= 80 ? 'tc-done' : pct >= 50 ? 'tc-prog' : 'tc-media';
        const status = pct >= 80 ? 'Пройдена' : pct >= 50 ? 'В процессе' : 'На старте';
        return `<div class="miss-card ${tc}">
          <div class="rarity-stripe"></div>
          <div class="miss-head">
            <span class="miss-idx">🏕️ Миссия ${esc(sid)}</span>
            <span class="miss-meta">${shiftComps.length} заданий · ${badgeCount} баджей · ${esc(status)}</span>
          </div>
          <div class="miss-name">${esc(shiftName)}</div>
          <div class="miss-dirs">
            ${directions.map(d => `<span class="miss-dir">${esc(d)}</span>`).join('') || '<span class="miss-dir">без направлений</span>'}
          </div>
          <div class="miss-score-row">
            <div class="miss-track"><div class="miss-fill" style="width:${pct}%"></div></div>
            <span class="miss-pct">${pct}%</span>
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

    // Top strengths — competency tiles in DISC-card language
    if (topComps.length > 0) {
      html += `<div class="pp-tile rec-section" style="--rc-border:#34d399;--rc-glow:rgba(52,211,153,0.16);--rc-text:#6ee7b7">
        <div class="rec-section-title"><span class="dot"></span>💪 Сильные стороны</div>`;
      topComps.forEach(([id, val]) => {
        const comp = state.competencies.find(c => c.id === id);
        if (!comp) return;
        const col = comp.color || '#3B82F6';
        html += `<div class="rec-str" style="--rc-border:${col};--rc-glow:${col}33;--rc-text:${col}">
          <span class="rec-str-ic">${comp.icon}</span>
          <span class="rec-str-name">${comp.name}</span>
          <div class="comp-track" style="flex:1;max-width:none"><div class="comp-fill" style="width:${val}%"></div></div>
          <span class="rec-str-pct">${val}%</span>
        </div>`;
      });
      html += '</div>';
    }

    // Profession recommendations
    const profRecs = [];
    topComps.forEach(([id]) => {
      if (professionMap[id]) professionMap[id].forEach(p => profRecs.push(p));
    });
    if (profRecs.length > 0) {
      const unique = [...new Set(profRecs)].slice(0, 6);
      html += `<div class="pp-tile rec-section" style="--rc-border:#f5b83d;--rc-glow:rgba(245,184,61,0.16);--rc-text:#fbbf6a">
        <div class="rec-section-title"><span class="dot"></span>🔮 Профессии будущего</div>
        <div class="rec-chips">${unique.map(p =>
          `<span class="rec-chip orange"><span class="tag">проф</span>${esc(p)}</span>`
        ).join('')}</div>
      </div>`;
    }

    // Extracurricular recommendations
    const extraRecs = [];
    topComps.forEach(([id]) => {
      if (extraMap[id]) extraMap[id].forEach(e => extraRecs.push(e));
    });
    if (extraRecs.length > 0) {
      const unique = [...new Set(extraRecs)].slice(0, 8);
      html += `<div class="pp-tile rec-section" style="--rc-border:#3b82f6;--rc-glow:rgba(59,130,246,0.16);--rc-text:#93c5fd">
        <div class="rec-section-title"><span class="dot"></span>🌟 Кружки и секции</div>
        <div class="rec-chips">${unique.map(e =>
          `<span class="rec-chip sky"><span class="tag">кружок</span>${esc(e)}</span>`
        ).join('')}</div>
      </div>`;
    }

    // Areas to develop
    if (weakComps.length > 0) {
      html += `<div class="pp-tile rec-section" style="--rc-border:#6b7280;--rc-glow:rgba(107,114,128,0.16);--rc-text:#9ca3af">
        <div class="rec-section-title"><span class="dot"></span>📚 Рекомендуется развить</div>
        <div class="rec-develop">${weakComps.map(([id, val]) => {
          const comp = state.competencies.find(c => c.id === id);
          if (!comp) return '';
          return `<span class="rec-chip gray"><span class="tag">${esc(comp.icon)}</span>${esc(comp.name)} ${esc(val)}%</span>`;
        }).join('')}</div>
      </div>`;
    }

    // Summary
    const totalObs = obs.length;
    const totalBadges = earnedBadges.length;
    const avgObs = totalObs > 0 ? Math.round(obs.reduce((s, o) => s + (o.quality || 0), 0) / totalObs * 20) : 0;
    html += `<div class="pp-tile rec-section" style="--rc-border:#3b82f6;--rc-glow:rgba(59,130,246,0.16);--rc-text:#93c5fd;margin-top:4px">
      <div class="rec-section-title"><span class="dot"></span>📊 Итоговый профиль</div>
      <p style="font-size:0.72rem;color:var(--muted);margin-bottom:6px">Уровень ${lv.level} · ${xp} XP · ${totalObs} наблюдений · ${totalBadges} значков · средний балл ${avgObs}%</p>
      <p style="font-size:0.72rem;color:var(--muted)">Основной профиль: <strong style="color:var(--rc-text,#93c5fd)">${topComps.length > 0 ? (state.competencies.find(c => c.id === topComps[0][0])?.name || '--') : 'Пока нет данных'}</strong></p>
    </div>`;

    if (!html) html = '<p class="empty-note">Недостаточно данных для анализа. Начните выставлять оценки!</p>';
    ppRecEl.innerHTML = html;
  }

  // ── CD8: Streak display in hero ────────────────────────────
  const streak = getStreak(studentId);
  const streakEl = document.getElementById('pp-streak');
  if (streakEl) {
    if (streak.count > 0) {
      const bonus = STREAK_BONUS[Math.min(streak.count, STREAK_BONUS.length - 1)] || 0;
      const milestone = STREAK_MILESTONES.find(m => m.days === streak.count);
      streakEl.innerHTML = `<div class="streak-display"><span class="streak-fire">${streak.count >= 7 ? '🔥' : '⚡'}</span><span class="streak-count">${streak.count} дн.</span><span class="streak-bonus">+${bonus} XP</span>${milestone ? '<span class="streak-milestone">' + milestone.label + '</span>' : ''}</div>`;
      streakEl.style.display = '';
    } else {
      streakEl.innerHTML = '<div class="streak-display muted"><span>🔥</span><span>Начни серию!</span></div>';
      streakEl.style.display = '';
    }
  }

  // ── CD2: Near-miss feedback ───────────────────────────────
  const nearMiss = getNearMiss(studentId);
  const nmEl = document.getElementById('pp-near-miss');
  if (nmEl) {
    if (nearMiss) {
      nmEl.innerHTML = `<div class="near-miss">🎯 Ещё <strong>${nearMiss.needed} XP</strong> до уровня <strong>${nearMiss.nextLevelName}</strong>!</div>`;
      nmEl.style.display = '';
    } else {
      nmEl.style.display = 'none';
    }
  }

  // ── CD4/CD6: Coins display ────────────────────────────────
  const totalCoins = getEconomyFromCompletions(studentId);
  const coinsEl = document.getElementById('pp-coins');
  if (coinsEl) {
    coinsEl.innerHTML = `<div class="coins-display"><span class="coins-icon">🪙</span><span class="coins-amount">${totalCoins} НЕО</span></div>`;
  }

  // ── CD5: Social panel ─────────────────────────────────────
  const socialEl = document.getElementById('pp-social');
  if (socialEl) {
    let shtml = '';
    // Friends comparison
    const friends = getFriends(studentId, 5);
    shtml += '<div class="gc"><h3>👥 Друзья по уровню</h3>';
    friends.forEach((f, i) => {
      const isMe = f.student.id == studentId;
      const fl = getLevel(f.xp);
      shtml += `<div class="friend-row ${isMe ? 'is-me' : ''}">
        <span class="friend-rank">#${i + 1}</span>
        <span class="friend-name">${isMe ? '⭐ ' : ''}${displayNameEsc(f.student)}</span>
        <span class="friend-level">Ур.${fl.level}</span>
        <span class="friend-xp">${f.xp} XP</span>
      </div>`;
    });
    shtml += '</div>';
    // Squad scoreboard
    const squads = getSquadScores();
    if (squads.length > 1) {
      shtml += '<div class="gc"><h3>⚔️ Команды</h3>';
      squads.forEach((sq, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        shtml += `<div class="squad-row">
          <span class="squad-rank">${medal} #${i + 1}</span>
          <span class="squad-name">${esc(sq.name)}</span>
          <span class="squad-xp">${sq.totalXP} XP · ${sq.members} чел. · ${sq.badges} 🏅</span>
        </div>`;
      });
      shtml += '</div>';
    }
    // Recent activity
    const recent = getRecentActivity(5);
    if (recent.length) {
      shtml += '<div class="gc"><h3>📡 Последняя активность</h3>';
      recent.forEach(r => {
        shtml += `<div class="activity-row">
          <span class="act-name">${displayNameEsc(r.student)}</span>
          <span class="act-desc">${esc(r.completion.direction_name || 'задание')}</span>
          <span class="act-score">★${r.completion.score || 0}</span>
        </div>`;
      });
      shtml += '</div>';
    }
    socialEl.innerHTML = shtml || '<p class="empty-note">Пока нет данных</p>';
  }

  // ── CD1: Legacy relics panel ──────────────────────────────
  const legacyEl = document.getElementById('pp-legacy');
  if (legacyEl) {
    const relics = getRelics(studentId);
    let lhtml = '';
    if (relics.length) {
      lhtml += '<div class="relics-grid">';
      relics.forEach(rid => {
        const relic = LEGENDARY_RELICS.find(r => r.id === rid);
        if (relic) {
          lhtml += `<div class="relic-card"><span class="relic-icon">${relic.icon}</span><strong>${relic.name}</strong><p>${relic.desc}</p></div>`;
        }
      });
      lhtml += '</div>';
    } else {
      lhtml = '<p class="empty-note">Реликвии получаются за прохождение смен. Каждая смена — одна реликвия.</p>';
    }
    lhtml += '<div class="gc" style="margin-top:12px"><h3>📋 Доступные реликвии</h3><div class="relics-grid">';
    LEGENDARY_RELICS.forEach(r => {
      const has = relics.includes(r.id);
      lhtml += `<div class="relic-card ${has ? 'owned' : 'locked'}"><span class="relic-icon">${has ? r.icon : '🔒'}</span><strong>${has ? r.name : '???'}</strong><p>${has ? r.desc : 'Смена ' + r.from_shift}</p></div>`;
    });
    lhtml += '</div></div>';
    legacyEl.innerHTML = lhtml;
  }

  // ── CD2: Boss battle panel ────────────────────────────────
  const bossEl = document.getElementById('pp-boss');
  if (bossEl) {
    const boss = getCurrentBoss();
    const defeated = isBossDefeated(studentId, boss.week);
    const damage = getBossTeamDamage(studentId);
    const hpPct = Math.min(100, Math.round((damage / boss.hp) * 100));
    let bhtml = `<div class="boss-card">
      <div class="boss-header"><span class="boss-icon">${boss.icon}</span><div><strong>${boss.name}</strong><p>Неделя ${boss.week} · HP: ${boss.hp}</p></div></div>
      <div class="boss-hp-bar"><div class="boss-hp-fill" style="width:${defeated ? 100 : hpPct}%"></div></div>
      <div class="boss-info">
        <span>Твой урон: ${damage}</span>
        <span>${defeated ? '✅ Победа!' : hpPct + '%'}</span>
      </div>`;
    if (!defeated && damage >= boss.hp) {
      bhtml += `<button class="btn-primary" onclick="claimBossReward()">🏆 Получить награду!</button>`;
    } else if (defeated) {
      bhtml += `<div class="boss-rewards">Награды: ${boss.rewards.xp} XP · ${boss.rewards.coins} 🪙 · Значок</div>`;
    } else {
      bhtml += `<p class="empty-note">Выполняй задания, чтобы наносить урон боссу!</p>`;
    }
    bhtml += '</div>';
    bossEl.innerHTML = bhtml;
  }

  // ── CD4/CD6: Shop panel ───────────────────────────────────
  const shopEl = document.getElementById('pp-shop');
  if (shopEl) {
    const coins = getCoins(studentId);
    let shhtml = `<div class="shop-balance"><span>🪙</span><strong>${coins} НЕО-коинов</strong></div><div class="shop-grid">`;
    ECONOMY_SHOP.forEach(item => {
      const canBuy = coins >= item.cost;
      shhtml += `<div class="shop-item ${canBuy ? 'buyable' : 'locked'}" ${canBuy ? 'data-card-action tabindex="0"' : ''} onclick="${canBuy ? "buyShopItem('" + item.id + "')" : ''}">
        <span class="shop-icon">${item.icon}</span>
        <strong>${item.name}</strong>
        <p>${item.desc}</p>
        <span class="shop-cost ${canBuy ? '' : 'too-expensive'}">🪙 ${item.cost}</span>
      </div>`;
    });
    shhtml += '</div>';
    shopEl.innerHTML = shhtml;
  }

  // ── CD3: Mission branch in shifts tab ──────────────────────
  const branch = getMissionBranch(studentId);
  const branchEl = document.getElementById('pp-mission-branch');
  if (branchEl) {
    branchEl.innerHTML = `<div class="mission-branch">
      <h4>🔀 Выбери свой путь</h4>
      <div class="branch-options">
        <div class="branch-card" data-card-action tabindex="0" onclick="selectBranch('a')">
          <span class="branch-icon">${branch.a.icon}</span>
          <strong>${branch.a.name}</strong>
          <p>${branch.a.desc}</p>
        </div>
        <div class="branch-card" data-card-action tabindex="0" onclick="selectBranch('b')">
          <span class="branch-icon">${branch.b.icon}</span>
          <strong>${branch.b.name}</strong>
          <p>${branch.b.desc}</p>
        </div>
      </div>
    </div>`;
  }

  // ── CD1/CD3: DISC recommendation in hero ──────────────────
  const discRec = getDiscRecommendation(studentId);
  const discRecEl = document.getElementById('pp-disc-rec');
  if (discRecEl) {
    discRecEl.innerHTML = `<div class="disc-rec"><span>${discRec.icon}</span><span>${discRec.label}: ${discRec.boost}</span></div>`;
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
