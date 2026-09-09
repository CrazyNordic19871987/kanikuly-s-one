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
  const g = opts.fillGrad || ['rgba(59,130,246,0.35)', 'rgba(59,130,246,0.15)'];
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  grad.addColorStop(0, g[0]);
  grad.addColorStop(1, g[1]);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = opts.stroke || '#3B82F6';
  ctx.lineWidth = 2;
  ctx.stroke();

  state.competencies.forEach((c, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    const val = (scores[c.id] || 0) / 100;
    const x = cx + Math.cos(angle) * R * val;
    const y = cy + Math.sin(angle) * R * val;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI*2);
    ctx.fillStyle = opts.point || '#3B82F6';
    ctx.fill();
  });
}

function renderRadarChart(scores) {
  drawRadar(document.getElementById('radar-canvas'), scores, {
    grid: 'rgba(255,255,255,0.08)',
    axis: 'rgba(255,255,255,0.1)',
    label: 'rgba(255,255,255,0.5)',
    font: '11px sans-serif',
    fillGrad: ['rgba(59,130,246,0.35)', 'rgba(59,130,246,0.15)'],
    stroke: '#3B82F6',
    point: '#3B82F6'
  });
}

function renderCompBars(scores) {
  const el = document.getElementById('comp-bars');
  if (!el) return;
  el.innerHTML = '<div class="pp-comp">' + state.competencies.map(c => {
    const col = c.color || '#3B82F6';
    const pct = Math.max(0, Math.min(100, scores[c.id] || 0));
    return `<div class="pp-tile comp-tile" style="--rc-border:${col};--rc-glow:${col}33;--rc-text:${col}">
      <span class="comp-ic">${c.icon}</span>
      <span class="comp-nm">${c.name}</span>
      <div class="comp-track"><div class="comp-fill" style="width:${pct}%"></div></div>
      <span class="comp-vl">${pct}%</span>
    </div>`;
  }).join('') + '</div>';
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
  const discImg = (state.discConfig.images || {});
  const labels = {
    D:{label:'Командир', color:dc.D || '#EF4444', desc:'Я беру высоту!', slogan:'Сила воли, скорость, преодоление препятствий', img:discImg.D || ''},
    I:{label:'Звездочет', color:dc.I || '#FBBF24', desc:'Я зажигаю свет!', slogan:'Энергия, общение, вдохновение и веселье', img:discImg.I || ''},
    S:{label:'Хранитель', color:dc.S || '#22C55E', desc:'Я держу строй!', slogan:'Забота, дружба, помощь и терпение', img:discImg.S || ''},
    C:{label:'Мастер',    color:dc.C || '#3B82F6', desc:'Я знаю секрет!', slogan:'Точность, знания, логика и порядок', img:discImg.C || ''}
  };

  const dominant = Object.entries(disc).sort((a,b) => b[1]-a[1])[0];

  return { disc, labels, dominant };
}

// Картинка DISC-профиля: URL из content_disc_config[images], иначе эмодзи-заглушка
function discTypeImg(type, label) {
  const size = 42;
  const img = (label && label.img) || '';
  const emojiMap = { D:'💪', I:'🌟', S:'🤝', C:'🧠' };
  const emoji = emojiMap[type] || '🧩';
  if (img) {
    return '<img src="' + esc(img) + '" alt="' + esc(emoji) + '" width="' + size + '" height="' + size + '" style="border-radius:10px;object-fit:cover" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span style="display:none;width:' + size + 'px;height:' + size + 'px;border-radius:10px;background:var(--glass-b);align-items:center;justify-content:center;font-size:22px">' + emoji + '</span>';
  }
  return '<span style="display:flex;width:' + size + 'px;height:' + size + 'px;border-radius:10px;background:var(--glass-b);align-items:center;justify-content:center;font-size:22px">' + emoji + '</span>';
}

// DISC-архетипы: карточки по дизайну disc_cards.html
const DISC_ARCHETYPES = [
  { t:'D', name:'Командир', archetype:'«Завоеватель» / «Штурмовой генерал»', motto:'«Я беру высоту!» 🚩',
    anchor:'«Короче. Делаем так.»',
    desc:'25% чистой прорывной энергии. Не просит разрешения — предъявляет результат. Запускает систему одним толчком.',
    superpower:'Скорость решений в кризисе', shadow:'Тирания в мелочах, выгорание без подчинения',
    gives:'темп', through:'волю', question:'«Что дальше?»' },
  { t:'I', name:'Звездочёт', archetype:'«Трубадур» / «Уличный маг»', motto:'«Я зажигаю свет!» 🤝',
    anchor:'«А представьте, если бы...»',
    desc:'25% вдохновения и харизмы. Работает не с фактами, а с верой людей в идею. Превращает трудности в приключение.',
    superpower:'Эмоциональная связь и вовлечённость', shadow:'Забывает дедлайны, обещает больше, чем реально',
    gives:'смысл', through:'слово', question:'«Кто с нами?»' },
  { t:'S', name:'Хранитель', archetype:'«Щитоносец» / «Старейшина клана»', motto:'«Я держу строй!» ⛩️',
    anchor:'«Давайте сначала проверим...»',
    desc:'25% стабильности и лояльности. Каркас конструкции — держит строй, пока остальные бегут к цели.',
    superpower:'Надёжность в любых условиях', shadow:'Консерватизм, сопротивление изменениям',
    gives:'порядок', through:'заботу', question:'«Как сохранить?»' },
  { t:'C', name:'Мастер', archetype:'«Архитектор реальности» / «Хранитель Гримуаров»', motto:'«Я знаю секрет!» 🔮',
    anchor:'«Согласно данным...»',
    desc:'25% чистого знания и холодного расчёта. Интеллектуальный капитал, без которого всё рассыплется.',
    superpower:'Глубина анализа, точность прогнозов', shadow:'Паралич анализа, эмоциональная сдержанность',
    gives:'качество', through:'мысль', question:'«Почему это работает?»' }
];
const DISC_ARCH_ICONS = { D:'⚡', I:'✨', S:'🛡️', C:'🧠' };

