// ═════════════════════════════════════════════
//  Каникулы с ONE! — КОНФИГУРАЦИЯ
// ═════════════════════════════════════════════

const SUPABASE_URL = 'https://xzmxxnhyvbzdebqhomzd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bXh4bmh5dmJ6ZGVicWhvbXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTEzNzMsImV4cCI6MjA5MzgyNzM3M30.xAKnz6ijF8H1PNHFKVjrLyD264OHCgowkPgd2DqWF18';

// OpenAI key removed — app uses local rule-based AI engine (analyzeStudentProfile)

const TABLES = {
  STUDENTS:              'students',
  OBSERVATIONS:          'observations',
  BADGES:                'badges',
  COMPLETIONS:           'completions',
  CONTENT_SHIFTS:        'content_shifts',
  CONTENT_COMPETENCIES:  'content_competencies',
  CONTENT_BADGE_DEFS:    'content_badge_definitions',
  CONTENT_DISC_CONFIG:   'content_disc_config',
  CONTENT_MISSIONS:      'content_missions',
  CONTENT_INVENTORY:     'content_inventory_items',
  PARTICIPATIONS:        'participations'
};

// ── Fallback данные (если Supabase пуст) ──────────────────

const DEFAULT_COMPETENCIES = [
  { id:'communication',      name:'Коммуникация',          icon:'💬', color:'#FBBF24' },
  { id:'cooperation',       name:'Кооперация',            icon:'🤝', color:'#22C55E' },
  { id:'problem_solving',   name:'Решение проблем',       icon:'🧩', color:'#3B82F6' },
  { id:'adaptability',      name:'Адаптивность',          icon:'🔄', color:'#06B6D4' },
  { id:'critical_thinking', name:'Критическое мышление', icon:'🧠', color:'#8B5CF6' },
  { id:'curiosity',         name:'Любознательность',      icon:'🔍', color:'#EC4899' },
  { id:'learning_ability',  name:'Умение учиться',        icon:'📚', color:'#0EA5E9' },
  { id:'self_organization', name:'Самоорганизация',       icon:'📋', color:'#6366F1' },
  { id:'creativity',        name:'Креативное мышление',   icon:'🎨', color:'#F59E0B' },
  { id:'initiative',        name:'Инициативность',        icon:'🚀', color:'#EF4444' },
  { id:'persistence',       name:'Настойчивость',         icon:'💪', color:'#A855F7' },
  { id:'social_position',   name:'Общественная позиция',  icon:'🏛', color:'#14B8A6' }
];

const DEFAULT_DISC_CONFIG = {
  colors: { D:'#EF4444', I:'#FBBF24', S:'#22C55E', C:'#3B82F6' },
  images: { D:'', I:'', S:'', C:'' },  // URL картинки профиля DISC (Supabase Storage)
  skill_map: {
    D: ['initiative','persistence','problem_solving'],
    I: ['communication','creativity','social_position'],
    S: ['cooperation','adaptability','self_organization'],
    C: ['critical_thinking','learning_ability','curiosity']
  },
  combo: {
    'DI': { label:'Командир-Звездочет', color:'#EF4444', desc:'Ведёт за собой, вдохновляя энергией' },
    'IS': { label:'Звездочет-Хранитель', color:'#FBBF24', desc:'Создаёт команду и заботится о ней' },
    'SC': { label:'Хранитель-Мастер',    color:'#22C55E', desc:'Надёжно выполняет задачи с точностью' },
    'CD': { label:'Мастер-Командир',     color:'#3B82F6', desc:'Находит лучшие решения и ведёт к цели' }
  }
};

const DEFAULT_SHIFTS = [];

// ── Shift Dates ──────────────────────────────────────────────
const SHIFT_DATES = {
  1: '05.10 – 09.10.2026',
  2: '16.11 – 20.11.2026',
  3: '22.02 – 26.02.2027',
  4: '29.03 – 02.04.2027',
  5: '20.06 – 29.06.2027',
  6: '30.06 – 09.07.2027',
  7: '09.07 – 19.07.2027',
  8: '20.07 – 29.07.2027',
  9: '30.07 – 08.08.2027',
  10: '09.08 – 18.08.2027'
};

// ── CD8: Streak System ──────────────────────────────────────
const STREAK_BONUS = [0, 0, 10, 15, 25, 40, 60, 80, 110, 150, 200]; // bonus XP per streak day (index = day)
const STREAK_MILESTONES = [
  { days: 3,  label:'🔥 3 дня!', desc:'Огненная серия' },
  { days: 7,  label:'⚡ Неделя!', desc:'Электрическая неделя' },
  { days: 14, label:'💎 2 недели!', desc:'Бриллиантовая серия' },
  { days: 30, label:'🏆 Легенда!', desc:'Легендарная серия' }
];

