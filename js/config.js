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
  CONTENT_MISSIONS:      'content_missions'
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
  skill_map: {
    D: ['initiative','persistence','problem_solving'],
    I: ['communication','creativity','social_position'],
    S: ['cooperation','adaptability','self_organization'],
    C: ['critical_thinking','learning_ability','curiosity']
  },
  combo: {
    'DI': { label:'Харизматичный лидер',    color:'#EF4444', desc:'Ориентирован на результат через взаимодействие с людьми' },
    'IS': { label:'Дипломат',               color:'#FBBF24', desc:'Умеет убеждать, сохраняя дружелюбную атмосферу' },
    'SC': { label:'Надёжный исполнитель',    color:'#22C55E', desc:'Качественно и методично выполняет задачи' },
    'CD': { label:'Точный стратег',          color:'#3B82F6', desc:'Анализирует и находит самые эффективные решения' }
  }
};

const DEFAULT_SHIFTS = [];

// ── Экспорт ────────────────────────────────────────────────
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.TABLES = TABLES;
window.DEFAULT_COMPETENCIES = DEFAULT_COMPETENCIES;
window.DEFAULT_DISC_CONFIG = DEFAULT_DISC_CONFIG;
window.DEFAULT_SHIFTS = DEFAULT_SHIFTS;