// Палитра из disc_cards.html (точное соответствие приложенному файлу)
const DISC_ARCH_STYLE = {
  D: '--rc-border:#dc2626;--rc-glow:rgba(220,38,38,0.18);--rc-text:#f87171;',
  I: '--rc-border:#f5b83d;--rc-glow:rgba(245,184,61,0.20);--rc-text:#fbbf6a;',
  S: '--rc-border:#84956b;--rc-glow:rgba(132,149,107,0.18);--rc-text:#a8b894;',
  C: '--rc-border:#3b82f6;--rc-glow:rgba(59,130,246,0.16);--rc-text:#93c5fd;'
};

function discArchStyle(t) {
  return DISC_ARCH_STYLE[t] || '--rc-border:#3b82f6;--rc-glow:rgba(59,130,246,0.16);--rc-text:#93c5fd;';
}

function renderDiscPage() {
  const cardsEl = document.getElementById('disc-page-cards');
  if (!cardsEl) return;
  cardsEl.innerHTML = DISC_ARCHETYPES.map(a =>
    '<div class="disc-arch-card" style="' + discArchStyle(a.t) + '">' +
      '<div class="rarity-stripe"></div>' +
      '<div class="disc-arch-head">' +
        '<span class="disc-arch-letter">' + a.t + ' · 25%</span>' +
        '<span class="disc-arch-share">DISC</span>' +
      '</div>' +
      '<div class="disc-arch-icon">' + (DISC_ARCH_ICONS[a.t] || '🧩') + '</div>' +
      '<div class="disc-arch-name">' + esc(a.name) + '</div>' +
      '<div class="disc-arch-archetype">' + esc(a.archetype) + '</div>' +
      '<div class="disc-arch-motto">' + esc(a.motto) + '</div>' +
      '<div class="disc-arch-label">Суть</div>' +
      '<div class="disc-arch-desc">' + esc(a.desc) + '</div>' +
      '<div class="disc-arch-label">Фраза-якорь</div>' +
      '<div class="disc-arch-anchor">' + esc(a.anchor) + '</div>' +
      '<div class="disc-arch-label" style="margin-top:12px;">Суперсила / Тень</div>' +
      '<div class="disc-arch-pair"><b>+</b><span>' + esc(a.superpower) + '</span></div>' +
      '<div class="disc-arch-pair shadow-row"><b>–</b><span>' + esc(a.shadow) + '</span></div>' +
      '<div class="disc-arch-formula">' +
        '<div><b>Задаёт</b><span class="formula-val">' + esc(a.gives) + '</span></div>' +
        '<div><b>Действует через</b><span class="formula-val">' + esc(a.through) + '</span></div>' +
        '<div><b>Вопрос</b><span class="formula-val">' + esc(a.question) + '</span></div>' +
      '</div>' +
    '</div>'
  ).join('');
  const synEl = document.getElementById('disc-page-synergy');
  if (synEl) {
    synEl.innerHTML = '<h3>Синергия 4×25% — «Почини сломанный корабль»</h3>' +
      '<div class="disc-synergy-grid">' +
      DISC_ARCHETYPES.map(p =>
        '<div class="col"><span class="q">' + esc(p.name.toUpperCase()) + '</span><span class="a">' + esc(p.gives) + '</span></div>'
      ).join('') +
      '</div>';
  }
}

function renderDISC(obs, studentId) {
  const { disc, labels, dominant } = calcDisc(obs, studentId);

  renderDiscPage();

  const discBarsEl = document.getElementById('disc-bars');
  if (discBarsEl) discBarsEl.innerHTML = ['D','I','S','C'].map(t => `
    <div class="disc-row" style="align-items:center">
      <div class="disc-type-img">${discTypeImg(t, labels[t])}</div>
      <div style="flex:1">
      <div class="disc-type-label" style="color:${labels[t].color}">${t} <span style="font-size:0.75em;opacity:0.85">${labels[t].label}</span></div>
      <div class="disc-bar-wrap">
        <div class="disc-bar-inner" style="width:${disc[t]}%;background:linear-gradient(90deg,${labels[t].color}90,${labels[t].color})">
          <span class="disc-bar-pct">${disc[t]}%</span>
        </div>
      </div>
      <div class="disc-type-desc">${labels[t].desc}</div>
      </div>
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