// ── CD4/CD6: Economy System ──────────────────────────────────
const ECONOMY_CURRENCY = { name:'НЕО-коины', icon:'🪙', abbrev:'NC' };
const ECONOMY_SHOP = [
  { id:'shop_xp_boost',    name:'XP-бустер',       icon:'⚡', cost:50,  desc:'+50 XP к следующему заданию', type:'consumable' },
  { id:'shop_badge_hint',  name:'Подсказка баджа', icon:'💡', cost:30,  desc:'Показать критерий случайного баджа', type:'consumable' },
  { id:'shop_inv_slot',    name:'Доп. слот',       icon:'🎒', cost:100, desc:'+1 слот инвентаря', type:'permanent' },
  { id:'shop_rare_chest',  name:'Редкий сундук',   icon:'📦', cost:75,  desc:'Гарантированный rare-предмет', type:'consumable' },
  { id:'shop_name_color',  name:'Цвет имени',      icon:'🎨', cost:60,  desc:'Разноцветное имя в профиле', type:'cosmetic' },
  { id:'shop_profile_frame',name:'Рамка профиля',  icon:'🖼️', cost:120, desc:'Уникальная рамка аватара', type:'cosmetic' },
  { id:'shop_title',       name:'Титул',           icon:'👑', cost:200, desc:'Персональный титул в профиле', type:'cosmetic' },
  { id:'shop_legendary_key',name:'Ключ Легенды',   icon:'🗝️', cost:300, desc:'Открывает Легендарный сундук', type:'consumable' }
];

// ── CD7: Mystery Box ────────────────────────────────────────
const MYSTERY_BOX_INTERVAL = 5; // every N completions
const MYSTERY_BOX_POOL = [
  { weight:40, type:'xp',      value:25,  label:'+25 XP',          icon:'⚡' },
  { weight:25, type:'xp',      value:50,  label:'+50 XP',          icon:'💫' },
  { weight:15, type:'coin',    value:10,  label:'+10 НЕО-коинов',   icon:'🪙' },
  { weight:10, type:'coin',    value:25,  label:'+25 НЕО-коинов',   icon:'💰' },
  { weight:5,  type:'rare_item',value:1,  label:'Редкий предмет',   icon:'📦' },
  { weight:3,  type:'epic_item', value:1,  label:'Эпический предмет',icon:'🎁' },
  { weight:2,  type:'legendary_item',value:1,label:'Легендарный предмет',icon:'🏆' }
];

// ── CD2: Boss Battles ────────────────────────────────────────
const BOSS_BATTLES = [
  { week:1, name:'Кибер-Дракон',      icon:'🐉', hp:500,  rewards:{ xp:150, coins:30, badge:'boss_dragon' }},
  { week:2, name:'Терра-Голем',       icon:'🗿', hp:750,  rewards:{ xp:200, coins:40, badge:'boss_golem' }},
  { week:3, name:'Хроно-Фантом',      icon:'👻', hp:1000, rewards:{ xp:250, coins:50, badge:'boss_phantom' }},
  { week:4, name:'Нео-Король',        icon:'👑', hp:1500, rewards:{ xp:400, coins:80, badge:'boss_neoking' }}
];

// ── CD6: Limited-Time Badges ──────────────────────────────────
const LIMITED_BADGES = [
  { id:'limited_speedrunner',  name:'Спидраннер',     icon:'⏱️', desc:'Заверши 3 задания за день', rarity:'rare',     condition:'3 completions in 1 day', shift_ids:[1,2,3,4,5,6,7,8,9,10] },
  { id:'limited_perfectionist',name:'Перфекционист',  icon:'💎', desc:'Получи 5/5 в 5 заданиях подряд', rarity:'epic',  condition:'5 perfect scores in a row', shift_ids:[1,2,3,4,5,6,7,8,9,10] },
  { id:'limited_nightowl',     name:'Ночная Сова',    icon:'🦉', desc:'Выполни задание после 20:00',   rarity:'rare',   condition:'completion after 20:00', shift_ids:[1,2,3,4,5,6,7,8,9,10] },
  { id:'limited_earlybird',    name:'Ранняя Пташка',  icon:'🐦', desc:'Выполни задание до 10:00',      rarity:'rare',   condition:'completion before 10:00', shift_ids:[1,2,3,4,5,6,7,8,9,10] },
  { id:'limited_explorer',     name:'Исследователь',  icon:'🧭', desc:'Попробуй все 7 направлений за смену', rarity:'legendary', condition:'all 7 directions in 1 shift', shift_ids:[1,2,3,4,5,6,7,8,9,10] }
];

