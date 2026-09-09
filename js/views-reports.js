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
    <div style="background:linear-gradient(135deg,var(--orange-dim),rgba(59,130,246,0.05));border:1px solid var(--border-h);border-radius:10px;padding:16px">
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

  set('rp-avatar', avatarImg(student.id, initialsOf(student), 64, student.avatar_url));
  set('rp-name', displayName(student));
  set('rp-age', student.age != null ? student.age + ' лет' : '—');
  set('rp-grade', student.grade != null ? student.grade + ' класс' : '—');
  const rpPrimShift = studentPrimaryShift(student.id);
  const rpPrimSquad = studentPrimarySquad(student.id);
  set('rp-squad', rpPrimSquad != null ? squadName(rpPrimSquad) : '—');
  const shiftDef = state.shifts.find(sh => sh.id == rpPrimShift);
  set('rp-shift', shiftDef ? shiftDef.name : 'Миссия ' + rpPrimShift);
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
    fillGrad: ['rgba(59,130,246,0.32)', 'rgba(59,130,246,0.05)'],
    stroke: '#3B82F6',
    point: '#3B82F6'
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
        <span class="rp-badge-ico">${is ? badgeImg(def.id, def.icon, 32, def.image_url) : '🔒'}</span>
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
      compHtml += '<div style="margin-bottom:12px;padding:12px;border-radius:10px;background:rgba(59,130,246,0.04);border:1px solid rgba(59,130,246,0.12)">';
      compHtml += '<div style="font-size:.72rem;font-weight:700;color:#3B82F6;margin-bottom:8px">Миссия ' + sId + (sh ? ' — ' + sh.title : '') + ' · ' + sAvg + '★ · ' + sXp + ' XP</div>';
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