// ── CD1: Legacy Relics (cross-shift) ──────────────────────────
const LEGENDARY_RELICS = [
  { id:'relic_dragon_scale',    name:'Чешуя Дракона',      icon:'🐉', from_shift:1, desc:'Реликвия Кибер-Атлетов. +10 XP ко всем заданиям.' },
  { id:'relic_terra_seed',      name:'Семя Теры',          icon:'🌱', from_shift:2, desc:'Реликвия Терраформеров. +10% к биотеху.' },
  { id:'relic_time_crystal',    name:'Кристалл Времени',   icon:'🔮', from_shift:3, desc:'Реликвия Детективов. +10% к аналитике.' },
  { id:'relic_maker_gear',      name:'Шестерёнка Будущего', icon:'⚙️', from_shift:4, desc:'Реликвия Инноваторов. +10% к IT.' },
  { id:'relic_bio_core',        name:'Био-Ядро',           icon:'🧬', from_shift:5, desc:'Реликвия Атлетов. +10% к спорту.' },
  { id:'relic_city_key',        name:'Ключ Города',        icon:'🔑', from_shift:6, desc:'Реликвия Агентов. +10% к навигации.' },
  { id:'relic_smart_chip',      name:'Smart-Чип',          icon:'💾', from_shift:7, desc:'Реликвия Архитекторов. +10% к проектированию.' },
  { id:'relic_game_coin',       name:'Монета Студии',      icon:'🪙', from_shift:8, desc:'Реликвия Геймдева. +10% к креативу.' },
  { id:'relic_champion_medal',  name:'Медаль Чемпиона',    icon:'🏅', from_shift:9, desc:'Реликвия Чемпионов. +10% к настойчивости.' },
  { id:'relic_island_relic',    name:'Артефакт Острова',   icon:'🗿', from_shift:10, desc:'Реликвия Выживших. +10% ко всем навыкам.' }
];

// ── CD3: Avatar Customization ─────────────────────────────────
const AVATAR_COLORS = ['#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#EC4899'];
const AVATAR_ICONS = ['🦊','🐱','🐶','🦁','🐼','🦄','🐲','🤖','👾','🎯','⚡','🔥','💎','🌟','🎮','🛠️'];

// ── CD1/CD3: DISC Mission Recommendations ────────────────────
const DISC_MISSION_BOOSTS = {
  D: { label:'Командир',  boost:'Лидерские и стратегические задания', icon:'👑', skills:['initiative','persistence','problem_solving'] },
  I: { label:'Звездочет', boost:'Коммуникационные и творческие задания', icon:'⭐', skills:['communication','creativity','social_position'] },
  S: { label:'Хранитель', boost:'Командные и поддерживающие задания', icon:'🛡️', skills:['cooperation','adaptability','self_organization'] },
  C: { label:'Мастер',    boost:'Аналитические и технические задания', icon:'🔬', skills:['critical_thinking','learning_ability','curiosity'] }
};

// ── Экспорт ────────────────────────────────────────────────
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.TABLES = TABLES;
window.DEFAULT_COMPETENCIES = DEFAULT_COMPETENCIES;
window.DEFAULT_DISC_CONFIG = DEFAULT_DISC_CONFIG;
window.DEFAULT_SHIFTS = DEFAULT_SHIFTS;
window.STREAK_BONUS = STREAK_BONUS;
window.STREAK_MILESTONES = STREAK_MILESTONES;
window.ECONOMY_CURRENCY = ECONOMY_CURRENCY;
window.ECONOMY_SHOP = ECONOMY_SHOP;
window.MYSTERY_BOX_INTERVAL = MYSTERY_BOX_INTERVAL;
window.MYSTERY_BOX_POOL = MYSTERY_BOX_POOL;
window.BOSS_BATTLES = BOSS_BATTLES;
window.LIMITED_BADGES = LIMITED_BADGES;
window.LEGENDARY_RELICS = LEGENDARY_RELICS;
window.AVATAR_COLORS = AVATAR_COLORS;
window.AVATAR_ICONS = AVATAR_ICONS;
window.DISC_MISSION_BOOSTS = DISC_MISSION_BOOSTS;
window.SHIFT_DATES = SHIFT_DATES;
